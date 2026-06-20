"use client";

import StudioShell from "@/components/studio/StudioShell";

/**
 * Algorithm Lab — renders through the shared StudioShell master template, so its
 * layout, styles and chrome are identical to SMA Config and update globally when
 * the template changes. This file supplies the title, summary, the engine
 * scaffold (studio classes + alab ids) and the About copy; engine/lab.ts wires it.
 */
const SCAFFOLD = `
<div class="studio-selectbar">
  <label for="alab-algo">Algorithm</label>
  <select id="alab-algo" aria-label="Algorithm"></select>
</div>
<div class="studio-grid">
  <div class="studio-visual" id="alab-stage">
    <div class="studio-presetbar">
      <label for="alab-preset">Presets</label>
      <select id="alab-preset" aria-label="Presets"><option value="">none</option></select>
      <button id="alab-save" title="Save current as preset">★</button>
    </div>
    <div class="studio-topctl">
      <button id="alab-reset">RESTART</button>
      <button id="alab-randomise">RANDOMISE</button>
    </div>
    <div id="alab-fps" class="studio-fps"></div>
    <button id="alab-cine-exit" class="studio-cine-exit">✕ controls</button>
  </div>
  <aside class="studio-side">
    <button id="alab-ctrltoggle" class="studio-ctrltoggle" aria-label="Toggle controls">⚙ Controls</button>
    <div id="alab-panel" class="studio-controls"></div>
  </aside>
</div>
<section class="studio-about" aria-label="About this system">
  <h3 id="alab-about-title" class="studio-about-title">System</h3>
  <div id="alab-about-body" class="studio-about-body"></div>
</section>
`;

const load = async () => {
  const m = await import("./engine/lab");
  return (root: HTMLElement) => m.mountLab(root);
};

export default function AlgorithmLab() {
  return (
    <StudioShell
      title="Algorithms V2"
      intro="A living collection of nature-inspired generative systems. Pick one, tune it live, and capture it as a smooth, loopable motion-graphic background. Built to run light, ready for banner and page visuals."
      scaffold={SCAFFOLD}
      load={load}
    />
  );
}
