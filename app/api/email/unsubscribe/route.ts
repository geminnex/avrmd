import { NextResponse } from "next/server";
import { verifyUnsubscribeToken, type EmailKind } from "@/lib/email-prefs";
import { isUuid } from "@/lib/ids";
import { setEmailPref } from "@/lib/db/repositories/email-prefs";

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here without the
 * member signing in. The signed token limits it to one kind of email for
 * one member. The /unsubscribe page posts here too.
 */
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("u") ?? "";
  const kind = params.get("k") ?? "";
  const token = params.get("t") ?? "";
  if (!isUuid(userId) || !verifyUnsubscribeToken(userId, kind, token)) {
    return NextResponse.json({ ok: false, message: "This unsubscribe link isn't valid." }, { status: 400 });
  }
  await setEmailPref(userId, kind as EmailKind, false);

  // Mail clients send "List-Unsubscribe=One-Click" and only need a 2xx; the
  // page's own form expects to land on a confirmation page.
  const body = await request.text().catch(() => "");
  if (!body.includes("List-Unsubscribe=One-Click")) {
    const base = process.env.AUTH_URL ?? new URL(request.url).origin;
    return NextResponse.redirect(`${base}/unsubscribe?done=${kind}`, 303);
  }
  return NextResponse.json({ ok: true });
}
