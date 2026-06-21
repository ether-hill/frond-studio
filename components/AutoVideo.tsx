"use client";

import { useEffect, useRef } from "react";

/**
 * Autoplay/muted/loop video. By default it fades in once it can play and covers
 * its box. Pass `noFade` to let CSS own opacity (for blend-mode backdrops), and
 * `objectFit="contain"` to letterbox instead of crop. An IntersectionObserver
 * re-asserts muted + play() when it enters the viewport (reliable autoplay) and
 * pauses it off-screen.
 */
export default function AutoVideo({
  src,
  poster,
  style,
  className,
  objectFit = "cover",
  noFade = false,
}: {
  src: string;
  poster?: string;
  style?: React.CSSProperties;
  className?: string;
  objectFit?: "cover" | "contain";
  noFade?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    const show = () => {
      if (!noFade) el.style.opacity = "1";
    };
    el.addEventListener("canplay", show, { once: true });
    el.addEventListener("playing", show, { once: true });
    const t = window.setTimeout(show, 1500);

    const tryPlay = () => {
      el.muted = true;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    };

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
  }, [noFade]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit,
        opacity: noFade ? undefined : 0,
        transition: "opacity 1.3s ease, transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
    />
  );
}
