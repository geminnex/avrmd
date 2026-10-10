import { describe, expect, it } from "vitest";
import { modalities, specialties, useCases } from "./catalog";
import { buildRecord, initialFields, slugify, type ReviewCandidate } from "./review";

const candidate: ReviewCandidate = {
  id: "c1",
  title: "Virtual reality for pain in dental treatment: a systematic review",
  sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/1/",
  sourceLabel: "PubMed",
  entityKindHint: "evidence",
  triage: {
    draft: {
      name: "VR for pain and anxiety in dental treatment",
      kind: "evidence",
      typeLabel: "Systematic review",
      summary: "A systematic review of virtual reality for pain and anxiety during adult dental treatment.",
      specialties: [specialties[0]],
      useCases: [useCases[0]],
      modalities: [modalities[0]],
      stages: ["validation"],
      topicSlugs: [],
      geography: "Global",
      maturity: "Published",
    },
  },
};

describe("review", () => {
  it("starts from the AI draft", () => {
    expect(initialFields(candidate).typeLabel).toBe("Systematic review");
  });

  it("builds a valid, AI-labelled record with a unique slug", () => {
    const result = buildRecord(candidate, initialFields(candidate), new Set(["vr-for-pain-and-anxiety-in-dental-treatment"]), "2026-10-10");
    if (!("record" in result)) throw new Error(result.problems.join());
    expect(result.record.slug).toBe("vr-for-pain-and-anxiety-in-dental-treatment-2");
    expect(result.record.aiAssisted).toBe(true);
    expect(result.record.claimStatus).toBe("not-claimable");
    expect(result.record.sourceUrl).toBe(candidate.sourceUrl);
  });

  it("refuses an incomplete record instead of writing it", () => {
    const fields = { ...initialFields(candidate), summary: "short", specialties: [] };
    const result = buildRecord(candidate, fields, new Set());
    expect("problems" in result && result.problems.length).toBeGreaterThanOrEqual(2);
  });

  it("makes clean slugs", () => {
    expect(slugify("  Ångström — XR: a Review! ")).toBe("angstrom-xr-a-review");
  });
});
