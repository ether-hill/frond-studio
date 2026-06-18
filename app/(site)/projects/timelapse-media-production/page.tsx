import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";

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

const BLOG = [
  {
    title: "Cymatics in High Performance Bubbles",
    body:
      "Cymatic patterns and forms in hard-to-pop, high performance bubbles offer a multisensory experience, combining the auditory perception of sound with the visual interplay of ever-changing shapes, colors and swirling patterns.",
    image: "/timelapse/blog-cymatics-bubbles.avif",
  },
  {
    title: "Cymatics",
    body: "Prototyping cymatics assemblies and processes to explore the visualisation of sound.",
    image: "/timelapse/blog-cymatics.avif",
  },
  {
    title: "Focus Stacking",
    body:
      "Unlock advanced techniques for videos and photos. Can be used for your social media, website, and events to make your brand stand out. A creative tool for impressing friends and foes alike.",
    image: "/timelapse/blog-focus-stacking.avif",
  },
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
            <div className="sym-eyebrow">
              F R O N D &nbsp; S T U D I O <span>Film &amp; timelapse production</span>
            </div>
            <h1
              style={{
                margin: "clamp(22px,3.5vh,40px) 0 0",
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "clamp(40px,5.6vw,72px)",
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

        {/* Blog — three featured posts */}
        <section className="sym-section" style={{ background: "#000", borderTop: "1px solid var(--line-2)" }}>
          <div className="sym-wrap">
            <h2 className="sym-h2" data-rvs style={{ textAlign: "center" }}>
              Blog
            </h2>

            <div className="tlmp-blog" data-stag>
              {BLOG.map((post) => (
                <article key={post.title} className="tlmp-card">
                  <span className="tlmp-card-shot">
                    <img src={post.image} alt={post.title} loading="lazy" decoding="async" width={1280} height={1280} />
                  </span>
                  <div className="tlmp-card-body">
                    <h3>{post.title}</h3>
                    <p>{post.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <div data-rvs style={{ marginTop: "clamp(32px,5vh,52px)", textAlign: "center" }}>
              <a className="sym-readbtn" href="https://www.frond.studio/news" target="_blank" rel="noopener noreferrer">
                View all
              </a>
            </div>
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
              Got an upcoming timelapse project — nature, architecture, events or industrial? Frond Studio handles process
              design, rigging, capture and post. Get in touch.
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
