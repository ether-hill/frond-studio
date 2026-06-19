import Link from "next/link";
import AutoVideo from "./AutoVideo";
import MediaPlaceholder from "./MediaPlaceholder";
import type { ProjectCard } from "@/sanity/lib/queries";

export default function CaseStudyRow({
  project,
  flip,
}: {
  project: ProjectCard;
  flip: boolean;
}) {
  const href = `/work/${project.slug}`;
  const points = project.keyPoints || [];
  const scope = project.services || [];

  // Each row reveals on its own as it scrolls into view ([data-rvs] → fade+rise,
  // scroll-triggered when below the fold). Not wrapped in a [data-stag] group, so
  // there's no double-targeting (which previously fought and flashed).
  return (
    <article className="cs-row" data-flip={flip ? "true" : "false"} data-rvs>
      {/* Media */}
      <Link className="cs-media vwork" href={href} aria-label={project.title}>
        <div
          className="vwork-media"
          style={{ position: "relative", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", background: "var(--media)", border: "1px solid var(--line-2)" }}
        >
          {project.thumbnailVideo ? (
            <AutoVideo src={project.thumbnailVideo} poster={`/posters/${project.slug}.jpg`} />
          ) : (
            <MediaPlaceholder label={project.title} />
          )}
        </div>
      </Link>

      {/* Text */}
      <div className="cs-text">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-dim)",
            marginBottom: "clamp(14px,2vh,20px)",
          }}
        >
          <span>{project.subtitle}</span>
          {project.year ? <span style={{ color: "var(--fg-faint)" }}>— {project.year}</span> : null}
        </div>

        <h2 style={{ marginBottom: "clamp(14px,2vh,20px)" }}>
          <Link
            className="cs-title"
            href={href}
            style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(30px,3.4vw,52px)", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, display: "inline-block" }}
          >
            {project.title}
          </Link>
        </h2>

        {project.summary ? (
          <p style={{ color: "var(--fg-dim)", fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.55, maxWidth: "46ch", marginBottom: "clamp(20px,3vh,28px)" }}>
            {project.summary}
          </p>
        ) : null}

        {points.length ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: "clamp(22px,3vh,30px)" }}>
            {points.map((pt) => (
              <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "var(--fg)", lineHeight: 1.5 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    flexShrink: 0,
                    marginTop: "calc(0.75em - 3px)",
                  }}
                />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {scope.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "clamp(24px,3.5vh,34px)" }}>
            {scope.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>
        ) : null}

        <Link className="linku link-cta" href={href}>
          View case study &#8594;
        </Link>
      </div>
    </article>
  );
}
