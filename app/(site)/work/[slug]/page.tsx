import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "next-sanity";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import MediaPlaceholder from "@/components/MediaPlaceholder";
import Cta from "@/components/Cta";
import { getProject, getProjectSlugs, getAdjacentProjects } from "@/sanity/lib/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  const project = await getProject(slug);
  if (!project) notFound();

  const { prev, next } = await getAdjacentProjects(slug);

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

      {/* Prev / Next */}
      {(prev || next) && (
        <nav style={{ borderTop: "1px solid var(--line)", background: "var(--bg-1)" }}>
          <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "clamp(40px,6vh,72px) var(--gutter)", display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            {prev ? (
              <Link href={`/work/${prev.slug}`} className="linku" style={{ color: "var(--fg-dim)", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
                  &#8592; Previous
                </span>
                <span style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(20px,2vw,30px)", color: "var(--fg)" }}>{prev.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link href={`/work/${next.slug}`} className="linku" style={{ color: "var(--fg-dim)", textAlign: "right", display: "flex", flexDirection: "column", gap: 6, marginLeft: "auto" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
                  Next &#8594;
                </span>
                <span style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(20px,2vw,30px)", color: "var(--fg)" }}>{next.title}</span>
              </Link>
            ) : <span />}
          </div>
        </nav>
      )}

      <Cta />
    </RevealRoot>
  );
}
