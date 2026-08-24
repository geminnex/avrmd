import { describe, expect, it } from "vitest";
import { catalog } from "../catalog";
import { answer, ask, interpret, weakConfidence, withFilters } from "./engine";

const catalogSlugs = new Set(catalog.map((entity) => entity.slug));

describe("assistant engine", () => {
  it("routes a clinical need to its topic", () => {
    const result = ask("vr for back pain");
    expect(result.kind).toBe("topic");
    expect(result.topics.map((topic) => topic.slug)).toContain("pain-management");
    expect(result.entities.map((entity) => entity.slug)).toContain("relievrx");
  });

  it("keeps overlapping surgical topics apart", () => {
    // A bare "surgical" token would drag planning queries into training.
    expect(interpret("surgical planning software").topicSlugs).toEqual(["surgical-planning"]);
    expect(interpret("training for surgical residents").topicSlugs).toEqual(["surgical-training"]);
  });

  it("keeps the MX alias working", () => {
    const result = interpret("mx visualisation");
    expect(result.modalities).toContain("MR");
  });

  it("answers ownership questions from the catalog", () => {
    const result = ask("who makes RelieVRx");
    expect(result.entities[0]?.slug).toBe("appliedvr");
    expect(result.lead).toContain("AppliedVR");
  });

  it("treats hardware questions as gear", () => {
    const result = ask("which headset should we buy");
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities.every((entity) => entity.subtype === "hardware")).toBe(true);
    // The disclaimer must survive into the answer itself.
    expect(result.lead).toMatch(/not medical devices/i);
  });

  it("handles questions about the site without inventing records", () => {
    const result = ask("how do I claim my company page");
    expect(result.kind).toBe("nav");
    expect(result.entities).toEqual([]);
    expect(result.links.some((link) => link.href.startsWith("/for-organizations"))).toBe(true);
  });

  it("admits when nothing matches", () => {
    const result = ask("qwertyuiop zxcvbnm");
    expect(result.kind).toBe("none");
    expect(result.entities).toEqual([]);
    expect(result.lead).toMatch(/no record/i);
  });

  it("never returns anything outside the catalog", () => {
    const queries = [
      "surgical training",
      "evidence for pain",
      "conferences in europe",
      "stroke rehabilitation",
      "apple vision pro",
      "nursing simulation",
      "",
    ];
    for (const query of queries) {
      for (const entity of ask(query).entities) {
        expect(catalogSlugs.has(entity.slug), `${query} → ${entity.slug}`).toBe(true);
      }
    }
  });

  it("flags vague queries as weak so the model layer can help", () => {
    expect(interpret("something for my department").confidence).toBeLessThan(weakConfidence);
    expect(interpret("vr for back pain").confidence).toBeGreaterThan(weakConfidence);
  });

  it("applies model-supplied filters through the same local retrieval", () => {
    const vague = interpret("something that helps people walk again");
    const refined = withFilters(vague, { specialties: ["Rehabilitation"] });
    const result = answer(refined);

    // Asserts the behaviour (the filter narrows to rehabilitation records)
    // rather than one specific slug, which would break every time the
    // catalog grows and re-ranks.
    expect(result.entities.length).toBeGreaterThan(0);
    expect(
      result.entities.every((entity) => entity.specialties.includes("Rehabilitation")),
    ).toBe(true);
  });
});
