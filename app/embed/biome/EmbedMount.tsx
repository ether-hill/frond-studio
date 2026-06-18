"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

type MiniSize = "micro" | "compact" | "mini";
const SIZES: MiniSize[] = ["micro", "compact", "mini"];

/**
 * Client mount for the embeddable Biome mini. Reads ?size and ?s from the URL,
 * lazily imports the engine (client-only — the AudioContext never touches SSR),
 * decodes any shared snapshot, and mounts the mini into a ref div. On unmount the
 * shared audio context is suspended so embeds go silent when removed.
 */
export default function EmbedMount() {
  const ref = useRef<HTMLDivElement>(null);
  const sp = useSearchParams();
  const raw = sp.get("size");
  const size: MiniSize = SIZES.includes(raw as MiniSize) ? (raw as MiniSize) : "micro";
  const s = sp.get("s");

  useEffect(() => {
    // Embeds are a consistent dark card regardless of the host page or the visitor's
    // system theme, so pin the embed document to dark (the root layout's theme script
    // would otherwise flip it to light on some hosts).
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ mountMini }, { decodeState, readSharedFromLocation }] = await Promise.all([
          import("@/components/projects/instruments/engine/instruments/biomeMini"),
          import("@/components/projects/instruments/engine/instruments/biomeShare"),
        ]);
        const state = (s ? decodeState(s) : null) ?? readSharedFromLocation();
        if (!cancelled && ref.current) mountMini(ref.current, { size, state });
      } catch (err) {
        console.error("Failed to mount Biome embed:", err);
      }
    })();

    return () => {
      cancelled = true;
      import("@/components/projects/instruments/engine/audioCtx")
        .then(({ getAudioContext }) => {
          try { getAudioContext().suspend(); } catch { /* no context yet */ }
        })
        .catch(() => {});
    };
  }, [size, s]);

  return <div ref={ref} />;
}
