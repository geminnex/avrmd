import { describe, expect, it } from "vitest";
import { catalogEntitySchema } from "./catalog-schema";
import { getEntity } from "./catalog";
import {
  getRecentSignals,
  getSignalsByCategory,
  signalCategories,
  getSignals,
} from "./signals";

const signals = getSignals();

describe("signals", () => {
  it("carries none of a reviewed record's trust fields", () => {
    // A signal auto-publishes with no editor in the loop, which is only safe
    // because it cannot be mistaken for a reviewed catalog record: it must
    // never gain a reviewStatus, claimStatus, or specialties field.
    for (const signal of signals) {
      expect(signal).not.toHaveProperty("reviewStatus");
      expect(signal).not.toHaveProperty("claimStatus");
      expect(signal).not.toHaveProperty("specialties");
      expect(catalogEntitySchema.safeParse(signal).success, signal.id).toBe(false);
    }
  });

  it("has a well-formed id, url, and category", () => {
    for (const signal of signals) {
      expect(signal.id.length, signal.headline).toBeGreaterThan(4);
      expect(signal.url, signal.headline).toMatch(/^https:\/\//);
      expect(signalCategories, signal.headline).toContain(signal.category);
      expect(signal.headline.length, signal.id).toBeGreaterThan(5);
    }
  });

  it("keeps ids unique", () => {
    const ids = signals.map((signal) => signal.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("orders recent signals newest first", () => {
    const recent = getRecentSignals();
    for (let i = 1; i < recent.length; i += 1) {
      expect(
        recent[i - 1].discoveredAt >= recent[i].discoveredAt,
        `${recent[i - 1].id} should not follow ${recent[i].id}`,
      ).toBe(true);
    }
  });

  it("respects a limit and the category filter", () => {
    expect(getRecentSignals(3).length).toBeLessThanOrEqual(3);
    for (const category of signalCategories) {
      for (const signal of getSignalsByCategory(category)) {
        expect(signal.category).toBe(category);
      }
    }
  });

  it("resolves a promoted signal to a real catalog record", () => {
    const promoted = signals.filter((signal) => signal.promotedSlug);
    for (const signal of promoted) {
      expect(getEntity(signal.promotedSlug!), signal.id).toBeDefined();
    }
  });
});
