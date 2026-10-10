import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogEntity } from "./catalog-types";
import { buildRecord, type ReviewCandidate, type ReviewFields } from "./review";
import type { Triage } from "./triage";

/**
 * The review queue and the catalog are JSON files under data/. Editors'
 * decisions write them here; an approved record is published by the next
 * build, since record pages are generated at build time.
 */
const dataDir = join(process.cwd(), "data");

export type QueueCandidate = ReviewCandidate & {
  key: string;
  status: "pending" | "approved" | "rejected" | "dismissed";
  sourceId: string;
  published: string | null;
  discoveredAt: string;
  triage?: Triage;
  decidedAt?: string;
  decidedBy?: string;
  slug?: string;
};

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;
}

function write(file: string, value: unknown) {
  const path = join(dataDir, file);
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

export function readQueue() {
  try {
    return read<QueueCandidate[]>("candidates.json");
  } catch {
    return [];
  }
}

/** Matches the robot's signal ids (scripts/discover.mjs), to link a signal to its new record. */
function signalId(key: string) {
  return createHash("sha1").update(`signal:${key}`).digest("hex").slice(0, 16);
}

export function approveCandidate(id: string, fields: ReviewFields, editorId: string) {
  const queue = readQueue();
  const candidate = queue.find((item) => item.id === id);
  if (!candidate || candidate.status !== "pending") return { ok: false as const, problems: ["This candidate is no longer pending."] };

  const catalog = read<CatalogEntity[]>("catalog.json");
  const built = buildRecord(candidate, fields, new Set(catalog.map((entity) => entity.slug)));
  if ("problems" in built) return { ok: false as const, problems: built.problems };

  write("catalog.json", [...catalog, built.record]);
  const now = new Date().toISOString();
  write(
    "candidates.json",
    queue.map((item) =>
      item.id === id ? { ...item, status: "approved", slug: built.record.slug, decidedAt: now, decidedBy: editorId } : item,
    ),
  );
  try {
    const signals = read<{ id: string; promotedSlug?: string }[]>("signals.json");
    const target = signalId(candidate.key);
    if (signals.some((signal) => signal.id === target)) {
      write("signals.json", signals.map((signal) => (signal.id === target ? { ...signal, promotedSlug: built.record.slug } : signal)));
    }
  } catch {
    // The signal may have aged out of the feed; the record stands on its own.
  }
  return { ok: true as const, record: built.record };
}

export function decideCandidate(id: string, status: "rejected" | "pending", editorId: string) {
  const queue = readQueue();
  if (!queue.some((item) => item.id === id)) return false;
  write(
    "candidates.json",
    queue.map((item) =>
      item.id === id ? { ...item, status, decidedAt: new Date().toISOString(), decidedBy: editorId } : item,
    ),
  );
  return true;
}
