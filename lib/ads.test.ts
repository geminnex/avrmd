import { describe, expect, it } from "vitest";
import { adCampaigns, getActiveAds, type AdCampaign } from "./ads";

const creative = {
  id: "creative-test",
  advertiser: "Example Health XR",
  headline: "Example headline",
  body: "Example body copy for a labelled placement.",
  href: "https://example.com/",
  rightsAttested: true,
};

const campaign: AdCampaign = {
  id: "campaign-test",
  advertiser: "Example Health XR",
  creative,
  slots: ["topic-aside"],
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "active",
};

const inWindow = new Date("2026-06-01T00:00:00Z");

function serve(overrides: Partial<AdCampaign>, context = {}, now = inWindow) {
  adCampaigns.push({ ...campaign, ...overrides });
  try {
    return getActiveAds("topic-aside", context, now);
  } finally {
    adCampaigns.length = 0;
  }
}

describe("ad placement", () => {
  it("ships with no booked campaigns", () => {
    expect(adCampaigns).toHaveLength(0);
    expect(getActiveAds("topic-aside")).toEqual([]);
  });

  it("serves an eligible campaign in its window", () => {
    expect(serve({})).toHaveLength(1);
  });

  it("never serves against an evidence record", () => {
    // Enforced centrally so a page author cannot place an ad on evidence.
    expect(serve({}, { entityKind: "evidence" })).toEqual([]);
  });

  it("respects status, rights attestation, slot, and dates", () => {
    expect(serve({ status: "paused" })).toEqual([]);
    expect(serve({ creative: { ...creative, rightsAttested: false } })).toEqual([]);
    expect(serve({ slots: ["event-announcement"] })).toEqual([]);
    expect(serve({}, {}, new Date("2027-01-01T00:00:00Z"))).toEqual([]);
  });

  it("honours contextual targeting without inferring anything about the visitor", () => {
    const targeted = { contextualTargets: { topicSlugs: ["pain-management"] } };
    expect(serve(targeted, { topicSlug: "pain-management" })).toHaveLength(1);
    expect(serve(targeted, { topicSlug: "rehabilitation" })).toEqual([]);
    expect(serve(targeted, {})).toEqual([]);
  });
});
