/**
 * Where to send someone after signing in. Only a path on this site: no
 * scheme, no host, no protocol-relative "//evil.example", no backslash
 * tricks — anything else falls back to the home page.
 */
export function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.length > 300) {
    return "/";
  }
  if (/[\u0000-\u001f]/.test(path) || path.startsWith("/api/")) return "/";
  return path;
}

/**
 * Rejects state-changing requests a browser sent from another site. Every
 * browser sends Origin on a POST; a request without one isn't a browser
 * acting on a victim's cookies, so it passes. SameSite=Lax alone would trust
 * the sibling *.cyalin.com sites on this host as same-site.
 */
export function isCrossSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  return origin !== expected;
}

export type GoogleIdClaims = {
  sub: string;
  email: string;
  name?: string;
};

/**
 * Checks the claims of an ID token received directly from Google's token
 * endpoint over TLS — which OpenID Connect Core (3.1.3.7) allows in place of
 * a signature check. Issuer, audience, expiry, nonce and a verified email
 * are all required.
 */
export function validateGoogleIdToken(
  idToken: unknown,
  expected: { clientId: string; nonce: string; now?: number },
): GoogleIdClaims | null {
  if (typeof idToken !== "string") return null;
  const [, payload] = idToken.split(".");
  if (!payload) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const now = Math.floor((expected.now ?? Date.now()) / 1000);
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audienceOk = claims.aud === expected.clientId;
  const fresh = typeof claims.exp === "number" && claims.exp > now;
  const nonceOk = typeof claims.nonce === "string" && claims.nonce === expected.nonce;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!issuerOk || !audienceOk || !fresh || !nonceOk || !verified) return null;
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") return null;
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase().trim(),
    name: typeof claims.name === "string" ? claims.name.slice(0, 80) : undefined,
  };
}
