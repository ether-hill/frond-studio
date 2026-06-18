"use client";

import { useEffect, useRef } from "react";

/**
 * Homepage hero background — the Jones (2010) agent Physarum model running live.
 * First paint is the studio default, "Monochrome Drift" (stark white veins on
 * black; it stays dark regardless of site theme — the inverse reads poorly).
 * RANDOMISE (the `hero-physarum-reseed` event) explores the FULL space: it draws
 * a random curated scene — colours, sensing, deposition, everything — and jitters
 * its movement for extra variation. WebGL2-only; falls back to an empty bg.
 */
type P = Record<string, unknown>;

export default function HeroPhysarum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const AGENTS = 256; // agentTexW → 65k agents, matches the reference's light footprint
    const START_DELAY = 1300; // let the hero text animate in first, then start the sim (avoids load jank)

    let eng: { render: () => void; dispose: () => void } | null = null;
    let raf = 0;
    let startT = 0;
    let disposed = false;
    let scenes: P[] = [];
    let lastParams: P | null = null; // last-built scene, so a resize rebuilds it (not the hero default)
    let dims = { w: 1920, h: 800 }; // current rectangular sim size, matched to the viewport aspect

    // Sim dimensions from the canvas's real on-screen size: crisp 1:1 with the
    // viewport, capped DPR and a ≤1920 long edge so wide monitors stay light.
    const computeDims = () => {
      const rect = canvas.getBoundingClientRect();
      const rectW = rect.width || window.innerWidth || 1920;
      const rectH = rect.height || window.innerHeight || 800;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      let w = Math.round(rectW * dpr);
      let h = Math.round(rectH * dpr);
      if (!Number.isFinite(w) || w < 1) w = 1920;
      if (!Number.isFinite(h) || h < 1) h = 800;
      const long = Math.max(w, h);
      if (long > 1920) {
        const k = 1920 / long;
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      return { w, h };
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

    // full-space variation layered on top of a curated scene's own palette/params
    const jitter = (p: P): P => ({
      ...p,
      sensorAngle: rand(12, 38),
      sensorDist: rand(7, 22),
      turnSpeed: rand(12, 42),
      stepSize: rand(1.0, 2.0),
      deposit: rand(0.05, 0.13),
      decay: rand(0.85, 0.95),
      diffuse: Math.random() < 0.45 ? 0 : rand(0, 0.4),
      gamma: rand(0.28, 0.55),
      spawn: pick(["random", "ring", "center"] as const),
    });

    const buildParams = (p: P): P => ({
      ...p,
      agentTexW: AGENTS,
      stepsPerFrame: Math.min(Number(p.stepsPerFrame) || 2, 3),
      mouseFood: 0,
    });

    let Engine: new (c: HTMLCanvasElement, res: { w: number; h: number }, p: unknown) => {
      render: () => void;
      dispose: () => void;
    };

    const build = (p: P) => {
      lastParams = p;
      dims = computeDims();
      try {
        eng?.dispose();
      } catch {
        /* noop */
      }
      try {
        eng = new Engine(canvas, dims, buildParams(p));
      } catch {
        eng = null; // WebGL2 unavailable
      }
    };

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Start driving the freshly-built engine: ~90 static frames if reduced
    // motion, otherwise a RAF loop. Reused by first paint and resize rebuilds.
    const run = () => {
      if (reduce) {
        for (let k = 0; k < 90 && eng; k++) eng.render();
      } else {
        const loop = () => {
          eng?.render();
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      }
    };

    Promise.all([import("./projects/algorithms/engine/physarum"), import("./projects/algorithms/engine/versions")])
      .then(([{ Physarum }, { VERSIONS, HERO_VERSION_ID }]) => {
        if (disposed) return;
        Engine = Physarum as typeof Engine;
        // every 2D scene is fair game for RANDOMISE (colours + full params)
        scenes = VERSIONS.filter((v) => v.dimension !== "3d").map((v) => v.params as unknown as P);
        const hero = VERSIONS.find((v) => v.id === HERO_VERSION_ID) || VERSIONS[0];
        const start = () => {
          if (disposed) return;
          build(hero.params as unknown as P); // canonical Monochrome Drift on first paint
          canvas.style.opacity = "1"; // fade the sim in (CSS transition on the canvas)
          run();
        };
        // Hold the heavy sim until the headline/intro have finished animating in,
        // so the reveal stays smooth. Reduced-motion has no intro — start at once.
        if (reduce) start();
        else startT = window.setTimeout(start, START_DELAY);
      })
      .catch(() => {
        /* engine failed to load — leave background empty */
      });

    const onReseed = () => {
      if (!Engine || !scenes.length) return;
      build(jitter(pick(scenes)));
      if (reduce) run(); // RAF loop is already live otherwise
    };
    window.addEventListener("hero-physarum-reseed", onReseed);

    // Debounced resize: rebuild (same scene) only when the viewport aspect/size
    // shifts enough to matter — the >12% gate avoids reflowing on minor jitter.
    let resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        if (!Engine || disposed) return;
        const next = computeDims();
        const dw = Math.abs(next.w - dims.w) / dims.w;
        const dh = Math.abs(next.h - dims.h) / dims.h;
        if (dw < 0.12 && dh < 0.12) return;
        build((lastParams ?? {}) as P); // computeDims() runs inside build()
        if (reduce) run();
      }, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(startT);
      window.clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hero-physarum-reseed", onReseed);
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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover", opacity: 0, transition: "opacity 1s ease" }}
    />
  );
}
