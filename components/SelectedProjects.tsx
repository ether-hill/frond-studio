import Link from "next/link";
import { PERSONAL_PROJECTS } from "@/lib/projects";

/**
 * Homepage "Recent Projects" — the studio's own experiments and tools, shown
 * three-up with their 16:9 covers (first six). Mirrors the /projects index but
 * compact.
 */
const RECENT = PERSONAL_PROJECTS.slice(0, 6);

export default function SelectedProjects() {
  return (
    <section style={{ borderTop: "1px solid var(--line)" }}>
      <div
        className="page-gutter"
        style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)" }}
      >
        <div
          data-rvs
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 24,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 22,
            marginBottom: "clamp(34px,5vh,58px)",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 500, letterSpacing: "-0.018em" }}>
            Recent Projects
          </h2>
          <Link
            href="/projects"
            className="linku"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--fg-dim)",
            }}
          >
            All projects →
          </Link>
        </div>

        <div
          className="sp-grid"
          data-stag
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(20px,2.4vw,40px)",
          }}
        >
          {RECENT.map((p) => {
            const inner = (
              <>
                {p.image && (
                  <span className="proj-shot">
                    <img src={p.image} alt={`${p.title} preview`} loading="lazy" decoding="async" width={1600} height={900} />
                  </span>
                )}
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
                  {p.kicker}
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
                <p style={{ margin: "12px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-dim)" }}>{p.summary}</p>
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
                  {p.external ? "Visit ↗" : "Open →"}
                </span>
              </>
            );

            const cardStyle: React.CSSProperties = {
              display: "flex",
              flexDirection: "column",
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
      </div>
    </section>
  );
}
