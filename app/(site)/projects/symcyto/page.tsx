import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import VideoPlayer from "@/components/projects/symcyto/VideoPlayer";
import ResearchCarousel, { type ResearchSlide } from "@/components/projects/symcyto/ResearchCarousel";

export const metadata: Metadata = {
  title: "Symcyto — New Forms of Harvest · Frond Studio",
  description:
    "A collaboration with Physarum polycephalum — slime mould as both scientific subject and artistic medium. Timelapse bio-art and documentary content grown in smart-enabled studio ecosystems.",
};

const RESEARCH: ResearchSlide[] = [
  {
    title: "Slime Molds as a Valuable Source of Antimicrobial Agents",
    body:
      "Given the emerging multidrug-resistant pathogens, the number of effective antimicrobial agents to deal with the threat of bacterial and fungal resistance has fallen dramatically. Therefore, the critical solution to deal with the missing effective antibiotics is to research new sources or new synthetic antibiotics. This article has focused on antibiotics from slime molds, especially Myxomycetes.",
    attribution: "Vida Tafakori, Kharazmi University",
    cta: "Read article",
    href: "https://www.researchgate.net/publication/352692963_Slime_molds_as_a_valuable_source_of_antimicrobial_agents",
  },
  {
    title: "Slime Mold Helps to Map the Universe's Tendrils of Dark Matter",
    body:
      "Scientists have used slime molds' exploration prowess to solve mazes and logic puzzles, to re-create transportation systems, and to inspire efficient computer algorithms. “It's a really good mapping algorithm because it's not really biased by the first direction you decide to look in; [it's] capable of exploring everything at once,” says New Jersey Institute of Technology slime mold specialist Simon Garnier.",
    attribution: "Mark Popinchalk — Scientific American",
    cta: "Read article",
    href: "https://www.scientificamerican.com/article/slime-mold-helps-to-map-the-universes-tendrils-of-dark-matter/",
  },
  {
    title: "Scientists Create Living Smartwatch Powered by Slime Mold",
    body:
      "Using the electrically conductive single-cell organism known as “slime mold,” the researchers created a watch that only works when the organism is healthy, requiring the user to provide it with food and care.",
    attribution: "By Cassandra Belek — University of Chicago",
    cta: "Find out more",
    href: "https://news.uchicago.edu/story/scientists-create-living-smartwatch-powered-slime-mold",
  },
];

const TIMELAPSES = [
  { title: "Ganoderma Polypore, Immortalised in Slime Time", src: "/symcyto/ganoderma-polypore.mp4", poster: "/symcyto/ganoderma-polypore-poster.avif" },
  { title: "Black Cherry — Comatricha nigra", src: "/symcyto/black-cherry.mp4", poster: "/symcyto/black-cherry-poster.avif" },
  { title: "Cytoplasmic Resonance", src: "/symcyto/cytoplasmic-resonance.mp4", poster: "/symcyto/cytoplasmic-resonance-poster.avif" },
  { title: "Cypress Knee — elongated cranium & particle effects", src: "/symcyto/cypress-knee.mp4", poster: "/symcyto/cypress-knee-poster.avif" },
  { title: "The Slime Divide — Physarum polycephalum", src: "/symcyto/the-slime-divide.mp4", poster: "/symcyto/the-slime-divide-poster.avif" },
  { title: "Paracas Queen, Immortalised in Slime", src: "/symcyto/paracas-queen.mp4", poster: "/symcyto/paracas-queen-poster.avif" },
  { title: "Slime Mold Tearin' Up a Turkey Tail", src: "/symcyto/turkey-tail.mp4", poster: "/symcyto/turkey-tail-poster.avif" },
  { title: "Slime Mold Imagines a Forest", src: "/symcyto/imagines-a-forest.mp4", poster: "/symcyto/imagines-a-forest-poster.avif" },
  { title: "Paracas Pharaoh — Slimelapse", src: "/symcyto/paracas-pharaoh.mp4", poster: "/symcyto/paracas-pharaoh-poster.avif" },
];

