"use client";

import { useEffect, useRef } from "react";

/**
 * Live "Algorithms" toolbox — twelve generative systems, each running in the
 * browser (p5.js sketches + a WebGL2 GPU Physarum engine). Ported from
 * generatives.vercel.app and reskinned to Frond's tokens. The heavy engine
 * modules are imported lazily (client-only) so p5/WebGL never touch SSR.
 */
export default function AlgorithmsApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let teardown: (() => void) | undefined;
    let cancelled = false;

    import("./engine/algorithms")
      .then(({ mountAlgorithms }) => {
        if (cancelled || !rootRef.current) return;
        teardown = mountAlgorithms(rootRef.current);
      })
      .catch((err) => console.error("Failed to mount algorithms engine:", err));

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="algo-root"
      style={{ fontFamily: "var(--font-body), 'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: "hidden" }}
    >
      <section
        style={{
          padding: "clamp(120px,13vw,170px) clamp(22px,5vw,64px) clamp(36px,5vw,52px)",
          borderBottom: "1px solid rgba(var(--lw),0.1)",
        }}
      >
        <div
          style={{
            maxWidth: 1680,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                fontSize: 11,
                letterSpacing: "0.28em",
                color: "var(--fg4)",
                marginBottom: 18,
              }}
            >
              THE TOOLBOX · 12 SYSTEMS
            </div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(40px,7vw,92px)", lineHeight: 0.94, letterSpacing: "-0.025em" }}>
              Algorithms
            </h1>
          </div>
          <p style={{ margin: 0, maxWidth: "46ch", fontSize: "clamp(14px,1.7vw,16px)", lineHeight: 1.6, color: "var(--fg2)" }}>
            Twelve systems, each running live. Every one builds complex structure from a handful of simple rules — no
            blueprint, just local interactions. Pick one to watch it run.
          </p>
        </div>
      </section>

      <section style={{ padding: "clamp(34px,5vw,56px) clamp(22px,5vw,64px) clamp(72px,9vw,120px)" }}>
        <div style={{ maxWidth: 1680, margin: "0 auto" }}>
          <div
            id="algoGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "168px minmax(0,1.3fr) minmax(0,0.92fr)",
              gap: "clamp(22px,2.8vw,44px)",
              alignItems: "start",
            }}
          >
            <nav id="algoIndex" style={{ display: "flex", flexDirection: "column", gap: 1 }} />
            <div id="algoHero" />
            <div id="algoText" />
          </div>
          <div id="algoBelow" style={{ marginTop: "clamp(44px,6vw,80px)" }} />
        </div>
      </section>
    </div>
  );
}
