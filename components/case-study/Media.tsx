"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaSlot, Ratio } from "@/content/projects/_types";

const RATIO: Record<Ratio, string> = {
  "4:5": "4 / 5",
  "3:4": "3 / 4",
  "16:9": "16 / 9",
};

/**
 * Shared media renderer for case studies.
 *  - Empty `src` -> a labelled placeholder box (aspect-ratio held), so a page can
 *    ship before the real asset exists.
 *  - Video -> muted/loop/playsinline, preload="none", autoplay only while on
 *    screen (IntersectionObserver), paused without resetting currentTime when it
 *    scrolls away. Under prefers-reduced-motion it never autoplays — the poster
 *    stands in.
 *  - Image -> native lazy-loading.
 */
export default function Media({ slot, className }: { slot: MediaSlot; className?: string }) {
  const aspectRatio = RATIO[slot.ratio];
  const frame: React.CSSProperties = {
    position: "relative",
    aspectRatio,
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--media)",
    border: "1px solid var(--line-2)",
  };

  if (!slot.src) {
    return (
      <figure className={className} style={{ margin: 0 }}>
        <div style={{ ...frame, display: "grid", placeItems: "center", borderStyle: "dashed", borderColor: "var(--line)" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--fg-faint)",
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            {slot.label || "Media"} — placeholder
          </span>
        </div>
        {slot.label ? <Caption text={slot.label} /> : null}
      </figure>
    );
  }

  return (
    <figure className={className} style={{ margin: 0 }}>
      <div style={frame}>{slot.type === "video" ? <LazyVideo slot={slot} /> : <img src={slot.src} alt={slot.alt} loading="lazy" decoding="async" style={fill} />}</div>
      {slot.label ? <Caption text={slot.label} /> : null}
    </figure>
  );
}

const fill: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

function Caption({ text }: { text: string }) {
  return (
    <figcaption
      style={{
        marginTop: 12,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--fg-faint)",
      }}
    >
      {text}
    </figcaption>
  );
}

function LazyVideo({ slot }: { slot: MediaSlot }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const reduced = !!m?.matches;
    setReduce(reduced);
    const el = ref.current;
    if (!el || reduced) return; // reduced motion: leave the poster, never autoplay

    el.muted = true;
    const tryPlay = () => {
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    };

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) tryPlay();
            else el.pause(); // keeps currentTime -> resumes from the same spot
          }
        },
        { threshold: 0.2 }
      );
      io.observe(el);
    } else {
      tryPlay();
    }
    return () => io?.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={slot.src}
      poster={slot.poster || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-label={slot.alt}
      autoPlay={false}
      controls={reduce}
      style={fill}
    />
  );
}
