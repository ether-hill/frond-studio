"use client";

import { useEffect, useRef } from "react";

/**
 * Algorithm Lab — laid out to match the site system (mirrors the SMA Config
 * page): a header with title + summary, an algorithm dropdown below the summary,
 * then a margin-aligned grid with the visual in a bordered panel and the live
 * controls in a sticky sidebar. The framework-agnostic engine reads the scaffold
 * by id, lazily imports client-side (WebGL/three/Tweakpane never hit SSR), and
 * tears down on unmount. Cinematic mode makes the visual fill the viewport.
 */
const CSS = `
.alab-root { font-family: var(--font-body), 'Helvetica Neue', Helvetica, Arial, sans-serif; }

.alab-head { max-width: var(--maxw); margin: 0 auto; padding: var(--pad-top) var(--gutter) clamp(18px,2.6vw,30px); }
.alab-title { margin: 0; font-family: var(--font-display), sans-serif; font-weight: 600; font-size: clamp(44px,7vw,108px); line-height: 0.94; letter-spacing: -0.035em; }
.alab-intro { margin: clamp(18px,2.5vh,28px) 0 0; max-width: 60ch; font-size: clamp(14px,1.6vw,17px); line-height: 1.6; color: var(--fg-dim); }

.alab-wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 var(--gutter) var(--pad-bottom); }

/* algorithm picker — replaces the old left menu, sits below the summary */
.alab-pick { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: clamp(18px,2.4vw,30px); }
.alab-pick label { font: 700 10px var(--font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-faint); }
.alab-pick select { background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 999px; padding: 11px 20px; font: 500 14px var(--font-body), sans-serif; cursor: pointer; min-width: min(420px, 80vw); }
.alab-pick select:hover { border-color: var(--accent); }

.alab-grid { display: grid; grid-template-columns: minmax(0,1fr) 304px; gap: clamp(20px,2.4vw,40px); align-items: start; }

.alab-visual { position: relative; width: 100%; height: min(86vh,1040px); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #000; touch-action: none; }
.alab-visual canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; }

#alab-topctl { position: absolute; top: 12px; right: 12px; z-index: 13; display: flex; gap: 8px; }
#alab-topctl button { background: rgba(8,8,8,0.6); color: #ededed; border: 1px solid rgba(255,255,255,0.22); border-radius: 999px; padding: 8px 14px; font: 600 10px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: border-color .2s ease, background-color .2s ease; }
#alab-topctl button:hover { border-color: rgba(255,255,255,0.6); background: rgba(8,8,8,0.82); }
#alab-fps { position: absolute; left: 14px; bottom: 12px; z-index: 11; color: rgba(255,255,255,0.55); font: 11px ui-monospace, monospace; pointer-events: none; }
.alab-cine-exit { position: absolute; top: 12px; right: 12px; z-index: 30; display: none; background: rgba(8,8,8,0.6); color: #ededed; border: 1px solid rgba(255,255,255,0.32); border-radius: 999px; padding: 8px 15px; font: 600 10px ui-monospace, monospace; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px); }

.alab-side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 92px; }
#alab-panel { width: 100%; }
#alab-panel .tp-dfwv { width: 100%; }
.alab-export { border-top: 1px solid var(--line); padding-top: 14px; }
.alab-lbl { font: 700 10px var(--font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-faint); margin-bottom: 10px; }
.alab-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.alab-export button, .alab-export select { background: transparent; color: var(--fg-dim); border: 1px solid var(--line); border-radius: 8px; padding: 7px 11px; font: 500 12px var(--font-body), sans-serif; cursor: pointer; }
.alab-export button:hover { color: var(--fg); border-color: var(--accent); }
.alab-presets { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.alab-preset { display: flex; gap: 4px; }
.alab-preset .load { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* cinematic / full-bleed: the visual fills the whole viewport (over the nav) */
.alab-cinematic .alab-visual { position: fixed; inset: 0; width: 100vw; height: 100svh; max-height: none; border: 0; border-radius: 0; z-index: 80; }
.alab-cinematic .alab-cine-exit { display: inline-flex; }

@media (max-width: 860px) {
  .alab-grid { grid-template-columns: 1fr; gap: 16px; }
  .alab-visual { height: min(70vh, 640px); }
  .alab-side { position: static; top: auto; }
}
`;

const SCAFFOLD = `
<div class="alab-pick">
  <label for="alab-algo">Algorithm</label>
  <select id="alab-algo" aria-label="Algorithm"></select>
</div>
<div class="alab-grid">
  <div class="alab-visual" id="alab-stage">
    <div id="alab-topctl">
      <button id="alab-play">▶ play</button>
      <button id="alab-reset">⟳ reset</button>
      <button id="alab-cine">⛶ full-bleed</button>
    </div>
    <div id="alab-fps"></div>
    <button class="alab-cine-exit" id="alab-cine-exit">✕ controls</button>
  </div>
  <aside class="alab-side">
    <div id="alab-panel"></div>
    <div class="alab-export">
      <div class="alab-lbl">Capture</div>
      <div class="alab-row"><button id="alab-rec">● record webm</button><select id="alab-recsec"><option value="6">6s</option><option value="10" selected>10s</option><option value="20">20s</option><option value="30">30s</option></select></div>
      <div class="alab-row"><button id="alab-png">PNG</button><button data-x="2">2×</button><button data-x="4">4×</button></div>
      <div class="alab-row"><button id="alab-copy">copy JSON</button><button id="alab-save">★ save preset</button></div>
      <div class="alab-presets" id="alab-presets"></div>
    </div>
  </aside>
</div>
`;

export default function AlgorithmLab() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = SCAFFOLD;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    import("./engine/lab")
      .then((m) => { if (!cancelled) teardown = m.mountLab(root); })
      .catch((err) => console.error("Algorithm Lab failed to mount:", err));
    return () => { cancelled = true; teardown?.(); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="alab-root">
        <header className="alab-head">
          <h1 className="alab-title">Algorithm Lab</h1>
          <p className="alab-intro">
            A live lab of nature-inspired generative systems. Pick one below, tune it
            in real time, and record it as a smooth, loopable motion-graphic background.
            Every piece is built to run light and buttery, ready for banner and page visuals.
          </p>
        </header>
        <div className="alab-wrap">
          <div ref={ref} id="alab-mount" />
        </div>
      </div>
    </>
  );
}
