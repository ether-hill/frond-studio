"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The footer's big statement line — a randomiser that cycles a pool of the
 * studio's points of view (biophilic design, patterns in nature, positive AI,
 * systems thinking, what slime moulds and fungal networks can teach us). Starts
 * on a random line, then drifts gently between them with a soft fade. Respects
 * reduced-motion (picks one line and holds it). SSR renders the first line; the
 * client randomises on mount to avoid a hydration mismatch.
 */
const LINES = [
  "We design the way nature does — with patterns, not blueprints.",
  "Biophilic by default: software that brings a little more life into the room.",
  "The same spirals shape galaxies, ferns and an interface worth using.",
  "We use AI to widen what people can make — never to replace the maker.",
  "Everything is a system; we design the relationships, not just the parts.",
  "A slime mould has no brain and still finds the shortest path. So can a product.",
  "Fungal networks route nutrients to where they're needed. Good software routes attention.",
  "Simple rules, repeated, become complex life — and the best digital things.",
  "We'd rather grow a project like a garden than assemble it like a machine.",
  "Resilience is a forest trait: many small parts, quietly connected.",
  "Emergence over control — set the conditions and let the work find its form.",
  "Nature wastes nothing; neither should an interface.",
  "We study how things grow, then build things that grow well.",
  "Positive technology: tools that leave their users calmer than they found them.",
  "Mycelium thinks with its whole body. We try to design that way too.",
  "Feedback loops, not features, decide whether a system stays alive.",
  "The most advanced pattern is usually the oldest one in the field.",
  "Decentralised, adaptive, patient — the qualities we borrow from living systems.",
  "Good design, like good soil, is mostly invisible and holds everything up.",
  "We make for the long season — things that age into the landscape, not out of it.",
];

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
