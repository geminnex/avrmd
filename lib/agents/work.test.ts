import { describe, expect, it } from "vitest";
import { validateOutput } from "./work";
import { team, taskKinds } from "./team";

const sources = [
  { id: "s1", type: "record", title: "RelieVRx", body: "", href: "/entities/relievrx", external: false, meta: "" },
  { id: "s2", type: "website", title: "FDA", body: "", href: "https://www.fda.gov/x", external: true, meta: "" },
];

describe("agent output validation", () => {
  it("every agent has a known task kind and a unique id", () => {
    expect(new Set(team.map((agent) => agent.id)).size).toBe(team.length);
    for (const agent of team) expect(taskKinds).toContain(agent.kind);
  });

  it("renumbers answer citations and appends only cited, known sources", () => {
    const out = validateOutput("draft_answer", { answer: "It is cleared [s2] and made by AppliedVR [s1] [s9].", citations: ["s1", "s2"], confidence: 3 }, { sources });
    expect(out?.text).toContain("It is cleared [1] and made by AppliedVR [2].");
    expect(out?.text).toContain("[1] FDA — https://www.fda.gov/x");
    expect(out?.text).toMatch(/\[2\] RelieVRx — https?:\/\/[^\s]+\/entities\/relievrx/);
    expect(out?.confidence).toBe(1);
  });

  it("rejects replies without the required fields", () => {
    expect(validateOutput("draft_answer", { answer: "short" })).toBeNull();
    expect(validateOutput("assess_report", { recommendation: "delete" })).toBeNull();
    expect(validateOutput("draft_invitation", {})).toBeNull();
    expect(validateOutput("site_report", { attention: ["x"] })).toBeNull();
  });

  it("keeps a moderation recommendation and its reason", () => {
    expect(validateOutput("assess_report", { recommendation: "hide", reason: "Names a patient.", confidence: 0.8 })).toEqual({
      recommendation: "hide",
      reason: "Names a patient.",
      confidence: 0.8,
    });
  });

  it("turns article markers into links and never shows a bare marker", () => {
    const body = "Big news: [s1](s1) and [the FDA list](s2), plus [a bad one](javascript:x) and [gone](s9). ".repeat(4);
    const out = validateOutput("weekly_article", { title: "A week", summary: "Short.", body }, { links: ["https://example.org/a", "/clearances"], titles: ["NHS framework", "FDA list"] });
    expect(out?.text).toContain("[NHS framework](https://example.org/a)");
    expect(out?.text).toContain("[the FDA list](/clearances)");
    expect(out?.text).not.toContain("javascript");
    expect(out?.text).toContain(" a bad one ");
    expect(out?.text).toContain(" gone.");
    expect(String(out?.text).startsWith("# A week\n\nShort.\n\n")).toBe(true);
  });

  it("formats a site report with lists", () => {
    const out = validateOutput("site_report", { summary: "Quiet week.", attention: ["3 unanswered"], suggestions: ["Invite 5 surgeons"] });
    expect(out?.text).toBe("Quiet week.\n\nNeeds attention:\n- 3 unanswered\n\nSuggestions:\n- Invite 5 surgeons");
  });
});
