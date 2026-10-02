import { groq } from "next-sanity";
import { client } from "./client";

export type ProjectCard = {
  _id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  order: number | null;
  year: string | null;
  services: string[] | null;
  summary: string | null;
  keyPoints: string[] | null;
  thumbnailVideo: string | null;
  thumbnailImage: string | null;
};

export type ProjectFull = ProjectCard & {
  client: string | null;
  year: string | null;
  liveUrl: string | null;
  overview: unknown[] | null;
};

const cardFields = `
  _id,
  title,
  subtitle,
  "slug": slug.current,
  order,
  year,
  services,
  summary,
  keyPoints,
  thumbnailVideo,
  thumbnailImage
`;

// Projects that stay in the dataset but are not shown under Work: no row on
// /work or the home, no /work/<slug> page.
//  - thomas-custom-marine: taken off the site and archived (content/archive/).
//  - biophilia-matters-…: moved to the personal Projects list (lib/projects.ts).
const HIDDEN_WORK_SLUGS = ["thomas-custom-marine", "biophilia-matters-design-and-creative-strategy"];

// Timelapse Media lives in the personal Projects list (lib/projects.ts), not the
// client Work section — exclude it here so it doesn't show in Recent Work / /work.
export async function getProjects(): Promise<ProjectCard[]> {
  return client.fetch(
    groq`*[_type == "project" && defined(slug.current) && !(slug.current match "timelapse*") && !(slug.current in $hidden)] | order(order asc, title asc){${cardFields}}`,
    { hidden: HIDDEN_WORK_SLUGS },
    { next: { revalidate: 60 } }
  );
}

export async function getProjectSlugs(): Promise<string[]> {
  return client.fetch(
    groq`*[_type == "project" && defined(slug.current) && !(slug.current in $hidden)].slug.current`,
    { hidden: HIDDEN_WORK_SLUGS },
    { next: { revalidate: 60 } }
  );
}

export async function getProject(slug: string): Promise<ProjectFull | null> {
  if (HIDDEN_WORK_SLUGS.includes(slug)) return null;
  return client.fetch(
    groq`*[_type == "project" && slug.current == $slug][0]{
      ${cardFields},
      client,
      year,
      liveUrl,
      overview
    }`,
    { slug },
    { next: { revalidate: 60 } }
  );
}

export async function getAdjacentProjects(slug: string) {
  const all = await getProjects();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? all[i - 1] : all[all.length - 1],
    next: i < all.length - 1 ? all[i + 1] : all[0],
  };
}
