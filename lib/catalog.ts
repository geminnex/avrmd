import catalogData from "../data/catalog.json";
import type { CatalogEntity, EntityKind } from "./catalog-types";

export const catalog = catalogData as CatalogEntity[];

/**
 * Gear is a solution subtype, not a seventh entity kind, so it travels through
 * the same filters as a pseudo-kind.
 */
export type CatalogFilterKind = EntityKind | "all" | "gear";

export const kindLabels: Record<EntityKind, string> = {
  problem: "Problems",
  organization: "Organizations",
  solution: "Solutions",
  evidence: "Evidence",
  event: "Events",
  project: "Projects",
  group: "Groups",
};

export const filterKindLabels: Record<CatalogFilterKind, string> = {
  all: "All record types",
  ...kindLabels,
  gear: "Gear & hardware",
};

export const modalities = Array.from(
  new Set(catalog.flatMap((entity) => entity.modalities)),
).sort();

export const specialties = Array.from(
  new Set(catalog.flatMap((entity) => entity.specialties)),
).sort();

export const useCases = Array.from(
  new Set(catalog.flatMap((entity) => entity.useCases)),
).sort();

export function getEntity(slug: string) {
  return catalog.find((entity) => entity.slug === slug);
}

export function getGear() {
  return catalog.filter((entity) => entity.subtype === "hardware");
}

export function getProblems() {
  return catalog.filter((entity) => entity.kind === "problem");
}

export function getProblemsForTopic(topicSlug: string) {
  return catalog.filter(
    (entity) => entity.kind === "problem" && entity.topicSlug === topicSlug,
  );
}

export function getOwnerEntity(entity: CatalogEntity) {
  if (!entity.owner) return undefined;
  return catalog.find(
    (item) => item.kind === "organization" && item.name === entity.owner,
  );
}

export function getRelatedEntities(entity: CatalogEntity) {
  return entity.relatedSlugs
    .map((slug) => getEntity(slug))
    .filter((item): item is CatalogEntity => Boolean(item));
}

const relatedKindOrder: EntityKind[] = [
  "evidence",
  "solution",
  "organization",
  "project",
  "event",
  "group",
];

export function getRelatedEntitiesByKind(entity: CatalogEntity) {
  const related = getRelatedEntities(entity);
  return relatedKindOrder
    .map((kind) => ({ kind, items: related.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length > 0);
}

function matchesKind(entity: CatalogEntity, kind: CatalogFilterKind) {
  if (kind === "all") return true;
  if (kind === "gear") return entity.subtype === "hardware";
  return entity.kind === kind;
}

export function searchCatalog(
  query: string,
  kind: CatalogFilterKind = "all",
  modality = "all",
  specialty = "all",
) {
  const normalized = query.trim().toLowerCase();

  return catalog.filter((entity) => {
    const modalityMatch = modality === "all" || entity.modalities.includes(modality);
    const specialtyMatch = specialty === "all" || entity.specialties.includes(specialty);
    const searchable = [
      entity.name,
      entity.typeLabel,
      entity.summary,
      entity.owner ?? "",
      ...entity.modalities,
      ...entity.specialties,
      ...entity.useCases,
      normalized === "mx" ? "mixed reality mr" : "",
    ]
      .join(" ")
      .toLowerCase();

    return (
      matchesKind(entity, kind) &&
      modalityMatch &&
      specialtyMatch &&
      (!normalized || searchable.includes(normalized))
    );
  });
}
