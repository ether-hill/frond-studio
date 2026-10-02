import type { EditorialProject } from "./editorial-types";
import embassyCaseStudy from "./embassy-of-the-free-mind-case-study";
import sourceLibrary from "./source-library";
import folium from "./folium";
import futuresAtlas from "./futures-atlas";

// Registry of editorial (long-scroll) case-study projects. These render with
// EditorialCaseStudy and take precedence over both the Sanity-backed thin layout
// and the canonical CaseStudy template on the /work/[slug] route. Adding one =
// drop a content file and list it here.
// The order here is the order on /work, the home page and the "See more work" slider.
export const EDITORIAL_PROJECTS: EditorialProject[] = [folium, futuresAtlas, embassyCaseStudy, sourceLibrary];

export function getEditorialProject(slug: string): EditorialProject | undefined {
  return EDITORIAL_PROJECTS.find((p) => p.slug === slug);
}

export const editorialSlugs = EDITORIAL_PROJECTS.map((p) => p.slug);
