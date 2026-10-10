import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth/flow";
import { consumeVerificationToken } from "@/lib/db/repositories/verification-tokens";
import { confirmRegisteredEmail, findOrCreateUser } from "@/lib/db/repositories/users";
import { createSession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { isCrossSite, safeNextPath } from "@/lib/auth/guards";
import { afterSignIn } from "@/lib/onboarding";

const perIp = rateLimiter("verify", 20, 15 * 60_000);

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
  if (await perIp(clientIp(request))) return NextResponse.redirect(`${base}/sign-in?error=rate_limited`, 303);

  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const next = safeNextPath(form?.get("next"));
  if (typeof token !== "string" || !token) {
    return NextResponse.redirect(`${base}/sign-in?error=missing_token`, 303);
  }

  const used = await consumeVerificationToken(token, ["verify_email", "sign_in"]);
  if (!used) return NextResponse.redirect(`${base}/sign-in?error=expired_link`, 303);

  // A registration link keeps the password chosen with it; an older
  // sign-in link proves the address another way (see claimUnverified).
  const user =
    used.purpose === "verify_email" ? await confirmRegisteredEmail(used.email) : await findOrCreateUser(used.email);
  if (!user) return NextResponse.redirect(`${base}/sign-in?error=expired_link`, 303);
  const { raw, expiresAt } = await createSession(user.id);

  const response = NextResponse.redirect(`${base}${afterSignIn(user, next)}`, 303);
  response.cookies.set(sessionCookieName, raw, sessionCookieOptions(expiresAt));
  return response;
}
