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
};

