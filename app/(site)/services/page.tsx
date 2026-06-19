import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import CapabilitiesGraph from "@/components/CapabilitiesGraph";
import MyceliumBg from "@/components/MyceliumBg";
import AboutMyceliumControls from "@/components/AboutMyceliumControls";
import Cta from "@/components/Cta";

export const metadata: Metadata = {
  title: "About · Frond Studio",
  description:
    "A growing, transdisciplinary studio working the way living systems do: across boundaries, with ethical AI, on projects that nourish people and the planet.",
};

const ETHOS = [
  {
    num: "01",
    kicker: "Transdisciplinary design",
    statement: "The interesting problems don’t fit inside one discipline.",
    body: "We work across design, engineering, strategy and AI as a single craft, so an idea can move from sketch to shipped without ever changing hands. The best thinking tends to live in the seams between disciplines, so that’s where we spend our time: holding the whole problem at once instead of passing it down a line.",
  },
  {
    num: "02",
    kicker: "Biophilic design",
    statement: "We borrow the patterns of living systems.",
    body: "Nature has been prototyping for billions of years. We design with its grammar (growth, networks, rhythm, adaptation) to make things that feel alive and last. Biophilia isn’t a decorative layer we paint on at the end; it’s a way of shaping how something behaves, breathes and grows over time.",
  },
  {
    num: "03",
    kicker: "Ethical & positive AI",
    statement: "AI in service of flourishing, not extraction.",
    body: "We reach for AI where it amplifies human craft and curiosity, never to cut corners, deceive, or quietly replace the people it should serve. Used with consent, transparency and care, it’s a remarkable instrument. Used carelessly, it’s just another extraction machine. We choose the former, every time.",
  },
  {
    num: "04",
    kicker: "Nourishing, not extractive",
    statement: "We’d rather make things that nourish.",
    body: "We shy away from big, greedy corporations and the work that quietly takes more than it gives. We choose projects that are nourishing: for the people who use them, for the teams who make them, and for the planet that hosts all of it. Smaller, slower and more alive beats bigger and emptier. That’s the work we want our hands on.",
  },
];

export default function AboutPage() {
  return (
    <RevealRoot>
      {/* Header + manifesto — living mycelium grows behind it. Full-viewport like
          the homepage hero, with the same scroll cue. */}
      <section data-theme="dark" style={{ position: "relative", overflow: "hidden", minHeight: "100svh", background: "var(--bg-0)", color: "var(--fg)" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.85 }}>
          <MyceliumBg />
        </div>
        <AboutMyceliumControls />
        {/* scrim: keep the copy legible over the living network */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(105deg, var(--bg-0) 0%, color-mix(in srgb, var(--bg-0) 72%, transparent) 42%, color-mix(in srgb, var(--bg-0) 30%, transparent) 70%, transparent 100%)",
          }}
        />
        {/* Same size + position as the homepage hero: bottom-left, compositor-driven
            rise/fade so the WebGL sim can't stall it. */}
        <div
          className="hero-inner"
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            minHeight: "100svh",
            padding: "120px var(--gutter) clamp(116px,16vh,168px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            textShadow: "0 2px 44px rgba(0,0,0,0.62)",
          }}
        >
          <h1 className="hero-h1" style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(36px,6.6vw,114px)", lineHeight: 0.92, letterSpacing: "-0.038em" }}>
            <span className="hero-clip">
              <span className="hero-rise" style={{ animationDelay: "0.06s" }}>Studio as</span>
            </span>
            <span className="hero-clip">
              <span className="hero-rise" style={{ animationDelay: "0.14s" }}>ecosystem.</span>
            </span>
          </h1>
          <p
            className="hero-fade"
            style={{ animationDelay: "0.26s", maxWidth: 620, marginTop: "clamp(22px,3vh,38px)", fontSize: "clamp(19px,1.7vw,27px)", lineHeight: 1.4, color: "var(--fg)" }}
          >
            We work the way nature does: across disciplines, through connection, in every
            direction at once. Always seeking new methods, flavours and interpretations.
          </p>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, zIndex: 2 }}>
          <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
            <span className="scroll-cue">
              <span className="scroll-cue-label">Scroll</span>
              <svg className="scroll-cue-arrow" width="20" height="26" viewBox="0 0 20 26" fill="none" aria-hidden="true">
                <path d="M10 1v22M2 16l8 8 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      {/* Full-bleed node cloud behind the copy — same convention, size and layering
          as the homepage Focus-areas section (cloud z0 · scrim z1 · copy z2). The
          cloud is sticky so it holds, viewport-sized, while the copy scrolls over it. */}
      <section id="services" className="about-flow" style={{ position: "relative", overflow: "hidden", background: "var(--bg-1)" }}>
        <div className="about-cloud">
          <div className="about-cloud-inner">
            <CapabilitiesGraph />
            <div className="about-cloud-scrim" aria-hidden />
          </div>
        </div>
        <div className="page-gutter about-flow-inner">
          {ETHOS.map((e) => (
            <div key={e.kicker} className="ethos-point" data-rv>
              <div className="about-kicker">{e.kicker}</div>
              <h2 className="ethos-statement">{e.statement}</h2>
              <p className="about-body">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
