import { describe, expect, it } from "vitest";
import { catalog, getEntity, getGear, getOwnerEntity, searchCatalog } from "./catalog";
import { catalogSchema } from "./catalog-schema";
import { pipelineStages } from "./catalog-types";

describe("catalog", () => {
  it("validates the data file against the record schema", () => {
    const result = catalogSchema.safeParse(catalog);
    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.path.join(".")),
    ).toEqual([]);
  });

  it("keeps canonical slugs unique", () => {
    const slugs = catalog.map((entity) => entity.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("requires provenance for every public record", () => {
    for (const entity of catalog) {
      expect(entity.sourceUrl).toMatch(/^https:\/\//);
      expect(entity.sourceLabel.length).toBeGreaterThan(2);
      expect(entity.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("resolves every related slug", () => {
    for (const entity of catalog) {
      for (const slug of entity.relatedSlugs) {
        expect(getEntity(slug), `${entity.slug} → ${slug}`).toBeDefined();
      }
    }
  });

  it("searches specialties and respects facets", () => {
    expect(searchCatalog("pain").some((entity) => entity.slug === "relievrx")).toBe(true);
    expect(searchCatalog("", "solution", "AR").every((entity) => entity.kind === "solution")).toBe(
      true,
    );
  });

  it("filters gear as a solution subtype", () => {
    const gear = getGear();
    expect(gear.length).toBeGreaterThan(0);
    for (const item of gear) {
      expect(item.kind, item.slug).toBe("solution");
      // General-purpose hardware must never imply medical clearance.
      expect(item.regulatoryNote, item.slug).toMatch(/not a medical device/i);
    }
    expect(searchCatalog("", "gear").map((item) => item.slug).sort()).toEqual(
      gear.map((item) => item.slug).sort(),
    );
  });

  it("never uses the umbrella term as a modality", () => {
    // XR covers VR, AR, and MR; tagging a record "XR" says nothing a filter
    // can act on.
    for (const entity of catalog) {
      expect(entity.modalities, entity.slug).not.toContain("XR");
    }
  });

  it("only sets operatingStatus on records known to no longer operate independently", () => {
    for (const entity of catalog) {
      if (entity.operatingStatus) {
        expect(["acquired", "discontinued"], entity.slug).toContain(entity.operatingStatus);
      }
    }
  });

  it("places every record on the pipeline", () => {
    // Stages are a browse dimension, so a record without one is invisible
    // on that axis. No exceptions.
    for (const entity of catalog) {
      expect(entity.stages, entity.slug).toBeDefined();
      expect(entity.stages!.length, entity.slug).toBeGreaterThan(0);
      for (const stage of entity.stages!) {
        expect(pipelineStages, entity.slug).toContain(stage);
      }
    }
  });

  it("explains why a record is marked acquired or discontinued", () => {
    // An operating-status badge is a claim about a real company; the source
    // note has to say what it is based on.
    for (const entity of catalog) {
      if (!entity.operatingStatus) continue;
      expect(entity.sourceNote.length, entity.slug).toBeGreaterThan(40);
      expect(entity.claimStatus, entity.slug).toBe("not-claimable");
    }
  });

  it("resolves owners to organization records", () => {
    expect(getOwnerEntity(getEntity("relievrx")!)?.slug).toBe("appliedvr");
  });

  it("resolves related records", () => {
    expect(getEntity("relievrx")?.relatedSlugs).toContain("appliedvr");
  });
});
