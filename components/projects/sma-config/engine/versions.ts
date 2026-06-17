import { DEFAULTS, type Params } from "./physarum";

export interface Version {
  id: string;
  label: string;
  blurb: string;
  params: Params;
  dimension?: "2d" | "3d"; // default 2d
  audio?: boolean; // auto-open the sonification panel
}

const mk = (over: Partial<Params>): Params => ({ ...DEFAULTS, ...over });

// Each version is a distinct creative mode. v1 is frozen — new ideas are added
// as v2, v3, … so older pieces stay reproducible.
export const VERSIONS: Version[] = [
  {
    id: "v1",
    label: "v1 · Classic Networks",
    blurb: "The original Physarum transport networks — agents follow a shared pheromone trail.",
    params: mk({}),
  },
  {
    id: "v2",
    label: "v2 · Living Ink",
    blurb: "Move your cursor over the canvas to drop food — the slime swarms toward it and draws with you.",
    params: mk({
      spawn: "random",
      mouseFood: 0.3,
      foodRadius: 30,
      sensorAngle: 22,
      sensorDist: 11,
      turnSpeed: 30,
      deposit: 0.1,
      decay: 0.92,
      diffuse: 0.35,
      bg: "#04060a",
      lo: "#0b3a6b",
      hi: "#7df3ff",
      intensity: 0.75,
      gamma: 1.0,
    }),
  },
  {
    id: "v3",
    label: "v3 · Three Species",
    blurb: "Three populations, each following its own pheromone (R/G/B) and avoiding the others.",
    params: mk({
      species: 3,
      spawn: "random",
      avoid: 0.5,
      displayMode: "rgb",
      sensorAngle: 22,
      sensorDist: 9,
      turnSpeed: 28,
      deposit: 0.14,
      decay: 0.92,
      diffuse: 0.4,
      intensity: 0.8,
      gamma: 1.0,
      bg: "#050507",
      colR: "#ff2d6b",
      colG: "#22e0c8",
      colB: "#ffd23d",
    }),
  },
  {
    id: "v4",
    label: "v4 · Solfeggio Field",
    blurb: "Sonified with healing frequencies — open the Sonification panel, press ▶ Sound, and the growing field drives a drone of Solfeggio tones.",
    audio: true,
    params: mk({
      spawn: "ring",
      sensorAngle: 30,
      sensorDist: 12,
      turnSpeed: 24,
      stepSize: 1.0,
      deposit: 0.16,
      decay: 0.95,
      diffuse: 0.5,
      bg: "#060410",
      lo: "#2a1457",
      hi: "#9d7bff",
      intensity: 1.0,
      gamma: 0.9,
    }),
  },
  {
    id: "v5",
    label: "Cosmic Web · Blue",
    blurb: "Monte Carlo Physarum Machine — agents weave filaments between galaxy nodes, reconstructing the cosmic web of the intergalactic medium. Drag to rotate.",
    dimension: "3d",
    params: mk({
      sensorDist: 3,
      turnSpeed: 18,
      stepSize: 0.9,
      deposit: 0.02,
      decay: 0.85,
      diffuse: 0.3,
      intensity: 1.1,
      bg: "#010206",
      lo: "#16356e", // filament deep blue
      hi: "#cfeaff", // bright node cyan-white
    }),
  },
  {
    id: "v5v",
    label: "Cosmic Web · Violet",
    blurb: "Monte Carlo Physarum Machine in violet — the slime-mould cosmic web rendered like a deep-field survey. Drag to rotate.",
    dimension: "3d",
    params: mk({
      sensorDist: 3,
      turnSpeed: 18,
      stepSize: 0.9,
      deposit: 0.02,
      decay: 0.85,
      diffuse: 0.3,
      intensity: 1.15,
      bg: "#060108",
      lo: "#4a0d5e", // filament deep violet
      hi: "#ff8af0", // bright node magenta-pink
    }),
  },
  {
    id: "v6",
    label: "v6 · Aurora Veil",
    blurb: "A slow violet bloom of 256K agents on long sensors — the signature Frond look, used as the home-page hero background and the studio's default scene.",
    params: mk({
      agentTexW: 512, sensorAngle: 13, sensorDist: 22, turnSpeed: 15, stepSize: 1,
      deposit: 0.04, decay: 0.832, diffuse: 0, stepsPerFrame: 6, intensity: 3.15, gamma: 0.3,
      bg: "#060410", lo: "#2a1457", hi: "#9d7bff", spawn: "ring", species: 1, avoid: 1,
      mouseFood: 0, foodRadius: 36, displayMode: "rgb", colR: "#ffffff", colG: "#22e0c8", colB: "#ffd23d",
    }),
  },
  {
    id: "v7",
    label: "v7 · Monochrome Drift",
    blurb: "Stark white veins on pure black — a scattered swarm on long sensors with no diffusion, so every channel reads on tonal logic alone. The studio's default scene, matching the home and banner look.",
    params: mk({
      agentTexW: 256, sensorAngle: 20, sensorDist: 14, turnSpeed: 32, stepSize: 1.7,
      deposit: 0.09, decay: 0.89, diffuse: 0, stepsPerFrame: 3, intensity: 3, gamma: 0.3,
      bg: "#000000", lo: "#3a3a3a", hi: "#ffffff", spawn: "random", species: 1, avoid: 0,
      mouseFood: 0, foodRadius: 36, displayMode: "palette",
    }),
  },
  ...scenes(),
];

