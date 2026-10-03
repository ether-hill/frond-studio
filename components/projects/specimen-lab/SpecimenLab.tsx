"use client";

import StudioShell from "@/components/studio/StudioShell";

/**
 * Specimen Lab — an ongoing notebook of generative specimens, rendered through
 * the shared StudioShell template like Algorithm Lab and SMA Config. Specimen
 * 001 is the radiolarian sphere (radiolarian/), a React Three Fiber scene with
 * Leva controls, mounted into the shell's visual and sidebar by mount.tsx.
 */
const SCAFFOLD = `
<div class="studio-grid">
  <div class="studio-visual" id="spec-stage"></div>
  <aside class="studio-side">
    <button id="spec-ctrltoggle" class="studio-ctrltoggle" aria-label="Toggle controls">⚙ Controls</button>
    <div id="spec-panel" class="studio-controls spec-panel"></div>
  </aside>
</div>
<section class="studio-about" aria-label="About this specimen">
  <h3 class="studio-about-title">001 · Radiolarian sphere</h3>
  <div class="studio-about-body spec-about">
    <p class="studio-about-lead">Radiolarians are single-celled sea creatures that grow intricate glass skeletons. This specimen grows one from a seed: openings spiral out at the golden angle, struts fuse into one another like bone, and spines end in small beads.</p>
    <div class="studio-about-cols">
      <div>
        <h4>How it's made</h4>
        <ul>
          <li><b>Seeds</b> are laid out on a sphere by golden-angle phyllotaxis, small at the centre and larger toward the rim.</li>
          <li><b>Spherical Voronoi</b> cells around those seeds become the openings; their edges become struts.</li>
          <li>Struts, nodes and spines are blended with a <b>smooth-minimum distance field</b>, meshed by marching cubes and smoothed.</li>
          <li>Rendered in greyscale with ambient occlusion, depth of field and film grain.</li>
        </ul>
      </div>
      <div>
        <h4>Try it</h4>
        <ul>
          <li>Drag to turn the specimen; scroll or pinch to zoom.</li>
          <li>Pick a <b>preset</b> or a <b>random seed</b> to grow a new one.</li>
          <li>Every setting is saved in the page link, so copying it keeps that exact specimen.</li>
          <li>Export a PNG up to 4096 px, or the model as a GLB file.</li>
        </ul>
      </div>
    </div>
  </div>
</section>
`;

// Scoped to this page: the status line over the visual, and Leva in the sidebar.
const SPEC_CSS = `
.spec-hud { position: absolute; left: 14px; bottom: 12px; z-index: 11; color: rgba(255,255,255,0.55); font: 11px ui-monospace, monospace; pointer-events: none; }
.spec-error { color: #ff9b9b; }
.spec-progress { display: flex; gap: 10px; align-items: center; }
.spec-bar { width: 160px; height: 2px; background: #222; display: inline-block; }
.spec-bar span { display: block; height: 100%; background: #d8d8d8; transition: width .1s linear; }
.spec-about li { white-space: normal; }
.spec-panel { border: 1px solid var(--line); border-radius: 8px; overflow: hidden auto; max-height: calc(100svh - 150px); }
`;

const load = async () => {
  const m = await import("./mount");
  return (root: HTMLElement) => m.mountSpecimenLab(root);
};

export default function SpecimenLab() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SPEC_CSS }} />
      <StudioShell
        title="Specimen Lab"
        intro="An ongoing notebook of generative specimens, each grown from a seed and rendered live in the browser. The first is a radiolarian sphere: a golden-angle lattice of openings with bone-like struts and bead-tipped spines, in greyscale."
        scaffold={SCAFFOLD}
        load={load}
      />
    </>
  );
}
