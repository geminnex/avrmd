import { sql } from "drizzle-orm";

/**
 * Fixed-window rate limiting backed by Postgres, so limits hold across
 * processes and restarts. One atomic upsert per check: parallel requests
 * can't all slip under the limit. If the database is unreachable it falls
 * back to a per-process counter rather than letting everything through.
 */
export function rateLimiter(name: string, max: number, windowMs: number) {
  return (key: string) => isRateLimited(`${name}:${key}`, max, windowMs);
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    if (memory.size > 10_000) {
      for (const [stale, value] of memory) if (now > value.resetAt) memory.delete(stale);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const { getDatabase } = await import("./db/client");
    const { rateLimits } = await import("./db/schema");
    const database = getDatabase();
    const windowStart = new Date(Date.now() - windowMs);
    const result = await database.execute<{ hits: number }>(sql`
      insert into ${rateLimits} (key, window_start, hits) values (${key}, now(), 1)
      on conflict (key) do update set
        hits = case when ${rateLimits.windowStart} < ${windowStart} then 1 else ${rateLimits.hits} + 1 end,
        window_start = case when ${rateLimits.windowStart} < ${windowStart} then now() else ${rateLimits.windowStart} end
      returning hits`);
    if (Math.random() < 0.01) {
      await database.execute(sql`delete from ${rateLimits} where ${rateLimits.windowStart} < now() - interval '1 day'`);
    }
    return Number(result.rows[0]?.hits ?? 0) > max;
  } catch {
    return memoryLimited(key, max, windowMs);
  }
}
