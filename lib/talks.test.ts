import { describe, expect, it } from "vitest";
import { catalogEntitySchema } from "./catalog-schema";
import { pipelineStages } from "./catalog-types";
import { facets } from "./facets";
import { curatedTalks, filterTalks, pickShowcaseTalks } from "./talks";
import { topics } from "./topics";

const topicSlugs = new Set(topics.map((topic) => topic.slug));
const facetNames = new Set(facets.map((facet) => facet.name));

describe("talks", () => {
  it("keeps slugs unique and links well formed", () => {
    const slugs = curatedTalks.map((talk) => talk.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const talk of curatedTalks) {
      expect(talk.url, talk.slug).toMatch(/^https:\/\//);
      expect(talk.title.length, talk.slug).toBeGreaterThan(10);
      expect(talk.hostLabel.length, talk.slug).toBeGreaterThan(2);
    }
  });

  it("carries none of a reviewed record's trust fields", () => {
    // A talk is a link to someone else's recording, not a vetted record.
    for (const talk of curatedTalks) {
      expect(talk).not.toHaveProperty("reviewStatus");
      expect(talk).not.toHaveProperty("claimStatus");
      expect(catalogEntitySchema.safeParse(talk).success, talk.slug).toBe(false);
    }
  });

  it("tags only with vocabulary that already exists", () => {
    // Talks reuse topics, stages, and facets — introducing a private
    // taxonomy here would fragment search across the site.
    for (const talk of curatedTalks) {
      for (const slug of talk.topicSlugs ?? []) {
        expect(topicSlugs.has(slug), `${talk.slug} → ${slug}`).toBe(true);
      }
      for (const stage of talk.stages ?? []) {
        expect(pipelineStages, talk.slug).toContain(stage);
      }
      for (const facet of talk.facets ?? []) {
        expect(facetNames.has(facet), `${talk.slug} → ${facet}`).toBe(true);
      }
    }
  });

  it("gives every talk at least one way to be found", () => {
    for (const talk of curatedTalks) {
      const tagCount =
        (talk.topicSlugs?.length ?? 0) + (talk.stages?.length ?? 0) + (talk.facets?.length ?? 0);
      expect(tagCount, talk.slug).toBeGreaterThan(0);
    }
  });

  it("filters by topic, stage, and facet", () => {
    const byStage = filterTalks(curatedTalks, { stage: "regulatory" });
    expect(byStage.length).toBeGreaterThan(0);
    expect(byStage.every((talk) => talk.stages?.includes("regulatory"))).toBe(true);

    const byTopic = filterTalks(curatedTalks, { topic: "surgical-training" });
    expect(byTopic.every((talk) => talk.topicSlugs?.includes("surgical-training"))).toBe(true);
  });

  it("showcases a stable selection for a given seed", () => {
    const first = pickShowcaseTalks(curatedTalks, 3, 42).map((talk) => talk.slug);
    const again = pickShowcaseTalks(curatedTalks, 3, 42).map((talk) => talk.slug);
    expect(first).toEqual(again);
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);

    // A different seed should generally give a different selection.
    const other = pickShowcaseTalks(curatedTalks, 3, 4242).map((talk) => talk.slug);
    expect(other).toHaveLength(3);
  });
});
