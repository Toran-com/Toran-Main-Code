import type { MetadataRoute } from "next";
import { site, siteUrl } from "@/lib/site";

// Search engines may read the public pages (each page still says "don't
// list me" until launch), never the admin areas. The sitemap is only
// offered once Toran has launched.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ops", "/manage", "/account", "/auth", "/api/"],
    },
    ...(site.launched ? { sitemap: `${siteUrl()}/sitemap.xml` } : {}),
  };
}
