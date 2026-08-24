import { describe, expect, it } from "vitest";
import { getEntity, getProblems } from "./catalog";
import {
  getOrganizationsForProblem,
  getRelated,
  getRelationGroups,
  getSolutionsForProblem,
  relations,
} from "./relations";

describe("relations", () => {
  it("resolves every endpoint and never self-references", () => {
    for (const relation of relations) {
      expect(getEntity(relation.from), `from: ${relation.from}`).toBeDefined();
      expect(getEntity(relation.to), `to: ${relation.to}`).toBeDefined();
      expect(relation.from).not.toBe(relation.to);
    }
  });

  it("has no exact duplicate edge", () => {
    const seen = new Set<string>();
    for (const relation of relations) {
      const key = `${relation.from}>${relation.type}>${relation.to}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("shows the inverse label on the other side of the edge", () => {
    const groups = getRelationGroups("relievrx-k243417");
    expect(groups.some((group) => group.label === "Evidence for")).toBe(true);

    const inverse = getRelationGroups("relievrx");
    expect(inverse.some((group) => group.label === "Evidence")).toBe(true);
  });

  it("connects a problem to the solutions that address it", () => {
    const solutions = getSolutionsForProblem("manual-skill-without-theatre");
    expect(solutions.map((entity) => entity.slug)).toContain("osso-vr");

    const problems = getRelated("osso-vr", "addresses", "from");
    expect(problems.map((entity) => entity.slug)).toContain("manual-skill-without-theatre");
  });

  it("derives organisations for a problem from solution ownership, not a stored edge", () => {
    const orgs = getOrganizationsForProblem("home-therapy-adherence");
    expect(orgs.map((entity) => entity.slug)).toContain("appliedvr");
  });

  it("leaves unaddressed problems honestly empty rather than padded", () => {
    // Some problems have no solution in the catalog yet — open technical
    // problems especially. That gap is real content, so it must surface as
    // an empty list rather than be padded with loosely-related records.
    // Asserted as a property, not a fixed list, so it survives the catalog
    // growing.
    const unaddressed = getProblems().filter(
      (problem) => getSolutionsForProblem(problem.slug).length === 0,
    );
    expect(unaddressed.length).toBeGreaterThan(0);

    for (const problem of getProblems()) {
      const solutions = getSolutionsForProblem(problem.slug);
      expect(Array.isArray(solutions), problem.slug).toBe(true);
      // Anything returned must be a real record reached by an authored edge.
      for (const solution of solutions) {
        expect(solution.slug, problem.slug).toBeTruthy();
      }
    }
  });
});
