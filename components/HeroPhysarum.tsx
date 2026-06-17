"use client";

import { useEffect, useRef } from "react";

/**
 * Homepage hero background — the Jones (2010) agent Physarum model running live
 * in "Monochrome Drift": ~65k agents leaving stark veins, white-on-black in dark
 * mode and inverted in light mode. RANDOMISE (the `hero-physarum-reseed` event)
 * spawns a fresh variant by perturbing the movement parameters while keeping the
 * monochrome palette. WebGL2-only; falls back to a quiet empty background.
 */
export default function HeroPhysarum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let eng: { render: () => void; dispose: () => void } | null = null;
    let raf = 0;
    let disposed = false;
    let base: Record<string, unknown> = {};
    // last movement variant in play, so a theme flip only swaps the palette
    let movement: Record<string, unknown> | null = null;

    const isDark = () => (document.documentElement.dataset.theme || "dark") !== "light";
    const palette = () =>
      isDark()
        ? { bg: "#000000", lo: "#3a3a3a", hi: "#ffffff" }
        : { bg: "#f4f1ea", lo: "#b9b2a4", hi: "#0a0a0a" };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

    const newMovement = () => ({
      sensorAngle: rand(14, 34),
      sensorDist: rand(8, 22),
      turnSpeed: rand(14, 40),
      stepSize: rand(1.1, 2.0),
      deposit: rand(0.06, 0.12),
      decay: rand(0.86, 0.94),
      diffuse: Math.random() < 0.5 ? 0 : rand(0, 0.32),
      stepsPerFrame: 2 + (Math.random() * 2 | 0),
      intensity: rand(2.4, 3.4),
      gamma: rand(0.28, 0.5),
      spawn: pick(["random", "ring", "center"] as const),
    });

    const buildParams = (mv: Record<string, unknown> | null) => ({
      ...base,
      ...(mv || {}),
      ...palette(),
      species: 1,
      avoid: 0,
      mouseFood: 0,
      displayMode: "palette",
    });

    let Engine: new (c: HTMLCanvasElement, res: number, p: unknown) => {
      render: () => void;
      dispose: () => void;
    };

    const build = (mv: Record<string, unknown> | null) => {
      try {
        eng?.dispose();
      } catch {
        /* noop */
      }
      try {
        eng = new Engine(canvas, 512, buildParams(mv));
      } catch {
        eng = null; // WebGL2 unavailable
      }
    };

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    Promise.all([import("./projects/algorithms/engine/physarum"), import("./projects/algorithms/engine/versions")])
      .then(([{ Physarum }, { VERSIONS, HERO_VERSION_ID }]) => {
        if (disposed) return;
        Engine = Physarum as typeof Engine;
        const hero = VERSIONS.find((v) => v.id === HERO_VERSION_ID) || VERSIONS[0];
        base = { ...(hero.params as unknown as Record<string, unknown>) };
        build(null); // canonical Monochrome Drift on first paint

        if (reduce) {
          for (let k = 0; k < 90 && eng; k++) eng.render();
        } else {
          const loop = () => {
            eng?.render();
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        }
      })
      .catch(() => {
        /* engine failed to load — leave background empty */
      });

    const onReseed = () => {
      if (!Engine) return;
      movement = newMovement();
      build(movement);
    };
    window.addEventListener("hero-physarum-reseed", onReseed);

    // re-skin (not re-seed) when the theme flips
    const themeObs = new MutationObserver(() => {
      if (Engine) build(movement);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("hero-physarum-reseed", onReseed);
      themeObs.disconnect();
      try {
        eng?.dispose();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" }}
    />
  );
}
