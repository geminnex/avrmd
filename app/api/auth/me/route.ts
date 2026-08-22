import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Deliberately not read in any page's server render — that would force
 * every static page (all 18 entity pages, all 6 topic hubs) into dynamic
 * rendering just to check who's signed in. Fetched client-side instead, from
 * a tiny island in the header, so the catalog stays fully static.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    user: user ? { displayName: user.displayName, email: user.email, handle: user.handle } : null,
  });
}
