import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import CymaticsSimulator from "@/components/projects/cymatics/CymaticsSimulator";

export const metadata: Metadata = {
  title: "Cymatics — Sound Made Visible · Frond Studio",
  description:
    "An interactive cymatics simulator and live-display research rig — vibrating water at key frequencies to induce complex geometry, exploring how sound, tone and resonance shape matter.",
};

// Gallery — the nature timelapse collection (shared assets, already self-hosted).
const GALLERY = [
  { title: "Ostrich Ferns — in conversation", src: "/timelapse/ostrich-ferns.mp4", poster: "/timelapse/ostrich-ferns-poster.jpg" },
  { title: "Oyster Mushrooms are good for you", src: "/timelapse/oyster-mushrooms.mp4", poster: "/timelapse/inkcaps-poster.avif" },
  { title: "Passionflower Fata Confetto — timelapse drama", src: "/timelapse/passionflower.mp4", poster: "/timelapse/passionflower-poster.avif" },
  { title: "Sporangia of Rhizopus stolonifer — microscope timelapse", src: "/timelapse/sporangia.mp4", poster: "/timelapse/sporangia-poster.avif" },
  { title: "Phallus impudicus — the common stinkhorn", src: "/timelapse/phallus-impudicus.mp4", poster: "/timelapse/phallus-impudicus-poster.avif" },
  { title: "Tendril of a passion flower — passionate indeed", src: "/timelapse/tendril.mp4", poster: "/timelapse/tendril-poster.avif" },
];

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
          <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
            <div className="sym-eyebrow">
              C Y M A T I C S <span>Sound made visible</span>
            </div>
            <h1
              data-rvs
              style={{
                margin: "clamp(22px,3.5vh,40px) 0 0",
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "clamp(34px,4.8vw,64px)",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
                maxWidth: "20ch",
              }}
            >
              Vibrating water at certain key frequencies induces complex geometry — insight into the way sound, tone and
              resonance shape our lives and the world around us.
            </h1>
          </div>
        </section>

        {/* The rig */}
        <section className="cyma-section" style={{ paddingTop: 0 }}>
          <div className="cyma-narrow">
            <h2 className="sym-h2" data-rvs>
              A live display for sound
            </h2>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(20px,3vh,32px)" }}>
              Cymatics is the study of how sound creates form and patterns on surfaces such as water, alcohol and oils. This is
              ongoing prototyping of live display systems for multi-channel cymatics research and entertainment — the intent is to
              build an experience that lets anyone physically explore the realm. Current components include a six-ring array of
              NeoPixel LEDs programmed via Arduino and DMX, a multitrack audio mix through Ableton Live, hot-swappable vessels (to
              explore different substances and sizes), and focusable armatures for cameras and LED arrays.
            </p>
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
          <div className="cyma-narrow">
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(28px,4vh,44px)" }}>
              Sometimes it feels like cymatics has a mind of its own. As the system and its variables grow in complexity, a
              personality emerges — many of the best captures happen out of the blue and are often hard to recreate.
            </p>
          </div>
        </section>

        {/* 40Hz / medicine */}
        <section className="cyma-section" style={{ background: "#000", borderTop: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)" }}>
          <div className="cyma-med">
            <div data-stag>
              <div className="sym-eyebrow" style={{ color: "var(--accent)" }}>
                Cymatics in medicine
              </div>
              <h3
                style={{
                  margin: "clamp(16px,2.4vh,24px) 0 0",
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 600,
                  fontSize: "clamp(24px,2.8vw,38px)",
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

        {/* Gallery */}
        <section className="cyma-section">
          <h2 className="sym-h2" data-rvs style={{ textAlign: "center" }}>
            Gallery
          </h2>
          <div className="sym-grid" data-stag style={{ marginTop: "clamp(36px,5vh,64px)" }}>
            {GALLERY.map((v) => (
              <figure key={v.src} className="sym-figure">
                <VideoPlayer src={v.src} poster={v.poster} title={v.title} />
                <figcaption className="sym-cap">{v.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Let's connect */}
        <section
          className="sym-section"
          style={{ background: "#000", borderTop: "1px solid var(--line-2)", paddingBottom: "clamp(64px,10vh,120px)" }}
        >
          <div className="sym-wrap" style={{ textAlign: "center" }}>
            <h2 className="sym-h2" data-rvs>
              Let&apos;s connect
            </h2>
            <p className="sym-lead" data-rvs style={{ margin: "clamp(20px,3vh,32px) auto 0", maxWidth: "50ch" }}>
              Cymatics, sound made visible, living display rigs — Frond Studio explores where scientific research meets artistic
              expression. Get in touch about the work or a collaboration.
            </p>
            <div
              data-rvs
              style={{ marginTop: "clamp(32px,5vh,48px)", display: "flex", flexWrap: "wrap", gap: "14px 18px", justifyContent: "center", alignItems: "center" }}
            >
              <Link href="/contact" className="sym-readbtn">
                Message us
              </Link>
              <a className="sym-readbtn" href="https://www.youtube.com/@FrondStudio/videos" target="_blank" rel="noopener noreferrer">
                Watch on YouTube
              </a>
            </div>
            <div style={{ marginTop: "clamp(40px,6vh,64px)" }}>
              <Link className="linku" href="/projects" style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--fg-dim)" }}>
                ← All projects
              </Link>
            </div>
          </div>
        </section>
      </div>
    </RevealRoot>
  );
}
