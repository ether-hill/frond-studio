import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Further Cymatics · Frond Studio",
  description:
    "New cymatics rigs pairing sound with programmable light — RGB LED ring arrays driven by Arduino and DMX, temporal-aliasing tests that phase light against sound, and new vessel geometries.",
};

export default function FurtherCymaticsPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-bleed banner timelapse (autoplay, muted) */}
        <section className="cym-hero">
          <AutoVideo src="/further-cymatics/cymatics-dual-process-01.mp4" poster="/further-cymatics/cymatics-dual-process-01-poster.jpg" />
        </section>

        <article className="cym-article">
          {/* Masthead — title left, intro right, across the full grid */}
          <header className="cym-head" data-stag>
            <div>
              <div className="cym-kicker">Research &amp; Development</div>
              <h1 className="cym-title">
                <span className="mask-line">
                  <span>Further Cymatics</span>
                </span>
              </h1>
              <div className="cym-meta">2024 – 2025</div>
            </div>
            <p className="sym-lead" data-rvs>
              An ongoing series of cymatics rigs that pair sound with programmable light. We&apos;re building new instruments with
              far finer control over the light source — RGB LED ring arrays driven by Arduino and DMX — to reveal how tone and
              resonance shape matter.
            </p>
          </header>

          {/* Video grid — 2 columns. Every clip here is square, so each player is
              pinned to 1:1 to show the full frame uncropped. */}
          <div className="cym-grid" data-stag>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer ratio="1 / 1" src="/further-cymatics/cymatics-temp-alias-002-3500.mp4" poster="/further-cymatics/cymatics-temp-alias-002-3500-poster.jpg" title="Exploring temporal aliasing" />
              <figcaption className="cym-cap">Exploring temporal aliasing</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer ratio="1 / 1" src="/further-cymatics/cymatics-touch-001.mp4" poster="/further-cymatics/cymatics-touch-001-poster.jpg" title="Process view" />
              <figcaption className="cym-cap">Process view</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer ratio="1 / 1" src="/further-cymatics/cymatics-double-ring-004-4000.mp4" poster="/further-cymatics/cymatics-double-ring-004-4000-poster.jpg" title="Double ring vessel with RGB LED ring array" />
              <figcaption className="cym-cap">Double ring vessel with RGB LED ring array</figcaption>
            </figure>
            <figure className="cym-cell" data-rvs>
              <VideoPlayer ratio="1 / 1" src="/further-cymatics/cymatics-budge-loop-011.mp4" poster="/further-cymatics/cymatics-budge-loop-011-poster.jpg" title="Multi frequency and RGB LED ring array, seamless loop" />
              <figcaption className="cym-cap">Multi frequency and RGB LED ring array, seamless loop</figcaption>
            </figure>
          </div>

          {/* Body */}
          <div className="cym-body" data-stag>
            <p className="sym-lead" data-rvs>
              Recent prototypes incorporate NeoPixel LED ring arrays that are controlled with an Arduino.
            </p>
            <p className="sym-lead" data-rvs>
              One line of tests explores temporal aliasing: we phase the frequency of the light source against the frequency of
              the sound, so the strobing illumination samples the vibrating surface slightly out of step with its motion. The
              result is smooth, linear, phase-style movement — patterns that appear to glide and rotate continuously, even though
              the medium is oscillating in place.
            </p>
            <p className="sym-lead" data-rvs>
              Alongside the light and sound, we&apos;re exploring the vessels themselves — varying their size, depth and geometry,
              and moving to multi-ring forms that hold several concentric fields at once. Each change shifts which frequencies
              resonate and how the medium behaves.
            </p>
          </div>

          {/* References */}
          <div className="cym-refs" data-rvs>
            <span className="lbl">References</span>
            <a className="linku" href="https://en.wikipedia.org/wiki/Cymatics" target="_blank" rel="noopener noreferrer">
              Cymatics — Wikipedia ↗
            </a>
            <a className="linku" href="https://en.wikipedia.org/wiki/Stroboscopic_effect" target="_blank" rel="noopener noreferrer">
              Stroboscopic effect — Wikipedia ↗
            </a>
            <a className="linku" href="https://en.wikipedia.org/wiki/DMX512" target="_blank" rel="noopener noreferrer">
              DMX512 — Wikipedia ↗
            </a>
          </div>
        </article>
      </div>
      <MoreProjects excludeSlug="further-cymatics" />
    </RevealRoot>
  );
}
