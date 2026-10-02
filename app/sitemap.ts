import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getWorkCards } from "@/lib/work";
import { PERSONAL_PROJECTS } from "@/lib/projects";

export const revalidate = 3600;

// The main pages, every case study shown under Work (so anything hidden there
// stays out), and the studio's own project pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const work = await getWorkCards();
  const paths = [
    "/",
    "/work",
    "/projects",
    "/about",
    "/contact",
    ...work.map((p) => `/work/${p.slug}`),
    ...PERSONAL_PROJECTS.filter((p) => !p.external && p.href.startsWith("/projects/")).map((p) => p.href),
    ...["juno-106", "space-echo", "theremin", "biome"].map((s) => `/projects/instruments/${s}`),
  ];
  return [...new Set(paths)].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" || path === "/work" || path === "/projects" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.split("/").length === 2 ? 0.8 : 0.6,
  }));
}
