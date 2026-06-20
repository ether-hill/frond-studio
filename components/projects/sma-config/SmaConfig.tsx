"use client";

import StudioShell from "@/components/studio/StudioShell";

/**
 * SMA Config — the advanced Jones-agent slime-mould studio. Renders through the
 * shared StudioShell master template (layout/styles/chrome live there); this file
 * only supplies the title, summary, the engine scaffold (studio classes + the
 * engine's own ids) and the About copy. The engine reads the scaffold by id.
 */
const SCAFFOLD = `
<div class="studio-grid">
  <div class="studio-visual">
    <canvas id="gl"></canvas>
    <div id="presetbar" class="studio-presetbar">
      <label id="algolabel" class="studio-hide">Algorithm</label>
      <select id="algorithm" class="studio-hide" aria-label="Algorithm"></select>
      <label id="presetlabel">Preset</label>
      <select id="version" aria-label="Preset"></select>
    </div>
    <div id="topctl" class="studio-topctl"><button id="p3-restart">RESTART</button><button id="p3-rand">RANDOMISE</button></div>
    <div id="fps" class="studio-fps"></div>
    <div id="fatal" class="studio-fatal"></div>
  </div>
  <aside class="studio-side">
    <button id="ctrltoggle" class="studio-ctrltoggle" aria-label="Toggle controls">⚙ Controls</button>
    <div id="guihost" class="studio-controls"></div>
  </aside>
</div>
<section id="insight" class="studio-about" aria-label="About the Jones agent model">
  <button id="paneltoggle" class="studio-paneltoggle"><span>About · The Jones model</span><span class="caret">▾</span></button>
  <div id="panelbody" class="studio-panelbody">
    <p id="blurb" class="studio-hide"></p>
    <div id="p3desc" class="studio-about-body">
      <p class="studio-about-lead">The <b>Jones Agent Model</b> (Jeff Jones, 2010) is a bio-inspired multi-agent algorithm that simulates the foraging and network-forming behaviour of the slime mould <i>Physarum polycephalum</i> through <b>stigmergy</b>: indirect coordination via the environment.</p>
      <div class="studio-about-cols">
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

const load = async () => {
  const m = await import("./engine/playground3");
  return () => m.mount();
};

export default function SmaConfig() {
  return (
    <StudioShell
      title="SMA Config"
      intro="An advanced real-time GPU studio for the Jones (2010) agent-based Physarum slime-mould model. Sculpt sensing, deposition, diffusion and colour live. RANDOMISE rolls a fresh configuration, RESTART reseeds the field."
      scaffold={SCAFFOLD}
      load={load}
    />
  );
}
