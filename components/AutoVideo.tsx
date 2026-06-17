"use client";

import { useEffect, useRef } from "react";

/** Autoplay/muted/loop video that fades in once it can play (so it doesn't pop). */
export default function AutoVideo({
  src,
  poster,
  style,
}: {
  src: string;
  poster?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    const show = () => {
      el.style.opacity = "1";
    };
    el.addEventListener("canplay", show, { once: true });
    el.addEventListener("playing", show, { once: true });
    const t = window.setTimeout(show, 1500);

    const tryPlay = () => {
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    };

    // Play only while on screen; pause (keeping currentTime) when scrolled away,
    // so it resumes from the same spot when it returns.
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) tryPlay();
            else el.pause();
          }
        },
        { threshold: 0.15 }
      );
      io.observe(el);
    } else {
      tryPlay();
    }

    return () => {
      window.clearTimeout(t);
      if (io) io.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 0,
        transition: "opacity 1.3s ease",
        ...style,
      }}
    />
  );
}
