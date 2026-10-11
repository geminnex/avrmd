import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { countUnreadNotifications } from "@/lib/db/repositories/notifications";

/**
 * Deliberately not read in any page's server render — that would force
 * every static page (all 18 entity pages, all 6 topic hubs) into dynamic
 * rendering just to check who's signed in. Fetched client-side instead, from
 * a tiny island in the header, so the catalog stays fully static.
 *
 * The unread count rides along so the header bell costs no second request.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  let unreadNotifications = 0;
  try {
    unreadNotifications = await countUnreadNotifications(user.id);
  } catch {
    // The bell shows nothing rather than taking sign-in state down with it.
  }

  return NextResponse.json({
    user: {
      displayName: user.displayName,
      email: user.email,
      handle: user.handle,
      staff: isStaff(user),
      unreadNotifications,
    },
  });
}