export default function SymcytoPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-bleed signature timelapse with overlaid branding */}
        <section className="sym-hero">
          <div data-par="0.12" data-par-scale="0.1" style={{ position: "absolute", inset: "-8% 0", willChange: "transform" }}>
            <AutoVideo src="/symcyto/symcyto-001.mp4" poster="/symcyto/symcyto-001-poster.jpg" style={{ objectPosition: "center" }} />
          </div>
          <div className="sym-hero-scrim" aria-hidden />
          <div className="sym-hero-brand">
            <div className="sym-wrap" data-stag>
              <div className="sym-eyebrow">
                Symcyto <span>— New Forms of Harvest</span>
              </div>
              <h1
                style={{
                  margin: "clamp(18px,3vh,30px) 0 0",
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 600,
                  fontSize: "clamp(54px,10vw,168px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: "var(--fg)",
                }}
              >
                <span className="mask-line">
                  <span>Symcyto</span>
                </span>
              </h1>
              <a
                href="https://www.instagram.com/symcyto/"
                target="_blank"
                rel="noopener noreferrer"
                className="linku"
                style={{ display: "inline-block", marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.1em", color: "var(--fg-dim)" }}
              >
                @symcyto ↗
              </a>
            </div>
          </div>
        </section>

        {/* Ancient algorithms — opening statement */}
        <section className="sym-section">
          <div className="sym-wrap">
            <div style={{ maxWidth: 920 }}>
              <h2 className="sym-h2" data-rvs>
                Ancient algorithms
              </h2>
              <p className="sym-lead" data-rvs style={{ marginTop: "clamp(24px,4vh,40px)", maxWidth: "60ch" }}>
                Just as AI is creeping into our lives, nature poetically accelerates the endorsement of a lesser-known form of
                intelligence. As if to remind the world that hidden amongst ancient organisms is an organic intelligence — an OI —
                that demonstrates the power of evolutionary programming. This is slime mould: a left-field, decentralised,
                single-celled, pulsating problem solver.
              </p>
            </div>
          </div>
        </section>

        {/* Not actually mould — media left, text right */}
        <section className="sym-section" style={{ paddingTop: 0 }}>
          <div className="sym-wrap">
            <div className="sym-feature">
              <div className="sym-media sq" data-rvs>
                <div data-par="0.08" data-par-scale="0.08" style={{ position: "absolute", inset: "-6% 0", willChange: "transform" }}>
                  <AutoVideo src="/symcyto/erasmus-polypore.mp4" poster="/symcyto/erasmus-polypore-poster.jpg" />
                </div>
              </div>
              <div className="sym-text" data-stag>
                <h2 className="sym-h2">Not actually mould</h2>
                <p className="sym-lead" style={{ marginTop: "clamp(20px,3vh,32px)" }}>
                  …but a collection of single-celled organisms closely related to the amoeba family. These organisms possess
                  advanced capabilities and intelligence demonstrated by their spatial awareness and problem-solving skills.
                  Several advanced algorithms have been developed based on numerous behavioural anomalies exhibited by this humble
                  species.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Befriending Physarum — text left, portrait media right */}
        <section className="sym-section" style={{ paddingTop: 0 }}>
          <div className="sym-wrap">
            <div className="sym-feature rev">
              <div className="sym-media port" data-rvs>
                <div data-par="0.1" data-par-scale="0.08" style={{ position: "absolute", inset: "-6% 0", willChange: "transform" }}>
                  <AutoVideo src="/symcyto/sym-2-hero.mp4" poster="/symcyto/sym-2-poster.jpg" />
                </div>
              </div>
              <div className="sym-text" data-stag>
                <h2 className="sym-h2">Befriending Physarum polycephalum</h2>
                <p className="sym-lead" style={{ marginTop: "clamp(20px,3vh,32px)" }}>
                  To honour and help increase the awareness of this organism we have been collaborating with the flagship species,
                  Physarum polycephalum. United, we have created a new form of harvest — a creative content branch that represents
                  a fresh type of meta-fruiting body in the form of timelapse bio-art and documentary content. A mix of our own
                  sculptural pieces and objects found in nature, combined with ongoing development of cultivation techniques and
                  smart-enabled grow chambers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* News & Research carousel */}
        <section className="sym-section" style={{ background: "#000", borderTop: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)" }}>
          <div className="sym-wrap">
            <h2 className="sym-h2" data-rvs style={{ textAlign: "center" }}>
              Slime mould news &amp; research
            </h2>
            <ResearchCarousel items={RESEARCH} />
          </div>
        </section>

        {/* Art & Media — grid of video players */}
        <section className="sym-section">
          <div className="sym-wrap">
            <h2 className="sym-h2" data-rvs style={{ textAlign: "center" }}>
              Slime mould art &amp; media
            </h2>
            <p className="sym-lead" data-rvs style={{ margin: "clamp(20px,3vh,32px) auto 0", maxWidth: "64ch", textAlign: "center" }}>
              Our process involves cultivation of healthy, informed batches of slime mould which are introduced into smart-enabled
              mini studio ecosystems along with complementary objects. These objects can range from simple agar panels and natural
              environment sets to novel items found in nature or sculpted in-house.
            </p>

            <div className="sym-grid" data-stag>
              {TIMELAPSES.map((v) => (
                <figure key={v.src} className="sym-figure">
                  <VideoPlayer src={v.src} poster={v.poster} title={v.title} />
                  <figcaption className="sym-cap">{v.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Let's connect */}
        <section className="sym-section" style={{ background: "#000", borderTop: "1px solid var(--line-2)", paddingBottom: "clamp(64px,10vh,120px)" }}>
          <div className="sym-wrap" style={{ textAlign: "center" }}>
            <h2 className="sym-h2" data-rvs>
              Let&apos;s connect
            </h2>
            <p className="sym-lead" data-rvs style={{ margin: "clamp(20px,3vh,32px) auto 0", maxWidth: "48ch" }}>
              Symcyto is a project of Frond Studio — a transdisciplinary design, research, development and production studio based
              in Amsterdam. Get in touch about the work, the chambers, or a collaboration.
            </p>
            <div
              data-rvs
              style={{ marginTop: "clamp(32px,5vh,48px)", display: "flex", flexWrap: "wrap", gap: "14px 18px", justifyContent: "center", alignItems: "center" }}
            >
              <Link href="/contact" className="sym-readbtn">
                Message us
              </Link>
              <a className="sym-readbtn" href="https://www.instagram.com/symcyto/" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a className="sym-readbtn" href="https://www.youtube.com/@Symcyto" target="_blank" rel="noopener noreferrer">
                YouTube
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
