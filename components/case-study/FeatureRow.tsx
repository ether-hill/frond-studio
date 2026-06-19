import type { Feature } from "@/content/projects/_types";
import Media from "./Media";

/** One alternating text/clip feature row. `index` drives the flip + the "— 00n" label. */
export default function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const flip = index % 2 === 1;
  const num = String(index + 1).padStart(3, "0");
  return (
    <article data-rvs className="cs-feature" data-flip={flip ? "true" : "false"} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,84px)", alignItems: "center" }}>
      <div className="cs-feature-media">
        <Media slot={feature.clip} />
      </div>
      <div className="cs-feature-text" style={{ display: "flex", flexDirection: "column", gap: "clamp(12px,1.8vh,18px)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", color: "var(--fg-faint)" }}>&mdash; {num}</span>
        <h3 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(26px,3vw,42px)", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.04, color: "var(--fg)" }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.55, color: "var(--fg-dim)", maxWidth: "44ch" }}>{feature.note}</p>
      </div>
    </article>
  );
}
