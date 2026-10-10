import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser, sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { deleteUser } from "@/lib/db/repositories/users";
import { deleteUserUploads } from "@/lib/storage";

const rateLimited = rateLimiter("account-delete", 3, 60 * 60_000);

const bodySchema = z.object({ confirmEmail: z.string() });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email) {
    return NextResponse.json({ ok: false, message: "Type your account email exactly to confirm." }, { status: 422 });
  }

  try {
    await deleteUserUploads(user.id);
  } catch (error) {
    // Storage trouble must not keep someone's account alive; the files are
    // unlinked from everything once the rows are gone.
    console.error("Upload cleanup failed during account deletion", error);
  }
  await deleteUser(user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", sessionCookieOptions());
  return response;
}
