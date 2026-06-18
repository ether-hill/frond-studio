import RevealRoot from "@/components/RevealRoot";
import HeroPhysarum from "@/components/HeroPhysarum";
import RandomiseButton from "@/components/RandomiseButton";
import HeroVote from "@/components/HeroVote";
import SelectedWork from "@/components/SelectedWork";
import SelectedProjects from "@/components/SelectedProjects";
import CapabilitiesGraph from "@/components/CapabilitiesGraph";
import Cta from "@/components/Cta";
import { getProjects } from "@/sanity/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const projects = await getProjects();
  const featured = projects.slice(0, 6);

  return (
    <RevealRoot>
      {/* Hero — live Jones-agent Physarum, full viewport. Always the dark
          monochrome scene (the inverted/light version reads poorly), so the
          section pins data-theme="dark" for its text + overlays. */}
      <section data-theme="dark" style={{ minHeight: "100svh", position: "relative", overflow: "hidden", background: "#000", color: "var(--fg)" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <HeroPhysarum />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(100deg, var(--bg-0) 0%, rgba(0,0,0,0.0) 70%)", opacity: 0.9 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(to top, var(--bg-0) 4%, rgba(0,0,0,0) 50%)", opacity: 0.95 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg, var(--bg-0) 0%, transparent 22%)", opacity: 0.6 }} />
        <RandomiseButton
          event="hero-physarum-reseed"
          title="Spawn a new Jones-agent render"
          variant="circle"
          caption="Visualising a slime mold algorithm"
          label="Randomise"
        />
        <HeroVote />

        <div
          className="hero-inner"
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            minHeight: "100svh",
            padding: "120px var(--gutter) clamp(116px,16vh,168px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            textShadow: "0 2px 44px rgba(0,0,0,0.62)",
          }}
        >
          {/* Hero intro animates via compositor-driven CSS (see globals.css
              .hero-rise/.hero-fade), NOT GSAP — so the heavy WebGL sim on the
              main thread can't stall it. Triggered by `.intro-ready` (added by
              RevealRoot once fonts are ready), pre-hidden only under `.gsap-on`. */}
          <h1 className="hero-h1" style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(36px,6.6vw,114px)", lineHeight: 0.92, letterSpacing: "-0.038em" }}>
            <span className="hero-clip">
              <span className="hero-rise" style={{ animationDelay: "0.04s" }}>Natural</span>
            </span>
            <span className="hero-clip">
              <span className="hero-rise" style={{ animationDelay: "0.12s" }}>selections.</span>
            </span>
          </h1>

          <p
            className="hero-fade"
            style={{
              animationDelay: "0.26s",
              maxWidth: 560,
              marginTop: "clamp(22px,3vh,38px)",
              fontSize: "clamp(16px,1.35vw,19px)",
              lineHeight: 1.55,
              color: "var(--fg)",
            }}
          >
            <span style={{ display: "block", marginBottom: 9, fontSize: "clamp(10px,0.8vw,12px)", fontWeight: 600, letterSpacing: "0.08em", color: "var(--fg-dim)" }}>
              Things that matter to us:
            </span>
            transdisciplinary and biophilic design, meandering, ethical AI, design systems, working remotely worldwide… the
            planet, animal welfare, social justice…
          </p>
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, zIndex: 2 }}>
          <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
            <span className="scroll-cue">
              <span className="scroll-cue-label">Scroll to explore</span>
              <svg className="scroll-cue-arrow" width="20" height="26" viewBox="0 0 20 26" fill="none" aria-hidden="true">
                <path d="M10 1v22M2 16l8 8 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      <SelectedWork projects={featured} />

      <SelectedProjects />

      {/* Capabilities — interactive 3D node cloud, full-bleed behind the copy */}
      <section
        id="services"
        className="cap-section"
        style={{ position: "relative", overflow: "hidden", background: "var(--bg-1)", borderTop: "1px solid var(--line)" }}
      >
        <div className="cap-cloud">
          <CapabilitiesGraph />
        </div>
        <div className="cap-scrim" aria-hidden />
        <div
          className="page-gutter"
          style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)", pointerEvents: "none" }}
        >
          <div className="cap-text" data-stag style={{ maxWidth: "40ch", userSelect: "none" }}>
            <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 400, letterSpacing: "-0.015em" }}>
              Capabilities
            </h2>
            <p
              style={{
                marginTop: "clamp(20px,3vh,32px)",
                maxWidth: "40ch",
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "clamp(19px,1.7vw,27px)",
                fontWeight: 400,
                lineHeight: 1.34,
                letterSpacing: "-0.01em",
                color: "var(--fg-dim)",
              }}
            >
              The interesting problems don&apos;t fit inside one discipline. We work across design, engineering, strategy and AI
              as a single craft — so an idea moves from sketch to shipped without changing hands. Running through all of it is a{" "}
              <span style={{ color: "var(--fg)" }}>biophilic</span> instinct: we borrow the patterns of living systems to make
              things that grow, adapt and last.
            </p>
          </div>
        </div>
      </section>

      <Cta />
    </RevealRoot>
  );
}
