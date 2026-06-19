import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import CapabilitiesGraph from "@/components/CapabilitiesGraph";
import Cta from "@/components/Cta";
import { PILLARS } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — Frond Studio",
  description:
    "A small, transdisciplinary studio working the way living systems do — across boundaries, with ethical AI, on projects that nourish people and the planet.",
};

const VALUES = [
  "Transdisciplinary",
  "Biophilic",
  "Ethical AI",
  "Nourishing, not extractive",
  "Remote · worldwide",
  "Independent",
];

const ETHOS = [
  {
    num: "01",
    kicker: "Transdisciplinary design",
    statement: "The interesting problems don’t fit inside one discipline.",
    body: "We work across design, engineering, strategy and AI as a single craft — so an idea can move from sketch to shipped without ever changing hands. The best thinking tends to live in the seams between disciplines, so that’s where we spend our time: holding the whole problem at once instead of passing it down a line.",
  },
  {
    num: "02",
    kicker: "Biophilic design",
    statement: "We borrow the patterns of living systems.",
    body: "Nature has been prototyping for billions of years. We design with its grammar — growth, networks, rhythm, adaptation — to make things that feel alive and last. Biophilia isn’t a decorative layer we paint on at the end; it’s a way of shaping how something behaves, breathes and grows over time.",
  },
  {
    num: "03",
    kicker: "Ethical & positive AI",
    statement: "AI in service of flourishing, not extraction.",
    body: "We reach for AI where it amplifies human craft and curiosity — never to cut corners, deceive, or quietly replace the people it should serve. Used with consent, transparency and care, it’s a remarkable instrument. Used carelessly, it’s just another extraction machine. We choose the former, every time.",
  },
  {
    num: "04",
    kicker: "Nourishing, not extractive",
    statement: "We’d rather make things that nourish.",
    body: "We shy away from big, greedy corporations and the work that quietly takes more than it gives. We choose projects that are nourishing — for the people who use them, for the teams who make them, and for the planet that hosts all of it. Smaller, slower and more alive beats bigger and emptier. That’s the work we want our hands on.",
  },
];

export default function AboutPage() {
  return (
    <RevealRoot>
      {/* Header + manifesto */}
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) clamp(40px,6vh,72px)" }}>
        <PageHeader
          eyebrow="Frond Studio — our ethos"
          title="About"
          intro="We’re a small, transdisciplinary studio that works the way living systems do — across boundaries, in service of things that grow."
          introSerif
        />

        <div className="about-values" data-stag>
          {VALUES.map((v) => (
            <span key={v} className="about-tag">
              {v}
            </span>
          ))}
        </div>
      </section>

      {/* Ethos — four layouts */}
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter) var(--section-y)" }}>
        {ETHOS.map((e) => (
          <div key={e.num} className="about-row" data-rv>
            <div>
              <div className="about-num">{e.num}</div>
              <div className="about-kicker">{e.kicker}</div>
            </div>
            <div>
              <h2 className="about-statement">{e.statement}</h2>
              <p className="about-body">{e.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* What we do — disciplines */}
      <section style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}>
        <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)" }}>
          <div data-rv style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "baseline", marginBottom: "clamp(36px,5vh,56px)" }}>
            <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(30px,4vw,58px)", fontWeight: 500, letterSpacing: "-0.015em" }}>
              What we do
            </h2>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-dim)" }}>
              Design · Development · Consulting
            </span>
          </div>

          <div
            data-stag
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 255px), 1fr))",
              gap: "clamp(32px,4vw,60px)",
            }}
          >
            {PILLARS.map((p) => (
              <div key={p.num} style={{ borderTop: "1px solid var(--line)", paddingTop: 22 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--fg-faint)" }}>
                    {p.num}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(24px,2.4vw,36px)", fontWeight: 500, letterSpacing: "-0.012em" }}>
                    {p.title}
                  </h3>
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
                      }}
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities — interactive node graph, full-bleed behind the copy */}
      <section
        id="services"
        className="cap-section"
        style={{ position: "relative", overflow: "hidden", background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}
      >
        <div className="cap-cloud">
          <CapabilitiesGraph />
        </div>
        <div className="cap-scrim" aria-hidden />
        <div
          className="page-gutter cap-copy"
          style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)", pointerEvents: "none" }}
        >
          <div className="cap-text" data-stag style={{ maxWidth: "40ch", userSelect: "none" }}>
            <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 400, letterSpacing: "-0.015em" }}>
              Capabilities
            </h2>
            <p
              style={{
                marginTop: "clamp(20px,3vh,32px)",
                maxWidth: "40ch",
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "clamp(19px,1.7vw,27px)",
                fontWeight: 400,
                lineHeight: 1.34,
                letterSpacing: "-0.01em",
                color: "var(--fg-dim)",
              }}
            >
              Where the thinking meets the making. The disciplines we move between
              aren&apos;t separate services — they&apos;re{" "}
              <span style={{ color: "var(--fg)" }}>one connected practice</span>, wired
              the way a living system is.
            </p>
          </div>
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
