import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";
import { isCrossSite } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const base = process.env.AUTH_URL ?? new URL(request.url).origin;
  // Another site must not be able to sign a member out.
  if (isCrossSite(request)) return NextResponse.redirect(`${base}/`, 303);

  const store = await cookies();
  const raw = store.get(sessionCookieName)?.value;
  if (raw) await destroySession(raw);

  const response = NextResponse.redirect(`${base}/`, 303);
  response.cookies.set(sessionCookieName, "", sessionCookieOptions());
  return response;
}
