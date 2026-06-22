"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero control cluster (bottom-right): a small caption + two equal-height
 * buttons — Remix and a sound toggle.
 *  - Remix re-seeds the live Jones/Physarum sim (hero-physarum-reseed) and, if
 *    sound is on, rolls a fresh random biome soundscape.
 *  - Sound toggles a generative biome soundscape (the instruments-rack engine,
 *    lazy-loaded on first enable; the click is the audio-unlock gesture).
 */
type BiomeLike = { start: () => Promise<void>; setMuted: (m: boolean) => void; apply: (s: unknown, m?: unknown) => void; setPalette?: (p: number[]) => void };

export default function HeroControls() {
  const [soundOn, setSoundOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const biomeRef = useRef<BiomeLike | null>(null);
  const rollRef = useRef<(() => void) | null>(null);
  const suspendRef = useRef<(() => void) | null>(null);

  // Auto-remix countdown ring: a circle "fills" over AUTO_MS and, on each
  // completion, fires a remix and restarts. The progress circle is driven by
  // the Web Animations API so the visual and the trigger stay in lock-step.
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
    window.dispatchEvent(new CustomEvent("hero-physarum-reseed"));
    if (soundOn) rollRef.current?.(); // a new random selection of the soundscape
  };
  remixRef.current = remix; // keep the timer's callback bound to the latest soundOn

  // A manual click remixes and resets the countdown so the next auto-remix is a
  // full 11s away (no jarring near-instant re-trigger).
  const onRemixClick = () => {
    remix();
    restartRef.current();
  };

  // Drive the ring + auto-remix loop. Disabled under reduced-motion; the
  // countdown only advances while the hero is actually on screen AND the tab is
  // visible — so we never rebuild the (heavy) WebGL sim for a hero nobody's
  // looking at, which was hitching the rest of the page as you scrolled down.
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
      a.onfinish = () => {
        remixRef.current();
        start();
      };
      animRef.current = a;
      sync(); // don't run the countdown if we start out off-screen/hidden
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
  }, [AUTO_MS, RING_C]);

  const toggleSound = async () => {
    if (busy) return;
    if (soundOn) {
      try {
        biomeRef.current?.setMuted(true);
        suspendRef.current?.(); // hard-stop the shared context — guaranteed silence, no lingering pulse
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
      await shared.ensureAudio(); // resume the AudioContext (this click is the gesture)
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
      rollRef.current?.(); // random selection of the biome soundscape
      biomeRef.current.setMuted(false);
      setSoundOn(true);
    } catch {
      /* audio unavailable — leave it off */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-ctl" ref={rootRef}>
      <span className="hero-ctl-cap">Slime mold algorithm visualisation</span>
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
      </div>
    </div>
  );
}
