import { NextResponse } from "next/server";
import { createSession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "./session";

/** Behind Caddy the request's own origin is the internal proxy target. */
export function siteUrl(request: Request) {
  return process.env.AUTH_URL ?? new URL(request.url).origin;
}

/**
 * Local development may show an emailed link on screen when no mail server
 * is running. Production never does: whoever typed the address would get
 * into that account.
 */
export function devLink(url: string, sent: boolean) {
  return !sent && process.env.NODE_ENV !== "production" ? url : undefined;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Starts a session and answers the fetch with where to go next. */
export async function signedInJson(userId: string, next: string) {
  const { raw, expiresAt } = await createSession(userId);
  const response = NextResponse.json({ ok: true, next });
  response.cookies.set(sessionCookieName, raw, sessionCookieOptions(expiresAt));
  return response;
}
