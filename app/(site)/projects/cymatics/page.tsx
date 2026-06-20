import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import Cta from "@/components/Cta";
import CymaticsSimulator from "@/components/projects/cymatics/CymaticsSimulator";

export const metadata: Metadata = {
  title: "Cymatics — Sound Made Visible · Frond Studio",
  description:
    "An interactive cymatics simulator and live-display research rig — vibrating water at key frequencies to induce complex geometry, exploring how sound, tone and resonance shape matter.",
};

export default function CymaticsPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — statement + spinning cymatics captures */}
        <section className="cyma-hero">
          <div className="cyma-orb tr">
            <AutoVideo src="/cymatics-lab/hero-a.mp4" />
          </div>
          <div className="cyma-orb bl">
            <AutoVideo src="/cymatics-lab/hero-b.mp4" />
          </div>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 980 }}>
            <h1
              data-rvs
              style={{
                margin: 0,
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "var(--text-title)",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
                maxWidth: "16ch",
              }}
            >
              Physically dialing in sound frequencies to induce beautiful geometry provides insight into the way sound, tone and
              resonance can affect our lives.
            </h1>
          </div>
        </section>

        {/* Interactive simulator */}
        <section className="cyma-section" style={{ paddingTop: 0 }}>
          <div className="cyma-narrow">
            <p className="sym-lead" data-rvs>
              We built this Cymatics Simulator to demonstrate the key relationships audio frequencies have with matter — water, in
              this case. Turn on the sound to explore, and use the frequency tabs at the bottom to bounce around.
            </p>
          </div>
          <div data-rvs>
            <CymaticsSimulator />
          </div>
        </section>

        {/* 40Hz / medicine */}
        <section className="cyma-section" style={{ background: "#000", borderTop: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)" }}>
          <div className="cyma-med">
            <div data-stag>
              <div className="cym-kicker" style={{ marginBottom: "clamp(14px,2vh,22px)" }}>
                Cymatics in Medicine
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 600,
                  fontSize: "var(--text-subtitle)",
                  lineHeight: 1.12,
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                }}
              >
                This is what 40&nbsp;Hz looks like. Scientists at MIT are using it to fight Alzheimer&apos;s.
              </h3>
              <p className="sym-lead" style={{ marginTop: "clamp(18px,2.6vh,28px)" }}>
                A study zeroes in on how 40&nbsp;Hz sensory stimulation helps sustain an essential process in which the
                signal-sending branches of neurons — axons — stay wrapped in a fatty insulation called myelin. Often called the
                brain&apos;s &ldquo;white matter,&rdquo; myelin protects axons and ensures better electrical signal transmission in
                brain circuits.
              </p>
              <a
                className="sym-readbtn"
                href="https://news.mit.edu/2023/40-hz-vibrations-reduce-alzheimers-pathology-symptoms-mouse-models-0605"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: "clamp(26px,4vh,38px)" }}
              >
                Learn more ↗
              </a>
            </div>
            <div className="cyma-med-media" data-rvs>
              <AutoVideo src="/cymatics-lab/medicine-40hz.mp4" />
            </div>
          </div>
        </section>

      </div>

      {/* Shared closing banner — the global "Letting things flow" CTA, so edits
          to it propagate to every page that uses it. */}
      <Cta />
    </RevealRoot>
  );
}
