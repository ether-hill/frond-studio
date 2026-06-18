"use client";

import { useRef, useState } from "react";

/**
 * A click-to-play video player matching the original Symcyto grid: a poster
 * still with a centred play button; on play it reveals the native scrubber /
 * volume / fullscreen controls. Muted-looping like the source timelapses.
 */
export default function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    setStarted(true);
  };

  return (
    <div className="sym-player">
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls={started}
        loop
        playsInline
        preload="none"
      />
      {!started && (
        <button type="button" className="sym-play" onClick={play} aria-label={title ? `Play “${title}”` : "Play video"}>
          <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden="true">
            <path d="M21 12 0 24V0l21 12Z" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  );
}
