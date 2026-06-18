"use client";

import { useEffect, useRef } from "react";
import { blurbWeight } from "@/lib/blurbVotes";
import { fetchHeroLearning } from "@/app/hero-vote-actions";

/**
 * Homepage hero background — the Jones (2010) agent Physarum model running live.
 * First paint is the studio default, "Monochrome Drift" (stark white veins on
 * black; it stays dark regardless of site theme — the inverse reads poorly).
 *
 * RANDOMISE (the `hero-physarum-reseed` event) is now *learned*: visitors' 👍/👎
 * (from <HeroVote>, relayed via the `hero-feedback` event) weight which curated
 * preset is drawn AND bank the exact config of liked renders. Each randomise then
 * either explores fresh (weighted preset + jitter) or, up to half the time but
 * never more (a hard exploration floor), exploits — mutating from a banked
 * favourite. It emits `hero-render` {id, params} so <HeroVote> always knows
 * what's on screen. WebGL2-only; falls back to an empty bg.
 */
type P = Record<string, unknown>;
type Vote = { up: number; down: number };
type Liked = { id: string; params: P };

export default function HeroPhysarum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const AGENTS = 256; // agentTexW → 65k agents, matches the reference's light footprint
    const START_DELAY = 180; // brief beat so first paint/intro start, then build the sim (it fades in)
    const EXPLORE_FLOOR = 0.5; // always ≥50% fresh draws so the hero never collapses to one look

    let eng: { render: () => void; dispose: () => void } | null = null;
    let raf = 0;
    let startT = 0;
    let disposed = false;
    let visible = true; // pause the WebGL sim when the hero is scrolled off-screen
    let looping = false;
    let sceneList: { id: string; params: P }[] = [];
    let lastParams: P | null = null; // last-built scene, so a resize rebuilds it (not the hero default)
    let dims = { w: 1920, h: 800 }; // current rectangular sim size, matched to the viewport aspect

    // Learning state (effect-local; fed by the server on mount + `hero-feedback`).
    let sceneVotes: Record<string, Vote> = {};
    let liked: Liked[] = [];
    let current: Liked | null = null; // the config on screen, for voting

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
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

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

    // small perturbation of a liked config's movement params (palette/spawn kept)
    const mut = (v: number, a: number, b: number, frac = 0.18) =>
      clamp(v + (Math.random() * 2 - 1) * (b - a) * frac, a, b);
    const mutate = (p: P): P => ({
      ...p,
      sensorAngle: mut(Number(p.sensorAngle) || 25, 12, 38),
      sensorDist: mut(Number(p.sensorDist) || 14, 7, 22),
      turnSpeed: mut(Number(p.turnSpeed) || 27, 12, 42),
      stepSize: mut(Number(p.stepSize) || 1.5, 1.0, 2.0),
      deposit: mut(Number(p.deposit) || 0.09, 0.05, 0.13),
      decay: mut(Number(p.decay) || 0.9, 0.85, 0.95),
      gamma: mut(Number(p.gamma) || 0.4, 0.28, 0.55),
    });

    // weighted preset pick — liked presets surface more, disliked fade (never to 0)
    const pickScene = () => {
      if (!sceneList.length) return null;
      const ws = sceneList.map((s) => blurbWeight(sceneVotes[s.id]));
      const total = ws.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < sceneList.length; i++) {
        r -= ws[i];
        if (r <= 0) return sceneList[i];
      }
      return sceneList[sceneList.length - 1];
    };

    // choose the next config: exploit a banked favourite, or explore fresh
    const choose = (): P => {
      if (liked.length && Math.random() > EXPLORE_FLOOR) {
        const base = pick(liked);
        const params = mutate(base.params);
        current = { id: base.id, params };
        return params;
      }
      const s = pickScene() || sceneList[0];
      const params = jitter(s.params);
      current = { id: s.id, params };
      return params;
    };

    const announce = () => {
      if (current) window.dispatchEvent(new CustomEvent("hero-render", { detail: current }));
    };

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

    const loop = () => {
      if (disposed || !visible) {
        looping = false;
        return;
      }
      eng?.render();
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (looping || reduce || disposed) return;
      looping = true;
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      if (reduce) {
        for (let k = 0; k < 90 && eng; k++) eng.render();
      } else {
        startLoop();
      }
    };

    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            visible = e.isIntersecting;
            if (visible) startLoop();
          }
        },
        { threshold: 0 }
      );
      io.observe(canvas);
    }

    // Pull the learned signal early; refs update in place so the next randomise uses it.
    fetchHeroLearning()
      .then((d) => {
        if (disposed) return;
        sceneVotes = d.sceneVotes || {};
        liked = (d.liked || []).map((c) => ({ id: c.id, params: c.params as P }));
      })
      .catch(() => {});

    // Relay from <HeroVote>: update the in-memory weighting so this session's
    // randomises feel the vote immediately (the server is the durable record).
    const onFeedback = (ev: Event) => {
      const d = (ev as CustomEvent).detail as { id?: string; dir?: "up" | "down"; params?: P } | undefined;
      if (!d?.id || (d.dir !== "up" && d.dir !== "down")) return;
      const v = sceneVotes[d.id] || { up: 0, down: 0 };
      sceneVotes = { ...sceneVotes, [d.id]: { ...v, [d.dir]: v[d.dir] + 1 } };
      if (d.dir === "up" && d.params) liked = [{ id: d.id, params: d.params }, ...liked].slice(0, 60);
    };
    window.addEventListener("hero-feedback", onFeedback);

    Promise.all([import("./projects/algorithms/engine/physarum"), import("./projects/algorithms/engine/versions")])
      .then(([{ Physarum }, { VERSIONS, HERO_VERSION_ID }]) => {
        if (disposed) return;
        Engine = Physarum as typeof Engine;
        sceneList = VERSIONS.filter((v) => v.dimension !== "3d").map((v) => ({ id: v.id, params: v.params as unknown as P }));
        const hero = VERSIONS.find((v) => v.id === HERO_VERSION_ID) || VERSIONS[0];
        const start = () => {
          if (disposed) return;
          current = { id: hero.id, params: hero.params as unknown as P }; // canonical Monochrome Drift on first paint
          build(current.params);
          canvas.style.opacity = "1"; // fade the sim in (CSS transition on the canvas)
          announce();
          run();
        };
        if (reduce) start();
        else startT = window.setTimeout(start, START_DELAY);
      })
      .catch(() => {
        /* engine failed to load — leave background empty */
      });

    const onReseed = () => {
      if (!Engine || !sceneList.length) return;
      build(choose());
      announce();
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
      io?.disconnect();
      window.clearTimeout(startT);
      window.clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hero-physarum-reseed", onReseed);
      window.removeEventListener("hero-feedback", onFeedback);
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
