const TONES = {
  before: { tint: "rgba(196, 96, 74, 0.95)", dot: "rgba(196, 96, 74, 0.9)" },
  after: { tint: "rgba(108, 176, 150, 0.98)", dot: "rgba(108, 176, 150, 0.95)" },
};

function Column({ kind, points }: { kind: "before" | "after"; points: string[] }) {
  const tone = TONES[kind];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(18px,2.6vh,26px)" }}>
      <h3
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: tone.tint,
        }}
      >
        {kind === "before" ? "Before" : "After"}
      </h3>
      <ul style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {points.map((p) => (
          <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 14, fontSize: "clamp(16px,1.4vw,20px)", lineHeight: 1.45, color: "var(--fg)", whiteSpace: "normal" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: tone.dot, flexShrink: 0, marginTop: "0.55em" }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BeforeAfter({ before, after }: { before: string[]; after: string[] }) {
  return (
    <section data-rvs className="cs-before-after" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,84px)" }}>
      <Column kind="before" points={before} />
      <Column kind="after" points={after} />
    </section>
  );
}
