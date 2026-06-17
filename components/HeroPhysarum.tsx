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

    const RES = 2048; // high-res sim/display grid for crisp veins
    const AGENTS = 1024; // agentTexW → ~1M agents for dense detail

    let eng: { render: () => void; dispose: () => void } | null = null;
    let raf = 0;
    let disposed = false;
    let scenes: P[] = [];

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
      stepsPerFrame: Math.min(Number(p.stepsPerFrame) || 2, 2),
      mouseFood: 0,
    });

    let Engine: new (c: HTMLCanvasElement, res: number, p: unknown) => {
      render: () => void;
      dispose: () => void;
    };

    const build = (p: P) => {
      try {
        eng?.dispose();
      } catch {
        /* noop */
      }
      try {
        eng = new Engine(canvas, RES, buildParams(p));
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
        // every 2D scene is fair game for RANDOMISE (colours + full params)
        scenes = VERSIONS.filter((v) => v.dimension !== "3d").map((v) => v.params as unknown as P);
        const hero = VERSIONS.find((v) => v.id === HERO_VERSION_ID) || VERSIONS[0];
        build(hero.params as unknown as P); // canonical Monochrome Drift on first paint

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
      if (!Engine || !scenes.length) return;
      build(jitter(pick(scenes)));
    };
    window.addEventListener("hero-physarum-reseed", onReseed);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" }}
    />
  );
}
