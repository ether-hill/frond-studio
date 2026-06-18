"use client";

import { useEffect, useRef, useState } from "react";
import { BLURBS as LINES } from "@/lib/blurbs";

/**
 * The footer's big statement line — a randomiser that cycles the studio's shared
 * pool of points of view (see lib/blurbs). Starts on a random line, then drifts
 * gently between them with a soft fade. Respects reduced-motion (picks one line
 * and holds it). SSR renders the first line; the client randomises on mount to
 * avoid a hydration mismatch.
 */
const sharedStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontSize: "clamp(30px,4.4vw,68px)",
  fontWeight: 400,
  lineHeight: 1.04,
  letterSpacing: "-0.02em",
  maxWidth: "20ch",
  marginBottom: "clamp(48px,7vh,90px)",
  minHeight: "calc(1.04em * 3)",
  transition: "opacity .6s ease",
};

export default function FooterBlurb() {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  const idxRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // randomise the starting line on the client
    const start = Math.floor(Math.random() * LINES.length);
    idxRef.current = start;
    setIdx(start);

    if (reduce) return;

    let fadeTimer: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setVis(false);
      fadeTimer = setTimeout(() => {
        let n = Math.floor(Math.random() * LINES.length);
        if (n === idxRef.current) n = (n + 1) % LINES.length;
        idxRef.current = n;
        setIdx(n);
        setVis(true);
      }, 600);
    }, 5200);

    return () => {
      clearInterval(cycle);
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <h2 data-rvs style={{ ...sharedStyle, opacity: vis ? 1 : 0 }}>
      {LINES[idx]}
    </h2>
  );
}
