import { catalog, getGear, getOwnerEntity } from "../catalog";
import type { CatalogEntity, EntityKind } from "../catalog-types";
import { getTopic, getTopicEntities, type Topic } from "../topics";
import { navIntents, vocabRules } from "./vocab";

export type AssistantLink = { label: string; href: string };

export type Interpretation = {
  query: string;
  navLead?: string;
  navLinks?: AssistantLink[];
  topicSlugs: string[];
  specialties: string[];
  useCases: string[];
  modalities: string[];
  kinds: EntityKind[];
  wantsGear: boolean;
  ownerOf?: CatalogEntity;
  /** 0–1. Below `weakConfidence` the API may ask a model to re-read the query. */
  confidence: number;
};

export type AssistantAnswer = {
  kind: "records" | "topic" | "nav" | "none";
  lead: string;
  entities: CatalogEntity[];
  topics: Topic[];
  links: AssistantLink[];
};

export const weakConfidence = 0.34;

/** Filters the model is allowed to return, drawn from the catalog itself. */
export type ModelFilters = {
  specialties?: string[];
  useCases?: string[];
  modalities?: string[];
  kinds?: EntityKind[];
};

function normalize(query: string) {
  return ` ${query.toLowerCase().replace(/[^\p{L}\p{N}()]+/gu, " ").trim()} `;
}

/**
 * Whole-word (or simple plural) containment. Substring matching would let
 * "ads" fire inside "headset" and "for" inside "Oxford".
 */
