"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cymatics Simulator — a faithful React port of the original Webflow simulator.
 * One looping cymatics video whose patterns morph through five frequencies; a
 * custom fill-scrubber, a sound toggle (the video carries the real tones), a
 * follow-cursor play/pause, and frequency tabs that seek along the timeline.
 */

const FREQS = [
  { hz: "66", sub: "" },
  { hz: "66", sub: "+ 98hz" },
  { hz: "82", sub: "" },
  { hz: "82", sub: "+ 132hz" },
  { hz: "102", sub: "+ 166hz" },
];

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CymaticsSimulator() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [time, setTime] = useState("0:00");
  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false);
  const [active, setActive] = useState(0);
  const [cur, setCur] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const onTime = () => {
      if (!v.duration) return;
      const f = v.currentTime / v.duration;
      setProgress(f);
      setActive(Math.min(FREQS.length - 1, Math.floor(f * FREQS.length)));
      setTime(fmt(v.currentTime));
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => setSound(!v.muted);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, []);

  const seek = (f: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.min(v.duration - 0.05, Math.max(0, f) * v.duration);
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setSound(!v.muted);
  };
  const onMove = (e: React.MouseEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    setCur({ x: e.clientX - r.left, y: e.clientY - r.top, show: true });
  };

  return (
    <div className="csim">
      <div className="csim-bar">
        <span className="csim-title">Cymatics Simulator</span>
        <span className="csim-time">{time}</span>
      </div>

      <div
        ref={stageRef}
        className="csim-stage"
        onClick={togglePlay}
        onMouseMove={onMove}
        onMouseLeave={() => setCur((c) => ({ ...c, show: false }))}
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause cymatics video" : "Play cymatics video"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePlay();
          }
        }}
      >
        <video ref={videoRef} className="csim-video" src="/cymatics-lab/simulator.mp4" loop playsInline preload="auto" />

        <button
          type="button"
          className="csim-sound"
          onClick={(e) => {
            e.stopPropagation();
            toggleSound();
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
            {sound && <path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
          </svg>
          {sound ? "Sound on" : "Turn sound on"}
        </button>

        {cur.show && (
          <span className="csim-cursor" style={{ transform: `translate(${cur.x}px, ${cur.y}px)` }} aria-hidden>
            {playing ? "Pause" : "Play"}
          </span>
        )}
      </div>

      <div
        className="csim-scrub"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          seek((e.clientX - r.left) / r.width);
        }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
      >
        <span className="csim-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="csim-tabs">
        {FREQS.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`csim-tab${i === active ? " on" : ""}`}
            onClick={() => seek(i / FREQS.length + 0.01)}
          >
            <span className="hz">
              {f.hz}
              <i>hz</i>
            </span>
            {f.sub && <span className="sub">{f.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
