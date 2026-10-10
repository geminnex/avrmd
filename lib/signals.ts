import { createHash } from "node:crypto";
import { readDataFile } from "./data-file";

/**
 * A signal is a headline pointing at an external source — never a reviewed
 * catalog record. It auto-publishes from the daily discovery job with no
 * editor in the loop, which is only safe because it carries none of a
 * record's trust claims: no review state, no specialties, no relations.
 * A signal is promoted into a real record deliberately, via
 * scripts/approve-candidate.mjs, at which point `promotedSlug` links them.
 */
export const signalCategories = ["regulatory", "research", "trial", "industry"] as const;

export type SignalCategory = (typeof signalCategories)[number];

export type Signal = {
  id: string;
  headline: string;
  url: string;
  sourceLabel: string;
  category: SignalCategory;
  publishedAt: string | null;
  discoveredAt: string;
  sourceId: string;
  promotedSlug?: string;
};

type QueueItem = { key: string; triage?: { recommendation?: string } };

let offTopicCache: { source: QueueItem[]; ids: Set<string> } | undefined;

/**
 * Signals whose candidate AI triage judged off topic (not about XR in
 * health). They were found by broad searches; showing them would put
 * unrelated papers in the feed, on the home page and in the assistant.
 * Ids match the robot's: sha1("signal:" + key).
 */
function offTopicSignalIds() {
  const queue = readDataFile<QueueItem[]>("candidates.json", []);
  if (offTopicCache?.source === queue) return offTopicCache.ids;
  const ids = new Set(
    queue
      .filter((item) => item.triage?.recommendation === "off_topic")
      .map((item) => createHash("sha1").update(`signal:${item.key}`).digest("hex").slice(0, 16)),
  );
  offTopicCache = { source: queue, ids };
  return ids;
}

/** Read per request: the discovery robot rewrites the file every day. */
export function getSignals() {
  const hidden = offTopicSignalIds();
  return readDataFile<Signal[]>("signals.json", []).filter((signal) => !hidden.has(signal.id));
}

export const signalCategoryLabels: Record<SignalCategory, string> = {
  regulatory: "Regulatory",
  research: "Research",
  trial: "Clinical trial",
  industry: "Industry",
};

export function getRecentSignals(limit?: number) {
  const sorted = [...getSignals()].sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  return limit ? sorted.slice(0, limit) : sorted;
}

export function getSignalsByCategory(category: SignalCategory | "all" = "all") {
  return category === "all" ? getRecentSignals() : getRecentSignals().filter(
    (signal) => signal.category === category,
  );
}
