import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything public is open to crawlers. /studio is the Sanity editor and
// /embed holds chrome-free pages made to sit inside other pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/embed"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
