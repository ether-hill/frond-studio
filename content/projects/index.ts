import type { Project } from "./_types";

// Registry of content-file (rich case-study) projects using the canonical
// CaseStudy template. Currently empty: Embassy of the Free Mind and Source
// Library both moved to the editorial layout (see ./editorial.ts). Kept so a
// future project can use the canonical template without re-wiring the route.
export const CONTENT_PROJECTS: Project[] = [];

export function getContentProject(slug: string): Project | undefined {
  return CONTENT_PROJECTS.find((p) => p.slug === slug);
}

export const contentProjectSlugs = CONTENT_PROJECTS.map((p) => p.slug);
