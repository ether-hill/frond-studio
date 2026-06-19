import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import CaseStudyRow from "@/components/CaseStudyRow";
import Cta from "@/components/Cta";
import { getProjects } from "@/sanity/lib/queries";

export const metadata: Metadata = {
  title: "Work — Frond Studio",
  description: "Selected client work in design, development and art direction.",
};

export const revalidate = 60;

export default async function WorkPage() {
  const projects = await getProjects();

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
