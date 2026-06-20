import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "next-sanity";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import MediaPlaceholder from "@/components/MediaPlaceholder";
import Cta from "@/components/Cta";
import { getProject, getProjects, getProjectSlugs } from "@/sanity/lib/queries";
import CaseStudy from "@/components/case-study/CaseStudy";
import EditorialCaseStudy from "@/components/case-study/EditorialCaseStudy";
import MoreWork, { type MoreWorkItem } from "@/components/case-study/MoreWork";
import { getContentProject, contentProjectSlugs, CONTENT_PROJECTS } from "@/content/projects";
import { getEditorialProject, editorialSlugs, EDITORIAL_PROJECTS } from "@/content/projects/editorial";

// Unified cross-project list for the "See more work" slider — editorial + content-file
// flagships first, then Sanity-backed work; the current project is filtered out
// by the caller.
async function moreWorkItems(): Promise<MoreWorkItem[]> {
  const sanity = await getProjects();
  return [
    ...EDITORIAL_PROJECTS.map((p) => ({ slug: p.slug, title: p.title, label: p.category, video: p.card?.video, poster: p.card?.poster, image: p.card?.poster || undefined })),
    ...CONTENT_PROJECTS.map((p) => ({ slug: p.slug, title: p.title, label: p.category, image: p.homepageGrab?.src || undefined })),
    ...sanity.map((p) => ({ slug: p.slug, title: p.title, label: p.subtitle ?? undefined, image: p.thumbnailImage || `/posters/${p.slug}.jpg` })),
  ];
}

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  // Editorial + content-file case studies + Sanity-backed ones, de-duplicated.
  return [...new Set([...editorialSlugs, ...contentProjectSlugs, ...slugs])].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const editorial = getEditorialProject(slug);
  if (editorial) {
    return { title: `${editorial.title} — Frond Studio`, description: editorial.oneLiner };
  }
  const content = getContentProject(slug);
  if (content) {
    return { title: `${content.title} — Frond Studio`, description: content.oneLiner };
  }
  const project = await getProject(slug);
  if (!project) return { title: "Project — Frond Studio" };
  return {
    title: `${project.title} — Frond Studio`,
    description: project.summary || project.subtitle || undefined,
  };
}

const meta = (label: string, value: React.ReactNode) => (
  <div>
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--fg-faint)",
        marginBottom: 9,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 15, color: "var(--fg)", lineHeight: 1.5 }}>{value}</div>
  </div>
);

export default async function ProjectCaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Editorial long-scroll case study takes precedence over every other layout.
  const editorial = getEditorialProject(slug);
  if (editorial) {
    const moreWork = (await moreWorkItems()).filter((it) => it.slug !== slug);
    return (
      <RevealRoot>
        <EditorialCaseStudy project={editorial} moreWork={moreWork} />
        <Cta />
      </RevealRoot>
    );
  }

  // Rich, content-file case study (the reusable template) takes precedence.
  const content = getContentProject(slug);
  if (content) {
    const moreWork = (await moreWorkItems()).filter((it) => it.slug !== slug);
    return (
      <RevealRoot>
        <CaseStudy project={content} moreWork={moreWork} />
        <Cta />
      </RevealRoot>
    );
  }

  const project = await getProject(slug);
  if (!project) notFound();

  const moreWork = (await moreWorkItems()).filter((it) => it.slug !== slug);

  return (
    <RevealRoot>
      <article className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        {/* Eyebrow */}
        <div
          data-rv
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "var(--fg-dim)",
            marginBottom: "clamp(20px,3vh,30px)",
          }}
        >
          <Link href="/work" className="linku" style={{ color: "var(--fg-dim)" }}>
            Work
          </Link>
          <span style={{ color: "var(--fg-faint)" }}>/</span>
          <span>{project.subtitle}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(44px,7.4vw,120px)", lineHeight: 0.94, letterSpacing: "-0.035em", maxWidth: "18ch" }}>
          <span className="mask-line">
            <span>{project.title}</span>
          </span>
        </h1>

        {project.summary ? (
          <p data-rv style={{ transitionDelay: "0.2s", maxWidth: 680, marginTop: "clamp(24px,3.5vh,42px)", fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(22px,2.4vw,34px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.012em", color: "var(--fg)" }}>
            {project.summary}
          </p>
        ) : null}

        {/* Hero media */}
        <div
          data-rvs
          style={{ position: "relative", marginTop: "clamp(40px,6vh,72px)", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", background: "var(--media)", border: "1px solid var(--line-2)" }}
        >
          {project.thumbnailVideo ? (
            <AutoVideo src={project.thumbnailVideo} poster={`/posters/${slug}.jpg`} />
          ) : (
            <MediaPlaceholder label={project.title} />
          )}
        </div>

        {/* Body: meta + overview */}
        <div
          className="services-grid"
          style={{ marginTop: "clamp(48px,7vh,96px)", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "clamp(40px,5vw,90px)", alignItems: "start" }}
        >
          <div data-stag style={{ display: "flex", flexDirection: "column", gap: 28, position: "sticky", top: 110 }}>
            {project.client ? meta("Client", project.client) : null}
            {project.year ? meta("Year", project.year) : null}
            {project.services && project.services.length
              ? meta(
                  "Services",
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {project.services.map((s) => (
                      <span key={s} className="tag">
                        {s}
                      </span>
                    ))}
                  </div>
                )
              : null}
            {project.liveUrl
              ? meta(
                  "Live site",
                  <a className="linku" href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                    Visit site &#8599;
                  </a>
                )
              : null}
          </div>

          <div
            data-rvs
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "clamp(16px,1.25vw,18px)",
              lineHeight: 1.65,
              color: "var(--fg-dim)",
              display: "flex",
              flexDirection: "column",
              gap: "1.1em",
            }}
          >
            {project.overview ? (
              <PortableText
                value={project.overview as never}
                components={{
                  block: {
                    normal: ({ children }) => <p>{children}</p>,
                  },
                }}
              />
            ) : null}
          </div>
        </div>
      </article>

      <MoreWork items={moreWork} />

      <Cta />
    </RevealRoot>
  );
}
