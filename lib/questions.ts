import { pipelineStages } from "./catalog-types";
import { facets } from "./facets";
import type { MemberProfile } from "./member-profile";
import { topics } from "./topics";

/**
 * A question is tagged with the same vocabularies as a talk or a profile:
 * clinical topics, pipeline stages, and facets. Those tags are what route it.
 */
export type QuestionTags = {
  topicSlugs: string[];
  stages: string[];
  facets: string[];
};

export const questionTagLimits = { topicSlugs: 3, stages: 3, facets: 5 } as const;

const topicSlugSet = new Set(topics.map((topic) => topic.slug));
const stageSet = new Set<string>(pipelineStages);
const facetNameSet = new Set(facets.map((facet) => facet.name));

/**
 * The first tag outside the site's vocabulary, as a message — or null.
 * A free-text tag would route to nobody and be unreachable from every filter.
 */
export function findUnknownQuestionTag(tags: QuestionTags) {
  const topic = tags.topicSlugs.find((slug) => !topicSlugSet.has(slug));
  if (topic) return `Unknown clinical area: ${topic}`;
  const stage = tags.stages.find((value) => !stageSet.has(value));
  if (stage) return `Unknown stage: ${stage}`;
  const facet = tags.facets.find((name) => !facetNameSet.has(name));
  if (facet) return `Unknown tag: ${facet}`;
  return null;
}

export function questionTagCount(tags: QuestionTags) {
  return tags.topicSlugs.length + tags.stages.length + tags.facets.length;
}

export type HelperMatch = {
  userId: string;
  /** Question facets this member said they can help with. */
  helpMatches: string[];
  stageMatches: string[];
  topicMatches: string[];
  score: number;
};

export type HelperCandidate = { userId: string; profile: MemberProfile };

export function matchHelper(candidate: HelperCandidate, tags: QuestionTags): HelperMatch {
  const helpMatches = tags.facets.filter((name) => candidate.profile.canHelpWith.includes(name));
  const stageMatches = tags.stages.filter((stage) =>
    (candidate.profile.stages as string[]).includes(stage),
  );
  const topicMatches = tags.topicSlugs.filter((slug) =>
    candidate.profile.topicInterests.includes(slug),
  );
  return {
    userId: candidate.userId,
    helpMatches,
    stageMatches,
    topicMatches,
    // An offer of help outweighs any coincidence of stage or interest.
    score: helpMatches.length * 3 + stageMatches.length + topicMatches.length,
  };
}

/** How many members one question may notify. */
export const maxRoutedPerQuestion = 8;
/** How many routed questions one member receives per day, at most. */
export const maxRoutedPerMemberPerDay = 5;

/**
 * Who gets told about a new question. Only members whose `canHelpWith`
 * overlaps the question's facets: saying "I can help with X" is the opt-in
 * to being asked about X. Working at the same stage or caring about the same
 * clinical area is not an invitation, so it only decides the order.
 *
 * `saturated` is the set of members already at their daily limit — a member
 * who is asked about everything stops reading any of it.
 */
export function routeQuestion(
  tags: QuestionTags,
  candidates: HelperCandidate[],
  options: { authorId: string; saturated?: Set<string>; limit?: number },
): HelperMatch[] {
  const limit = options.limit ?? maxRoutedPerQuestion;
  return candidates
    .filter((candidate) => candidate.userId !== options.authorId)
    .filter((candidate) => !options.saturated?.has(candidate.userId))
    .map((candidate) => matchHelper(candidate, tags))
    .filter((match) => match.helpMatches.length > 0)
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

/**
 * People worth pointing a reader at on the question page: anyone who offered
 * help with one of its tags first, then people working at the same stage.
 * Shown, never notified.
 */
export function suggestHelpers(
  tags: QuestionTags,
  candidates: HelperCandidate[],
  options: { excludeIds: string[]; limit?: number },
): HelperMatch[] {
  const exclude = new Set(options.excludeIds);
  return candidates
    .filter((candidate) => !exclude.has(candidate.userId))
    .map((candidate) => matchHelper(candidate, tags))
    .filter((match) => match.helpMatches.length > 0 || match.stageMatches.length > 0)
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .slice(0, options.limit ?? 6);
}

export type QuestionFilter = {
  topic?: string;
  stage?: string;
  facet?: string;
  unanswered?: boolean;
  /** Facets the viewer can help with: keep questions that ask about one. */
  helpWith?: string[];
};

export function filterQuestions<
  T extends QuestionTags & { acceptedAnswerId: string | null; answerCount: number },
>(pool: T[], filter: QuestionFilter): T[] {
  return pool.filter((question) => {
    if (filter.topic && !question.topicSlugs.includes(filter.topic)) return false;
    if (filter.stage && !question.stages.includes(filter.stage)) return false;
    if (filter.facet && !question.facets.includes(filter.facet)) return false;
    if (filter.unanswered && (question.acceptedAnswerId || question.answerCount > 0)) return false;
    if (filter.helpWith && !question.facets.some((name) => filter.helpWith!.includes(name)))
      return false;
    return true;
  });
}
