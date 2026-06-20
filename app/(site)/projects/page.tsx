import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import Cta from "@/components/Cta";
import { PERSONAL_PROJECTS } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects — Frond Studio",
  description:
    "The studio's own experiments, tools and generative pieces — a growing directory of things we make to keep things interesting.",
};

export default function ProjectsPage() {
  return (
    <RevealRoot>
      <section
        className="page-gutter"
        style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}
      >
        <PageHeader
          title="Projects"
          intro="Our own experiments, tools and generative pieces: a growing directory of things we make outside client work, to keep things interesting."
        />

        <div
          data-stag
          style={{
            marginTop: "clamp(56px,8vh,104px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
            gap: 1,
            background: "var(--line-2)",
            border: "1px solid var(--line-2)",
          }}
        >
          {PERSONAL_PROJECTS.map((p) => {
            const inner = (
              <>
                {p.image && (
                  <span className="proj-shot">
                    <img src={p.image} alt={`${p.title} preview`} loading="lazy" decoding="async" width={1600} height={900} />
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--fg-faint)",
                    }}
                  >
                    {p.kicker}
                  </span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--fg-faint)" }}>{p.year}</span>
                </div>

                <h2
                  style={{
                    margin: "20px 0 0",
                    fontFamily: "var(--font-display), sans-serif",
                    fontWeight: 500,
                    fontSize: "var(--text-title)",
                    lineHeight: 1.0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {p.title}
                </h2>

                <p style={{ margin: "16px 0 0", fontSize: "var(--text-body)", lineHeight: 1.6, color: "var(--fg-dim)", maxWidth: "44ch" }}>
                  {p.summary}
                </p>

                <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        color: "var(--fg-dim)",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        padding: "5px 11px",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <span
                  className="linku"
                  style={{
                    marginTop: 28,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  {p.external ? "Visit ↗" : "Open →"}
                </span>
              </>
            );

            const cardStyle: React.CSSProperties = {
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-0)",
              padding: "clamp(28px,3vw,44px)",
              textDecoration: "none",
              color: "inherit",
            };

            return p.external ? (
              <a key={p.slug} href={p.href} target="_blank" rel="noopener noreferrer" className="vwork" style={cardStyle}>
                {inner}
              </a>
            ) : (
              <Link key={p.slug} href={p.href} className="vwork" style={cardStyle}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
