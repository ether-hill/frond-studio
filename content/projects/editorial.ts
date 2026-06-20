import type { EditorialProject } from "./editorial-types";
import embassyCaseStudy from "./embassy-of-the-free-mind-case-study";

// Registry of editorial (long-scroll) case-study projects. These render with
// EditorialCaseStudy and take precedence over both the Sanity-backed thin layout
// and the canonical CaseStudy template on the /work/[slug] route. Adding one =
// drop a content file and list it here.
export const EDITORIAL_PROJECTS: EditorialProject[] = [embassyCaseStudy];

export function getEditorialProject(slug: string): EditorialProject | undefined {
  return EDITORIAL_PROJECTS.find((p) => p.slug === slug);
}

export const editorialSlugs = EDITORIAL_PROJECTS.map((p) => p.slug);
