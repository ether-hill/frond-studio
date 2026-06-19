import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import CaseStudyRow from "@/components/CaseStudyRow";
import Cta from "@/components/Cta";
import { getProjects, type ProjectCard } from "@/sanity/lib/queries";
import { CONTENT_PROJECTS } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work — Frond Studio",
  description: "Selected client work in design, development and art direction.",
};

export const revalidate = 60;

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
  // Prefer the "after" wins; otherwise lead with the feature titles.
  keyPoints: p.after?.points ?? (p.features ?? []).slice(0, 4).map((f) => f.title),
  thumbnailVideo: p.heroVideo.src || null,
  thumbnailImage: null,
}));

export default async function WorkPage() {
  const sanityProjects = await getProjects();
  // Content-file flagships lead, then the Sanity-backed work.
  const projects = [...CONTENT_CARDS, ...sanityProjects];

  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        <PageHeader
          title="Work"
          intro="Selected client work in design, development and art direction, for people who care how things are built."
        />

        <div style={{ marginTop: "clamp(56px,8vh,104px)", display: "flex", flexDirection: "column", gap: "clamp(72px,11vh,140px)" }}>
          {projects.map((p, i) => (
            <CaseStudyRow key={p._id} project={p} flip={i % 2 === 1} />
          ))}
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
