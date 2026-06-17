import Link from "next/link";
import CtaCanvas from "./CtaCanvas";
import RandomiseButton from "./RandomiseButton";

export default function Cta() {
  return (
    <section style={{ position: "relative", overflow: "hidden", borderTop: "1px solid var(--line)" }}>
      <div data-par="0.14" style={{ position: "absolute", inset: "-14% 0", zIndex: 0, willChange: "transform" }}>
        <CtaCanvas />
      </div>
      {/* scrim: keep the headline legible over the living network */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 70% at 50% 50%, color-mix(in srgb, var(--bg-0) 78%, transparent) 0%, color-mix(in srgb, var(--bg-0) 38%, transparent) 55%, transparent 100%)",
        }}
      />
      <RandomiseButton event="cta-mycelium-reseed" title="Randomise the mycelium background" />
      <div
        className="hero-glow"
        style={{
          position: "absolute",
          top: "-40%",
          left: "-12%",
          width: "60%",
          height: "180%",
          background: "radial-gradient(closest-side, var(--accent), transparent 72%)",
          opacity: 0.07,
          filter: "blur(20px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        data-stag
        className="page-gutter"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(90px,17vh,190px) var(--gutter)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "clamp(22px,4vh,38px)",
          }}
        >
          Have a project in mind?
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "clamp(46px,8.4vw,134px)",
            fontWeight: 500,
            lineHeight: 0.92,
            letterSpacing: "-0.032em",
          }}
        >
          Let&apos;s make something <em style={{ fontWeight: 400 }}>ambitious.</em>
        </h2>
        <div
          style={{
            marginTop: "clamp(36px,5vh,62px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "18px 22px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link
            href="/contact"
            className="pill pill-solid"
            style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 30px" }}
          >
            Start a project
          </Link>
        </div>
      </div>
    </section>
  );
}