// ── Curated scenes ("points") — a gallery of distinct, beautiful slime configs in
// the spirit of Sage Jenson's 36 Points. Three movement "characters" (reticulated
// web, drifting filaments, soft bloom) recoloured into many palettes.
function scenes(): Version[] {
  const RETIC = { agentTexW: 512, sensorAngle: 24, sensorDist: 9, turnSpeed: 30, stepSize: 1.2, deposit: 0.08, decay: 0.9, diffuse: 0.25, stepsPerFrame: 3, intensity: 2.4, gamma: 0.42, spawn: "random", displayMode: "palette" } as Partial<Params>;
  const DRIFT = { agentTexW: 256, sensorAngle: 15, sensorDist: 19, turnSpeed: 17, stepSize: 1.5, deposit: 0.07, decay: 0.88, diffuse: 0, stepsPerFrame: 4, intensity: 2.9, gamma: 0.34, spawn: "random", displayMode: "palette" } as Partial<Params>;
  const BLOOM = { agentTexW: 512, sensorAngle: 31, sensorDist: 12, turnSpeed: 23, stepSize: 1.0, deposit: 0.1, decay: 0.94, diffuse: 0.5, stepsPerFrame: 3, intensity: 2.2, gamma: 0.52, spawn: "ring", displayMode: "palette" } as Partial<Params>;
  const S: [string, string, Partial<Params>, string, string, string][] = [
    // id, label, base, bg, lo, hi
    ["ember", "Ember Filigree", RETIC, "#0a0402", "#7a1a00", "#ffd24a"],
    ["cyan", "Cyan Circuitry", RETIC, "#02060c", "#0b3a6b", "#7df3ff"],
    ["magma", "Magma Veins", DRIFT, "#0a0206", "#b3164b", "#ffd0a0"],
    ["biolum", "Bioluminescence", BLOOM, "#01070a", "#0b4a3a", "#9bffd0"],
    ["rose", "Rose Quartz", BLOOM, "#0a0408", "#7a1f55", "#ffc6e6"],
    ["gold", "Gold Leaf", RETIC, "#0a0800", "#5a3d00", "#ffe9a0"],
    ["arctic", "Arctic Lattice", RETIC, "#04070a", "#33506e", "#eaf6ff"],
    ["solar", "Solar Flare", DRIFT, "#0a0300", "#a83a00", "#fff6cf"],
    ["deepsea", "Deep Sea", DRIFT, "#01030a", "#16246e", "#79c7ff"],
    ["forest", "Forest Floor", RETIC, "#040803", "#2c4a12", "#cfe89a"],
    ["uv", "Ultraviolet", BLOOM, "#060108", "#4a0d6e", "#ff8af0"],
    ["copper", "Copper Patina", RETIC, "#03080a", "#0b5a52", "#ffb07a"],
    ["coral", "Neon Coral", DRIFT, "#0a0306", "#b3214b", "#ff9e57"],
    ["lavender", "Lavender Mist", BLOOM, "#060610", "#3a2f7a", "#cdb8ff"],
    ["phosphor", "Phosphor", DRIFT, "#020a04", "#0a5a22", "#9bff8a"],
    ["sand", "Sandstorm", RETIC, "#0a0703", "#6e4a1f", "#ffe6b0"],
    ["blacklight", "Blacklight", BLOOM, "#04020a", "#5a0d7a", "#7df3ff"],
    ["ink", "Ink Wash", DRIFT, "#070707", "#444444", "#f2f2f2"],
  ];
  return S.map(([id, label, base, bg, lo, hi]) => ({
    id, label,
    blurb: `${label} — a curated slime scene. Drag on the canvas to feed the swarm, or tweak any parameter to make it your own.`,
    params: mk({ ...base, bg, lo, hi, mouseFood: 0.25, foodRadius: 34, species: 1, avoid: 0 }),
  }));
}

// The signature scene — the studio's default and the look shared with the home
// banner and the banner maker.
export const HERO_VERSION_ID = "v7";

export const VERSION_BY_ID = Object.fromEntries(VERSIONS.map((v) => [v.id, v]));
