import Link from "next/link";
import AutoVideo from "./AutoVideo";
import MediaPlaceholder from "./MediaPlaceholder";
import type { ProjectCard } from "@/sanity/lib/queries";

function disciplineLine(p: ProjectCard) {
  return (p.services || []).slice(0, 3).join(" · ");
}

/**
 * Homepage "Recent Work" — mirrors Recent Projects: a title with a "View all"
 * button top-right, then a three-up card grid (16:9 cover, caps discipline
 * kicker, title, "Open →").
 */
export default function SelectedWork({ projects }: { projects: ProjectCard[] }) {
  return (
    <section
      id="work"
      className="page-gutter"
      style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)" }}
    >
      <div
        data-rvs
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          borderTop: "1px solid var(--line)",
          paddingTop: 22,
          marginBottom: "clamp(34px,5vh,58px)",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 500, letterSpacing: "-0.018em" }}>
          Recent Work
        </h2>
        <Link
          href="/work"
          className="pill pill-ghost"
          style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", padding: "12px 22px" }}
        >
          View all
        </Link>
      </div>

      <div className="sp-grid" data-stag style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(20px,2.4vw,40px)" }}>
        {projects.map((p) => (
          <Link key={p._id} className="vwork" href={`/work/${p.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
            <span className="proj-shot">
              {p.thumbnailVideo ? <AutoVideo src={p.thumbnailVideo} poster={`/posters/${p.slug}.jpg`} /> : <MediaPlaceholder label={p.title} />}
            </span>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginBottom: 12,
              }}
            >
              {disciplineLine(p)}
            </div>
            <h3
              className="vwork-name"
              style={{
                margin: 0,
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 500,
                fontSize: "clamp(24px,2.4vw,34px)",
                lineHeight: 1.02,
                letterSpacing: "-0.018em",
              }}
            >
              {p.title}
            </h3>
            <span
              className="linku"
              style={{
                marginTop: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--accent)",
              }}
            >
              Open →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
