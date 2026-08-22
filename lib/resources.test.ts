import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import {
  getResourcesByCategory,
  resourceCategories,
  resources,
} from "./resources";

describe("related websites", () => {
  it("keeps slugs and hostnames unique", () => {
    const slugs = resources.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const hosts = resources.map((item) => new URL(item.url).hostname);
    expect(new Set(hosts).size).toBe(hosts.length);
  });

  it("uses https and a known category and scope", () => {
    for (const item of resources) {
      expect(item.url, item.slug).toMatch(/^https:\/\//);
      expect(resourceCategories, item.slug).toContain(item.category);
      expect(["medical", "general-xr"], item.slug).toContain(item.scope);
      expect(item.description.length, item.slug).toBeGreaterThan(20);
    }
  });

  it("covers both audiences", () => {
    expect(resources.some((item) => item.scope === "medical")).toBe(true);
    expect(resources.some((item) => item.scope === "general-xr")).toBe(true);
  });

  it("stays separate from the catalog", () => {
    // A related website must never masquerade as a reviewed record.
    const catalogSlugs = new Set(catalog.map((entity) => entity.slug));
    for (const item of resources) {
      expect(catalogSlugs.has(item.slug), item.slug).toBe(false);
    }
  });

  it("omits empty category groups", () => {
    for (const group of getResourcesByCategory("medical")) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});
