"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Control cluster for the About-hero mycelium background — the same widget as the
 * home hero (caption + Remix-with-countdown-ring + sound toggle + 👍/👎), wired to
 * the live mycelium instead of the Jones sim. Remix (and the thumbs) grow a fresh
 * network + palette via the `about-mycelium-reseed` event; the sound toggle plays
 * the shared biome soundscape. Auto-remix only runs while the hero is on screen.
 */
type BiomeLike = { start: () => Promise<void>; setMuted: (m: boolean) => void; apply: (s: unknown, m?: unknown) => void; setPalette?: (p: number[]) => void };

const RESEED = "about-mycelium-reseed";

export default function AboutMyceliumControls() {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const biomeRef = useRef<BiomeLike | null>(null);
  const rollRef = useRef<(() => void) | null>(null);
  const suspendRef = useRef<(() => void) | null>(null);

  const AUTO_MS = 11000;
  const RING_R = 9;
  const RING_C = 2 * Math.PI * RING_R;
  const ringRef = useRef<SVGCircleElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const remixRef = useRef<() => void>(() => {});
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      try {
        biomeRef.current?.setMuted(true);
        suspendRef.current?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  const remix = () => {
    window.dispatchEvent(new CustomEvent(RESEED));
    if (soundOn) rollRef.current?.();
  };
  remixRef.current = remix;

  const onRemixClick = () => {
    remix();
    restartRef.current();
  };

  // Auto-remix countdown ring — only advances while on screen and tab visible.
  useEffect(() => {
    const el = ringRef.current;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) return;

    let inView = true;
    const active = () => inView && !document.hidden;
    const sync = () => {
      const a = animRef.current;
      if (!a) return;
      if (active()) a.play();
      else a.pause();
    };
    const start = () => {
      animRef.current?.cancel();
      const a = el.animate(
        [{ strokeDashoffset: RING_C }, { strokeDashoffset: 0 }],
        { duration: AUTO_MS, easing: "linear" }
      );
      a.onfinish = () => { remixRef.current(); start(); };
      animRef.current = a;
      sync();
    };
    restartRef.current = start;

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && rootRef.current) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) inView = e.isIntersecting;
          sync();
        },
        { threshold: 0 }
      );
      io.observe(rootRef.current);
    }

    start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      animRef.current?.cancel();
    };
  }, [RING_C]);

  const toggleSound = async () => {
    if (busy) return;
    if (soundOn) {
      try {
        biomeRef.current?.setMuted(true);
        suspendRef.current?.();
      } catch {
        /* noop */
      }
      setSoundOn(false);
      return;
    }
    setBusy(true);
    try {
      const [shared, engine] = await Promise.all([
        import("@/components/projects/instruments/engine/instruments/shared"),
        import("@/components/projects/instruments/engine/instruments/biomeEngine"),
      ]);
      await shared.ensureAudio();
      suspendRef.current = shared.suspendAudio;
      if (!biomeRef.current) {
        const b = new engine.Biome() as unknown as BiomeLike;
        await b.start();
        biomeRef.current = b;
        rollRef.current = () => {
          const { strands, master, palette } = engine.randomConfig();
          try {
            b.setPalette?.(palette);
          } catch {
            /* noop */
          }
          b.apply(strands, master);
        };
      }
      rollRef.current?.();
      biomeRef.current.setMuted(false);
      setSoundOn(true);
    } catch {
      /* audio unavailable — leave it off */
    } finally {
      setBusy(false);
    }
  };

  // 👍 / 👎 — grow a different network (the mycelium has no learning target, so
  // both simply reseed, with the same brief confirmation flash as the hero).
  const vote = (dir: "up" | "down") => {
    window.dispatchEvent(new CustomEvent(RESEED));
    setFlash(dir);
    window.setTimeout(() => setFlash(null), 600);
  };

  return (
    <div className="hero-ctl" ref={rootRef}>
      <span className="hero-ctl-cap">Mycelium algorithm visualisation</span>
      <div className="hero-ctl-row" role="group" aria-label="Visualisation controls">
        <button type="button" className="ui-btn ui-btn-pill" onClick={onRemixClick} aria-label="Remix the visualisation">
          <svg className="hero-ring" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r={RING_R} stroke="currentColor" strokeWidth="2" opacity="0.28" />
            <circle
              ref={ringRef}
              cx="12"
              cy="12"
              r={RING_R}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              transform="rotate(-90 12 12)"
              style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C }}
            />
          </svg>
          Remix
        </button>
        <button
          type="button"
          className={`ui-btn ui-btn-icon${soundOn ? " on" : ""}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
          title={soundOn ? "Sound on — Remix for a new soundscape" : "Turn on sound"}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" fill="currentColor" />
            {soundOn ? (
              <>
                <path d="M16 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M18.6 6.6a7.5 7.5 0 0 1 0 10.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </>
            ) : (
              <path d="M17 9.5l4 5M21 9.5l-4 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <button type="button" className={`ui-btn ui-btn-icon${flash === "up" ? " voted" : ""}`} onClick={() => vote("up")} aria-label="Grow a different network" title="Grow another">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={`ui-btn ui-btn-icon${flash === "down" ? " voted" : ""}`} onClick={() => vote("down")} aria-label="Grow a different network" title="Grow another">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <g transform="rotate(180 12 12)">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </button>
      </div>
    </div>
  );
}
