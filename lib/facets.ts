import facetData from "../data/facets.json";
import { catalog } from "./catalog";
import type { CatalogEntity, EntityKind } from "./catalog-types";

/**
 * A facet is a tag with a page: it answers "what else shares this?" without
 * needing a description, provenance, or a review state of its own. Anything
 * that needs to be described and discussed is an entity instead.
 */
export const facetKinds = ["technology", "method", "specialty", "modality"] as const;

export type FacetKind = (typeof facetKinds)[number];

export type Facet = {
  slug: string;
  name: string;
  kind: FacetKind;
  definition: string;
  /** Extra strings on a record that also mean this facet. */
  aliases?: string[];
};

export const facets = facetData as Facet[];

export const facetKindLabels: Record<FacetKind, string> = {
  technology: "Technology",
  method: "Method",
  specialty: "Clinical specialty",
  modality: "Modality",
};

export function getFacet(slug: string) {
  return facets.find((facet) => facet.slug === slug);
}

/** Every tag value a record carries, across all three vocabularies. */
function tagValues(entity: CatalogEntity) {
  return [...entity.specialties, ...entity.useCases, ...entity.modalities];
}

export function facetMatches(facet: Facet, entity: CatalogEntity) {
  const values = tagValues(entity).map((value) => value.toLowerCase());
  const names = [facet.name, ...(facet.aliases ?? [])].map((value) => value.toLowerCase());
  return names.some((name) => values.includes(name));
}

export function getFacetEntities(facet: Facet) {
  return catalog.filter((entity) => facetMatches(facet, entity));
}

const facetKindOrder: EntityKind[] = [
  "problem",
  "solution",
  "organization",
  "evidence",
  "project",
  "event",
  "group",
];

export function getFacetEntitiesByKind(facet: Facet) {
  const entities = getFacetEntities(facet);
  return facetKindOrder
    .map((kind) => ({ kind, items: entities.filter((entity) => entity.kind === kind) }))
    .filter((group) => group.items.length > 0);
}

/** The facets a record carries, for chip rows on entity and problem pages. */
export function getFacetsForEntity(entity: CatalogEntity) {
  return facets.filter((facet) => facetMatches(facet, entity));
}

export function getFacetsByKind(kind: FacetKind) {
  return facets.filter((facet) => facet.kind === kind);
}

/** Facets carrying at least one record — the only ones worth linking. */
export function getPopulatedFacets() {
  return facets
    .map((facet) => ({ facet, count: getFacetEntities(facet).length }))
    .filter((item) => item.count > 0);
}
