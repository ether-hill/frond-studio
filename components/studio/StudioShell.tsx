"use client";

import { useEffect, useRef } from "react";

/**
 * StudioShell — the GLOBAL MASTER TEMPLATE for all visualisation / generative /
 * algorithm project pages (SMA Config, Algorithm Lab, and future ones).
 *
 * It owns the layout, styles and chrome: the design-system header (title +
 * summary), the margin-aligned grid, the bordered visual panel with its overlay
 * slots (preset/algorithm dropdowns top-left, action buttons top-right, FPS
 * bottom-left), the sticky controls sidebar, and the About section — all styled
 * by the single `STUDIO_CSS` source of truth below.
 *
 * Each project passes a `scaffold` (the inner grid HTML, using `.studio-*`
 * classes + its own engine ids) and a `load()` that returns the engine's mount
 * function. EDIT THIS FILE ONCE AND EVERY STUDIO PAGE UPDATES.
 */

export const STUDIO_CSS = `
.studio-root { font-family: var(--font-body), 'Helvetica Neue', Helvetica, Arial, sans-serif; }

/* header — site margins */
.studio-head { max-width: var(--maxw); margin: 0 auto; padding: var(--pad-top) var(--gutter) clamp(26px,4vw,44px); }
.studio-title { margin: 0; font-family: var(--font-display), sans-serif; font-weight: 600; font-size: clamp(44px,7vw,108px); line-height: 0.94; letter-spacing: -0.035em; }
.studio-intro { margin: clamp(18px,2.5vh,28px) 0 0; max-width: 60ch; font-size: clamp(14px,1.6vw,17px); line-height: 1.6; color: var(--fg-dim); }

/* layout — visual + controls sidebar, within the gutter/maxw column */
.studio-wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 var(--gutter) var(--pad-bottom); }
.studio-grid { display: grid; grid-template-columns: minmax(0,1fr) 304px; gap: clamp(20px,2.4vw,40px); align-items: start; }

/* algorithm selector — sits below the summary, above the art window */
.studio-selectbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: clamp(16px,2vw,24px); }
.studio-selectbar label { font: 700 10px var(--font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-faint); }
.studio-selectbar select { background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 999px; padding: 11px 20px; font: 500 14px var(--font-body), sans-serif; cursor: pointer; min-width: min(460px, 84vw); }
.studio-selectbar select:hover { border-color: var(--accent); }
.studio-presetbar button { background: rgba(0,0,0,0.45); color: #fff; border: 1px solid rgba(255,255,255,0.24); border-radius: 999px; width: 28px; height: 24px; padding: 0; font: 12px ui-monospace, monospace; cursor: pointer; }
.studio-presetbar button:hover { border-color: rgba(255,255,255,0.6); }

/* the visual — expands to fill the space; the sim covers it via object-fit */
.studio-visual { position: relative; width: 100%; height: min(86vh, 1040px); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #000; touch-action: none; }
.studio-visual canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; object-position: center; image-rendering: auto; touch-action: none; }
.studio-visual::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 88% 88% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%); z-index: 1; }

/* action buttons — over the visual, top-right (RESTART / RANDOMISE / etc.) */
.studio-topctl { position: absolute; top: 12px; right: 12px; z-index: 13; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: calc(100% - 24px); }
.studio-topctl button { background: rgba(8,8,8,0.6); color: #ededed; border: 1px solid rgba(255,255,255,0.22); border-radius: 999px; padding: 8px 15px; font: 600 10px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: border-color .2s ease, background-color .2s ease; }
.studio-topctl button:hover { border-color: rgba(255,255,255,0.6); background: rgba(8,8,8,0.82); }
.studio-topctl button:disabled { opacity: 0.5; cursor: default; }

/* preset / algorithm picker — over the visual, top-left */
.studio-presetbar { position: absolute; top: 12px; left: 12px; z-index: 11; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: rgba(8,8,8,0.6); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 6px 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); max-width: calc(100% - 24px); }
.studio-presetbar label { color: rgba(255,255,255,0.6); font: 700 9px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.16em; text-transform: uppercase; }
.studio-presetbar select { background: rgba(0,0,0,0.45); color: #fff; border: 1px solid rgba(255,255,255,0.24); border-radius: 999px; padding: 4px 9px; font: 11px ui-monospace, monospace; cursor: pointer; max-width: 52vw; }
.studio-hide { display: none !important; }

.studio-fps { position: absolute; left: 14px; bottom: 12px; z-index: 11; color: rgba(255,255,255,0.55); font: 11px ui-monospace, monospace; pointer-events: none; }
.studio-fatal { position: absolute; inset: 0; display: none; place-items: center; padding: 2rem; color: #ff9b9b; text-align: center; line-height: 1.6; z-index: 14; }

/* sidebar — controls + actions, sticky while scrolling */
.studio-side { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 92px; }
.studio-ctrltoggle { display: none; align-items: center; gap: 8px; align-self: flex-start; font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg-dim); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: color .2s ease, border-color .2s ease; }
.studio-ctrltoggle:hover { color: var(--fg); border-color: var(--accent); }
.studio-controls { width: 100%; }
.studio-controls .lil-gui { --background-color: rgba(8,8,8,0.92); --widget-color: #1c1c1c; --title-background-color: #0c0c0c; max-height: calc(100svh - 150px); overflow-y: auto; }
.studio-controls .lil-gui.root { width: 100% !important; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.studio-controls .tp-dfwv { width: 100%; }

/* shared action block (snapshot / video / presets) in the sidebar */
.studio-actions { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 14px; }
.studio-lbl { font: 700 10px var(--font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-faint); }
.studio-row { display: flex; gap: 6px; flex-wrap: wrap; }
.studio-btn, .studio-actions select { background: transparent; color: var(--fg-dim); border: 1px solid var(--line); border-radius: 8px; padding: 8px 13px; font: 500 12px var(--font-body), sans-serif; cursor: pointer; transition: color .2s ease, border-color .2s ease; }
.studio-btn:hover { color: var(--fg); border-color: var(--accent); }
.studio-btn:disabled { opacity: 0.5; cursor: default; }
.studio-presets { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.studio-preset { display: flex; gap: 4px; }
.studio-preset .load { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* About — a wide, readable section below the studio */
.studio-about { margin-top: clamp(40px, 5vw, 72px); border-top: 1px solid var(--line); padding-top: clamp(26px, 3vw, 40px); color: var(--fg-dim); }
.studio-paneltoggle { width: 100%; max-width: var(--maxw); display: flex; justify-content: space-between; align-items: center; gap: 16px; background: transparent; border: 0; color: var(--fg); cursor: pointer; font: 500 12px var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; padding: 0; }
.studio-paneltoggle .caret { color: var(--fg-dim); }
.studio-panelbody { margin-top: clamp(18px, 2.4vw, 30px); }
.studio-panelbody.hidden { display: none; }
.studio-about-body { color: var(--fg-dim); font-size: clamp(13px, 1vw, 15px); line-height: 1.65; }
.studio-about-lead { max-width: 72ch; font-size: clamp(15px, 1.25vw, 18px); line-height: 1.55; color: var(--fg); margin: 0 0 clamp(22px, 3vw, 36px); }
.studio-about-cols { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 4vw, 80px); max-width: 90ch; }
.studio-about-body h4 { color: var(--fg); font: 700 10px var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 13px; }
.studio-about-body ul { margin: 0; padding-left: 17px; }
.studio-about-body li { margin: 0 0 11px; }
.studio-about-body b { color: var(--fg); font-weight: 600; }
.studio-about-body i { color: var(--fg); font-style: italic; }

/* cinematic / full-bleed (for systems used as backgrounds) */
.studio-cinematic .studio-visual { position: fixed; inset: 0; width: 100vw; height: 100svh; max-height: none; border: 0; border-radius: 0; z-index: 80; }
.studio-cinematic .studio-presetbar, .studio-cinematic .studio-topctl, .studio-cinematic .studio-fps { display: none; }
.studio-cine-exit { display: none; position: absolute; top: 12px; right: 12px; z-index: 90; background: rgba(8,8,8,0.55); color: #ededed; border: 1px solid rgba(255,255,255,0.32); border-radius: 999px; padding: 8px 15px; font: 600 10px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.studio-cine-exit:hover { border-color: rgba(255,255,255,0.6); }
.studio-cinematic .studio-cine-exit { display: inline-flex; }

@media (max-width: 860px) {
  .studio-grid { grid-template-columns: 1fr; gap: 16px; }
  .studio-visual { height: min(72vh, 680px); }
  .studio-side { position: static; top: auto; }
  .studio-ctrltoggle { display: inline-flex; }
  .studio-about-cols { grid-template-columns: 1fr; gap: clamp(20px, 5vw, 32px); }
}
`;

type Props = {
  title: string;
  intro: string;
  /** Inner grid HTML (uses `.studio-*` classes + the engine's own ids). */
  scaffold: string;
  /** Lazily import the engine and return its mount fn (client-only). */
  load: () => Promise<(root: HTMLElement) => (() => void) | void>;
};

export default function StudioShell({ title, intro, scaffold, load }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = scaffold;
    let teardown: (() => void) | void;
    let cancelled = false;
    load()
      .then((mount) => { if (!cancelled) teardown = mount(root); })
      .catch((err) => console.error("Studio failed to mount:", err));
    return () => { cancelled = true; teardown?.(); };
  }, [scaffold, load]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />
      <div className="studio-root">
        <header className="studio-head">
          <h1 className="studio-title">{title}</h1>
          <p className="studio-intro">{intro}</p>
        </header>
        <div className="studio-wrap">
          <div ref={ref} id="root" />
        </div>
      </div>
    </>
  );
}
