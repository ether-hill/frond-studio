import { logoFor } from "./techLogos";

function Chip({ name }: { name: string }) {
  const logo = logoFor(name);
  return (
    <span className="tag" style={{ gap: 9 }}>
      {logo ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style={{ flex: "0 0 auto", opacity: 0.92 }}>
          <path d={logo.path} />
        </svg>
      ) : null}
      {name}
    </span>
  );
}

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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {integrations.map((i) => (
          <Chip key={i} name={i} />
        ))}
      </div>
    </section>
  );
}
