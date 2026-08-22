import opportunityData from "../data/opportunities.json";

/**
 * RFPs, RFQs, collaboration requests, and job postings. Ships empty — an
 * empty board reads as an abandoned site, so every surface that lists these
 * must check `.length` and render nothing rather than a hollow section.
 */
export const opportunityKinds = ["rfp", "rfq", "collaboration", "job"] as const;

export type OpportunityKind = (typeof opportunityKinds)[number];

export type Opportunity = {
  slug: string;
  kind: OpportunityKind;
  title: string;
  organisation: string;
  summary: string;
  url?: string;
  postedAt: string;
  closesAt?: string;
  location?: string;
  /** Reserved for a future paid-listing tier, mirroring lib/ads.ts. */
  featured?: boolean;
};

export const opportunities = opportunityData as Opportunity[];

export const opportunityKindLabels: Record<OpportunityKind, string> = {
  rfp: "RFP",
  rfq: "RFQ",
  collaboration: "Collaboration",
  job: "Job",
};

export function getOpportunities() {
  return [...opportunities].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export function getOpenOpportunities(now: Date = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return getOpportunities().filter((item) => !item.closesAt || item.closesAt >= today);
}
