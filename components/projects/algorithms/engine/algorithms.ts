// Algorithms page — the studio's toolbox. A left index of eleven systems; selecting
// one swaps the main panel. Six are the nature algorithms the studio cultivates
// (Physarum, Reaction–Diffusion, Boids, L-Systems, Voronoi, DLA); five are the named
// movements from the `algorithmic-art` skill (Organic Turbulence, Quantum Harmonics,
// Recursive Whispers, Field Dynamics, Stochastic Crystallization). Every system is
// LIVE: a large hero frame plus a gallery of seeded examples, each a real p5.js sketch.

import { GENERATORS, renderArt, type Params } from "./artGenerators";
import { PhysMod, M_DEFAULTS, type MParams } from "./physmod";

// Physarum now runs the studio's latest GPU model — the density-modulated Physarum
// from Playground 2 (src/physmod.ts), ~590k agents on the WebGL2 engine, instead of
// the old CPU grid sim. The page opens on a transport-network preset; RANDOMISE rolls
// through the curated archetypes below. The render is monochrome (white-on-black).
type Preset = { name: string; p: Partial<MParams> };
const PHYS_PRESETS: Preset[] = [
  { name: "Reticulum", p: { SensorDistance0: 7, SD_exponent: 4, SD_amplitude: 0.25, SensorAngle0: 0.42, RotationAngle0: 0.42, MoveDistance0: 0.8, MD_exponent: 5, MD_amplitude: 0.11, defaultScalingFactor: 22 } },
  { name: "Network", p: { SensorDistance0: 9, SD_exponent: 3, SD_amplitude: 0.2, SensorAngle0: 0.45, RotationAngle0: 0.4, MoveDistance0: 0.9, MD_exponent: 4, MD_amplitude: 0.1, defaultScalingFactor: 20 } },
  { name: "Enmeshed", p: { SensorDistance0: 3, SD_exponent: 7, SD_amplitude: 0.46, SensorAngle0: 0.5, RotationAngle0: 0.4, MoveDistance0: 0.85, MD_exponent: 9, MD_amplitude: 0.18, defaultScalingFactor: 34 } },
  { name: "Filigree", p: { SensorDistance0: 2, SD_exponent: 8, SD_amplitude: 0.24, SensorAngle0: 0.85, RotationAngle0: 0.55, MoveDistance0: 0.7, MD_exponent: 10, MD_amplitude: 0.08, defaultScalingFactor: 32 } },
  { name: "Plexus", p: { SensorDistance0: 6, SD_exponent: 5, SD_amplitude: 0.24, SensorAngle0: 0.5, RotationAngle0: 0.45, MoveDistance0: 0.75, MD_exponent: 6, MD_amplitude: 0.12, defaultScalingFactor: 24 } },
  { name: "Drift", p: { SensorDistance0: 12, SD_exponent: 2, SD_amplitude: 0.18, SensorAngle0: 0.35, RotationAngle0: 0.28, MoveDistance0: 1.1, MD_exponent: 2, MD_amplitude: 0.12, defaultScalingFactor: 18 } },
  { name: "Vortex", p: { SensorDistance0: 10, SD_exponent: 4, SD_amplitude: 0.16, SensorAngle0: 0.5, RotationAngle0: 0.9, MoveDistance0: 0.8, MD_exponent: 4, MD_amplitude: 0.12, defaultScalingFactor: 20 } },
  { name: "Filament", p: { SensorDistance0: 18, SD_exponent: 2, SD_amplitude: 0.1, SensorAngle0: 0.22, RotationAngle0: 0.2, MoveDistance0: 1.0, MD_exponent: 3, MD_amplitude: 0.1, defaultScalingFactor: 18 } },
  { name: "Mist", p: { SensorDistance0: 14, SD_exponent: 2, SD_amplitude: 0.16, SensorAngle0: 0.4, RotationAngle0: 0.3, MoveDistance0: 0.8, MD_exponent: 3, MD_amplitude: 0.1, defaultScalingFactor: 16, decayFactor: 0.85, exposure: 1.5 } },
  { name: "Cells", p: { SensorDistance0: 9, SD_exponent: 1, SD_amplitude: 0.05, SensorAngle0: 1.0, RotationAngle0: 0.45, MoveDistance0: 0.5, MD_exponent: 2, MD_amplitude: 0.06, defaultScalingFactor: 28 } },
];

