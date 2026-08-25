import { describe, expect, it } from "vitest";
import { facets } from "./facets";
import {
  emptyMemberProfile,
  isDirectoryListable,
  isFacetName,
  isPipelineStage,
  isProfessionalRole,
  isTopicSlug,
  matchesDirectoryQuery,
  professionalRoleHints,
  professionalRoleLabels,
  professionalRoles,
  profileMatchScore,
  type MemberProfile,
} from "./member-profile";
import { topics } from "./topics";

function profile(overrides: Partial<MemberProfile> = {}): MemberProfile {
  return { ...emptyMemberProfile, ...overrides };
}

describe("member profile vocabulary", () => {
  it("labels and hints every role", () => {
    // A role without a label renders as a raw slug; without a hint, people
    // pick the wrong one.
    for (const role of professionalRoles) {
      expect(professionalRoleLabels[role], role).toBeTruthy();
      expect(professionalRoleHints[role], role).toBeTruthy();
    }
  });

  it("accepts only values the rest of the site browses by", () => {
    expect(isProfessionalRole("clinician")).toBe(true);
    expect(isProfessionalRole("wizard")).toBe(false);

    expect(isPipelineStage("regulatory")).toBe(true);
    expect(isPipelineStage("vibes")).toBe(false);

    expect(isTopicSlug(topics[0].slug)).toBe(true);
    expect(isTopicSlug("not-a-topic")).toBe(false);

    // Declarations store the facet's display name, which is what the picker
    // sends and what the profile page renders.
    expect(isFacetName(facets[0].name)).toBe(true);
    expect(isFacetName(facets[0].slug + "-nope")).toBe(false);
  });
});

describe("directory listing", () => {
  it("keeps accounts that have said nothing out of the directory", () => {
    expect(isDirectoryListable(profile())).toBe(false);
    // Tagging interests alone is not a declaration of what you do.
    expect(isDirectoryListable(profile({ topicInterests: ["surgical-training"] }))).toBe(false);
    expect(isDirectoryListable(profile({ roles: ["engineer"] }))).toBe(true);
    expect(isDirectoryListable(profile({ stages: ["regulatory"] }))).toBe(true);
  });
});

describe("directory matching", () => {
  const engineer = profile({
    roles: ["engineer"],
    stages: ["technology", "implementation"],
    canHelpWith: ["Eye tracking"],
    topicInterests: ["surgical-training"],
  });

  it("matches on every axis and rejects a miss on any one", () => {
    expect(matchesDirectoryQuery(engineer, {})).toBe(true);
    expect(matchesDirectoryQuery(engineer, { role: "engineer" })).toBe(true);
    expect(matchesDirectoryQuery(engineer, { stage: "technology" })).toBe(true);
    expect(matchesDirectoryQuery(engineer, { helpWith: "Eye tracking" })).toBe(true);

    expect(matchesDirectoryQuery(engineer, { role: "investor" })).toBe(false);
    expect(matchesDirectoryQuery(engineer, { stage: "manufacturing" })).toBe(false);
    // Every filter is a conjunction: matching the role does not rescue a
    // stage miss.
    expect(matchesDirectoryQuery(engineer, { role: "engineer", stage: "manufacturing" })).toBe(
      false,
    );
  });

  it("ranks an offer of help above a role or stage coincidence", () => {
    const helper = profile({ roles: ["engineer"], canHelpWith: ["Eye tracking"] });
    const bystander = profile({ roles: ["engineer"], stages: ["technology"] });
    const query = { role: "engineer", helpWith: "Eye tracking" };

    expect(profileMatchScore(helper, query)).toBeGreaterThan(profileMatchScore(bystander, query));
  });
});
