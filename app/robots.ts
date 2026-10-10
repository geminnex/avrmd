import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/notifications", "/sign-in/confirm", "/sign-in/reset", "/workspace"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
