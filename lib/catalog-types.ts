export const entityKinds = [
  "problem",
  "organization",
  "solution",
  "evidence",
  "event",
  "project",
  "group",
] as const;

/** Solution subtypes, per the product spec's "software, hardware or gear, device, service". */
export const solutionSubtypes = ["software", "hardware", "service", "platform"] as const;

export type SolutionSubtype = (typeof solutionSubtypes)[number];

export type EntityKind = (typeof entityKinds)[number];

export type ReviewStatus = "source-reviewed" | "metadata-reviewed" | "needs-review";
export type ClaimStatus = "claimed" | "unclaimed" | "not-claimable";

/** Absent means active — the common case, so existing records need no edits. */
export const operatingStatuses = ["acquired", "discontinued"] as const;
export type OperatingStatus = (typeof operatingStatuses)[number];

/**
 * The path from clinical idea to reaching patients. A second axis alongside
 * clinical topics: topics answer "which medical problem?", stages answer
 * "which part of the journey am I stuck on?". Defined in lib/stages.ts.
 */
export const pipelineStages = [
  "research",
  "technology",
  "design",
  "implementation",
  "validation",
  "regulatory",
  "manufacturing",
  "commercialization",
] as const;

export type PipelineStage = (typeof pipelineStages)[number];

export type CatalogEntity = {
  id: string;
  slug: string;
  name: string;
  kind: EntityKind;
  typeLabel: string;
  owner?: string;
  summary: string;
  modalities: string[];
  specialties: string[];
  useCases: string[];
  geography: string;
  stage: string;
  reviewStatus: ReviewStatus;
  claimStatus: ClaimStatus;
  aiAssisted: boolean;
  lastReviewed: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceNote: string;
  accent: "teal" | "blue" | "violet" | "coral" | "gold";
  featured?: boolean;
  regulatoryNote?: string;
  eventDate?: string;
  relatedSlugs: string[];
  /** Solutions only. `hardware` is the gear layer: headsets software runs on. */
  subtype?: SolutionSubtype;
  /** Problems only. The clinical topic this problem belongs to. */
  topicSlug?: string;
  /** Absent = active. Set only when a record is known to no longer operate independently. */
  operatingStatus?: OperatingStatus;
  /** Where this sits on the path from idea to patient. Many records span several. */
  stages?: PipelineStage[];
};

