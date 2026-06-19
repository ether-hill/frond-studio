import type { Project } from "./_types";
import embassyOfTheFreeMind from "./embassy-of-the-free-mind";
import sourceLibrary from "./source-library";

// Registry of content-file (rich case-study) projects. Adding a project = drop a
// new content file and list it here. These take precedence over the Sanity-backed
// thin layout on the /work/[slug] route and are merged into the /work index.
export const CONTENT_PROJECTS: Project[] = [embassyOfTheFreeMind, sourceLibrary];

export function getContentProject(slug: string): Project | undefined {
  return CONTENT_PROJECTS.find((p) => p.slug === slug);
}

export const contentProjectSlugs = CONTENT_PROJECTS.map((p) => p.slug);
