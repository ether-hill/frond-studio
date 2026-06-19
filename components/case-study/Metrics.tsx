import type { Metric } from "@/content/projects/_types";

export default function Metrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section data-rvs className="cs-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line-2)", border: "1px solid var(--line-2)" }}>
      {metrics.map((m, i) => (
        <div key={`${m.label}-${i}`} style={{ background: "var(--bg-0)", padding: "clamp(26px,3vw,40px)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.4vw,60px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--fg)" }}>
            {m.value}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-dim)", lineHeight: 1.4 }}>
            {m.label}
          </div>
        </div>
      ))}
    </section>
  );
}
