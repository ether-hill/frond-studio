import Link from "next/link";
import type { Project } from "@/content/projects/_types";
import Media from "./Media";

export default function Hero({ project }: { project: Project }) {
  return (
    <section>
      {/* Breadcrumb */}
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
        <span>{project.title}</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(44px,7.4vw,120px)", lineHeight: 0.94, letterSpacing: "-0.035em", maxWidth: "18ch" }}>
        <span className="mask-line">
          <span>{project.title}</span>
        </span>
      </h1>

      <p
        data-rv
        style={{
          transitionDelay: "0.2s",
          maxWidth: 720,
          marginTop: "clamp(24px,3.5vh,42px)",
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "clamp(22px,2.4vw,34px)",
          fontWeight: 400,
          lineHeight: 1.2,
          letterSpacing: "-0.012em",
          color: "var(--fg)",
        }}
      >
        {project.oneLiner}
      </p>

      <div data-rvs style={{ marginTop: "clamp(40px,6vh,72px)" }}>
        <Media slot={project.heroVideo} />
      </div>
    </section>
  );
}
