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
  ratio,
}: {
  src: string;
  poster?: string;
  title?: string;
  /** Override the player's aspect-ratio (e.g. "1 / 1") so it matches the video
   *  and nothing is cropped. Omit to use the layout default (16:9 / grid 4:3). */
  ratio?: string;
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
    <div className="sym-player" style={ratio ? { aspectRatio: ratio } : undefined}>
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
