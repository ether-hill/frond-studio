import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import Cta from "@/components/Cta";

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
          {/* Masthead — title left, intro right, across the full grid */}
          <header className="cym-head" data-stag>
            <div>
              <div className="cym-kicker">Research &amp; Development</div>
              <h1 className="cym-title">
                <span className="mask-line">
                  <span>Spherical Cymatics in High Performance Bubbles</span>
                </span>
              </h1>
              <div className="cym-meta">January 8, 2024</div>
            </div>
            <p className="sym-lead" data-rvs>
              Cymatic patterns and forms in hard-to-pop, high-performance bubbles offer a multisensory experience, combining the
              auditory perception of sound with the visual interplay of ever-changing shapes, colours and swirling patterns.
            </p>
          </header>

          {/* Video grid — lead piece spans both columns, then a 2-up grid */}
          <div className="cym-grid" data-stag>
            <figure className="cym-cell cym-lead" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-003.mp4" poster="/cymatics/gobstopper-003-poster.jpg" title="Spherical cymatics — gobstopper 003" />
              <figcaption className="cym-cap">Gobstopper 003 — spherical standing waves</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/cymatics-bubble-spin-4000.mp4" poster="/cymatics/cymatics-bubble-spin-4000-poster.jpg" title="Cymatic bubble — spin at 4000 Hz" />
              <figcaption className="cym-cap">Spin — 4000 Hz</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/cymatics-bubble-phase-reversal-3500.mp4" poster="/cymatics/cymatics-bubble-phase-reversal-3500-poster.jpg" title="Cymatic bubble — phase reversal at 3500 Hz" />
              <figcaption className="cym-cap">Phase reversal — 3500 Hz</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-002.mp4" poster="/cymatics/gobstopper-002-poster.jpg" title="Spherical cymatics — gobstopper 002" />
              <figcaption className="cym-cap">Gobstopper 002 — thin-film interference</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-001.mp4" poster="/cymatics/gobstopper-001-poster.jpg" title="Spherical cymatics — gobstopper 001" />
              <figcaption className="cym-cap">Gobstopper 001 — swirling colour fields</figcaption>
            </figure>
          </div>

          {/* Body — two readable columns */}
          <div className="cym-body" data-stag>
            <p className="sym-lead" data-rvs>
              Hard-to-pop, high-performance bubbles provide a unique medium for cymatics experiments in three dimensions. The thin,
              flexible films of these bubble mixtures are highly sensitive to sound vibrations, allowing for the visualization of
              intricate patterns and 3D forms combined with the scientific colour phenomenon known as thin-film interference
              (colour swirls). This behaviour manifests an amazing tool for artistic explorations, educational demonstrations and
              scientific investigations, helping artists, students and researchers alike grasp the profound connection between
              sound, matter and geometric forms.
            </p>
            <p className="sym-lead" data-rvs>
              As we continue to explore the captivating world of cymatics through 3D bubble forms, we unlock new insights into the
              dynamic interplay between sound, matter, and art. This interdisciplinary journey enriches our understanding of both
              fields and paves the way for innovative collaborations that redefine the boundaries of scientific research and
              artistic expression.
            </p>
          </div>

          {/* References */}
          <div className="cym-refs" data-rvs>
            <span className="lbl">References</span>
            <a className="linku" href="https://en.wikipedia.org/wiki/Cymatics" target="_blank" rel="noopener noreferrer">
              Cymatics — Wikipedia ↗
            </a>
            <a className="linku" href="https://en.wikipedia.org/wiki/Thin-film_interference" target="_blank" rel="noopener noreferrer">
              Thin-film interference — Wikipedia ↗
            </a>
          </div>
        </article>

      </div>
      <Cta />
    </RevealRoot>
  );
}
