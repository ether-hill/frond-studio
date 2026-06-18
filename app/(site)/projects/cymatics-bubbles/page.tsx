import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";

export const metadata: Metadata = {
  title: "Spherical Cymatics in High Performance Bubbles · Frond Studio",
  description:
    "Research & development: cymatic patterns in hard-to-pop, high-performance bubbles — a multisensory study of sound made visible in three dimensions, with thin-film interference colour.",
};

export default function CymaticsBubblesPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-bleed banner timelapse (autoplay, muted) */}
        <section className="cym-hero">
          <AutoVideo src="/cymatics/hero.mp4" poster="/cymatics/gobstopper-003-poster.jpg" />
        </section>

        <article className="cym-article">
          {/* Masthead */}
          <div className="cym-prose" data-stag>
            <div className="cym-kicker">Research &amp; Development</div>
            <h1
              style={{
                margin: "clamp(16px,2.6vh,26px) 0 0",
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "clamp(34px,4.6vw,58px)",
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
                maxWidth: "18ch",
              }}
            >
              <span className="mask-line">
                <span>Spherical Cymatics in High Performance Bubbles</span>
              </span>
            </h1>
            <div className="cym-meta">January 8, 2024</div>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(26px,4vh,42px)" }}>
              Cymatic patterns and forms in hard-to-pop, high-performance bubbles offer a multisensory experience, combining the
              auditory perception of sound with the visual interplay of ever-changing shapes, colours and swirling patterns.
            </p>
          </div>

          {/* Player 1 */}
          <div className="cym-media" data-rvs>
            <VideoPlayer src="/cymatics/gobstopper-003.mp4" poster="/cymatics/gobstopper-003-poster.jpg" title="Spherical cymatics — gobstopper 003" />
          </div>

          <div className="cym-prose">
            <p className="sym-lead" data-rvs>
              Hard-to-pop, high-performance bubbles provide a unique medium for cymatics experiments in three dimensions. The thin,
              flexible films of these bubble mixtures are highly sensitive to sound vibrations, allowing for the visualization of
              intricate patterns and 3D forms combined with the scientific colour phenomenon known as thin-film interference
              (colour swirls). This behaviour manifests an amazing tool for artistic explorations, educational demonstrations and
              scientific investigations, helping artists, students and researchers alike grasp the profound connection between
              sound, matter and geometric forms.
            </p>
          </div>

          {/* Player 2 */}
          <div className="cym-media" data-rvs>
            <VideoPlayer src="/cymatics/gobstopper-002.mp4" poster="/cymatics/gobstopper-002-poster.jpg" title="Spherical cymatics — gobstopper 002" />
          </div>

          <div className="cym-prose">
            <p className="sym-lead" data-rvs>
              As we continue to explore the captivating world of cymatics through 3D bubble forms, we unlock new insights into the
              dynamic interplay between sound, matter, and art. This interdisciplinary journey enriches our understanding of both
              fields and paves the way for innovative collaborations that redefine the boundaries of scientific research and
              artistic expression.
            </p>
          </div>

          {/* Player 3 */}
          <div className="cym-media" data-rvs>
            <VideoPlayer src="/cymatics/gobstopper-001.mp4" poster="/cymatics/gobstopper-001-poster.jpg" title="Spherical cymatics — gobstopper 001" />
          </div>

          {/* References */}
          <div className="cym-prose cym-refs" data-rvs>
            <span className="lbl">References</span>
            <a className="linku" href="https://en.wikipedia.org/wiki/Cymatics" target="_blank" rel="noopener noreferrer">
              Cymatics — Wikipedia ↗
            </a>
            <a className="linku" href="https://en.wikipedia.org/wiki/Thin-film_interference" target="_blank" rel="noopener noreferrer">
              Thin-film interference — Wikipedia ↗
            </a>
          </div>
        </article>

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
              Cymatics, bubbles, sound made visible — Frond Studio explores where scientific research meets artistic expression.
              Get in touch about the work or a collaboration.
            </p>
            <div
              data-rvs
              style={{ marginTop: "clamp(32px,5vh,48px)", display: "flex", flexWrap: "wrap", gap: "14px 18px", justifyContent: "center", alignItems: "center" }}
            >
              <Link href="/contact" className="sym-readbtn">
                Message us
              </Link>
              <Link href="/services" className="sym-readbtn">
                Our services
              </Link>
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
