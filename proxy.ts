import { NextResponse, type NextRequest } from "next/server";

/**
 * One check in front of every state-changing API call: a browser request
 * from another site is refused before any route runs. SameSite=Lax cookies
 * alone treat the sibling *.cyalin.com sites on this host as same-site.
 * Requests without an Origin header are not browsers acting on a member's
 * cookies, so they pass to the route's own checks.
 */
export function proxy(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (origin === expected) return NextResponse.next();
  return NextResponse.json({ ok: false, message: "Cross-site request refused." }, { status: 403 });
}

export const config = {
  // Requests carrying an Origin; the method is checked above, so GETs
  // (including the Google callback) always pass.
  matcher: [
    {
      source: "/api/:path*",
      has: [{ type: "header", key: "origin" }],
    },
  ],
};
