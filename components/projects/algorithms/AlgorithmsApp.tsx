"use client";

import StudioShell from "@/components/studio/StudioShell";

/**
 * Algorithms — the live generative toolbox, now on the shared StudioShell master
 * template (same layout/styles/chrome as SMA Config and the Algorithm Lab). The
 * algorithm dropdown sits below the summary; each system renders into the art
 * window with live controls (its own settings + Touch / Soundscape / Export Video
 * / Snapshot) in the sidebar, and Presets / Restart / Randomise over the window.
 */
const SCAFFOLD = `
<div class="studio-selectbar">
  <label for="algo-algo">Algorithm</label>
  <select id="algo-algo" aria-label="Algorithm"></select>
</div>
<div class="studio-grid">
  <div class="studio-visual" id="algo-stage">
    <div class="studio-presetbar">
      <label for="algo-preset">Presets</label>
      <select id="algo-preset" aria-label="Presets"><option value="">default</option></select>
    </div>
    <div class="studio-topctl">
      <button id="algo-reset">RESTART</button>
      <button id="algo-randomise">RANDOMISE</button>
    </div>
    <div id="algo-fps" class="studio-fps"></div>
    <button id="algo-cine-exit" class="studio-cine-exit">✕ controls</button>
  </div>
  <aside class="studio-side">
    <button id="algo-ctrltoggle" class="studio-ctrltoggle" aria-label="Toggle controls">⚙ Controls</button>
    <div id="algo-panel" class="studio-controls"></div>
  </aside>
</div>
<section class="studio-about" aria-label="About this algorithm">
  <button id="algo-paneltoggle" class="studio-paneltoggle"><span>About · This algorithm</span><span class="caret">▾</span></button>
  <div id="algo-panelbody" class="studio-panelbody">
    <div id="algo-about-body" class="studio-about-body"></div>
  </div>
</section>
`;

const load = async () => {
  const m = await import("./engine/algoStudio");
  return (root: HTMLElement) => m.mountAlgoStudio(root);
};

export default function AlgorithmsApp() {
  return (
    <StudioShell
      title="Algorithms V1"
      intro="A growing collection of generative systems, each running live. Every one builds complex structure from a handful of simple rules: no blueprint, just local interactions. Pick one below, tune it in real time, and capture it."
      scaffold={SCAFFOLD}
      load={load}
    />
  );
}
