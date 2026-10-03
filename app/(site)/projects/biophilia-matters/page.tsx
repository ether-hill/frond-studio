import type { Metadata } from "next";
import { projectShareCard } from "@/lib/projects";
import RevealRoot from "@/components/RevealRoot";
import AutoVideo from "@/components/AutoVideo";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Biophilia Matters · Frond Studio",
  description:
    "Exploring plant and fungi based innovation and appreciation through design and creative strategy.",
  ...projectShareCard("biophilia-matters"),
};

// Moved here from the client Work list. The copy and media are the project's
// own, as they stood under Work; the old site link is gone because that site no
// longer exists.
const POINTS = ["Brand & business design", "Website + content design system", "Smart grow systems & timelapse"];

export default function BiophiliaMattersPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        {/* Hero — full-bleed timelapse with the title and statement overlaid
            bottom-left, as on the Timelapse Media page. */}
        <section className="tlmp-hero">
          <div className="tlmp-hero-media">
            <AutoVideo
              src="https://a.storyblok.com/f/69529/x/8c7d3ca6dc/mean-vitrine-001-hd-600-480p.mp4"
              poster="/posters/biophilia-matters-design-and-creative-strategy.jpg"
            />
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
                <span>Biophilia Matters</span>
              </span>
            </h1>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(20px,3vh,32px)", maxWidth: "54ch" }}>
              Exploring plant and fungi based innovation and appreciation through design and creative strategy.
            </p>
          </div>
        </section>

        <section className="sym-section">
          <div className="sym-wrap">
            <h2 className="sym-h2" data-rvs>
              The work
            </h2>
            <p className="sym-lead" data-rvs style={{ margin: "clamp(20px,3vh,32px) 0 0", maxWidth: "64ch" }}>
              Deliverables spanned brand and business design, website design and development, content creation and a
              design system, the design, fabrication and documentation of smart grow systems, and custom timelapse
              rigging and production.
            </p>

            <ul data-rvs style={{ margin: "clamp(28px,4vh,44px) 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {POINTS.map((pt) => (
                <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "var(--text-body)", color: "var(--fg)", lineHeight: 1.5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "calc(0.75em - 3px)" }} />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <MoreProjects excludeSlug="biophilia-matters" />
    </RevealRoot>
  );
}