const HELV = "var(--font-body),'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,monospace";

const HERO_PX = 680;

interface Step { n: string; title: string; text: string; }
interface Param { label: string; value: string; }
interface Algo {
  i: string; tag: string; gen: string; name: string; sub: string; filename: string; note: string;
  group: "NATURE SYSTEM" | "GENERATIVE MOVEMENT";
  paras: string[]; steps: Step[]; params: Param[];
}

const DATA: Algo[] = [
  {
    i: "01", tag: "physarum", gen: "physarum", name: "Physarum", sub: "SLIME MOLD TRANSPORT NETWORKS", filename: "physarum_polycephalum.sim",
    group: "NATURE SYSTEM",
    note: "Tero et al., “Rules for Biologically Inspired Adaptive Network Design”, Science, 2010.",
    paras: [
      "Physarum polycephalum is a single-celled organism with no brain and no nervous system, yet it reliably finds the shortest path through a maze and rebuilds the Tokyo rail network when food is placed at the cities.",
      "Our model is an agent swarm. Each particle senses a chemical trail just ahead of itself, steers toward the strongest signal, and deposits more trail as it moves. The trail diffuses and decays. From those four rules alone, the minimal transport network emerges.",
    ],
    steps: [
      { n: "1", title: "Sense", text: "Each agent samples the trail at three points ahead — front, front-left, front-right." },
      { n: "2", title: "Rotate", text: "It turns toward whichever sensor reads the highest concentration." },
      { n: "3", title: "Deposit", text: "It steps forward and lays a fixed amount of chemoattractant on the grid." },
      { n: "4", title: "Diffuse & Decay", text: "The whole field is blurred slightly and faded, carving stable channels." },
    ],
    params: [
      { label: "agents", value: "~590,000 (GPU)" },
      { label: "model", value: "density-modulated" },
      { label: "sensor_reach", value: "base · power · scale" },
      { label: "engine", value: "WebGL2 · 5-pass" },
      { label: "render", value: "white-on-black" },
    ],
  },
  {
    i: "02", tag: "gray-scott", gen: "gray-scott", name: "Reaction–Diffusion", sub: "GRAY–SCOTT MORPHOGENESIS", filename: "gray_scott.sim",
    group: "NATURE SYSTEM",
    note: "A. M. Turing, “The Chemical Basis of Morphogenesis”, Phil. Trans. R. Soc., 1952.",
    paras: [
      "In 1952 Alan Turing proposed that the spots on a leopard and the stripes on a fish could arise from two chemicals reacting and spreading at different speeds — no blueprint required.",
      "The Gray–Scott model simulates exactly this. One chemical is continuously fed in; a reaction converts it into a second that is steadily removed. Tiny tweaks to the feed and kill rates flip the system between dots, stripes, mazes and replicating coral.",
    ],
    steps: [
      { n: "1", title: "Diffuse", text: "Each chemical spreads across the grid at its own diffusion rate." },
      { n: "2", title: "React", text: "Where they meet, U + 2V → 3V converts feed into product." },
      { n: "3", title: "Feed", text: "Chemical U is replenished everywhere at the feed rate F." },
      { n: "4", title: "Kill", text: "Chemical V is removed at rate (F + k), setting the pattern regime." },
    ],
    params: [
      { label: "feed_rate F", value: "0.034 – 0.058" },
      { label: "kill_rate k", value: "0.057 – 0.065" },
      { label: "diffusion_U", value: "0.16" },
      { label: "diffusion_V", value: "0.08" },
      { label: "pattern", value: "coral / mitosis" },
    ],
  },
  {
    i: "03", tag: "boids", gen: "boids", name: "Boids", sub: "EMERGENT FLOCKING", filename: "boids.sim",
    group: "NATURE SYSTEM",
    note: "C. W. Reynolds, “Flocks, Herds and Schools”, SIGGRAPH, 1987.",
    paras: [
      "A murmuration of ten thousand starlings has no leader and no choreography. Each bird simply reacts to the handful of neighbours nearest to it.",
      "Craig Reynolds distilled this into three steering rules. Run them on every agent at once and lifelike flocking, schooling and swarming fall out for free — one of the founding results of artificial life. Here the flight paths are left as trails: a frozen murmuration.",
    ],
    steps: [
      { n: "1", title: "Separation", text: "Steer away from neighbours that are crowding too close." },
      { n: "2", title: "Alignment", text: "Match the average heading of nearby flockmates." },
      { n: "3", title: "Cohesion", text: "Steer gently toward the centre of the local group." },
      { n: "4", title: "Integrate", text: "Blend the three urges, clamp to max speed, and move." },
    ],
    params: [
      { label: "flock_size", value: "420 boids" },
      { label: "neighbour_radius", value: "6% of frame" },
      { label: "separation_w", value: "1.5" },
      { label: "alignment_w", value: "1.0" },
      { label: "max_speed", value: "2.1 px/frame" },
    ],
  },
  {
    i: "04", tag: "l-system", gen: "l-system", name: "L-Systems", sub: "RECURSIVE BOTANY", filename: "lindenmayer.sim",
    group: "NATURE SYSTEM",
    note: "A. Lindenmayer, “Mathematical Models for Cellular Interaction in Development”, 1968.",
    paras: [
      "A biologist studying how algae grow, Aristid Lindenmayer wrote down a grammar: start with a symbol, then repeatedly replace every symbol according to fixed rules.",
      "Read the resulting string as instructions for a drawing turtle — move, turn, branch — and ferns, trees and snowflakes unfold. The complexity is entirely in the recursion, not the rules.",
    ],
    steps: [
      { n: "1", title: "Axiom", text: "Begin with a short starting string, e.g. a single “X”." },
      { n: "2", title: "Rewrite", text: "Apply the production rules to every symbol, n times over." },
      { n: "3", title: "Interpret", text: "A turtle reads the string: F draws, +/− rotate." },
      { n: "4", title: "Branch", text: "[ and ] push and pop position, growing side-shoots." },
    ],
    params: [
      { label: "axiom", value: "X" },
      { label: "rule", value: "X → F+[[X]−X]−F[−FX]+X" },
      { label: "angle", value: "20° – 35°" },
      { label: "iterations", value: "5" },
      { label: "output", value: "fractal plant" },
    ],
  },
  {
    i: "05", tag: "voronoi", gen: "voronoi-recursive", name: "Voronoi", sub: "RECURSIVE CELLULAR TISSUE", filename: "voronoi.sim",
    group: "NATURE SYSTEM",
    note: "G. Voronoy, 1908 / S. Lloyd, relaxation, 1957.",
    paras: [
      "Scatter a handful of seeds on a plane, then ask of every other point: which seed is nearest? The plane divides into cells — the Voronoi diagram.",
      "It is the geometry behind dragonfly wings, giraffe coats, soap foam and cracked mud. Lloyd’s relaxation evens the packing; then each cell is subdivided into its own Voronoi — cells within cells — for the recursive tissue of Raven Kwok’s work.",
    ],
    steps: [
      { n: "1", title: "Seed", text: "Place N points across the plane by a noise-density field." },
      { n: "2", title: "Relax", text: "Lloyd-iterate each seed toward its centroid for even cells." },
      { n: "3", title: "Bound", text: "Cell walls form along the perpendicular bisectors, anti-aliased." },
      { n: "4", title: "Recurse", text: "Subdivide each cell into its own inner Voronoi or membrane." },
    ],
    params: [
      { label: "seed_count", value: "≈ 150" },
      { label: "relaxation", value: "Lloyd × 3" },
      { label: "subdivision", value: "recursive ×2–6" },
      { label: "edge_render", value: "anti-aliased" },
      { label: "output", value: "cellular tissue" },
    ],
  },
  {
    i: "06", tag: "dla", gen: "dla", name: "DLA", sub: "DIFFUSION-LIMITED AGGREGATION", filename: "dla.sim",
    group: "NATURE SYSTEM",
    note: "T. A. Witten & L. M. Sander, Phys. Rev. Lett., 1981.",
    paras: [
      "Diffusion-limited aggregation grows the branching forms of frost on a window, copper in an electrolyte, and lightning across the sky.",
      "A single seed sits at the centre. Particles wander in from far away on random walks; the instant one touches the cluster, it freezes in place. Because the tips reach out and intercept wanderers first, the structure becomes an ever-finer fractal dendrite.",
    ],
    steps: [
      { n: "1", title: "Seed", text: "Fix a single sticky particle at the centre." },
      { n: "2", title: "Walk", text: "Release a particle that random-walks across the field." },
      { n: "3", title: "Stick", text: "On contact with the cluster, it freezes permanently." },
      { n: "4", title: "Repeat", text: "Thousands of particles later: a fractal dendrite." },
    ],
    params: [
      { label: "particles", value: "~6,600" },
      { label: "stickiness", value: "1.0" },
      { label: "walk_step", value: "1 cell" },
      { label: "fractal_dim", value: "≈ 1.71" },
      { label: "seed", value: "point" },
    ],
  },
  {
    i: "07", tag: "organic-turbulence", gen: "organic-turbulence", name: "Organic Turbulence", sub: "FLOW FIELDS · LAYERED NOISE", filename: "organic_turbulence.gen",
    group: "GENERATIVE MOVEMENT",
    note: "algorithmic-art skill · movement no. 1 — chaos constrained by natural law.",
    paras: [
      "Chaos constrained by natural law; order emerging from disorder. Thousands of particles are released into a flow field driven by layered Perlin noise, each one following the vector force beneath it.",
      "Their trails accumulate into organic density maps — turbulent regions and calm zones carved by the noise octaves. Colour emerges from the journey: fast particles burn bright, slow ones fade to shadow, until the field settles into a meticulously tuned equilibrium.",
    ],
    steps: [
      { n: "1", title: "Field", text: "Layered Perlin noise defines a vector at every point of the plane." },
      { n: "2", title: "Seed", text: "Thousands of particles are scattered across the canvas." },
      { n: "3", title: "Flow", text: "Each particle reads the field beneath it and steers along the force." },
      { n: "4", title: "Accumulate", text: "Trails layer additively into organic density and glow." },
    ],
    params: [
      { label: "particles", value: "~size × 4.2" },
      { label: "noise_scale", value: "0.0015 – 0.0031" },
      { label: "field_turns", value: "4π" },
      { label: "blend", value: "additive" },
      { label: "palette", value: "ember / sky" },
    ],
  },
  {
    i: "08", tag: "quantum-harmonics", gen: "quantum-harmonics", name: "Quantum Harmonics", sub: "WAVE INTERFERENCE · SYMMETRY", filename: "quantum_harmonics.gen",
    group: "GENERATIVE MOVEMENT",
    note: "algorithmic-art skill · movement no. 2 — discrete entities, wave-like interference.",
    paras: [
      "Discrete entities exhibiting wave-like interference. Point sources radiate sine waves across the plane; where crests meet, constructive interference brightens to nodes, where they oppose, destructive interference opens voids.",
      "Folded into n-fold rotational symmetry, simple harmonic motion generates complex emergent mandalas — the product of painstaking frequency calibration where every ratio is chosen to resonate.",
    ],
    steps: [
      { n: "1", title: "Emit", text: "A handful of sources each radiate a sine wave at their own frequency." },
      { n: "2", title: "Interfere", text: "At every point the waves sum — crests reinforce, troughs cancel." },
      { n: "3", title: "Fold", text: "The field is mirrored into n-fold rotational symmetry." },
      { n: "4", title: "Resolve", text: "Constructive crests bloom into bright mandala nodes." },
    ],
    params: [
      { label: "sources", value: "4 – 7" },
      { label: "symmetry", value: "3 – 8 fold" },
      { label: "frequency", value: "0.03 – 0.10" },
      { label: "phase", value: "seeded" },
      { label: "output", value: "interference mandala" },
    ],
  },
  {
    i: "09", tag: "recursive-whispers", gen: "recursive-whispers", name: "Recursive Whispers", sub: "SELF-SIMILAR BRANCHING", filename: "recursive_whispers.gen",
    group: "GENERATIVE MOVEMENT",
    note: "algorithmic-art skill · movement no. 3 — self-similarity across scales.",
    paras: [
      "Self-similarity across scales; infinite depth in finite space. Branching structures subdivide recursively, each split constrained by the golden angle, each child slightly randomised by noise.",
      "Line weights diminish with every recursion level, colour cooling as the structure reaches outward — tree-like forms that feel both mathematical and organic, every branching angle the product of deep exploration.",
    ],
    steps: [
      { n: "1", title: "Trunk", text: "Begin with one or two trunks rising from the base." },
      { n: "2", title: "Split", text: "Each branch spawns children at golden-angle offsets." },
      { n: "3", title: "Perturb", text: "Noise nudges every angle so symmetry never reads as perfect." },
      { n: "4", title: "Diminish", text: "Length, weight and warmth fade with each level of depth." },
    ],
    params: [
      { label: "max_depth", value: "9 – 11" },
      { label: "split_angle", value: "golden (137.5°)" },
      { label: "child_count", value: "2 – 3" },
      { label: "length_decay", value: "0.66 – 0.80" },
      { label: "output", value: "fractal canopy" },
    ],
  },
  {
    i: "10", tag: "field-dynamics", gen: "field-dynamics", name: "Field Dynamics", sub: "VECTOR FIELDS · GHOST TRACES", filename: "field_dynamics.gen",
    group: "GENERATIVE MOVEMENT",
    note: "algorithmic-art skill · movement no. 4 — invisible forces made visible.",
    paras: [
      "Invisible forces made visible through their effects on matter. Vortices, sources and sinks compose a mathematical vector field; particles born at the edges flow along its field lines.",
      "The visualisation shows only the traces — ghost-like evidence of forces that attract, repel and rotate — a computational dance meticulously choreographed through force balance, each particle dying when it reaches equilibrium or the boundary.",
    ],
    steps: [
      { n: "1", title: "Place", text: "Scatter a few singularities: vortices, sources, sinks." },
      { n: "2", title: "Compose", text: "Their inverse-square pulls sum into one continuous field." },
      { n: "3", title: "Release", text: "Particles enter from the edges and follow the field lines." },
      { n: "4", title: "Trace", text: "Faint trails record the flow; particles die at equilibrium." },
    ],
    params: [
      { label: "singularities", value: "3 – 5" },
      { label: "type", value: "vortex / source / sink" },
      { label: "falloff", value: "inverse-square" },
      { label: "particles", value: "~size × 2.2" },
      { label: "blend", value: "additive ghost" },
    ],
  },
  {
    i: "11", tag: "stochastic-crystallization", gen: "stochastic-crystallization", name: "Stochastic Crystallization", sub: "CIRCLE PACKING · RELAXATION", filename: "stochastic_crystal.gen",
    group: "GENERATIVE MOVEMENT",
    note: "algorithmic-art skill · movement no. 5 — random processes crystallising into order.",
    paras: [
      "Random processes crystallising into ordered structures. Points are thrown down at random; each grows into the largest circle that fits without overlapping its neighbours or the frame.",
      "The organic tiling that emerges feels both random and inevitable — colour keyed to size, every seed producing a unique crystalline packing, the mark of a master-level generative algorithm.",
    ],
    steps: [
      { n: "1", title: "Throw", text: "Propose a random point somewhere on the plane." },
      { n: "2", title: "Grow", text: "Expand a circle until it touches a neighbour or the edge." },
      { n: "3", title: "Settle", text: "Keep it if it clears a minimum radius, else discard." },
      { n: "4", title: "Fill", text: "Repeat thousands of times until the plane crystallises." },
    ],
    params: [
      { label: "max_circles", value: "950" },
      { label: "max_radius", value: "13% of frame" },
      { label: "min_radius", value: "0.6% of frame" },
      { label: "colour_by", value: "radius" },
      { label: "output", value: "circle packing" },
    ],
  },
  {
    i: "12", tag: "mycelium", gen: "mycelium", name: "Mycelium", sub: "FUNGAL NETWORK GROWTH", filename: "mycelium.sim",
    group: "NATURE SYSTEM",
    note: "Meškauskas & Moore, Neighbour-Sensing model, Mycological Research, 2004 · Runions et al., space colonization, 2007.",
    paras: [
      "A mycelium has no brain and no central controller, yet the colony is anything but aimless — it routes nutrients across the network, reinforces the paths that pay and lets the rest fade. Each hyphal tip is an autonomous agent, sensing the nutrient field ahead and the threads its own colony has already laid down.",
      "Tips grow toward food and away from their own density, branch where the substrate is rich and open, and — the signature of a true mycelium — fuse when they meet, closing loops so the colony becomes a network rather than a tree. It keeps colonising: growing outward, layering over itself and filling the ground. RANDOMISE rolls a new growth habit and palette.",
    ],
    steps: [
      { n: "1", title: "Extend", text: "Each hyphal tip advances a step, steered up the nutrient gradient — chemotropism." },
      { n: "2", title: "Avoid", text: "Tips veer away from their colony's own density — negative autotropism spreads the fan." },
      { n: "3", title: "Branch", text: "Where food is rich and space is open, a tip splits — apical or lateral." },
      { n: "4", title: "Anastomose", text: "Meeting an existing thread, a tip fuses into it, closing a loop in the net." },
    ],
    params: [
      { label: "model", value: "tip-agent + fields" },
      { label: "tropism", value: "chemo − auto" },
      { label: "branching", value: "density-dependent" },
      { label: "fusion", value: "anastomosis" },
      { label: "substrate", value: "depleting nutrient" },
    ],
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Mounts the live Algorithms toolbox into `rootEl` (which must contain the
 * #algoIndex / #algoHero / #algoText / #algoBelow scaffold). Returns a teardown
 * function that disposes every live p5 / WebGL instance — call it on unmount.
 */
export function mountAlgorithms(rootEl: HTMLElement): () => void {
  const indexEl = rootEl.querySelector("#algoIndex") as HTMLElement;
  const heroEl = rootEl.querySelector("#algoHero") as HTMLElement;
  const textEl = rootEl.querySelector("#algoText") as HTMLElement;
  const belowEl = rootEl.querySelector("#algoBelow") as HTMLElement;

  let sel = 0;
let heroSeed = 0;
let heroParams: Params | undefined; // current overrides (only Physarum's default sets any)
const instances: any[] = []; // live p5 instances for the current selection

const baseSeed = (i: number) => 1000 + i * 131 + 7;

function teardown() {
  while (instances.length) {
    const inst = instances.pop();
    try { inst?.remove?.(); } catch { /* noop */ }
  }
}

// Render heavy sketches without freezing the page: hero immediately, then the
// example tiles one per frame so they pop in progressively.
function buildHero() {
  const host = heroEl.querySelector<HTMLElement>("#heroCanvas");
  if (!host) return;
  host.innerHTML = "";
  const lbl = heroEl.querySelector<HTMLElement>("#heroSeed");

  // Physarum runs the GPU density-modulated engine (PhysMod) rather than a p5 sketch.
  if (DATA[sel].gen === "physarum") {
    const cv = document.createElement("canvas");
    cv.style.cssText = "width:100%;height:100%;display:block";
    host.appendChild(cv);
    const preset = PHYS_PRESETS[Math.abs(heroSeed) % PHYS_PRESETS.length];
    let raf = 0;
    let pm: PhysMod | null = null;
    try {
      pm = new PhysMod(cv, 640, { ...M_DEFAULTS, agentTexW: 768, ...preset.p });
      const loop = () => { pm!.render(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    } catch { /* WebGL2 unavailable — leave the panel dark */ }
    instances.push({ remove() { cancelAnimationFrame(raf); try { pm?.dispose(); } catch { /* noop */ } cv.remove(); } });
    if (lbl) lbl.textContent = `${preset.name.toLowerCase()} · ${heroSeed}`;
    return;
  }

  const inst = renderArt(host, DATA[sel].gen, heroSeed, HERO_PX, 30, heroParams);
  if (inst) instances.push(inst);
  if (lbl) lbl.textContent = `seed ${heroSeed}`;
}

function renderIndex() {
  indexEl.innerHTML = DATA.map((d, i) => {
    if (i === sel) {
      return `<button data-sel="${i}" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:10px 11px;background:var(--accent-bg);color:var(--accent-fg);border:none;border-radius:3px;cursor:pointer;font-family:${HELV}">` +
        `<span style="font-family:ui-monospace,monospace;font-size:9.5px;opacity:0.9">${d.i}</span>` +
        `<span style="font-weight:600;font-size:12.5px;letter-spacing:-0.01em">${esc(d.name)}</span></button>`;
    }
    return `<button class="idx-ghost" data-sel="${i}" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:10px 11px;background:transparent;color:var(--fg2);border:none;border-bottom:1px solid rgba(var(--lw),0.07);cursor:pointer;font-family:${HELV};transition:color .2s,background .2s">` +
      `<span style="font-family:ui-monospace,monospace;font-size:9.5px;color:var(--fg4)">${d.i}</span>` +
      `<span style="font-weight:500;font-size:12.5px;letter-spacing:-0.01em">${esc(d.name)}</span></button>`;
  }).join("");
  indexEl.querySelectorAll<HTMLButtonElement>("button[data-sel]").forEach((b) => {
    b.addEventListener("click", () => select(Number(b.dataset.sel)));
  });
}

function renderMain() {
  const a = DATA[sel];

  // ── middle column: the live image — a clean dark "screen" in both themes ──
  heroEl.innerHTML =
    `<div style="border:1px solid rgba(var(--lw),0.16);border-radius:5px;overflow:hidden;background:#000">` +
      `<div style="position:relative;aspect-ratio:1/1;max-height:760px;background:#000">` +
        `<div id="heroCanvas" style="position:absolute;inset:0"></div>` +
        `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 86% 86% at 50% 50%,transparent 58%,rgba(0,0,0,0.5) 100%)"></div>` +
        `<div style="position:absolute;left:14px;bottom:14px;display:flex;gap:8px">` +
          `<button class="ghost-btn" data-act="reseed" style="padding:9px 14px;background:rgba(12,12,12,0.62);border:1px solid rgba(255,255,255,0.2);color:#ededed;border-radius:3px;font-size:10px;letter-spacing:0.14em;cursor:pointer;backdrop-filter:blur(8px)">RANDOMISE</button>` +
        `</div>` +
        `<div id="heroSeed" style="position:absolute;right:14px;bottom:14px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;color:rgba(255,255,255,0.7)"></div>` +
      `</div>` +
    `</div>`;

  // ── right column: number, name, sub, description, citation ──
  textEl.innerHTML =
    `<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:12px">` +
      `<span style="font-family:${MONO};font-size:13px;color:var(--fg4)">${a.i}</span>` +
      `<h2 style="margin:0;font-weight:700;font-size:clamp(26px,3.2vw,42px);line-height:1.02;letter-spacing:-0.02em">${esc(a.name)}</h2>` +
    `</div>` +
    `<div style="font-family:${MONO};font-size:11.5px;letter-spacing:0.16em;color:var(--fg3);margin-top:12px">${esc(a.sub)}</div>` +
    `<div style="display:flex;flex-direction:column;gap:16px;margin-top:24px">` +
      a.paras.map((p) => `<p style="margin:0;font-size:clamp(14px,1.05vw,15.5px);line-height:1.65;color:var(--fg2)">${esc(p)}</p>`).join("") +
    `</div>` +
    `<div style="font-family:${MONO};font-size:11px;letter-spacing:0.08em;color:var(--fg4);margin-top:22px;padding-left:13px;border-left:1px solid rgba(var(--lw),0.2);line-height:1.5">${esc(a.note)}</div>`;

  // ── full-width below: how it works + parameters ──
  belowEl.innerHTML =
    `<h3 style="margin:0 0 24px;font-family:${MONO};font-size:11px;letter-spacing:0.24em;color:var(--fg3);font-weight:400">HOW IT WORKS</h3>` +
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:1px;background:rgba(var(--lw),0.1);border:1px solid rgba(var(--lw),0.1)">` +
      a.steps.map((s) =>
        `<div style="background:var(--bg);padding:24px 22px 28px">` +
          `<div style="font-family:ui-monospace,monospace;font-size:24px;color:var(--fg4);margin-bottom:18px">${s.n}</div>` +
          `<div style="font-weight:600;font-size:14px;letter-spacing:0.02em;margin-bottom:9px">${esc(s.title)}</div>` +
          `<p style="margin:0;font-size:13px;line-height:1.55;color:var(--fg3)">${esc(s.text)}</p>` +
        `</div>`).join("") +
    `</div>` +

    `<h3 style="margin:clamp(40px,5vw,60px) 0 16px;font-family:${MONO};font-size:11px;letter-spacing:0.24em;color:var(--fg3);font-weight:400">PARAMETERS</h3>` +
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:0 40px">` +
      a.params.map((pr) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;padding:14px 2px;border-bottom:1px solid rgba(var(--lw),0.09)">` +
          `<span style="font-family:${MONO};font-size:12.5px;letter-spacing:0.08em;color:var(--fg3)">${esc(pr.label)}</span>` +
          `<span style="font-family:${MONO};font-size:12.5px;color:var(--fg2);text-align:right">${esc(pr.value)}</span>` +
        `</div>`).join("") +
    `</div>`;

  heroEl.querySelector('[data-act="reseed"]')?.addEventListener("click", () => {
    heroSeed = Math.floor(Math.random() * 999900) + 1;
    heroParams = { color: 1 }; // RANDOMISE opts into colour; the generator rolls a palette from the seed
    teardown();
    buildHero();
  });

  buildHero();
}

function select(i: number) {
  if (i === sel) return;
  sel = i;
  heroSeed = baseSeed(i);
  heroParams = undefined; // default → monochrome (renderArt sees no color flag)
  teardown();
  renderIndex();
  renderMain();
}

// guard against a missing generator (keeps the page resilient if a key is renamed)
DATA.forEach((d) => { if (!GENERATORS[d.gen]) console.warn("missing generator:", d.gen); });

  heroSeed = baseSeed(0);
  heroParams = undefined;
  renderIndex();
  renderMain();

  return () => teardown();
}
