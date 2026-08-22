import signalData from "../data/signals.json";

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

export const signals = signalData as Signal[];

export const signalCategoryLabels: Record<SignalCategory, string> = {
  regulatory: "Regulatory",
  research: "Research",
  trial: "Clinical trial",
  industry: "Industry",
};

export function getRecentSignals(limit?: number) {
  const sorted = [...signals].sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  return limit ? sorted.slice(0, limit) : sorted;
}

export function getSignalsByCategory(category: SignalCategory | "all" = "all") {
  return category === "all" ? getRecentSignals() : getRecentSignals().filter(
    (signal) => signal.category === category,
  );
}
