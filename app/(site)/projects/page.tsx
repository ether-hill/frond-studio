import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import CaseStudyRow from "@/components/CaseStudyRow";
import Cta from "@/components/Cta";
import { getProjects } from "@/sanity/lib/queries";

export const metadata: Metadata = {
  title: "Projects — Frond Studio",
  description: "Selected client work in design, development and art direction.",
};

export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: 1600, margin: "0 auto", padding: "clamp(130px,18vh,210px) var(--gutter) clamp(72px,11vh,128px)" }}>
        <PageHeader
          title="Projects"
          intro="We work across a wide range of projects to keep things interesting — selected client work in design, development and art direction, for people who care how things are built."
        />

        <div data-stag style={{ marginTop: "clamp(56px,8vh,104px)", display: "flex", flexDirection: "column", gap: "clamp(72px,11vh,140px)" }}>
          {projects.map((p, i) => (
            <CaseStudyRow key={p._id} project={p} flip={i % 2 === 1} />
          ))}
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
