"use client";

import { useEffect, useRef } from "react";

/**
 * SMA Config — the advanced Jones-agent slime-mould studio (ported from
 * generatives playground3). The engine reads a fixed HTML scaffold by id and
 * mounts a lil-gui control panel + WebGL2 sim; we inject that scaffold + its CSS,
 * lazily import the engine (client-only — WebGL/AudioContext never hit SSR), and
 * tear it down (stop the RAF loop, suspend audio) on unmount.
 *
 * Layout follows the site system: a header + a margin-aligned grid (the square
 * visual with RESTART / RANDOMISE overlaid on top, like the Algorithms heroes,
 * and a sidebar with the controls + About panel). On narrow screens it stacks,
 * visual first. The engine only reads element ids + the canvas rect, so the
 * chrome can be re-laid-out freely as long as the ids survive.
 */
const CSS = `
.sma-root { font-family: var(--font-body), 'Helvetica Neue', Helvetica, Arial, sans-serif; }

/* header — site margins */
.sma-head { max-width: var(--maxw); margin: 0 auto; padding: var(--pad-top) var(--gutter) clamp(26px,4vw,44px); }
.sma-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: var(--eyebrow-tracking); text-transform: uppercase; color: var(--fg-faint); margin-bottom: 16px; }
.sma-title { margin: 0; font-family: var(--font-display), sans-serif; font-weight: 600; font-size: clamp(44px,7vw,108px); line-height: 0.94; letter-spacing: -0.035em; }
.sma-intro { margin: clamp(18px,2.5vh,28px) 0 0; max-width: 58ch; font-size: clamp(14px,1.6vw,17px); line-height: 1.6; color: var(--fg-dim); }

/* layout — visual + controls sidebar, within the gutter/maxw column */
.sma-wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 var(--gutter) var(--pad-bottom); }
/* biome soundscape player — its own bar above the visual */
.sma-biome { margin-bottom: clamp(16px, 2vw, 26px); }
.sma-biome:empty { display: none; }
.sma-grid { display: grid; grid-template-columns: minmax(0,1fr) 304px; gap: clamp(20px,2.4vw,40px); align-items: start; }

/* the visual — expands to fill the available space (not a fixed square); the
   square sim covers it without distortion via object-fit. Controls overlaid. */
.sma-visual { position: relative; width: 100%; height: min(86vh, 1040px); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #000; touch-action: none; }
.sma-root #gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; object-position: center; image-rendering: auto; touch-action: none; }
.sma-visual::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 88% 88% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%); }

/* RESTART / RANDOMISE — over the visual, top-right (matches the Algorithms heroes) */
.sma-root #topctl { position: absolute; top: 12px; right: 12px; z-index: 13; display: flex; gap: 8px; }
.sma-root #topctl button { background: rgba(8,8,8,0.6); color: #ededed; border: 1px solid rgba(255,255,255,0.22); border-radius: 999px; padding: 8px 15px; font: 600 10px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: border-color .2s ease, background-color .2s ease; }
.sma-root #topctl button:hover { border-color: rgba(255,255,255,0.6); background: rgba(8,8,8,0.82); }

/* preset picker — over the visual, top-left */
.sma-root #presetbar { position: absolute; top: 12px; left: 12px; z-index: 11; display: flex; align-items: center; gap: 8px; background: rgba(8,8,8,0.6); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 6px 12px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.sma-root #presetlabel { color: rgba(255,255,255,0.6); font: 700 9px ui-monospace,'SF Mono',Menlo,monospace; letter-spacing: 0.16em; }
.sma-root #presetbar select { background: rgba(0,0,0,0.45); color: #fff; border: 1px solid rgba(255,255,255,0.24); border-radius: 999px; padding: 4px 9px; font: 11px ui-monospace, monospace; cursor: pointer; }
.sma-root #algolabel, .sma-root #algorithm { display: none; }
.sma-root #fps { position: absolute; left: 14px; bottom: 12px; z-index: 11; color: rgba(255,255,255,0.55); font: 11px ui-monospace, monospace; pointer-events: none; }
.sma-root #fatal { position: absolute; inset: 0; display: none; place-items: center; padding: 2rem; color: #ff9b9b; text-align: center; line-height: 1.6; }

/* sidebar — controls + About, in normal flow (themed, sticks while scrolling) */
.sma-side { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 92px; }
.sma-root #ctrltoggle { display: none; align-items: center; gap: 8px; align-self: flex-start; font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg-dim); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: color .2s ease, border-color .2s ease; }
.sma-root #ctrltoggle:hover { color: var(--fg); border-color: var(--accent); }
.sma-root #guihost { width: 100%; }
.sma-root #guihost .lil-gui { --background-color: rgba(8,8,8,0.92); --widget-color: #1c1c1c; --title-background-color: #0c0c0c; max-height: calc(100svh - 150px); overflow-y: auto; }
.sma-root #guihost .lil-gui.root { width: 100% !important; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }

/* About the model — a wide, readable section below the studio (not crammed in
   the sidebar). Lead paragraph spans, then two columns of detail. */
.sma-root .sma-about { margin-top: clamp(40px, 5vw, 72px); border-top: 1px solid var(--line); padding-top: clamp(26px, 3vw, 40px); color: var(--fg-dim); }
.sma-root #paneltoggle { width: 100%; max-width: var(--maxw); display: flex; justify-content: space-between; align-items: center; gap: 16px; background: transparent; border: 0; color: var(--fg); cursor: pointer; font: 500 12px var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; padding: 0; }
.sma-root #paneltoggle .caret { color: var(--fg-dim); }
.sma-root #panelbody { margin-top: clamp(18px, 2.4vw, 30px); }
.sma-root #panelbody.hidden { display: none; }
.sma-root #blurb { display: none; }
.sma-root #p3desc { color: var(--fg-dim); font-size: clamp(13px, 1vw, 15px); line-height: 1.65; }
.sma-root #p3desc .sma-about-lead { max-width: 72ch; font-size: clamp(15px, 1.25vw, 18px); line-height: 1.55; color: var(--fg); margin: 0 0 clamp(22px, 3vw, 36px); }
.sma-root .sma-about-cols { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 4vw, 80px); max-width: 90ch; }
.sma-root #p3desc h4 { color: var(--fg); font: 700 10px var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 13px; }
.sma-root #p3desc ul { margin: 0; padding-left: 17px; }
.sma-root #p3desc li { margin: 0 0 11px; }
.sma-root #p3desc b { color: var(--fg); font-weight: 600; }
.sma-root #p3desc i { color: var(--fg); font-style: italic; }

/* mobile / tablet — stack, visual on top, controls below */
@media (max-width: 860px) {
  .sma-grid { grid-template-columns: 1fr; gap: 16px; }
  .sma-visual { height: min(72vh, 680px); }
  .sma-side { position: static; top: auto; }
  .sma-root #ctrltoggle { display: inline-flex; }
  .sma-root .sma-about-cols { grid-template-columns: 1fr; gap: clamp(20px, 5vw, 32px); }
}
`;

