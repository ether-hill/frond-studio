import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Spherical Cymatics in High Performance Bubbles · Frond Studio",
  description:
    "Research & development: cymatic patterns in hard-to-pop, high-performance bubbles — a multisensory study of sound made visible in three dimensions, with thin-film interference colour.",
};

export default function CymaticsBubblesPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-viewport video banner with the title + subtext overlaid
            bottom-left. */}
        <section className="cym-hero">
          <div className="cym-hero-media">
            <AutoVideo src="/cymatics/hero.mp4" poster="/cymatics/gobstopper-003-poster.jpg" />
          </div>
          <div className="cym-hero-inner" data-stag>
            <div className="cym-kicker">Research &amp; Development</div>
            <h1 className="cym-hero-title">
              <span className="mask-line">
                <span>Spherical Cymatics in High Performance Bubbles</span>
              </span>
            </h1>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(20px,3vh,32px)", maxWidth: "56ch" }}>
              Cymatic patterns and forms in hard-to-pop, high-performance bubbles offer a multisensory experience, combining the
              auditory perception of sound with the visual interplay of ever-changing shapes, colours and swirling patterns.
            </p>
          </div>
        </section>

        <article className="cym-article">
          {/* Video grid — lead piece spans both columns, then a 2-up grid */}
          <div className="cym-grid" data-stag>
            <figure className="cym-cell cym-lead" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-003.mp4" poster="/cymatics/gobstopper-003-poster.jpg" title="Double bubble morphology and thin film interference" />
              <figcaption className="cym-cap">Double bubble morphology and thin film interference</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/cymatics-bubble-spin-4000.mp4" poster="/cymatics/cymatics-bubble-spin-4000-poster.jpg" title="Thin film interference spin control via 40hz" />
              <figcaption className="cym-cap">Thin film interference spin control via 40hz</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/cymatics-bubble-phase-reversal-3500.mp4" poster="/cymatics/cymatics-bubble-phase-reversal-3500-poster.jpg" title="Phase reversal" />
              <figcaption className="cym-cap">Phase reversal</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-002.mp4" poster="/cymatics/gobstopper-002-poster.jpg" title="Process view platonic solids" />
              <figcaption className="cym-cap">Process view platonic solids</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer src="/cymatics/gobstopper-001.mp4" poster="/cymatics/gobstopper-001-poster.jpg" title="Process view platonic solids 2" />
              <figcaption className="cym-cap">Process view platonic solids 2</figcaption>
            </figure>
          </div>

          {/* Body */}
          <div className="cym-body" data-stag>
            <p className="sym-lead" data-rvs>
              Hard-to-pop, high-performance bubbles provide a unique medium for cymatics experiments in three dimensions. The thin,
              flexible films of these bubble mixtures are highly sensitive to sound vibrations, allowing for the visualization of
              intricate patterns and 3D forms combined with the scientific colour phenomenon known as thin-film interference
              (colour swirls). This behaviour manifests an amazing tool for artistic explorations, educational demonstrations and
              scientific investigations, helping artists, students and researchers alike grasp the profound connection between
              sound, matter and geometric forms.
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
      <MoreProjects excludeSlug="cymatics-bubbles" />
    </RevealRoot>
  );
}
