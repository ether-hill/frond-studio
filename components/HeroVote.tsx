"use client";

import { useEffect, useRef, useState } from "react";
import { submitHeroVote } from "@/app/hero-vote-actions";

/**
 * Subtle 👍/👎 beside the hero RANDOMISE circle. It tracks whatever the live
 * Jones/Physarum sim is showing (via the `hero-render` event from HeroPhysarum),
 * and a vote (a) writes to the global aggregate (server action → Upstash) and
 * (b) relays a `hero-feedback` event so HeroPhysarum re-weights this session's
 * randomises right away. Up-votes also bank the exact config to mutate from.
 * Renders nothing until a render exists; hidden under reduced motion.
 */
type Render = { id: string; params: Record<string, unknown> };

export default function HeroVote() {
  const [current, setCurrent] = useState<Render | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const votedRef = useRef(false); // one vote per on-screen render

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onRender = (ev: Event) => {
      const d = (ev as CustomEvent).detail as Render | undefined;
      if (!d?.id) return;
      votedRef.current = false;
      setCurrent(d);
    };
    window.addEventListener("hero-render", onRender);
    return () => window.removeEventListener("hero-render", onRender);
  }, []);

  if (!current) return null;

  const vote = (dir: "up" | "down") => {
    if (votedRef.current) return;
    votedRef.current = true;
    const { id, params } = current;
    submitHeroVote(id, dir, dir === "up" ? params : null).catch(() => {});
    window.dispatchEvent(new CustomEvent("hero-feedback", { detail: { id, dir, params } }));
    setFlash(dir);
    window.setTimeout(() => setFlash(null), 600);
  };

  return (
    <div className="hero-votes" role="group" aria-label="Rate this pattern">
      <button
        type="button"
        className={`hero-vote${flash === "up" ? " voted" : ""}`}
        onClick={() => vote("up")}
        aria-label="More patterns like this"
        title="Show more like this"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className={`hero-vote${flash === "down" ? " voted" : ""}`}
        onClick={() => vote("down")}
        aria-label="Fewer patterns like this"
        title="Show fewer like this"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" transform="rotate(180 12 12)" />
        </svg>
      </button>
    </div>
  );
}
