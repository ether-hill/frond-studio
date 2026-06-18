import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import AutoVideo from "@/components/AutoVideo";
import Cta from "@/components/Cta";

export const metadata: Metadata = {
  title: "Symcyto — New Forms of Harvest · Frond Studio",
  description:
    "A collaboration with Physarum polycephalum — slime mould as both scientific subject and artistic medium. Timelapse bio-art and documentary content grown in smart-enabled studio ecosystems.",
};

/** Storyblok asset host (the original Symcyto media library). */
const SB = "https://a.storyblok.com/f/69529";

/** Living-network reading list — the three pieces of research the project cites. */
const RESEARCH = [
  {
    title: "Slime Molds as a Valuable Source of Antimicrobial Agents",
    source: "ResearchGate",
    cta: "Read article",
    href: "https://www.researchgate.net/publication/352692963_Slime_molds_as_a_valuable_source_of_antimicrobial_agents",
  },
  {
    title: "Slime Mold Helps to Map the Universe's Tendrils of Dark Matter",
    source: "Scientific American",
    cta: "Read article",
    href: "https://www.scientificamerican.com/article/slime-mold-helps-to-map-the-universes-tendrils-of-dark-matter/",
  },
  {
    title: "Scientists Create Living Smartwatch Powered by Slime Mold",
    source: "University of Chicago",
    cta: "Find out more",
    href: "https://news.uchicago.edu/story/scientists-create-living-smartwatch-powered-slime-mold",
  },
];

/** The timelapse harvest — meta-fruiting bodies, grown and filmed in-studio. */
const TIMELAPSES = [
  { title: "Symcyto 001", src: `${SB}/x/40b3db2297/symcyto-001-4k-sq-011-1000.mp4` },
  { title: "Sym 2", src: `${SB}/x/c84e445f7a/sym-2-sq-shortloop-1000.mp4`, poster: `${SB}/1052x1600/4495d9c8e1/sym-2-sq-poster.jpg` },
  { title: "Erasmus Polypore", src: `${SB}/x/ccbaecdda0/erasmus-polypore-003-1000.mp4`, poster: `${SB}/1420x1420/c6cbb4386b/erasmus-polypore-003poster.jpg` },
  { title: "Ganoderma Polypore, Immortalised in Slime Time", src: `${SB}/x/71c7f61ba5/ganoderma-polypore-immortalized-in-slime-time-slime-mold-timeplapse.mp4` },
  { title: "Slime Mold Imagines a Forest", src: `${SB}/x/278f0ab4a9/slime-mold-imagines-a-forest.mp4` },
  { title: "Paracas Pharaoh", src: `${SB}/x/4adce0dafd/paracas-pharaoh-slimelapse-backup-cam-view.mp4` },
  { title: "Paracas Queen, Immortalised in Slime", src: `${SB}/x/e1bfc7938b/paracas-queen-immortalized-in-slime.mp4` },
  { title: "Tearin' Up a Turkey Tail", src: `${SB}/x/4f5045b541/slime-mold-tearin-up-a-turkey-tail.mp4` },
  { title: "Cytoplasmic Resonance", src: `${SB}/x/51ffa54949/cytoplasmic-resonance-slime-mold-timelapse.mp4` },
  { title: "The Slime Divide", src: `${SB}/x/d3b38713c5/the-slime-divide-physarum-polycephalum-timelapse.mp4` },
  { title: "Cypress Knee", src: `${SB}/x/aa03aedea2/cypress-knee-slime-mold-with-elongated-cranium-and-particle-effects.mp4` },
  { title: "Black Cherry — Comatricha nigra", src: `${SB}/x/f025a78344/black-cherry-slime-mold-comatricha-nigra.mp4` },
];

const sectionHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 500,
  fontSize: "clamp(28px,3.6vw,46px)",
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
  margin: 0,
};

const prose: React.CSSProperties = {
  margin: "18px 0 0",
  maxWidth: "58ch",
  fontSize: "clamp(16px,1.25vw,18px)",
  lineHeight: 1.65,
  color: "var(--fg-dim)",
};

