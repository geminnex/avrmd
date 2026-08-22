import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/db/repositories/sessions";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  const store = await cookies();
  const raw = store.get(sessionCookieName)?.value;
  if (raw) await destroySession(raw);

  const base = process.env.AUTH_URL ?? new URL(request.url).origin;
  const response = NextResponse.redirect(`${base}/`);
  response.cookies.set(sessionCookieName, "", sessionCookieOptions());
  return response;
}
