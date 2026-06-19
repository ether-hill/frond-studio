import type { Metric } from "@/content/projects/_types";

/** "By the numbers" — a row of stat columns: big value, caps label, one-line note. */
export default function Metrics({ metrics, index = 4 }: { metrics: Metric[]; index?: number }) {
  return (
    <section data-rvs>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: "clamp(32px,5vh,64px)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        <span style={{ width: 40, height: 1, background: "var(--accent)" }} />
        <span>&mdash; {String(index).padStart(2, "0")} &middot; By the numbers</span>
      </div>

      <div className="cs-metrics" style={{ display: "grid", gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, gap: "clamp(28px,3vw,52px)" }}>
        {metrics.map((m, i) => (
          <div key={`${m.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(56px,6vw,104px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 0.9, color: "var(--fg)" }}>
              {m.value}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg)", lineHeight: 1.4 }}>
              {m.label}
            </div>
            {m.note ? <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--fg-dim)" }}>{m.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
