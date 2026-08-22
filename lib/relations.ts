import relationData from "../data/relations.json";
import { catalog, getEntity } from "./catalog";
import type { CatalogEntity } from "./catalog-types";

/**
 * Typed, directional edges — the part of the graph a tag cannot express.
 * A tag answers "what else shares this?"; a relation answers "how is A
 * connected to B?", so it needs a verb.
 *
 * `developed-by` is deliberately absent: it is already derivable from a
 * record's `owner` field via getOwnerEntity.
 */
export const relationTypes = [
  "addresses",
  "evidence-for",
  "runs-on",
  "comparable-to",
  "partner-of",
] as const;

export type RelationType = (typeof relationTypes)[number];

export type Relation = {
  from: string;
  to: string;
  type: RelationType;
};

type RelationLabels = {
  /** Reading the edge from the `from` side. */
  forward: string;
  /** Reading the same edge from the `to` side. */
  inverse: string;
  symmetric?: boolean;
};

export const relationLabels: Record<RelationType, RelationLabels> = {
  addresses: { forward: "Addresses", inverse: "Addressed by" },
  "evidence-for": { forward: "Evidence for", inverse: "Evidence" },
  "runs-on": { forward: "Runs on", inverse: "Runs" },
  "comparable-to": { forward: "Comparable to", inverse: "Comparable to", symmetric: true },
  "partner-of": { forward: "Partner of", inverse: "Partner of", symmetric: true },
};

export const relations = relationData as Relation[];

export type ResolvedRelationGroup = {
  type: RelationType;
  label: string;
  items: CatalogEntity[];
};

/**
 * Both directions in one call: an edge authored once as
 * `solution --addresses--> problem` shows as "Addresses" on the solution and
 * "Addressed by" on the problem, so no inverse edge is ever authored.
 */
export function getRelationGroups(slug: string): ResolvedRelationGroup[] {
  const groups = new Map<string, { type: RelationType; label: string; items: CatalogEntity[] }>();

  const add = (type: RelationType, label: string, target: string) => {
    const entity = getEntity(target);
    if (!entity) return;
    const key = `${type}:${label}`;
    const group = groups.get(key) ?? { type, label, items: [] };
    if (!group.items.some((item) => item.slug === entity.slug)) group.items.push(entity);
    groups.set(key, group);
  };

  for (const relation of relations) {
    const labels = relationLabels[relation.type];
    if (relation.from === slug) add(relation.type, labels.forward, relation.to);
    if (relation.to === slug) add(relation.type, labels.inverse, relation.from);
  }

  return [...groups.values()].filter((group) => group.items.length > 0);
}

export function getRelated(slug: string, type: RelationType, direction: "from" | "to" = "from") {
  return relations
    .filter((relation) => relation.type === type && relation[direction] === slug)
    .map((relation) => getEntity(direction === "from" ? relation.to : relation.from))
    .filter((entity) => entity !== undefined);
}

/** Solutions and projects that address a given problem. */
export function getSolutionsForProblem(problemSlug: string) {
  return getRelated(problemSlug, "addresses", "to");
}

/** Problems a given solution or project addresses. */
export function getProblemsForEntity(slug: string) {
  return getRelated(slug, "addresses", "from");
}

/** Organisations visible on a problem, via the solutions that address it. */
export function getOrganizationsForProblem(problemSlug: string) {
  const owners = getSolutionsForProblem(problemSlug)
    .map((solution) => solution.owner)
    .filter((owner): owner is string => Boolean(owner));

  return catalog.filter(
    (entity) => entity.kind === "organization" && owners.includes(entity.name),
  );
}
