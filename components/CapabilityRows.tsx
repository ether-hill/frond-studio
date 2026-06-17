import { CAPABILITIES } from "@/lib/site";

export default function CapabilityRows() {
  return (
    <div data-stag>
      {CAPABILITIES.map((c, i) => (
        <div
          key={c.num}
          className="cap-row"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 22,
            alignItems: "baseline",
            padding: "26px 0",
            borderTop: "1px solid var(--line)",
            borderBottom: i === CAPABILITIES.length - 1 ? "1px solid var(--line)" : undefined,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>
            {c.num}
          </span>
          <div>
            <h4
              className="cap-title"
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(22px,2.2vw,32px)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              {c.title}
            </h4>
            <p style={{ color: "var(--fg-dim)", marginTop: 9, maxWidth: "48ch", fontSize: 15, lineHeight: 1.5 }}>
              {c.desc}
            </p>
          </div>
          <span className="cap-arrow" style={{ fontSize: 18, color: "var(--accent)" }}>
            &#8594;
          </span>
        </div>
      ))}
    </div>
  );
}