export default function SymcytoPage() {
  return (
    <RevealRoot>
      <article
        className="page-gutter"
        style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}
      >
        <PageHeader
          eyebrow="The lab · Bio-art"
          title="Symcyto"
          intro="New forms of harvest — a collaboration with Physarum polycephalum, where slime mould is both scientific subject and artistic medium."
          introSerif
        />

        {/* Hero — a signature meta-fruiting body */}
        <div
          data-rvs
          style={{
            position: "relative",
            marginTop: "clamp(40px,6vh,72px)",
            aspectRatio: "16/9",
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--media)",
            border: "1px solid var(--line-2)",
          }}
        >
          <AutoVideo
            src={`${SB}/x/8466e8a338/sym-2-sq-shortloop-2500.mp4`}
            poster={`${SB}/1052x1600/4495d9c8e1/sym-2-sq-poster.jpg`}
            style={{ objectPosition: "center" }}
          />
        </div>

        {/* Prose */}
        <div
          data-stag
          style={{ marginTop: "clamp(56px,9vh,110px)", display: "flex", flexDirection: "column", gap: "clamp(44px,6vh,72px)" }}
        >
          <section>
            <h2 style={sectionHeading}>Ancient algorithms</h2>
            <p style={prose}>
              Just as AI is creeping into our lives, nature poetically accelerates the endorsement of a lesser-known form of
              intelligence. As if to remind the world that hidden amongst ancient organisms is an organic intelligence — an OI —
              that demonstrates the power of evolutionary programming. This is slime mould: a left-field, decentralised,
              single-celled, pulsating problem solver.
            </p>
          </section>

          <section>
            <h2 style={sectionHeading}>Not actually mould</h2>
            <p style={prose}>
              …but a collection of single-celled organisms closely related to the amoeba family. These organisms possess advanced
              capabilities and intelligence demonstrated by their spatial awareness and problem-solving skills. Several advanced
              algorithms have been developed based on numerous behavioural anomalies exhibited by this humble species.
            </p>
          </section>

          <section>
            <h2 style={sectionHeading}>Befriending Physarum polycephalum</h2>
            <p style={prose}>
              To honour and help increase the awareness of this organism we have been collaborating with the flagship species,
              Physarum polycephalum. United, we have created a new form of harvest — a creative content branch that represents a
              fresh type of meta-fruiting body in the form of timelapse bio-art and documentary content. A mix of our own
              sculptural pieces and objects found in nature, combined with ongoing development of cultivation techniques and
              smart-enabled grow chambers.
            </p>
          </section>
        </div>

        {/* News & Research */}
        <section data-rvs style={{ marginTop: "clamp(72px,11vh,140px)" }}>
          <h2 style={sectionHeading}>Slime mould news &amp; research</h2>
          <div
            data-stag
            style={{
              marginTop: "clamp(32px,5vh,56px)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: 1,
              background: "var(--line-2)",
              border: "1px solid var(--line-2)",
            }}
          >
            {RESEARCH.map((r) => (
              <a
                key={r.href}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="vwork"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg-0)",
                  padding: "clamp(26px,2.6vw,38px)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--fg-faint)",
                  }}
                >
                  {r.source}
                </span>
                <h3
                  style={{
                    margin: "18px 0 0",
                    fontFamily: "var(--font-display), sans-serif",
                    fontWeight: 500,
                    fontSize: "clamp(20px,1.8vw,26px)",
                    lineHeight: 1.18,
                    letterSpacing: "-0.012em",
                    flex: 1,
                  }}
                >
                  {r.title}
                </h3>
                <span
                  className="linku"
                  style={{
                    marginTop: 28,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  {r.cta} ↗
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Art & Media */}
        <section data-rvs style={{ marginTop: "clamp(72px,11vh,140px)" }}>
          <h2 style={sectionHeading}>Slime mould art &amp; media</h2>
          <p style={{ ...prose, maxWidth: "62ch" }}>
            Our process involves cultivation of healthy, informed batches of slime mould which are introduced into smart-enabled
            mini studio ecosystems along with complementary objects. These objects can range from simple agar panels and natural
            environment sets to novel items found in nature or sculpted in-house.
          </p>

          <div
            data-stag
            style={{
              marginTop: "clamp(36px,5vh,64px)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
              gap: "clamp(20px,2.4vw,36px)",
            }}
          >
            {TIMELAPSES.map((v) => (
              <figure key={v.src} style={{ margin: 0 }}>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--media)",
                    border: "1px solid var(--line-2)",
                  }}
                >
                  <AutoVideo src={v.src} poster={v.poster} />
                </div>
                <figcaption
                  style={{
                    marginTop: 14,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.02em",
                    color: "var(--fg-dim)",
                  }}
                >
                  {v.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Follow */}
        <div
          data-rvs
          style={{
            marginTop: "clamp(64px,9vh,120px)",
            paddingTop: "clamp(28px,4vh,40px)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px 26px",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          <span style={{ color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10 }}>
            Follow Symcyto
          </span>
          <a className="linku" href="https://www.instagram.com/symcyto/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-dim)" }}>
            Instagram ↗
          </a>
          <a className="linku" href="https://www.youtube.com/@Symcyto" target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-dim)" }}>
            YouTube ↗
          </a>
          <Link className="linku" href="/projects" style={{ color: "var(--fg-dim)", marginLeft: "auto" }}>
            ← All projects
          </Link>
        </div>
      </article>

      <Cta />
    </RevealRoot>
  );
}
