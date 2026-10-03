import type { Metadata } from "next";
import { projectShareCard } from "@/lib/projects";
import RevealRoot from "@/components/RevealRoot";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  ...projectShareCard("specimen-lab"),
  title: "Specimen Lab — Frond Studio",
  description:
    "An ongoing notebook of generative specimens. The first is a radiolarian sphere: a golden-angle Voronoi lattice with bone-like struts and bead-tipped spines, grown from a seed and rendered live in the browser.",
};

// The lab is its own Vercel project; the page runs it live in a frame, so new
// specimens show up here as soon as they ship there.
const LAB_URL = "https://specimen-lab-frond-studio.vercel.app";

export default function SpecimenLabPage() {
  return (
    <RevealRoot>
      <div className="sym-root" data-theme="dark">
        <section className="cyma-section">
          <div className="cyma-narrow">
            <div className="cym-kicker" data-rvs style={{ marginBottom: "clamp(14px,2vh,22px)" }}>
              Specimen 001 · Radiolarian sphere
            </div>
            <h1
              data-rvs
              style={{
                margin: 0,
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 600,
                fontSize: "var(--text-title)",
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "var(--fg)",
                maxWidth: "16ch",
              }}
            >
              Skeletons of the sea, grown from a single seed.
            </h1>
            <p className="sym-lead" data-rvs style={{ marginTop: "clamp(18px,2.6vh,28px)" }}>
              Specimen Lab is an ongoing notebook of generative visuals. The first specimen borrows the glass skeletons of
              radiolarians and the shells of pollen grains: openings spiral out at the golden angle, struts fuse into one
              another like bone, and spines end in small beads. Drag to turn it, open the controls to grow a new one, and copy
              the link to keep it. Every specimen can be rebuilt exactly from its seed.
            </p>
            <a
              className="sym-readbtn"
              href={`${LAB_URL}/radiolarian`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: "clamp(26px,4vh,38px)" }}
            >
              Open full screen ↗
            </a>
          </div>
        </section>

        <section className="cyma-section" style={{ paddingTop: 0 }}>
          <div className="spec-frame" data-rvs>
            <iframe
              src={`${LAB_URL}/radiolarian`}
              title="Specimen Lab — Radiolarian sphere"
              loading="lazy"
              allow="fullscreen"
            />
          </div>
        </section>
      </div>

      <MoreProjects excludeSlug="specimen-lab" />
    </RevealRoot>
  );
}
