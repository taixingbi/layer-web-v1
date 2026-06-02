/**
 * Robots.txt: index marketing/blog pages; exclude authenticated app surfaces.
 */

import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog/"],
      disallow: ["/chat", "/api/", "/login", "/signup", "/profile", "/auth/", "/forgot-password"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
