import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { findOrCreateUser, markEmailVerified } from "@/lib/db/repositories/users";
import { createSession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { isCrossSite, safeNextPath } from "@/lib/auth/guards";

// Behind Caddy, request.url's origin is the internal proxy target, so
// AUTH_URL is the source of truth for redirects.
const baseUrl = (request: Request) => process.env.AUTH_URL ?? new URL(request.url).origin;

/**
 * Links sent before the confirm step existed point here. Visiting no longer
 * signs anyone in — it forwards to the confirm page, which asks for a click.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(`${baseUrl(request)}/sign-in/confirm?token=${encodeURIComponent(token)}`, 303);
}

/** The confirm page's button. Only a same-site POST can spend a link. */
export async function POST(request: Request) {
  const base = baseUrl(request);
  if (isCrossSite(request)) return NextResponse.redirect(`${base}/sign-in?error=invalid_request`, 303);

  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const next = safeNextPath(form?.get("next"));
  if (typeof token !== "string" || !token) {
    return NextResponse.redirect(`${base}/sign-in?error=missing_token`, 303);
  }

  const email = await consumeVerificationToken(token);
  if (!email) return NextResponse.redirect(`${base}/sign-in?error=expired_link`, 303);

  const user = await findOrCreateUser(email);
  if (!user.emailVerifiedAt) await markEmailVerified(user.id);
  const { raw, expiresAt } = await createSession(user.id);

  const response = NextResponse.redirect(`${base}${next}`, 303);
  response.cookies.set(sessionCookieName, raw, sessionCookieOptions(expiresAt));
  return response;
}
