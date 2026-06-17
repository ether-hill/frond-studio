"use client";

import { useEffect, useRef } from "react";

/**
 * SMA Config — the advanced Jones-agent slime-mould studio (ported from
 * generatives playground3). The engine reads a fixed HTML scaffold by id and
 * mounts a lil-gui control panel + WebGL2 sim; we inject that scaffold + its CSS,
 * lazily import the engine (client-only — WebGL/AudioContext never hit SSR), and
 * tear it down (stop the RAF loop, suspend audio) on unmount.
 */
const CSS = `
.sma-root #stage { position: relative; min-height: calc(100vh - 0px); padding-top: 84px; display: grid; place-items: center; overflow: hidden; background: #000; }
.sma-root #gl { aspect-ratio: 1 / 1; width: min(100vw, calc(100vh - 120px)); height: min(100vw, calc(100vh - 120px)); image-rendering: auto; touch-action: none; display: block; }
.sma-root #insight { position: absolute; left: 12px; top: 96px; z-index: 9; width: 322px; max-width: calc(100vw - 24px); max-height: calc(100vh - 130px); overflow-y: auto; background: rgba(6,6,6,0.86); backdrop-filter: blur(9px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 11px 13px; color: #c4c4c4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
.sma-root #paneltoggle { width: 100%; display: flex; justify-content: space-between; align-items: center; background: transparent; border: 0; color: #e6e6e6; cursor: pointer; font: 700 10px ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.2em; padding: 0 0 10px; }
.sma-root #panelbody.hidden { display: none; }
.sma-root #blurb { display: none; }
.sma-root #algolabel, .sma-root #algorithm { display: none; }
.sma-root #p3desc { color: #a6a6a6; font-size: 11px; line-height: 1.55; margin-top: 2px; }
.sma-root #p3desc h4 { color: #d8d8d8; font: 700 9.5px ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.16em; text-transform: uppercase; margin: 15px 0 6px; }
.sma-root #p3desc p { margin: 0 0 9px; }
.sma-root #p3desc ul { margin: 0 0 4px; padding-left: 15px; }
.sma-root #p3desc li { margin: 0 0 7px; }
.sma-root #p3desc b { color: #e4e4e4; font-weight: 600; }
.sma-root #p3desc i { color: #d0d0d0; font-style: italic; }
.sma-root #topctl { position: absolute; top: 94px; right: 14px; z-index: 13; display: flex; gap: 8px; }
.sma-root #topctl button { background: rgba(6,6,6,0.82); color: #e8e8e8; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 7px 13px; font: 600 10.5px ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.1em; cursor: pointer; backdrop-filter: blur(7px); }
.sma-root #topctl button:hover { border-color: rgba(255,255,255,0.5); }
.sma-root #presetbar { position: absolute; top: 132px; right: 14px; z-index: 11; display: flex; align-items: center; gap: 8px; background: rgba(6,6,6,0.82); border: 1px solid rgba(255,255,255,0.16); border-radius: 6px; padding: 6px 10px; backdrop-filter: blur(7px); }
.sma-root #presetlabel { color: #8a8a8a; font: 700 9px ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.16em; }
.sma-root #presetbar select { background: #111; color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 4px 7px; font: 11px ui-monospace, monospace; cursor: pointer; }
.sma-root #guihost { position: absolute; top: 176px; right: 0; z-index: 9; }
.sma-root #guihost .lil-gui { --background-color: rgba(6,6,6,0.86); --widget-color: #1c1c1c; --title-background-color: #0c0c0c; max-height: calc(100vh - 120px); overflow-y: auto; }
.sma-root #guihost .lil-gui.root { backdrop-filter: blur(9px); border-left: 1px solid rgba(255,255,255,0.1); }
.sma-root #fps { position: absolute; left: 16px; bottom: 14px; color: #5a5a5a; font: 11px ui-monospace, monospace; pointer-events: none; }
.sma-root #fatal { position: absolute; inset: 0; display: none; place-items: center; padding: 2rem; color: #ff9b9b; text-align: center; line-height: 1.6; }
@media (max-width: 820px) { .sma-root #insight { top: 94px; width: min(330px, calc(100vw - 24px)); max-height: calc(100vh - 170px); } .sma-root #guihost { top: 176px; } .sma-root #guihost .lil-gui.autoPlace { max-height: 66vh; --width: 248px; } }
`;

const SCAFFOLD = `
<section id="stage">
  <canvas id="gl"></canvas>
  <div id="topctl"><button id="p3-restart">RESTART</button><button id="p3-rand">RANDOMISE</button></div>
  <div id="presetbar">
    <label id="algolabel">ALGORITHM</label>
    <select id="algorithm" aria-label="Algorithm"></select>
    <label id="presetlabel">PRESET</label>
    <select id="version" aria-label="Preset"></select>
  </div>
  <button id="ctrltoggle" class="toggle" aria-label="Toggle controls">⚙ controls</button>
  <section id="insight" aria-label="About the Jones agent model">
    <button id="paneltoggle"><span>ABOUT · THE JONES MODEL</span><span class="caret">▾</span></button>
    <div id="panelbody">
      <p id="blurb"></p>
      <div id="p3desc">
        <p>The <b>Jones Agent Model</b> (Jeff Jones, 2010) is a bio-inspired multi-agent algorithm that simulates the foraging and network-forming behaviour of the slime mould <i>Physarum polycephalum</i> through <b>stigmergy</b> — indirect coordination via the environment.</p>
        <h4>How it works</h4>
        <ul>
          <li><b>Agent layer</b> — thousands of agents move through the grid, each sensing three points ahead (left, centre, right).</li>
          <li><b>Trail map</b> — agents deposit a chemical trail and steer toward the highest concentration.</li>
          <li><b>Diffuse &amp; decay</b> — the trail blurs and fades, so pathways adapt, merge or collapse.</li>
        </ul>
        <h4>Emergent properties</h4>
        <ul>
          <li><b>Network minimisation</b> — inefficient branches are pruned, leaving efficient transport networks.</li>
          <li><b>Adaptation</b> — blocked paths reroute; decentralised resilience.</li>
          <li><b>Pattern formation</b> — labyrinths, reticulated networks and fanning search fronts.</li>
        </ul>
      </div>
    </div>
  </section>
  <div id="guihost"></div>
  <div id="fps"></div>
  <div id="fatal"></div>
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
      <div ref={ref} id="root" className="sma-root" />
    </>
  );
}
