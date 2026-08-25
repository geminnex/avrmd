import talkData from "../data/talks.json";
import type { PipelineStage } from "./catalog-types";

/**
 * A talk is a link to a recorded presentation someone else hosts — the
 * conference's talk track. Like signals and related websites, it is an
 * external pointer, not a reviewed catalog record, and it never carries a
 * review state.
 *
 * Two origins, presented together but labelled distinctly:
 *   curated — collected by AVRMD, attributed to the series that hosts it
 *   member  — submitted by a signed-in member (stored in Postgres)
 */
export type TalkSource = "curated" | "member";

export type Talk = {
  slug: string;
  title: string;
  speakers: string[];
  url: string;
  /** Where the recording lives, e.g. "MedVR Online Talks". */
  hostLabel: string;
  source: TalkSource;
  /** Reuses the existing vocabulary — no new taxonomy. */
  topicSlugs?: string[];
  stages?: PipelineStage[];
  facets?: string[];
  submittedByHandle?: string;
};

export const curatedTalks = talkData as Talk[];

/**
 * The full track: member submissions first (newest arrivals), then the
 * curated back catalog. The curated track is a flat file and keeps rendering
 * even when Postgres is unreachable, so a database outage degrades this page
 * rather than breaking it.
 */
export async function getAllTalks(): Promise<Talk[]> {
  try {
    const { listMemberTalks } = await import("./db/repositories/talks");
    const rows = await listMemberTalks();
    const memberTalks: Talk[] = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      speakers: row.speakers,
      url: row.url,
      hostLabel: row.hostLabel,
      source: "member",
      topicSlugs: row.topicSlugs,
      stages: row.stages as PipelineStage[],
      facets: row.facets,
      submittedByHandle: row.submittedByHandle ?? undefined,
    }));
    return [...memberTalks, ...curatedTalks];
  } catch {
    return curatedTalks;
  }
}

export type TalkFilter = {
  topic?: string;
  stage?: string;
  facet?: string;
};

export function filterTalks(pool: Talk[], filter: TalkFilter = {}) {
  return pool.filter((talk) => {
    if (filter.topic && !talk.topicSlugs?.includes(filter.topic)) return false;
    if (filter.stage && !talk.stages?.includes(filter.stage as PipelineStage)) return false;
    if (filter.facet && !talk.facets?.includes(filter.facet)) return false;
    return true;
  });
}

/**
 * Deterministic per-seed shuffle so the homepage can show a different
 * selection on each visit without the order jumping around mid-render.
 */
export function pickShowcaseTalks(pool: Talk[], count: number, seed = Date.now()) {
  const shuffled = [...pool];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    state = (state * 16807) % 2147483647;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Every tag actually used by a talk, for building the filter controls. */
export function getTalkTagCounts(pool: Talk[]) {
  const topics = new Map<string, number>();
  const stages = new Map<string, number>();
  const facets = new Map<string, number>();

  const bump = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  for (const talk of pool) {
    talk.topicSlugs?.forEach((value) => bump(topics, value));
    talk.stages?.forEach((value) => bump(stages, value));
    talk.facets?.forEach((value) => bump(facets, value));
  }

  return { topics, stages, facets };
}
