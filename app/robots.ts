import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything public is open to crawlers. /studio is the Sanity editor,
// /embed holds chrome-free pages made to sit inside other pages and
// /proposal and /proposals hold private, password-protected client proposals.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/embed", "/proposals", "/proposal"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
