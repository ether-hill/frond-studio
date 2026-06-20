"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * Homepage "Featured Instrument" — a condensed, playable Theremin teaser sized to
 * sit within one screen, shown under Recent Projects. The heavy Web-Audio engine
 * is imported lazily (client-only) so the AudioContext never touches SSR, and is
 * torn down on unmount. Links out to the full instrument and the whole rack.
 */
export default function FeaturedInstrument() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    import("./projects/instruments/engine/instruments/thereminMini")
      .then(({ mountMini }) => {
        if (!cancelled && ref.current) dispose = mountMini(ref.current);
      })
      .catch((err) => console.error("Failed to mount featured instrument:", err));
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section style={{ borderTop: "1px solid var(--line)" }}>
      <div
        className="page-gutter"
        style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)" }}
      >
        <div
          data-rvs
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 22,
            marginBottom: "clamp(34px,5vh,58px)",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 500, letterSpacing: "-0.018em" }}>
            Featured Instrument
          </h2>
          <Link href="/projects/instruments" className="pill pill-ghost">
            View all
          </Link>
        </div>

        <div
          data-stag
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(24px,3vw,52px)",
            alignItems: "stretch",
          }}
        >
          {/* intro + CTA */}
          <div style={{ flex: "1 1 280px", minWidth: 260, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
                marginBottom: 14,
              }}
            >
              Theremin · Web Audio
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 500,
                fontSize: "clamp(28px,3vw,44px)",
                lineHeight: 1.0,
                letterSpacing: "-0.02em",
              }}
            >
              Pulled out of the air.
            </h3>
            <p style={{ margin: "16px 0 0", maxWidth: "42ch", fontSize: 15.5, lineHeight: 1.6, color: "var(--fg-dim)" }}>
              No keys, no contact — power on and sweep the field. X bends pitch, Y swells
              volume, exactly like the two antennae of a real theremin. This is a taste;
              the full instrument stacks four voices into a breathing chord.
            </p>
            <Link href="/projects/instruments/theremin" className="linku link-cta" style={{ marginTop: 24 }}>
              Play the full Theremin →
            </Link>
          </div>

          {/* the condensed playable instrument */}
          <div
            style={{
              flex: "2 1 440px",
              minWidth: 280,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--bg-1)",
              padding: "clamp(16px,2vw,24px)",
            }}
          >
            <div ref={ref} />
          </div>
        </div>
      </div>
    </section>
  );
}
