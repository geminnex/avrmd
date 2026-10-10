import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleConfig, googleStateCookie } from "@/lib/auth/google";
import { safeNextPath } from "@/lib/auth/guards";

/**
 * Starts "Continue with Google": authorization code flow with PKCE, a state
 * value against login CSRF, and a nonce bound to the ID token. All three
 * live in a short-lived httpOnly cookie scoped to the callback.
 */
export async function GET(request: Request) {
  const base = process.env.AUTH_URL ?? new URL(request.url).origin;
  const config = googleConfig();
  if (!config) return NextResponse.redirect(`${base}/sign-in?error=google_unavailable`);

  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(googleStateCookie, JSON.stringify({ state, nonce, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: the cookie must ride along on Google's top-level redirect back.
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return response;
}
