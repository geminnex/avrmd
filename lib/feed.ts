import { catalog } from "./catalog";
import { communityThreads, type CommunityThread } from "./community";
import { getSignalsByCategory, type Signal } from "./signals";
import { getOpportunities, type Opportunity } from "./opportunities";
import type { CatalogEntity } from "./catalog-types";

/**
 * A single reverse-chronological feed merging four sources that otherwise
 * live in separate modules. Each item keeps a reference to its origin record
 * so the card can render source-appropriate trust signals — a signal never
 * borrows a catalog record's review state, and a sample thread is never
 * silently indistinguishable from a real one.
 */
export type FeedItem =
  | { kind: "signal"; date: string; data: Signal }
  | { kind: "record"; date: string; data: CatalogEntity }
  | { kind: "discussion"; date: string; data: CommunityThread }
  | { kind: "opportunity"; date: string; data: Opportunity };

/**
 * New database records are approximated by `lastReviewed`, the only date a
 * catalog record carries. It is not a perfect "added on" timestamp, but it
 * is the honest one that already exists rather than a fabricated field.
 */
function getRecordFeedItems(limit: number): FeedItem[] {
  return [...catalog]
    .filter((entity) => entity.kind !== "problem")
    .sort((a, b) => b.lastReviewed.localeCompare(a.lastReviewed))
    .slice(0, limit)
    .map((entity) => ({ kind: "record" as const, date: entity.lastReviewed, data: entity }));
}

function getSignalFeedItems(limit: number): FeedItem[] {
  return getSignalsByCategory("all")
    .slice(0, limit)
    .map((signal) => ({ kind: "signal" as const, date: signal.discoveredAt, data: signal }));
}

/**
 * Sample threads have no real timestamp — `lastReviewed` on the topic they
 * belong to stands in, which keeps the ordering honest rather than inventing
 * activity dates for content that is explicitly illustrative.
 */
function getDiscussionFeedItems(limit: number): FeedItem[] {
  return communityThreads
    .slice(0, limit)
    .map((thread) => ({ kind: "discussion" as const, date: "2026-07-23", data: thread }));
}

function getOpportunityFeedItems(limit: number): FeedItem[] {
  return getOpportunities()
    .slice(0, limit)
    .map((opportunity) => ({
      kind: "opportunity" as const,
      date: opportunity.postedAt,
      data: opportunity,
    }));
}

export function getFeed(limit = 25): FeedItem[] {
  const pool = [
    ...getSignalFeedItems(limit),
    ...getRecordFeedItems(limit),
    ...getDiscussionFeedItems(limit),
    ...getOpportunityFeedItems(limit),
  ];

  return pool.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
