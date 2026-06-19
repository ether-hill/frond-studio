import { logoFor } from "./techLogos";

function Cell({ name }: { name: string }) {
  const logo = logoFor(name);
  return (
    <div
      style={{
        background: "var(--bg-0)",
        padding: "clamp(20px,2vw,30px)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 78,
      }}
    >
      {logo ? (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--fg)" }}>
          <path d={logo.path} />
        </svg>
      ) : (
        <span style={{ width: 22, height: 22, flex: "0 0 auto" }} aria-hidden="true" />
      )}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: "var(--fg)", lineHeight: 1.3 }}>{name}</span>
    </div>
  );
}

export default function IntegrationsStrip({ integrations }: { integrations: string[] }) {
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
          marginBottom: "clamp(20px,3vh,32px)",
        }}
      >
        Tech &amp; integrations
      </h2>
      <div
        className="cs-int-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 1,
          background: "var(--line-2)",
          border: "1px solid var(--line-2)",
        }}
      >
        {integrations.map((i) => (
          <Cell key={i} name={i} />
        ))}
      </div>
    </section>
  );
}
