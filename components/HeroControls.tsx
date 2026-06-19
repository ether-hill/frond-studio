"use client";

import { useEffect, useRef, useState } from "react";
import { submitHeroVote } from "@/app/hero-vote-actions";

/**
 * Hero control cluster (bottom-right): a small caption + four equal-height
 * buttons — Remix, a sound toggle, and 👍/👎.
 *  - Remix re-seeds the live Jones/Physarum sim (hero-physarum-reseed) and, if
 *    sound is on, rolls a fresh random biome soundscape.
 *  - Sound toggles a generative biome soundscape (the instruments-rack engine,
 *    lazy-loaded on first enable; the click is the audio-unlock gesture).
 *  - 👍/👎 vote on the render on screen (via the hero-render / hero-feedback
 *    events + the global aggregate), teaching the randomiser.
 */
type Render = { id: string; params: Record<string, unknown> };
type BiomeLike = { start: () => Promise<void>; setMuted: (m: boolean) => void; apply: (s: unknown, m?: unknown) => void; setPalette?: (p: number[]) => void };

export default function HeroControls() {
  const [current, setCurrent] = useState<Render | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const votedRef = useRef(false);
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
  const animRef = useRef<Animation | null>(null);
  const remixRef = useRef<() => void>(() => {});
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    const onRender = (ev: Event) => {
      const d = (ev as CustomEvent).detail as Render | undefined;
      if (!d?.id) return;
      votedRef.current = false;
      setCurrent(d);
    };
    window.addEventListener("hero-render", onRender);
    return () => {
      window.removeEventListener("hero-render", onRender);
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

  // Drive the ring + auto-remix loop. Disabled under reduced-motion; paused when
  // the tab is hidden so the countdown matches what the visitor actually sees.
  useEffect(() => {
    const el = ringRef.current;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) return;

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
    };
    restartRef.current = start;

    const onVisibility = () => {
      if (document.hidden) animRef.current?.pause();
      else animRef.current?.play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      animRef.current?.cancel();
    };
  }, [AUTO_MS, RING_C]);

  const toggleSound = async () => {
    if (busy) return;
    if (soundOn) {
      try {
        biomeRef.current?.setMuted(true);
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

  const vote = (dir: "up" | "down") => {
    if (!current || votedRef.current) return;
    votedRef.current = true;
    const { id, params } = current;
    submitHeroVote(id, dir, dir === "up" ? params : null).catch(() => {});
    window.dispatchEvent(new CustomEvent("hero-feedback", { detail: { id, dir, params } }));
    setFlash(dir);
    window.setTimeout(() => setFlash(null), 600);
  };

  return (
    <div className="hero-ctl">
      <span className="hero-ctl-cap">Slime mold algorithm visualisation</span>
      <div className="hero-ctl-row" role="group" aria-label="Visualisation controls">
        <button type="button" className="hero-btn hero-btn-wide" onClick={onRemixClick} aria-label="Remix the visualisation">
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
          className={`hero-btn${soundOn ? " on" : ""}`}
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
        <button type="button" className={`hero-btn${flash === "up" ? " voted" : ""}`} onClick={() => vote("up")} aria-label="More patterns like this" title="Show more like this">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={`hero-btn${flash === "down" ? " voted" : ""}`} onClick={() => vote("down")} aria-label="Fewer patterns like this" title="Show fewer like this">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" transform="rotate(180 12 12)" />
          </svg>
        </button>
      </div>
    </div>
  );
}
