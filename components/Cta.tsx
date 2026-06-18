"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CtaCanvas from "./CtaCanvas";
import RandomiseButton from "./RandomiseButton";
import { BLURBS } from "@/lib/blurbs";
import { loadVotes, recordVote, pickWeighted, type VoteMap } from "@/lib/blurbVotes";

const RESEED_EVENT = "cta-mycelium-reseed";
const CYCLE_MS = 11000;

/**
 * Closing CTA — a living statement panel. The headline cycles the studio's
 * shared pool of points of view (lib/blurbs) and the Field Dynamics background
 * re-seeds, both every 8s. RANDOMISE forces the change. A small ring counts
 * down the cycle. The `cta-mycelium-reseed` event is the single "randomise now"
 * signal: the timer and the button both dispatch it; this panel swaps the line
 * and CtaCanvas re-seeds the field off the same event.
 */
export default function Cta() {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  const [cycle, setCycle] = useState(0); // re-keys the countdown ring so it restarts each round
  const [flash, setFlash] = useState<"up" | "down" | null>(null); // brief vote confirmation
  const idxRef = useRef(0);
  const votesRef = useRef<VoteMap>({});
  const reduceRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;

    votesRef.current = loadVotes();
    const start = pickWeighted(BLURBS, votesRef.current);
    idxRef.current = start;
    setIdx(start);
    if (reduce) return; // hold a single line + a static field

    let fadeT: ReturnType<typeof setTimeout>;
    let nextT: ReturnType<typeof setTimeout>;

    const schedule = () => {
      clearTimeout(nextT);
      nextT = setTimeout(() => window.dispatchEvent(new CustomEvent(RESEED_EVENT)), CYCLE_MS);
    };

    const onReseed = () => {
      setVis(false);
      clearTimeout(fadeT);
      fadeT = setTimeout(() => {
        const n = pickWeighted(BLURBS, votesRef.current, idxRef.current);
        idxRef.current = n;
        setIdx(n);
        setVis(true);
      }, 480);
      setCycle((c) => c + 1); // restart the ring + reset the clock
      schedule();
    };

    window.addEventListener(RESEED_EVENT, onReseed);

    // Only cycle (text swap + field re-seed) while the CTA is on screen —
    // otherwise we'd be remounting the p5 field every 8s for nobody.
    let io: IntersectionObserver | null = null;
    const sec = sectionRef.current;
    if (sec && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setCycle((c) => c + 1);
              schedule();
            } else {
              clearTimeout(nextT);
            }
          }
        },
        { threshold: 0 }
      );
      io.observe(sec);
    } else {
      setCycle((c) => c + 1);
      schedule();
    }

    return () => {
      clearTimeout(fadeT);
      clearTimeout(nextT);
      io?.disconnect();
      window.removeEventListener(RESEED_EVENT, onReseed);
    };
  }, []);

  // Thumbs feedback on the line currently on screen — records the vote (which
  // re-weights future picks) then moves on to the next statement.
  const onVote = (dir: "up" | "down") => {
    votesRef.current = recordVote(BLURBS[idxRef.current], dir);
    setFlash(dir);
    window.setTimeout(() => setFlash(null), 520);
    if (reduceRef.current) {
      // No auto-cycle in reduced motion — advance the line directly.
      const n = pickWeighted(BLURBS, votesRef.current, idxRef.current);
      idxRef.current = n;
      setIdx(n);
    } else {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(RESEED_EVENT)), 360);
    }
  };

  return (
    <section ref={sectionRef} data-theme="dark" style={{ position: "relative", overflow: "hidden", borderTop: "1px solid var(--line)", background: "var(--bg-0)", color: "var(--fg)" }}>
      <div data-par="0.14" style={{ position: "absolute", inset: "-14% 0", zIndex: 0, willChange: "transform" }}>
        <CtaCanvas />
      </div>
      {/* scrim: keep the headline legible over the living field */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 70% at 50% 50%, color-mix(in srgb, var(--bg-0) 78%, transparent) 0%, color-mix(in srgb, var(--bg-0) 38%, transparent) 55%, transparent 100%)",
        }}
      />
      {/* Teach the rotation: thumbs sit just left of RANDOMISE and vote on the
          statement on screen. Down-voted lines gradually surface less. */}
      <div className="cta-votes" role="group" aria-label="Rate this statement">
        <button
          type="button"
          className={`cta-vote${flash === "down" ? " voted" : ""}`}
          onClick={() => onVote("down")}
          aria-label="This statement isn't working"
          title="Show this one less"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" transform="rotate(180 12 12)" />
          </svg>
        </button>
        <button
          type="button"
          className={`cta-vote${flash === "up" ? " voted" : ""}`}
          onClick={() => onVote("up")}
          aria-label="This statement is working"
          title="Show this one more"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 3v10M7 13.5l1.4 5.3a2 2 0 0 0 3.86-.5l-.5-3.3H17a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 16 3H8.2A2 2 0 0 0 6.2 4.7L5 10.5A2 2 0 0 0 7 13.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <RandomiseButton event={RESEED_EVENT} title="Randomise the field + statement" />
      <div
        className="hero-glow"
        style={{
          position: "absolute",
          top: "-40%",
          left: "-12%",
          width: "60%",
          height: "180%",
          background: "radial-gradient(closest-side, var(--accent), transparent 72%)",
          opacity: 0.07,
          filter: "blur(20px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        data-stag
        className="page-gutter"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(90px,17vh,190px) var(--gutter)",
          textAlign: "center",
        }}
      >
        {/* timer indicator eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 11,
            marginBottom: "clamp(22px,4vh,38px)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          <span key={cycle} className="cta-timer" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.2" stroke="var(--line)" strokeWidth="1.7" />
              <circle
                className="cta-timer-arc"
                cx="10"
                cy="10"
                r="8.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                transform="rotate(-90 10 10)"
              />
            </svg>
          </span>
          Letting things flow
        </div>

        {/* headline wrapper is the GSAP-revealed element; the inner line fades on
            its own React-driven opacity, so the two never fight over opacity. */}
        <div>
          <h2
            style={{
              margin: "0 auto",
              maxWidth: "22ch",
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "clamp(32px,5.2vw,78px)",
              fontWeight: 500,
              lineHeight: 1.02,
              letterSpacing: "-0.026em",
              minHeight: "calc(1.02em * 3)",
              opacity: vis ? 1 : 0,
              transition: "opacity .5s ease",
            }}
          >
            {BLURBS[idx]}
          </h2>
        </div>

        <div
          style={{
            marginTop: "clamp(36px,5vh,62px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "18px 22px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link
            href="/contact"
            className="pill pill-solid"
            style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 30px" }}
          >
            Let&apos;s collaborate
          </Link>
        </div>
      </div>
    </section>
  );
}
