import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Timelapse Media Production · Frond Studio",
  description:
    "Process design, rigging, content creation and consulting for timelapse photography and film production — focussed on the kingdoms of plants, fungi and slime mould.",
};

// Nature-first gallery — the six timelapse pieces, self-hosted. (Oyster reuses
// the Ink Cap still as its poster, exactly as the original does.)
const NATURE = [
  { title: "Ostrich Ferns — in conversation", src: "/timelapse/ostrich-ferns.mp4", poster: "/timelapse/ostrich-ferns-poster.jpg" },
  { title: "Oyster Mushrooms are good for your", src: "/timelapse/oyster-mushrooms.mp4", poster: "/timelapse/inkcaps-poster.avif" },
  { title: "Passionflower Fata Confetto timelapse drama", src: "/timelapse/passionflower.mp4", poster: "/timelapse/passionflower-poster.avif" },
  { title: "Sporangia Of Rhizopus Stoloniferr — microscope timelapse", src: "/timelapse/sporangia.mp4", poster: "/timelapse/sporangia-poster.avif" },
  { title: "Phallus impudicus — the common stinkhorn", src: "/timelapse/phallus-impudicus.mp4", poster: "/timelapse/phallus-impudicus-poster.avif" },
  { title: "Tendril of a passion flower — passionate indeed", src: "/timelapse/tendril.mp4", poster: "/timelapse/tendril-poster.avif" },
];

export default function TimelapseMediaProductionPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-bleed opening timelapse (inkcaps) with the title and
            statement overlaid bottom-left, matching the original. */}
        <section className="tlmp-hero">
          <div className="tlmp-hero-media">
            <AutoVideo src="/timelapse/inkcaps-opener.mp4" poster="/timelapse/inkcaps-poster.avif" />
          </div>
          <div className="tlmp-hero-inner" data-stag>
            <h1
              style={{
                margin: "clamp(22px,3.5vh,40px) 0 0",
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "var(--text-display)",
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
                maxWidth: "16ch",
              }}
            >
              <span className="mask-line">
                <span>Timelapse Media Production</span>
              </span>
            </h1>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(20px,3vh,32px)", maxWidth: "54ch" }}>
              We specialize in process design, rigging, content creation and consulting for timelapse photography and film
              production.
            </p>
          </div>
        </section>

        {/* Nature first — heading + statement, then the gallery of players */}
        <section className="sym-section">
          <div className="sym-wrap">
            <h2 className="sym-h2" data-rvs>
              Nature first
            </h2>
            <p className="sym-lead" data-rvs style={{ margin: "clamp(20px,3vh,32px) 0 0", maxWidth: "64ch" }}>
              Our passion is focussed on the kingdoms of plants, fungi and slime mould. We also offer a wealth of experience
              shooting timelapse of architecture, events and industrial applications. Feel free to contact us if you have any
              questions or upcoming timelapse projects.
            </p>

            <div className="sym-grid" data-stag>
              {NATURE.map((v) => (
                <figure key={v.src} className="sym-figure">
                  <VideoPlayer src={v.src} poster={v.poster} title={v.title} />
                  <figcaption className="sym-cap">{v.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

      </div>
      <MoreProjects excludeSlug="timelapse-media-production" />
    </RevealRoot>
  );
}
