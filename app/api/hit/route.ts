import { sql } from "drizzle-orm";
import { clientIp } from "@/lib/auth/flow";
import { normalizePagePath } from "@/lib/page-path";
import { rateLimiter } from "@/lib/rate-limit";

// The IP only feeds this limiter; it is never written to the page_views table.
const rateLimited = rateLimiter("hit", 120, 60_000);

/** Counts one view of a page. Always answers 204: counting must never break a page. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const path = normalizePagePath(body?.path);
    if (!path || (await rateLimited(clientIp(request)))) return new Response(null, { status: 204 });

    const { getDatabase } = await import("@/lib/db/client");
    const { pageViews } = await import("@/lib/db/schema");
    await getDatabase().execute(sql`
      insert into ${pageViews} (day, path, views) values ((now() at time zone 'utc')::date, ${path}, 1)
      on conflict (day, path) do update set views = ${pageViews.views} + 1`);
  } catch {
    // Analytics are best-effort.
  }
  return new Response(null, { status: 204 });
}
