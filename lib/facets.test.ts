import { describe, expect, it } from "vitest";
import { catalog, modalities, specialties, useCases } from "./catalog";
import {
  facetKinds,
  facets,
  getFacet,
  getFacetEntities,
  getFacetEntitiesByKind,
  getFacetsForEntity,
} from "./facets";

describe("facets", () => {
  it("keeps slugs unique and well formed", () => {
    const slugs = facets.map((facet) => facet.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const facet of facets) {
      expect(facet.slug, facet.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(facet.definition.length, facet.slug).toBeGreaterThan(20);
      expect(facetKinds, facet.slug).toContain(facet.kind);
    }
  });

  it("covers every tag value the catalog actually uses", () => {
    // A tag with no facet is a dead end: it renders as a chip that links nowhere.
    const named = new Set(
      facets.flatMap((facet) => [facet.name, ...(facet.aliases ?? [])]),
    );
    for (const value of [...specialties, ...useCases, ...modalities]) {
      expect(named.has(value), `no facet for "${value}"`).toBe(true);
    }
  });

  it("resolves a facet to the records carrying it", () => {
    const painManagement = getFacet("pain-management");
    expect(painManagement).toBeDefined();
    const slugs = getFacetEntities(painManagement!).map((entity) => entity.slug);
    expect(slugs).toContain("relievrx");
    expect(slugs).toContain("appliedvr");
  });

  it("groups facet results by kind, omitting empty groups", () => {
    const facet = getFacet("skills-training");
    expect(facet).toBeDefined();
    const groups = getFacetEntitiesByKind(facet!);
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    expect(groups.flatMap((group) => group.items)).toHaveLength(
      getFacetEntities(facet!).length,
    );
  });

  it("gives every record at least one facet", () => {
    for (const entity of catalog) {
      expect(getFacetsForEntity(entity).length, entity.slug).toBeGreaterThan(0);
    }
  });
});
