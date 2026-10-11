import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleConfig, googleStateCookie } from "@/lib/auth/google";
import { safeNextPath, validateGoogleIdToken } from "@/lib/auth/guards";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { createSession } from "@/lib/db/repositories/sessions";
import { findOrCreateGoogleUser } from "@/lib/db/repositories/users";
import { afterSignIn } from "@/lib/onboarding";

function sameValue(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const base = process.env.AUTH_URL ?? new URL(request.url).origin;
  const fail = (reason: string) => {
    const response = NextResponse.redirect(`${base}/sign-in?error=${reason}`);
    response.cookies.set(googleStateCookie, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  };

  const config = googleConfig();
  if (!config) return fail("google_unavailable");

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return fail("google_cancelled");

  let saved: { state?: string; nonce?: string; verifier?: string; next?: string } = {};
  try {
    saved = JSON.parse((await cookies()).get(googleStateCookie)?.value ?? "{}");
  } catch {
    saved = {};
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !saved.state || !saved.nonce || !saved.verifier || !sameValue(state, saved.state)) {
    return fail("google_failed");
  }

  let idToken: unknown;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fail("google_failed");
    idToken = (await response.json())?.id_token;
  } catch {
    return fail("google_failed");
  }

  const claims = validateGoogleIdToken(idToken, { clientId: config.clientId, nonce: saved.nonce });
  if (!claims) return fail("google_failed");

  const user = await findOrCreateGoogleUser(claims);
  if (user.suspendedAt) return fail("suspended");
  const { raw, expiresAt } = await createSession(user.id);

  const response = NextResponse.redirect(`${base}${afterSignIn(user, safeNextPath(saved.next))}`);
  response.cookies.set(sessionCookieName, raw, sessionCookieOptions(expiresAt));
  response.cookies.set(googleStateCookie, "", { path: "/api/auth/google", maxAge: 0 });
  return response;
}
