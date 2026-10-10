import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/db/repositories/notifications";

const rateLimited = rateLimiter("notifications-read", 30, 60_000);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }
  if (await rateLimited(user.id)) {
    return NextResponse.json({ ok: false, message: "Too many requests. Wait a minute." }, { status: 429 });
  }
  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
