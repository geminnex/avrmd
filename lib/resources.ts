import resourceData from "../data/resources.json";

/**
 * Related websites are external links, not catalog records: they carry no
 * review state and no AVRMD provenance claim, so they live outside the
 * catalog and never appear in record search results.
 */
export const resourceCategories = [
  "news",
  "research",
  "books",
  "conferences",
  "bodies",
  "learning",
] as const;

export type ResourceCategory = (typeof resourceCategories)[number];
export type ResourceScope = "medical" | "general-xr";

export type Resource = {
  slug: string;
  name: string;
  url: string;
  category: ResourceCategory;
  scope: ResourceScope;
  description: string;
  /** Polled by the daily discovery job when present. */
  feedUrl?: string;
};

export const resources = resourceData as Resource[];

export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  news: "News and industry analysis",
  research: "Journals and research venues",
  books: "Books",
  conferences: "Conferences and academic venues",
  bodies: "Standards, societies, and regulators",
  learning: "Learning and community networks",
};

export const resourceScopeLabels: Record<ResourceScope, string> = {
  medical: "Medical XR",
  "general-xr": "Wider XR industry",
};

export function getResourcesByCategory(scope: ResourceScope | "all" = "all") {
  const filtered =
    scope === "all" ? resources : resources.filter((item) => item.scope === scope);

  return resourceCategories
    .map((category) => ({
      category,
      items: filtered.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

export function getResourceFeeds() {
  return resources.filter((item): item is Resource & { feedUrl: string } =>
    Boolean(item.feedUrl),
  );
}
