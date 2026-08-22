import { describe, expect, it } from "vitest";
import { catalog, getEntity, specialties, useCases } from "./catalog";
import {
  getTopic,
  getTopicEntities,
  getTopicEntitiesByKind,
  getTopicsForEntity,
  topics,
} from "./topics";

/** Records intentionally outside every clinical topic. */
const uncoveredByDesign = new Set([
  "united-xr-europe-2026",
  ...catalog.filter((entity) => entity.subtype === "hardware").map((entity) => entity.slug),
]);

describe("topics", () => {
  it("keeps slugs unique", () => {
    const slugs = topics.map((topic) => topic.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("selects only vocabulary the catalog actually uses", () => {
    // Guards against silent drift: editing a record's specialty must not
    // quietly empty a hub.
    for (const topic of topics) {
      for (const specialty of topic.specialties) {
        expect(specialties, `${topic.slug} specialty`).toContain(specialty);
      }
      for (const useCase of topic.useCases) {
        expect(useCases, `${topic.slug} use case`).toContain(useCase);
      }
    }
  });

  it("gives every topic something to show", () => {
    for (const topic of topics) {
      const entities = getTopicEntities(topic);
      expect(entities.length, topic.slug).toBeGreaterThan(0);
      expect(
        entities.some((entity) => entity.kind === "solution" || entity.kind === "organization"),
        `${topic.slug} needs a solution or organization`,
      ).toBe(true);
    }
  });

  it("covers every clinical record", () => {
    const uncovered = catalog
      .filter((entity) => getTopicsForEntity(entity).length === 0)
      .map((entity) => entity.slug)
      .filter((slug) => !uncoveredByDesign.has(slug));
    expect(uncovered).toEqual([]);
  });

  it("places every problem in the topic hub it declares", () => {
    for (const problem of catalog.filter((entity) => entity.kind === "problem")) {
      expect(problem.topicSlug, problem.slug).toBeDefined();
      expect(getTopic(problem.topicSlug!), problem.slug).toBeDefined();
    }
  });

  it("places records in the expected hubs", () => {
    const relievrx = getEntity("relievrx");
    expect(relievrx).toBeDefined();
    expect(getTopicsForEntity(relievrx!).map((topic) => topic.slug)).toContain(
      "pain-management",
    );

    const painHub = getTopic("pain-management");
    expect(painHub).toBeDefined();
    const painSlugs = getTopicEntities(painHub!).map((entity) => entity.slug);
    expect(painSlugs).toContain("relievrx-k243417");
    expect(painSlugs).toContain("appliedvr");
  });

  it("groups by kind and omits empty groups", () => {
    for (const topic of topics) {
      const groups = getTopicEntitiesByKind(topic);
      expect(groups.every((group) => group.items.length > 0)).toBe(true);
      // Problems lead the page in their own section, so the supporting-record
      // groups deliberately exclude them here.
      const nonProblems = getTopicEntities(topic).filter((entity) => entity.kind !== "problem");
      expect(groups.flatMap((group) => group.items)).toHaveLength(nonProblems.length);
    }
  });
});
