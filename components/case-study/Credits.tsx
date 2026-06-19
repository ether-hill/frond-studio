export default function Credits({ credits, frondRole }: { credits?: string; frondRole?: string }) {
  return (
    <section data-rvs>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-faint)",
          marginBottom: "clamp(14px,2vh,20px)",
        }}
      >
        Credits
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "60ch" }}>
        {credits ? <p style={{ fontSize: "clamp(16px,1.4vw,20px)", lineHeight: 1.5, color: "var(--fg)" }}>{credits}</p> : null}
        {frondRole ? <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--fg-dim)" }}>{frondRole}</p> : null}
      </div>
    </section>
  );
}
