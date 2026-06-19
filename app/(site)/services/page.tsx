import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
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
      {/* Header + manifesto — living mycelium grows behind it */}
      <section data-theme="dark" style={{ position: "relative", overflow: "hidden", minHeight: "min(86vh, 900px)", background: "var(--bg-0)", color: "var(--fg)" }}>
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
        <div
          className="page-gutter"
          style={{ position: "relative", zIndex: 2, maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) clamp(64px,12vh,128px)" }}
        >
          <PageHeader
            title="About"
            intro="We’re a growing, transdisciplinary studio that works the way living systems do: across boundaries, in service of things that grow."
            introSerif
          />
        </div>
      </section>

      {/* The four points flow organically down the page and dissolve into the
          Focus-areas node structure — one continuous movement, no dividers. */}
      <section id="services" className="about-flow" style={{ position: "relative", overflow: "hidden", background: "var(--bg-1)" }}>
        <div className="about-flow-cloud">
          <CapabilitiesGraph />
        </div>
        <div className="about-flow-scrim" aria-hidden />
        <div className="page-gutter about-flow-inner">
          {ETHOS.map((e, i) => (
            <div key={e.kicker} className="ethos-point" data-par={["0.12", "-0.08", "0.1", "-0.1"][i]}>
              <div data-rv>
                <div className="about-kicker">{e.kicker}</div>
                <h2 className="ethos-statement">{e.statement}</h2>
                <p className="about-body">{e.body}</p>
              </div>
            </div>
          ))}

          <div className="about-focus" data-rv>
            <h2 className="about-focus-title">Focus areas</h2>
            <p className="about-focus-copy">
              Where the thinking meets the making. The disciplines we move between
              aren&apos;t separate services, they&apos;re{" "}
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
