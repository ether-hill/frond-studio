// The single source of truth for the ordered Work card list — the flagship
// editorial case studies first, then content-file case studies, then the
// Sanity-backed projects. Used by both /work and the home "Recent Work" section
// so the home always surfaces the same, most-recent-first lineup.

import { getProjects, type ProjectCard } from "@/sanity/lib/queries";
import { CONTENT_PROJECTS } from "@/content/projects";
import { EDITORIAL_PROJECTS } from "@/content/projects/editorial";

// Map a rich content-file project to the card shape the index row expects, so
// flagship case studies sit in the same list as the Sanity-backed projects.
const CONTENT_CARDS: ProjectCard[] = CONTENT_PROJECTS.map((p) => ({
  _id: `content-${p.slug}`,
  title: p.title,
  subtitle: p.category ?? null,
  slug: p.slug,
  order: null,
  year: p.year,
  services: p.services,
  summary: p.oneLiner,
  keyPoints: p.after?.points ?? (p.features ?? []).slice(0, 4).map((f) => f.title),
  thumbnailVideo: null,
  thumbnailImage: p.heroVideo.src || null,
}));

// Editorial (long-scroll) case studies, mapped to the same index-row card shape.
const EDITORIAL_CARDS: ProjectCard[] = EDITORIAL_PROJECTS.map((p) => ({
  _id: `editorial-${p.slug}`,
  title: p.title,
  subtitle: p.category ?? null,
  slug: p.slug,
  order: null,
  year: "2026",
  services: p.services,
  summary: p.oneLiner,
  keyPoints: p.cardPoints ?? (p.stats ?? []).map((s) => `${s.value} ${s.label.toLowerCase()}`),
  thumbnailVideo: p.card?.video ?? null,
  thumbnailImage: p.card?.poster ?? null,
}));

/** Ordered Work cards: editorial flagships → content case studies → Sanity work. */
export async function getWorkCards(): Promise<ProjectCard[]> {
  const sanityProjects = await getProjects();
  return [...EDITORIAL_CARDS, ...CONTENT_CARDS, ...sanityProjects];
}
