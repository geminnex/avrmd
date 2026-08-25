import { pipelineStages, type PipelineStage } from "./catalog-types";
import { facets } from "./facets";
import { topics } from "./topics";

/**
 * What someone does, not what they are allowed to do — distinct from the
 * `memberRole` enum in the database schema, which is platform permission
 * (member / moderator / admin).
 *
 * The list is deliberately short. Its job is routing: when someone asks a
 * question, these are the buckets that decide whose attention is worth
 * spending. A longer list makes every bucket too small to route to.
 */
export const professionalRoles = [
  "clinician",
  "researcher",
  "engineer",
  "designer",
  "regulatory",
  "manufacturing",
  "business",
  "investor",
] as const;

export type ProfessionalRole = (typeof professionalRoles)[number];

export const professionalRoleLabels: Record<ProfessionalRole, string> = {
  clinician: "Clinician",
  researcher: "Researcher",
  engineer: "Engineer",
  designer: "Designer",
  regulatory: "Regulatory / quality",
  manufacturing: "Manufacturing",
  business: "Business / commercial",
  investor: "Investor",
};

/** Shown under each role on the directory so people pick the right one. */
export const professionalRoleHints: Record<ProfessionalRole, string> = {
  clinician: "Practises, teaches, or trains in a clinical setting",
  researcher: "Runs studies and publishes evidence",
  engineer: "Builds the software or the hardware",
  designer: "Designs the interaction, the content, or the study",
  regulatory: "Clearance, quality systems, and standards",
  manufacturing: "Making and shipping physical product",
  business: "Procurement, partnerships, reimbursement, go-to-market",
  investor: "Funds the work",
};

/**
 * The declarations a member can make. Every one is drawn from a vocabulary
 * the rest of the site already browses by, so a profile is reachable from
 * the same filters as a record.
 */
export type MemberProfile = {
  roles: ProfessionalRole[];
  /** Where in the pipeline this person works. */
  stages: PipelineStage[];
  /** Facet names — what they can answer for someone else. */
  canHelpWith: string[];
  /** Facet names — what they are stuck on themselves. */
  lookingFor: string[];
  /** Clinical topic slugs. */
  topicInterests: string[];
  /** A catalog organization slug, when they say where they work. */
  affiliationSlug: string | null;
};

export const emptyMemberProfile: MemberProfile = {
  roles: [],
  stages: [],
  canHelpWith: [],
  lookingFor: [],
  topicInterests: [],
  affiliationSlug: null,
};

const roleSet = new Set<string>(professionalRoles);
const stageSet = new Set<string>(pipelineStages);
const topicSet = new Set(topics.map((topic) => topic.slug));
const facetSet = new Set(facets.map((facet) => facet.name));

export function isProfessionalRole(value: string): value is ProfessionalRole {
  return roleSet.has(value);
}

export function isPipelineStage(value: string): value is PipelineStage {
  return stageSet.has(value);
}

export function isTopicSlug(value: string) {
  return topicSet.has(value);
}

export function isFacetName(value: string) {
  return facetSet.has(value);
}

/**
 * A member is listed in the directory once they have said something about
 * themselves — declaring a role or a stage is the opt-in. An account that
 * has only ever signed in stays out of it.
 */
export function isDirectoryListable(profile: MemberProfile) {
  return profile.roles.length > 0 || profile.stages.length > 0;
}

/**
 * How well a member answers a directory query. Used for ordering, so the
 * people who match on more than one axis come first.
 */
export function profileMatchScore(
  profile: MemberProfile,
  query: { role?: string; stage?: string; helpWith?: string; topic?: string },
) {
  let score = 0;
  if (query.role && profile.roles.includes(query.role as ProfessionalRole)) score += 1;
  if (query.stage && profile.stages.includes(query.stage as PipelineStage)) score += 1;
  if (query.helpWith && profile.canHelpWith.includes(query.helpWith)) score += 2;
  if (query.topic && profile.topicInterests.includes(query.topic)) score += 1;
  return score;
}

export function matchesDirectoryQuery(
  profile: MemberProfile,
  query: { role?: string; stage?: string; helpWith?: string; topic?: string },
) {
  if (query.role && !profile.roles.includes(query.role as ProfessionalRole)) return false;
  if (query.stage && !profile.stages.includes(query.stage as PipelineStage)) return false;
  if (query.helpWith && !profile.canHelpWith.includes(query.helpWith)) return false;
  if (query.topic && !profile.topicInterests.includes(query.topic)) return false;
  return true;
}
