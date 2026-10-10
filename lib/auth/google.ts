/** Google sign-in is offered only when both credentials are configured. */
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return { clientId, clientSecret, redirectUri: `${base}/api/auth/google/callback` };
}

export const googleStateCookie = "avrmd_google_oauth";
