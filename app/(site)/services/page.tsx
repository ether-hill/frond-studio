import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import CapabilityRows from "@/components/CapabilityRows";
import Cta from "@/components/Cta";
import { PILLARS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services — Frond Studio",
  description:
    "Design, development and consulting — so an idea can go from sketch to shipped without ever changing hands.",
};

export default function ServicesPage() {
  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: 1600, margin: "0 auto", padding: "clamp(130px,18vh,210px) var(--gutter) clamp(72px,11vh,128px)" }}>
        <PageHeader
          eyebrow="Design · Development · Consulting"
          title="Services"
          intro="We move between design, development and consulting — so an idea can go from sketch to shipped without ever changing hands."
          introSerif
        />

        <div
          data-stag
          style={{
            marginTop: "clamp(56px,8vh,96px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 255px), 1fr))",
            gap: "clamp(32px,4vw,60px)",
          }}
        >
          {PILLARS.map((p) => (
            <div key={p.num} style={{ borderTop: "1px solid var(--line)", paddingTop: 22 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
                <span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 11, fontWeight: 500, color: "var(--fg-faint)" }}>
                  {p.num}
                </span>
                <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(26px,2.6vw,40px)", fontWeight: 500, letterSpacing: "-0.012em" }}>
                  {p.title}
                </h2>
              </div>
              <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>{p.desc}</p>
              <ul>
                {p.items.map((it) => (
                  <li
                    key={it}
                    style={{
                      borderTop: "1px solid var(--line-2)",
                      padding: "13px 0",
                      fontSize: 15,
                      color: "var(--fg-dim)",
                      whiteSpace: "normal",
                    }}
                  >
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* (04) Capabilities band */}
      <section style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}>
        <div className="page-gutter" style={{ maxWidth: 1600, margin: "0 auto", padding: "clamp(72px,11vh,128px) var(--gutter)" }}>
          <div data-rvs style={{ display: "flex", gap: 18, alignItems: "baseline", marginBottom: "clamp(40px,6vh,64px)" }}>
            <span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 12, letterSpacing: "0.1em", color: "var(--accent)" }}>(04)</span>
            <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 400, letterSpacing: "-0.015em" }}>
              Capabilities
            </h2>
          </div>
          <CapabilityRows />
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
