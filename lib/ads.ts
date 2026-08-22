import type { EntityKind } from "./catalog-types";

/**
 * File-based mirror of the campaigns/creatives/delivery tables in
 * lib/db/schema.ts. Adding a campaign today means adding a typed entry below;
 * the shape is deliberately the one the database will take.
 */
export const adSlots = [
  "directory-inline",
  "topic-aside",
  "entity-contextual",
  "event-announcement",
] as const;

export type AdSlot = (typeof adSlots)[number];

export type AdCreative = {
  id: string;
  advertiser: string;
  headline: string;
  body: string;
  href: string;
  /** Advertiser attested they hold rights to the creative. Required to serve. */
  rightsAttested: boolean;
};

export type AdCampaign = {
  id: string;
  advertiser: string;
  creative: AdCreative;
  slots: AdSlot[];
  /** Inclusive ISO dates. */
  startDate: string;
  endDate: string;
  status: "draft" | "approved" | "active" | "paused" | "completed";
  /** Contextual only — never behavioural, never health-inferred. */
  contextualTargets?: {
    topicSlugs?: string[];
    kinds?: EntityKind[];
  };
};

export type AdContext = {
  topicSlug?: string;
  entityKind?: EntityKind;
};

/** No campaigns are booked yet. Slots render the house placeholder instead. */
export const adCampaigns: AdCampaign[] = [];

function withinWindow(campaign: AdCampaign, now: Date) {
  const day = now.toISOString().slice(0, 10);
  return campaign.startDate <= day && day <= campaign.endDate;
}

function matchesContext(campaign: AdCampaign, context: AdContext) {
  const targets = campaign.contextualTargets;
  if (!targets) return true;
  if (targets.topicSlugs && (!context.topicSlug || !targets.topicSlugs.includes(context.topicSlug))) {
    return false;
  }
  if (targets.kinds && (!context.entityKind || !targets.kinds.includes(context.entityKind))) {
    return false;
  }
  return true;
}

/**
 * Deterministic selection: eligibility only, never personalisation, and never
 * a reordering of organic results. Evidence records carry no advertising at
 * all, which is enforced here rather than left to each page.
 */
export function getActiveAds(
  slot: AdSlot,
  context: AdContext = {},
  now: Date = new Date(),
) {
  if (context.entityKind === "evidence") return [];

  return adCampaigns.filter(
    (campaign) =>
      campaign.status === "active" &&
      campaign.creative.rightsAttested &&
      campaign.slots.includes(slot) &&
      withinWindow(campaign, now) &&
      matchesContext(campaign, context),
  );
}
