import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { findOrCreateUser, markEmailVerified } from "@/lib/db/repositories/users";
import { createSession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  // Behind Caddy, request.url's origin reflects the internal proxy target
  // (127.0.0.1:3005), not the public host — AUTH_URL is the source of truth,
  // matching how the request route builds the link in the first place.
  const base = process.env.AUTH_URL ?? new URL(request.url).origin;

  if (!token) {
    return NextResponse.redirect(`${base}/sign-in?error=missing_token`);
  }

  const email = await consumeVerificationToken(token);
  if (!email) {
    return NextResponse.redirect(`${base}/sign-in?error=expired_link`);
  }

  const user = await findOrCreateUser(email);
  if (!user.emailVerifiedAt) await markEmailVerified(user.id);

  const { raw, expiresAt } = await createSession(user.id);

  // Redirects home for now; once /network (Phase D) exists this can target
  // the member's own feed instead.
  const response = NextResponse.redirect(`${base}/`);
  response.cookies.set(sessionCookieName, raw, sessionCookieOptions(expiresAt));
  return response;
}
