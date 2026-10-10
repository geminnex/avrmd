import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import {
  companyKey,
  fdaRecordLinks,
  filterFdaDevices,
  getFdaDeviceList,
  linkedRecordSlug,
} from "./fda-devices";

const list = getFdaDeviceList();

describe("FDA AR/VR device list", () => {
  it("is loaded from the FDA's own page", () => {
    expect(list.sourceUrl).toMatch(/^https:\/\/www\.fda\.gov\//);
    expect(list.devices.length).toBeGreaterThan(50);
  });

  it("has well-formed rows linking to the FDA database", () => {
    const seen = new Set<string>();
    for (const device of list.devices) {
      expect(device.submission, device.name).toMatch(/^(K|DEN|P)\d+/);
      expect(seen.has(device.submission), device.submission).toBe(false);
      seen.add(device.submission);
      expect(device.decisionDate, device.submission).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(device.fdaUrl, device.submission).toMatch(/^https:\/\/www\.accessdata\.fda\.gov\//);
      expect(device.fdaUrl, device.submission).toContain(device.submission);
    }
  });

  it("links only to records that exist, and every link is used", () => {
    const slugs = new Set(catalog.map((entity) => entity.slug));
    for (const link of fdaRecordLinks) {
      expect(slugs.has(link.slug), link.slug).toBe(true);
      expect(
        list.devices.some((device) => linkedRecordSlug(device) === link.slug),
        `no FDA row matches the link to ${link.slug}`,
      ).toBe(true);
    }
  });

  it("sends a company's named product to its own record", () => {
    expect(linkedRecordSlug({ company: "AppliedVR, Inc.", name: "EaseVRx" })).toBe("relievrx");
    expect(linkedRecordSlug({ company: "AppliedVR", name: "Something else" })).toBeUndefined();
    expect(linkedRecordSlug({ company: "Unknown Co", name: "X" })).toBeUndefined();
  });

  it("treats applicant spelling variants as one company", () => {
    expect(companyKey("Surgical Theater, LLC")).toBe(companyKey("SURGICAL THEATER, LLC"));
    expect(companyKey("SentiAR, Inc.")).toBe(companyKey("SentiAR, Inc"));
  });

  it("filters by panel, year and text", () => {
    const sample = list.devices;
    const radiology = filterFdaDevices(sample, { panel: "Radiology" });
    expect(radiology.every((device) => device.panel === "Radiology")).toBe(true);
    const relievrx = filterFdaDevices(sample, { q: "relievrx" });
    expect(relievrx.length).toBeGreaterThan(0);
  });
});
