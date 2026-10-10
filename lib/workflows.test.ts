import { describe, expect, it } from "vitest";
import { validateIntake } from "./workflows";

describe("AVRMD intake validation", () => {
  it("accepts a source-linked submission with rights attestation", () => {
    const result = validateIntake({
      type: "submission",
      name: "Example medical XR project",
      kind: "project",
      sourceUrl: "https://example.org/project",
      rightsBasis: "Official project metadata page.",
      contactEmail: "editor@example.org",
      attestation: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a submission without explicit rights attestation", () => {
    const result = validateIntake({
      type: "submission",
      name: "Example project",
      kind: "project",
      sourceUrl: "https://example.org/project",
      rightsBasis: "Official project metadata page.",
      contactEmail: "editor@example.org",
      attestation: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-web source URLs", () => {
    const result = validateIntake({
      type: "submission",
      name: "Private trial",
      kind: "evidence",
      sourceUrl: "file:///private/research.pdf",
      rightsBasis: "Editor supplied source with permission.",
      contactEmail: "editor@example.org",
      attestation: true,
    });

    expect(result.success).toBe(false);
  });

  it("requires a no-PHI attestation for private inquiries", () => {
    const result = validateIntake({
      type: "inquiry",
      entitySlug: "appliedvr",
      senderName: "A. Professional",
      senderEmail: "professional@example.org",
      organization: "Example Health",
      message: "Please share your professional product information packet.",
      noPhi: false,
    });

    expect(result.success).toBe(false);
  });
});
