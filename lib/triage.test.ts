import { describe, expect, it } from "vitest";
import { modalities, specialties, useCases } from "./catalog";
import { buildTriageMessages, validateTriage, type TriageInput } from "./triage";

const batch: TriageInput[] = [
  { id: "a", title: "VR for pediatric burn dressing: a randomized trial", sourceLabel: "PubMed", sourceId: "pubmed", published: "2026" },
  { id: "b", title: "Feasibility of AR suturing guidance", sourceLabel: "PubMed", sourceId: "pubmed", published: "2026" },
  { id: "c", title: "Crop yields under drought", sourceLabel: "PubMed", sourceId: "pubmed", published: "2026" },
];

describe("triage prompt", () => {
  it("lists the vocabularies and every item", () => {
    const [system, user] = buildTriageMessages(batch);
    expect(system.content).toContain(specialties[0]);
    expect(system.content).toContain("never invent");
    expect(user.content.split("\n")).toHaveLength(3);
  });
});

describe("validateTriage", () => {
  const good = {
    id: "a",
    recommendation: "add_record",
    confidence: 0.9,
    reason: "Randomized trial of a VR intervention",
    draft: {
      name: "VR distraction for pediatric burn dressing changes",
      kind: "evidence",
      typeLabel: "Randomized controlled trial",
      summary: "A randomized trial testing VR distraction during burn dressing changes in children.",
      specialties: [specialties[0], "Astrology"],
      useCases: [useCases[0]],
      modalities: [modalities[0], "Smell-o-vision"],
      stages: ["validation", "vibes"],
      topicSlugs: ["pain-management", "nope"],
      geography: "Global",
      maturity: "Published",
    },
  };

  it("keeps vocabulary values and drops invented ones", () => {
    const result = validateTriage({ items: [good] }, batch, "m");
    const draft = result.get("a")!.draft!;
    expect(draft.specialties).toEqual([specialties[0]]);
    expect(draft.modalities).toEqual([modalities[0]]);
    expect(draft.stages).toEqual(["validation"]);
    expect(draft.topicSlugs).toEqual(["pain-management"]);
  });

  it("ignores ids it didn't ask about and malformed entries", () => {
    const result = validateTriage(
      { items: [{ ...good, id: "zzz" }, { id: "b", recommendation: "maybe" }, { id: "c", recommendation: "off_topic", confidence: 2 }] },
      batch,
      "m",
    );
    expect([...result.keys()]).toEqual(["c"]);
    expect(result.get("c")!.confidence).toBe(1);
  });

  it("downgrades a recommendation whose draft is unusable", () => {
    const result = validateTriage({ items: [{ id: "a", recommendation: "add_record", confidence: 0.95, draft: { kind: "spaceship" } }] }, batch, "m");
    expect(result.get("a")!.draft).toBeUndefined();
    expect(result.get("a")!.confidence).toBeLessThanOrEqual(0.4);
  });

  it("survives garbage", () => {
    expect(validateTriage(null, batch, "m").size).toBe(0);
    expect(validateTriage({ items: "no" }, batch, "m").size).toBe(0);
  });
});
