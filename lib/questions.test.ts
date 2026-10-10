import { describe, expect, it } from "vitest";
import { facets } from "./facets";
import { emptyMemberProfile, type MemberProfile } from "./member-profile";
import {
  filterQuestions,
  findUnknownQuestionTag,
  maxRoutedPerQuestion,
  routeQuestion,
  suggestHelpers,
  type HelperCandidate,
  type QuestionTags,
} from "./questions";
import { topics } from "./topics";

const [facetA, facetB] = facets.map((facet) => facet.name);
const topic = topics[0].slug;

function candidate(userId: string, overrides: Partial<MemberProfile> = {}): HelperCandidate {
  return { userId, profile: { ...emptyMemberProfile, ...overrides } };
}

function tags(overrides: Partial<QuestionTags> = {}): QuestionTags {
  return { topicSlugs: [], stages: [], facets: [], ...overrides };
}

describe("question tags", () => {
  it("accepts only the site's vocabularies", () => {
    expect(findUnknownQuestionTag(tags({ topicSlugs: [topic], stages: ["design"], facets: [facetA] }))).toBeNull();
    expect(findUnknownQuestionTag(tags({ topicSlugs: ["astrology"] }))).toMatch(/clinical area/);
    expect(findUnknownQuestionTag(tags({ stages: ["vibes"] }))).toMatch(/stage/);
    expect(findUnknownQuestionTag(tags({ facets: ["Telepathy"] }))).toMatch(/tag/);
  });
});

describe("routeQuestion", () => {
  const question = tags({ facets: [facetA], stages: ["design"], topicSlugs: [topic] });

  it("notifies only members who offered help with a question tag", () => {
    const routed = routeQuestion(
      question,
      [
        candidate("helper", { canHelpWith: [facetA] }),
        // Same stage and interest, but never offered to help: not asked.
        candidate("bystander", { stages: ["design"], topicInterests: [topic] }),
        // Stuck on it themselves — lookingFor is not an offer.
        candidate("also-stuck", { lookingFor: [facetA] }),
      ],
      { authorId: "asker" },
    );
    expect(routed.map((match) => match.userId)).toEqual(["helper"]);
    expect(routed[0].helpMatches).toEqual([facetA]);
  });

  it("never notifies the asker", () => {
    const routed = routeQuestion(question, [candidate("asker", { canHelpWith: [facetA] })], {
      authorId: "asker",
    });
    expect(routed).toEqual([]);
  });

  it("skips members already at their daily limit", () => {
    const routed = routeQuestion(question, [candidate("busy", { canHelpWith: [facetA] })], {
      authorId: "asker",
      saturated: new Set(["busy"]),
    });
    expect(routed).toEqual([]);
  });

  it("ranks by overlap and caps the fan-out", () => {
    const many = Array.from({ length: maxRoutedPerQuestion + 4 }, (_, index) =>
      candidate(`m${String(index).padStart(2, "0")}`, { canHelpWith: [facetA] }),
    );
    const best = candidate("best", { canHelpWith: [facetA], stages: ["design"], topicInterests: [topic] });
    const routed = routeQuestion(question, [...many, best], { authorId: "asker" });
    expect(routed).toHaveLength(maxRoutedPerQuestion);
    expect(routed[0].userId).toBe("best");
  });
});

describe("suggestHelpers", () => {
  it("also shows people at the same stage, after the people who offered help", () => {
    const suggested = suggestHelpers(
      tags({ facets: [facetA], stages: ["design"] }),
      [
        candidate("same-stage", { stages: ["design"] }),
        candidate("helper", { canHelpWith: [facetA] }),
        candidate("unrelated", { stages: ["manufacturing"] }),
      ],
      { excludeIds: [] },
    );
    expect(suggested.map((match) => match.userId)).toEqual(["helper", "same-stage"]);
  });
});

describe("filterQuestions", () => {
  const pool = [
    { id: "a", ...tags({ facets: [facetA] }), acceptedAnswerId: null, answerCount: 0 },
    { id: "b", ...tags({ facets: [facetB], stages: ["design"] }), acceptedAnswerId: null, answerCount: 2 },
  ];

  it("filters by tag, unanswered, and what the viewer can help with", () => {
    expect(filterQuestions(pool, { stage: "design" }).map((q) => q.id)).toEqual(["b"]);
    expect(filterQuestions(pool, { unanswered: true }).map((q) => q.id)).toEqual(["a"]);
    expect(filterQuestions(pool, { helpWith: [facetB] }).map((q) => q.id)).toEqual(["b"]);
    expect(filterQuestions(pool, { helpWith: [] })).toEqual([]);
  });
});
