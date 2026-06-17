"use client";

import { useEffect, useRef } from "react";

export type InstrumentKind = "hub" | "juno-106" | "space-echo" | "theremin";

/**
 * Mounts a Web-Audio instrument (or the rack hub) into a container, ported from
 * generatives.vercel.app. Engine modules are imported lazily (client-only) so the
 * AudioContext never touches SSR. On unmount the shared context is suspended so
 * sound stops when you navigate away.
 */
export default function InstrumentMount({ kind }: { kind: InstrumentKind }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (kind === "hub") {
          const m = await import("./engine/instruments/hub");
          if (!cancelled && ref.current) m.mountHub(ref.current);
          return;
        }
        const mod =
          kind === "juno-106"
            ? await import("./engine/instruments/juno106")
            : kind === "space-echo"
            ? await import("./engine/instruments/spaceEcho")
            : await import("./engine/instruments/theremin");
        if (!cancelled && ref.current) mod.mount(ref.current);
      } catch (err) {
        console.error("Failed to mount instrument:", err);
      }
    })();

    return () => {
      cancelled = true;
      // Silence audio when leaving the page.
      import("./engine/audioCtx")
        .then(({ getAudioContext }) => {
          try {
            getAudioContext().suspend();
          } catch {
            /* no context yet */
          }
        })
        .catch(() => {});
    };
  }, [kind]);

  return <div ref={ref} className="inst-root" />;
}