const SCAFFOLD = `
<div id="biome-mini" class="sma-biome"></div>
<div class="sma-grid">
  <div class="sma-visual">
    <canvas id="gl"></canvas>
    <div id="presetbar">
      <label id="algolabel">ALGORITHM</label>
      <select id="algorithm" aria-label="Algorithm"></select>
      <label id="presetlabel">PRESET</label>
      <select id="version" aria-label="Preset"></select>
    </div>
    <div id="topctl"><button id="p3-restart">RESTART</button><button id="p3-rand">RANDOMISE</button></div>
    <div id="fps"></div>
    <div id="fatal"></div>
  </div>
  <aside class="sma-side">
    <button id="ctrltoggle" class="toggle" aria-label="Toggle controls">⚙ Controls</button>
    <div id="guihost"></div>
  </aside>
</div>
<section id="insight" class="sma-about" aria-label="About the Jones agent model">
  <button id="paneltoggle"><span>About · The Jones model</span><span class="caret">▾</span></button>
  <div id="panelbody">
    <p id="blurb"></p>
    <div id="p3desc">
      <p class="sma-about-lead">The <b>Jones Agent Model</b> (Jeff Jones, 2010) is a bio-inspired multi-agent algorithm that simulates the foraging and network-forming behaviour of the slime mould <i>Physarum polycephalum</i> through <b>stigmergy</b>: indirect coordination via the environment.</p>
      <div class="sma-about-cols">
        <div>
          <h4>How it works</h4>
          <ul>
            <li><b>Agent layer</b> — thousands of agents move through the grid, each sensing three points ahead (left, centre, right).</li>
            <li><b>Trail map</b> — agents deposit a chemical trail and steer toward the highest concentration.</li>
            <li><b>Diffuse &amp; decay</b> — the trail blurs and fades, so pathways adapt, merge or collapse.</li>
          </ul>
        </div>
        <div>
          <h4>Emergent properties</h4>
          <ul>
            <li><b>Network minimisation</b> — inefficient branches are pruned, leaving efficient transport networks.</li>
            <li><b>Adaptation</b> — blocked paths reroute; decentralised resilience.</li>
            <li><b>Pattern formation</b> — labyrinths, reticulated networks and fanning search fronts.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>
`;

export default function SmaConfig() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = SCAFFOLD;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    import("./engine/playground3")
      .then((m) => { if (!cancelled) teardown = m.mount(); })
      .catch((err) => console.error("SMA Config failed to mount:", err));
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sma-root">
        <header className="sma-head">
          <h1 className="sma-title">SMA Config</h1>
          <p className="sma-intro">
            An advanced real-time GPU studio for the Jones (2010) agent-based Physarum
            slime-mould model. Sculpt sensing, deposition, diffusion and colour live.
            RANDOMISE rolls a fresh configuration, RESTART reseeds the field.
          </p>
        </header>
        <div className="sma-wrap">
          <div ref={ref} id="root" />
        </div>
      </div>
    </>
  );
}
