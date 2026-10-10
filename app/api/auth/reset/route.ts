import { NextResponse } from "next/server";
import { z } from "zod";
import { signedInJson } from "@/lib/auth/flow";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { destroyUserSessions } from "@/lib/db/repositories/sessions";
import { setPasswordAfterReset } from "@/lib/db/repositories/users";
import { consumeVerificationToken, peekVerificationToken } from "@/lib/db/repositories/verification-tokens";

const bodySchema = z.object({ token: z.string().min(10), password: z.string() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });

  // Check the new password before spending the link, so a rejected password
  // doesn't cost the person their link.
  const pending = await peekVerificationToken(parsed.data.token);
  if (!pending || pending.purpose !== "reset_password") {
    return NextResponse.json({ ok: false, message: "This link has expired or was already used." }, { status: 410 });
  }
  const problem = passwordProblem(parsed.data.password, pending.email);
  if (problem) return NextResponse.json({ ok: false, message: problem }, { status: 422 });

  const token = await consumeVerificationToken(parsed.data.token, ["reset_password"]);
  if (!token) return NextResponse.json({ ok: false, message: "This link has expired or was already used." }, { status: 410 });

  const user = await setPasswordAfterReset(token.email, await hashPassword(parsed.data.password));
  if (!user) return NextResponse.json({ ok: false, message: "This link has expired or was already used." }, { status: 410 });

  // A new password ends every other session, including a thief's.
  await destroyUserSessions(user.id);
  return signedInJson(user.id, "/");
}
