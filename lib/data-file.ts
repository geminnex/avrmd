import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, { mtimeMs: number; value: unknown }>();

/**
 * Reads a file the daily discovery robot rewrites (data/signals.json and
 * friends) at request time instead of bundling it at build time, so the
 * live site shows each run's results without a redeploy. Re-parsed only
 * when the file changes. Server-side only.
 */
export function readDataFile<T>(file: string, fallback: T): T {
  const path = join(process.cwd(), "data", file);
  try {
    const { mtimeMs } = statSync(path);
    const hit = cache.get(path);
    if (hit && hit.mtimeMs === mtimeMs) return hit.value as T;
    const value = JSON.parse(readFileSync(path, "utf8")) as T;
    cache.set(path, { mtimeMs, value });
    return value;
  } catch {
    return fallback;
  }
}
