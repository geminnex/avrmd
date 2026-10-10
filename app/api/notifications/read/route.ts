import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/db/repositories/notifications";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in first." }, { status: 401 });
  }
  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
