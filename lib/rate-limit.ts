/**
 * In-memory, per-process: enough to stop a double-click storm or a stuck
 * script, not a defence against anyone determined. Same trade as the talks
 * and sign-in routes.
 */
export function createRateLimiter(maxPerWindow: number, windowMs = 60_000) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return function rateLimited(key: string) {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now > entry.resetAt) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > maxPerWindow;
  };
}
