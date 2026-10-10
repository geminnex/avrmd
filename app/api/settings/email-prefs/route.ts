import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { setEmailPref } from "@/lib/db/repositories/email-prefs";
import { emailKinds } from "@/lib/email-prefs";
import { rateLimiter } from "@/lib/rate-limit";

const rateLimited = rateLimiter("email-prefs", 30, 60_000);
const bodySchema = z.object({ kind: z.enum(emailKinds as [string, ...string[]]), on: z.boolean() });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  if (await rateLimited(user.id)) return NextResponse.json({ ok: false, message: "Too many requests." }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 422 });
  await setEmailPref(user.id, parsed.data.kind as (typeof emailKinds)[number], parsed.data.on);
  return NextResponse.json({ ok: true });
}
