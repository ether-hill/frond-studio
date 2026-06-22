"use client";

import { useEffect, useRef } from "react";

// MyceliumBg listens for this event to grow a fresh network + palette.
const RESEED = "about-mycelium-reseed";
const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Tiny remix / timer control for the Fungi Source mycelium hero: a compact pill
 * with a countdown ring that auto-grows a new network every `autoMs`, and on
 * click. The ring only advances while the hero is on screen and the tab is
 * visible; reduced motion holds it still.
 */
export default function MyceliumTimer({ autoMs = 10000 }: { autoMs?: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const animRef = useRef<Animation | null>(null);
  const restartRef = useRef<() => void>(() => {});

  const reseed = () => window.dispatchEvent(new CustomEvent(RESEED));

  useEffect(() => {
    const el = ringRef.current;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      const a = el.animate([{ strokeDashoffset: RING_C }, { strokeDashoffset: 0 }], { duration: autoMs, easing: "linear" });
      a.onfinish = () => { reseed(); start(); };
      animRef.current = a;
      sync();
    };
    restartRef.current = start;

    const onVis = () => sync();
    document.addEventListener("visibilitychange", onVis);
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && rootRef.current) {
      io = new IntersectionObserver(
        (entries) => { for (const e of entries) inView = e.isIntersecting; sync(); },
        { threshold: 0 },
      );
      io.observe(rootRef.current);
    }
    start();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
      animRef.current?.cancel();
    };
  }, [autoMs]);

  const onClick = () => { reseed(); restartRef.current(); };

  return (
    <button ref={rootRef} type="button" className="ui-btn ui-btn-pill fs-myc-btn" onClick={onClick} aria-label="Grow a new mycelium" title="Grow a new mycelium — auto-grows every few seconds">
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
  );
}
