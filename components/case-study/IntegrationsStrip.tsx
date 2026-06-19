export default function IntegrationsStrip({ integrations }: { integrations: string[] }) {
  return (
    <section data-rvs style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "clamp(28px,4vh,48px) 0" }}>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-faint)",
          marginBottom: "clamp(16px,2.2vh,24px)",
        }}
      >
        Tech &amp; integrations
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {integrations.map((i) => (
          <span key={i} className="tag">
            {i}
          </span>
        ))}
      </div>
    </section>
  );
}
