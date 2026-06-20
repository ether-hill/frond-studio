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
<section class="studio-about" aria-label="About the Algorithm Lab">
  <button id="alab-paneltoggle" class="studio-paneltoggle"><span>About · The systems</span><span class="caret">▾</span></button>
  <div id="alab-panelbody" class="studio-panelbody">
    <div class="studio-about-body">
      <p class="studio-about-lead">The <b>Algorithm Lab</b> is a living collection of nature-inspired generative systems. Each one is a small, self-contained algorithm you can seed, tune live, and capture as a smooth, loopable motion-graphic background.</p>
      <div class="studio-about-cols">
        <div>
          <h4>How it works</h4>
          <ul>
            <li><b>Seedable & deterministic</b> — the same seed and parameters reproduce the same piece, so a look you love is repeatable.</li>
            <li><b>Live parameters</b> — every control updates in real time; a <i>chaos</i> knob sets how energetic each system runs.</li>
            <li><b>Colour in OKLCH</b> — colour is driven from the simulation field through perceptual gradients, never flat RGB.</li>
          </ul>
        </div>
        <div>
          <h4>Use as a background</h4>
          <ul>
            <li><b>Full-bleed mode</b> — preview any system edge to edge, ready for a banner or page backdrop.</li>
            <li><b>Record video</b> — capture a clean WebM loop, or a hi-res PNG snapshot, straight from the canvas.</li>
            <li><b>Built to run light</b> — GPU where it counts and capped resolution so motion stays buttery, not choppy.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
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