function containsPhrase(haystack: string, phrase: string) {
  const needle = phrase.trim();
  return haystack.includes(` ${needle} `) || haystack.includes(` ${needle}s `);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function findOwnerQuestion(query: string, haystack: string) {
  if (!/\b(who|which company)\b.*\b(makes|made|builds|built|owns|develops|developed|behind)\b/.test(query)) {
    return undefined;
  }
  return catalog.find((entity) => haystack.includes(entity.name.toLowerCase()));
}

export function interpret(query: string): Interpretation {
  const haystack = normalize(query);
  const lowered = query.toLowerCase();

  const result: Interpretation = {
    query: query.trim(),
    topicSlugs: [],
    specialties: [],
    useCases: [],
    modalities: [],
    kinds: [],
    wantsGear: false,
    confidence: 0,
  };

  if (!result.query) return result;

  const nav = navIntents.find((intent) =>
    intent.match.some((phrase) => containsPhrase(haystack, phrase)),
  );
  if (nav) {
    result.navLead = nav.lead;
    result.navLinks = nav.links;
    result.confidence = 1;
    return result;
  }

  const owner = findOwnerQuestion(lowered, haystack);
  if (owner) {
    result.ownerOf = owner;
    result.confidence = 1;
    return result;
  }

  for (const rule of vocabRules) {
    if (!rule.match.some((phrase) => containsPhrase(haystack, phrase))) continue;
    result.topicSlugs.push(...(rule.topics ?? []));
    result.specialties.push(...(rule.specialties ?? []));
    result.useCases.push(...(rule.useCases ?? []));
    result.modalities.push(...(rule.modalities ?? []));
    result.kinds.push(...(rule.kinds ?? []));
    result.wantsGear ||= Boolean(rule.gear);
  }

  result.topicSlugs = unique(result.topicSlugs);
  result.specialties = unique(result.specialties);
  result.useCases = unique(result.useCases);
  result.modalities = unique(result.modalities);
  result.kinds = unique(result.kinds);

  const signals =
    result.topicSlugs.length +
    result.specialties.length +
    result.useCases.length +
    result.kinds.length +
    (result.wantsGear ? 1 : 0);
  const nameHit = catalog.some((entity) => haystack.includes(entity.name.toLowerCase()));

  // A weak text-only match should stay below the threshold, so the API layer
  // still has the option of asking a model to re-read the query.
  const topScore = scoredEntities(result)[0]?.score ?? 0;

  if (nameHit) result.confidence = 1;
  else if (result.topicSlugs.length > 0) result.confidence = 0.9;
  else if (signals > 0) result.confidence = 0.6;
  else if (topScore >= 20) result.confidence = 0.45;
  else if (topScore > 0) result.confidence = 0.2;

  return result;
}

/** Applies model-suggested filters to an existing interpretation. */
export function withFilters(base: Interpretation, filters: ModelFilters): Interpretation {
  const merged: Interpretation = {
    ...base,
    specialties: unique([...base.specialties, ...(filters.specialties ?? [])]),
    useCases: unique([...base.useCases, ...(filters.useCases ?? [])]),
    modalities: unique([...base.modalities, ...(filters.modalities ?? [])]),
    kinds: unique([...base.kinds, ...(filters.kinds ?? [])]),
  };
  merged.confidence = scoreEntities(merged).length > 0 ? 0.6 : base.confidence;
  return merged;
}

function scoreEntity(entity: CatalogEntity, interpretation: Interpretation, tokens: string[]) {
  const name = entity.name.toLowerCase();
  let score = 0;

  if (interpretation.query && name === interpretation.query.toLowerCase()) score += 100;
  else if (interpretation.query.length > 2 && name.includes(interpretation.query.toLowerCase())) {
    score += 60;
  }

  const ownerTokens = entity.owner
    ? entity.owner.toLowerCase().split(/[^\p{L}\p{N}]+/u)
    : [];
  if (tokens.some((token) => token.length > 3 && ownerTokens.includes(token))) {
    score += 25;
  }
  for (const specialty of interpretation.specialties) {
    if (entity.specialties.includes(specialty)) score += 22;
  }
  for (const useCase of interpretation.useCases) {
    if (entity.useCases.includes(useCase)) score += 16;
  }
  for (const modality of interpretation.modalities) {
    if (entity.modalities.includes(modality)) score += 9;
  }
  if (interpretation.kinds.length > 0 && interpretation.kinds.includes(entity.kind)) score += 26;
  if (interpretation.wantsGear && entity.subtype === "hardware") score += 40;

  const text = [entity.name, entity.typeLabel, entity.summary, entity.stage]
    .join(" ")
    .toLowerCase();
  for (const token of tokens) {
    if (token.length > 3 && text.includes(token)) score += 4;
  }

  return score;
}

function scoredEntities(interpretation: Interpretation) {
  const tokens = interpretation.query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);

  return catalog
    .map((entity) => ({ entity, score: scoreEntity(entity, interpretation, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
}

function scoreEntities(interpretation: Interpretation) {
  return scoredEntities(interpretation).map((item) => item.entity);
}

function plural(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Builds an answer entirely out of records that already exist. Nothing here
 * writes new claims about medicine: the lead is a count, and every statement
 * the reader sees afterwards is a stored field with its own source link.
 */
export function answer(interpretation: Interpretation): AssistantAnswer {
  if (interpretation.navLead && interpretation.navLinks) {
    return {
      kind: "nav",
      lead: interpretation.navLead,
      entities: [],
      topics: [],
      links: interpretation.navLinks,
    };
  }

  if (interpretation.ownerOf) {
    const entity = interpretation.ownerOf;
    const owner = getOwnerEntity(entity);
    if (owner) {
      return {
        kind: "records",
        lead: `${entity.name} is listed under ${owner.name}.`,
        entities: [owner, entity],
        topics: [],
        links: [{ label: `Open ${owner.name}`, href: `/entities/${owner.slug}` }],
      };
    }
    return {
      kind: "records",
      lead: entity.owner
        ? `${entity.name} is listed as ${entity.owner}, which has no record of its own yet.`
        : `${entity.name} has no owner recorded.`,
      entities: [entity],
      topics: [],
      links: [],
    };
  }

  if (interpretation.wantsGear && interpretation.topicSlugs.length === 0) {
    const gear = getGear();
    return {
      kind: "records",
      lead: `${plural(gear.length, "headset")} tracked as general-purpose hardware. These are not medical devices.`,
      entities: gear,
      topics: [],
      links: [{ label: "All gear and hardware", href: "/gear" }],
    };
  }

  const topics = interpretation.topicSlugs
    .map((slug) => getTopic(slug))
    .filter((topic) => topic !== undefined);

  if (topics.length > 0) {
    const primary = topics[0];
    const entities = getTopicEntities(primary);
    return {
      kind: "topic",
      lead: `${primary.shortName} covers ${plural(entities.length, "record")} in the catalog.`,
      entities: entities.slice(0, 6),
      topics,
      links: [
        { label: `Open ${primary.shortName}`, href: `/topics/${primary.slug}` },
        { label: "Discussions in this topic", href: `/topics/${primary.slug}#discussions` },
      ],
    };
  }

  const matches = scoreEntities(interpretation);
  if (matches.length > 0) {
    return {
      kind: "records",
      lead: `${plural(matches.length, "record")} in the catalog match that.`,
      entities: matches.slice(0, 6),
      topics: [],
      links: [
        {
          label: "See all results in the directory",
          href: `/explore?q=${encodeURIComponent(interpretation.query)}`,
        },
      ],
    };
  }

  return {
    kind: "none",
    lead: "No record in the catalog covers that yet.",
    entities: [],
    topics: [],
    links: [
      { label: "Browse clinical topics", href: "/topics" },
      { label: "Suggest a missing record", href: "/participate" },
    ],
  };
}

export function ask(query: string): AssistantAnswer {
  return answer(interpret(query));
}
