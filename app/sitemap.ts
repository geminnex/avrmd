import type { MetadataRoute } from "next";
import { catalog, entityHref } from "@/lib/catalog";
import { siteUrl } from "@/lib/site-url";
import { stages } from "@/lib/stages";
import { topics } from "@/lib/topics";

const staticPaths = [
  "/",
  "/explore",
  "/topics",
  "/stages",
  "/talks",
  "/clearances",
  "/signals",
  "/gear",
  "/resources",
  "/members",
  "/questions",
  "/for-organizations",
  "/participate",
  "/about",
  "/help",
  "/weekly",
  "/privacy",
  "/terms",
];

// Member profiles and individual questions are user content; they stay out
// until we decide what members may want indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path === "/" ? "" : path}` })),
    ...topics.map((topic) => ({ url: `${base}/topics/${topic.slug}` })),
    ...stages.map((stage) => ({ url: `${base}/stages/${stage.slug}` })),
    ...catalog.map((entity) => ({
      url: `${base}${entityHref(entity)}`,
      lastModified: entity.lastReviewed,
    })),
  ];
}
