import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import SelectedWork from "@/components/SelectedWork";
import CapabilityRows from "@/components/CapabilityRows";
import Cta from "@/components/Cta";
import { PLACEHOLDER_VIDEO } from "@/lib/site";
import { getProjects } from "@/sanity/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const projects = await getProjects();
  const featured = projects.slice(0, 6);

  return (
    <RevealRoot>
      {/* Hero — cinematic, full viewport */}
      <section style={{ minHeight: "100svh", position: "relative", overflow: "hidden" }}>
        <div data-par="-0.085" style={{ position: "absolute", top: "-22%", left: 0, width: "100%", height: "148%", zIndex: 0, willChange: "transform" }}>
          <AutoVideo src={PLACEHOLDER_VIDEO} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "var(--bg-0)", opacity: 0.3 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(100deg, var(--bg-0) 0%, rgba(0,0,0,0) 62%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg, var(--bg-0) 0%, transparent 24%, transparent 72%, var(--bg-0) 100%)", opacity: 0.6 }} />

        <div
          className="hero-inner"
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            minHeight: "100svh",
            padding: "120px var(--gutter) 96px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            data-rv
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--fg-dim)",
              marginBottom: "clamp(20px,3vh,32px)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
            Design — Development — Art Direction
          </div>

          <h1 className="hero-h1" style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(48px,8.8vw,152px)", lineHeight: 0.92, letterSpacing: "-0.038em" }}>
            <span className="mask-line">
              <span style={{ transitionDelay: "0.06s" }}>Design,</span>
            </span>
            <span className="mask-line">
              <span style={{ transitionDelay: "0.15s" }}>
                built <em style={{ fontWeight: 400 }}>in motion.</em>
              </span>
            </span>
          </h1>

          <p
            data-rv
            style={{
              transitionDelay: "0.22s",
              maxWidth: 500,
              marginTop: "clamp(22px,3vh,38px)",
              fontSize: "clamp(16px,1.35vw,19px)",
              lineHeight: 1.55,
              color: "var(--fg-dim)",
            }}
          >
            A transdisciplinary design &amp; technology studio — websites, apps and platforms for ambitious clients around the world.
          </p>

          <div data-rv style={{ transitionDelay: "0.3s", marginTop: "clamp(24px,3.2vh,38px)", display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Link href="/work" className="pill pill-solid" style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "14px 26px" }}>
              View selected work
            </Link>
            <Link href="/contact" className="pill pill-ghost" style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "14px 26px" }}>
              Start a project
            </Link>
          </div>
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, zIndex: 2 }}>
          <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
            <span
              data-rv
              style={{
                transitionDelay: "0.42s",
                display: "inline-block",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
              }}
            >
              Scroll to explore &#8595;
            </span>
          </div>
        </div>
      </section>

      <SelectedWork projects={featured} />

      {/* Capabilities */}
      <section id="services" style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}>
        <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)" }}>
          <div data-rvs style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, flexWrap: "wrap", marginBottom: "clamp(44px,6vh,72px)" }}>
            <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.1em", color: "var(--accent)" }}>(02)</span>
              <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 400, letterSpacing: "-0.015em" }}>Capabilities</h2>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-dim)" }}>
              Design · Development · Consulting
            </span>
          </div>

          <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "clamp(40px,5vw,90px)" }}>
            <div data-stag>
              <p style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(24px,2.5vw,38px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.012em" }}>
                We move between design, development and consulting — so an idea can go from sketch to shipped without ever changing hands.
              </p>
              <div data-stag style={{ marginTop: "clamp(34px,4vh,52px)", display: "flex", flexDirection: "column", gap: 24 }}>
                {[
                  { t: "Design", d: "Art direction, identity, editorial & interface design." },
                  { t: "Development", d: "Front-end, full-stack & platform engineering." },
                  { t: "Consulting", d: "Creative & technical direction for teams and founders." },
                ].map((r) => (
                  <div key={r.t}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 7 }}>
                      {r.t}
                    </div>
                    <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.5 }}>{r.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <CapabilityRows />
          </div>
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
