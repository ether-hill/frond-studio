import GUI from "lil-gui";
import { getAudioContext } from "./audioCtx";
import { Physarum, DEFAULTS, type Params } from "./physarum";
import { Cosmic } from "./cosmic";
import { VERSIONS, VERSION_BY_ID, HERO_VERSION_ID, type Version } from "./versions";
import { Sonifier, type Band } from "./audio";
import { AudioInput } from "./audioInput";
import { VideoRecorder } from "./recorder";
import type { Engine } from "./algo";
import { TeroNetwork, TERO_DEFAULTS, TERO_PRESETS, type TeroParams } from "./teroNetwork";

export function mount(): () => void {
  let __rafId = 0, __stopped = false;
const rootEl = document.getElementById("root") as HTMLElement;

const canvas = document.getElementById("gl") as HTMLCanvasElement;
const fpsEl = document.getElementById("fps")!;
const fatalEl = document.getElementById("fatal")!;
const algoSel = document.getElementById("algorithm") as HTMLSelectElement;
const versionSel = document.getElementById("version") as HTMLSelectElement;
const blurbEl = document.getElementById("blurb")!;

// Each algorithm is a documented slime-mould model:
//   jones — Jones (2010) agent-based Physarum (2D)
//   mcpm  — Monte Carlo Physarum Machine, Elek/Burchett (2020/22) (3D)
//   tero  — Tero et al. (2010) adaptive transport network
type AlgoId = "jones" | "mcpm" | "tero";
const slimeFamily = (id: AlgoId) => id === "jones" || id === "mcpm";
// Playground 3 is the Jones agent model only, restricted to three signature presets:
// v6 Aurora Veil, v7 Monochrome Drift, and Blue Field (registered just below). The
// registration is local to this page, so Playground 1's version list is untouched.
const EXTRA_PRESETS: Version[] = [
  {
    id: "blue", label: "Blue Field", blurb: "",
    params: {
      ...DEFAULTS,
      agentTexW: 256, sensorAngle: 6.341, sensorDist: 8.739, turnSpeed: 26.023, stepSize: 1.7,
      deposit: 0.09, decay: 0.9052, diffuse: 0.0353, stepsPerFrame: 3, spawn: "random",
      bg: "#04060a", lo: "#0b3a6b", hi: "#7df3ff", intensity: 3, gamma: 0.3,
      displayMode: "palette", species: 1, avoid: 0,
    },
  },
  {
    id: "starseed", label: "Starseed", blurb: "",
    params: {
      ...DEFAULTS,
      agentTexW: 512, sensorAngle: 10, sensorDist: 7, turnSpeed: 23, stepSize: 1.5,
      deposit: 0.04, decay: 0.815, diffuse: 0, stepsPerFrame: 3, intensity: 3.15, gamma: 0.3,
      bg: "#1a1438", lo: "#2a1457", hi: "#a8963e", spawn: "ring", species: 2, avoid: 0,
      mouseFood: 0, foodRadius: 36, displayMode: "rgb", colR: "#e1c45b", colG: "#937a34", colB: "#ffd23d",
    },
  },
  {
    id: "bubblegum", label: "Bubble Gum", blurb: "",
    params: {
      ...DEFAULTS,
      agentTexW: 256, sensorAngle: 26, sensorDist: 24, turnSpeed: 45.383, stepSize: 2.6,
      deposit: 0.5888, decay: 0.899, diffuse: 0.1, stepsPerFrame: 3, intensity: 0.865, gamma: 0.4859,
      bg: "#2b1226", lo: "#5a2490", hi: "#f0a8ec", spawn: "center", species: 3, avoid: 0.28,
      mouseFood: 0, foodRadius: 36, displayMode: "rgb", colR: "#b65e77", colG: "#c7527b", colB: "#f47c94",
    },
  },
];
for (const v of EXTRA_PRESETS) if (!VERSION_BY_ID[v.id]) { VERSIONS.push(v); VERSION_BY_ID[v.id] = v; }
const ALLOWED_VERSIONS = new Set(["v6", "v7", "blue", "starseed", "bubblegum"]);
const versionsFor = (_id: AlgoId) => VERSIONS.filter((v) => ALLOWED_VERSIONS.has(v.id));

interface AutoState { on: boolean; speed: number; }
interface Snapshot {
  alg?: AlgoId;
  v: string;
  p?: Partial<Params>;
  ap?: Record<string, any>;
  snd?: { t: number[]; vol: number; drive: number; bias: number; wave: OscillatorType };
  auto?: { sense: AutoState; trail: AutoState; look: AutoState };
  aauto?: AutoState;
}

const encode = (s: Snapshot) => encodeURIComponent(btoa(JSON.stringify(s)));
const decode = (str: string): Snapshot => JSON.parse(atob(decodeURIComponent(str)));

let suppressHash = false;
function setHash(h: string) { suppressHash = true; location.hash = h; }
const setVis = (folder: GUI, vis: boolean) => { folder.domElement.style.display = vis ? "" : "none"; };

// ---- initial state ----
let simRes = 1024;
let initSnap: Snapshot | null = null;
const hash = location.hash.replace("#", "");
if (hash.startsWith("s=")) { try { initSnap = decode(hash.slice(2)); } catch { /* ignore */ } }
const wantId = initSnap?.v || hash || localStorage.getItem("p3-version") || HERO_VERSION_ID;
const startId = ALLOWED_VERSIONS.has(wantId) ? wantId : HERO_VERSION_ID;
let current: Version = VERSION_BY_ID[startId] ?? VERSION_BY_ID[HERO_VERSION_ID];
let algoId: AlgoId = "jones"; // locked — Jones agent model only
const params: Params = { ...current.params };

let engine: Engine;
try {
  engine = makeActiveEngine();
} catch (err) {
  fatalEl.style.display = "grid";
  fatalEl.textContent = "Could not start the simulation: " + (err as Error).message;
  throw err;
}

function makeSlimeEngine(v: Version): Engine {
  return v.dimension === "3d" ? new Cosmic(canvas, simRes, params) : new Physarum(canvas, simRes, params);
}
function makeActiveEngine(): Engine {
  if (algoId === "tero") return new TeroNetwork(canvas, simRes, teroParams);
  return makeSlimeEngine(current);
}

// ---- controls ----
const gui = new GUI({ title: "Controls", container: document.getElementById("guihost")! });
const syncGui = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());
const ctl: Record<string, any> = {};
const autoSense = { on: false, speed: 0.3 };
const autoTrail = { on: false, speed: 0.3 };
const autoLook = { on: false, speed: 0.25 };

const fSense = gui.addFolder("Sensing");
fSense.add(autoSense, "on").name("↻ auto-random");
fSense.add(autoSense, "speed", 0, 1, 0.01).name("↻ speed");
ctl.sensorAngle = fSense.add(params, "sensorAngle", 1, 90, 1).name("sensor angle°");
ctl.sensorDist = fSense.add(params, "sensorDist", 1, 40, 0.5).name("sensor dist");
ctl.turnSpeed = fSense.add(params, "turnSpeed", 1, 90, 1).name("turn speed°");
ctl.stepSize = fSense.add(params, "stepSize", 0.2, 4, 0.1).name("step size");
ctl.avoid = fSense.add(params, "avoid", 0, 1, 0.01).name("species avoid");

const fTrail = gui.addFolder("Trail");
fTrail.add(autoTrail, "on").name("↻ auto-random");
fTrail.add(autoTrail, "speed", 0, 1, 0.01).name("↻ speed");
ctl.deposit = fTrail.add(params, "deposit", 0.01, 1, 0.01).name("deposit");
ctl.decay = fTrail.add(params, "decay", 0.7, 0.999, 0.001).name("decay");
ctl.diffuse = fTrail.add(params, "diffuse", 0, 1, 0.01).name("diffuse");
fTrail.add(params, "stepsPerFrame", 1, 6, 1).name("sim speed");

const fLook = gui.addFolder("Look");
fLook.add(autoLook, "on").name("↻ auto-random");
fLook.add(autoLook, "speed", 0, 1, 0.01).name("↻ speed");
fLook.add(params, "displayMode", ["palette", "rgb"]).name("color mode");
ctl.bg = fLook.addColor(params, "bg").name("background");
ctl.lo = fLook.addColor(params, "lo").name("low / far");
ctl.hi = fLook.addColor(params, "hi").name("high / near");
ctl.colR = fLook.addColor(params, "colR").name("species 1");
ctl.colG = fLook.addColor(params, "colG").name("species 2");
ctl.colB = fLook.addColor(params, "colB").name("species 3");
ctl.intensity = fLook.add(params, "intensity", 0.2, 4, 0.05).name("intensity");
ctl.gamma = fLook.add(params, "gamma", 0.3, 2.5, 0.05).name("gamma");

const fFood = gui.addFolder("Touch (cursor)");
fFood.add(params, "mouseFood", 0, 1.5, 0.05).name("strength");
fFood.add(params, "foodRadius", 8, 120, 1).name("radius");

const fAgents = gui.addFolder("Agents");
const AGENT_OPTIONS: Record<string, number> = { "256K": 512, "1M": 1024, "4M": 2048 };
const agentState = { count: "1M" };
function rebuildAgentSelect() {
  const m = Object.entries(AGENT_OPTIONS).find(([, w]) => w === params.agentTexW);
  agentState.count = m ? m[0] : "1M";
}
rebuildAgentSelect();
fAgents.add(agentState, "count", Object.keys(AGENT_OPTIONS)).name("count").onChange((val: string) => {
  params.agentTexW = AGENT_OPTIONS[val];
  engine.setParams(params);
});
fAgents.add(params, "species", { "1": 1, "2": 2, "3": 3 }).name("species").onChange((v: string) => {
  params.species = Number(v);
  engine.setParams(params);
});
fAgents.add(params, "spawn", ["center", "ring", "random"]).name("spawn").onChange(() => engine.setParams(params));

// ---- Tero adaptive network controls ----
const teroParams: TeroParams = { ...TERO_DEFAULTS };
const teroCtl: Record<string, any> = {};
const teroAuto = { on: false, speed: 0.3 };
const fTero = gui.addFolder("Tero Network");
fTero.add(teroAuto, "on").name("↻ auto-random");
fTero.add(teroAuto, "speed", 0, 1, 0.01).name("↻ speed");
teroCtl.mu = fTero.add(teroParams, "mu", 1, 3, 0.05).name("flux exponent μ");
teroCtl.dt = fTero.add(teroParams, "dt", 0.02, 0.4, 0.01).name("adapt rate");
teroCtl.iters = fTero.add(teroParams, "iters", 4, 60, 1).name("solver iters");
teroCtl.foods = fTero.add(teroParams, "foods", 2, 30, 1).name("food sources");
teroCtl.bg = fTero.addColor(teroParams, "bg").name("background");
teroCtl.lo = fTero.addColor(teroParams, "lo").name("low color");
teroCtl.hi = fTero.addColor(teroParams, "hi").name("high color");
teroCtl.intensity = fTero.add(teroParams, "intensity", 0.3, 3, 0.05).name("intensity");

interface AutoSpec { k: string; min?: number; max?: number; color?: boolean; s?: number; l?: number; }
interface Desc {
  id: AlgoId; params: any; defaults: any; ctl: Record<string, any>;
  autoState: { on: boolean; speed: number }; autoSpecs: AutoSpec[];
  reactive: [string, number, number][]; reactiveTargets: Record<string, number>;
  presets: { id: string; label: string; blurb: string; params: Record<string, any> }[]; presetId: string; folder: GUI;
}
const teroDesc: Desc = {
  id: "tero", params: teroParams, defaults: TERO_DEFAULTS, ctl: teroCtl, autoState: teroAuto, folder: fTero,
  autoSpecs: [
    { k: "mu", min: 1, max: 2.6 }, { k: "dt", min: 0.08, max: 0.3 },
    { k: "bg", color: true, s: 0.5, l: 0.05 }, { k: "lo", color: true, s: 0.7, l: 0.3 }, { k: "hi", color: true, s: 0.85, l: 0.62 },
  ],
  reactive: [["mu", 1, 2.6], ["dt", 0.08, 0.3]], reactiveTargets: {},
  presets: TERO_PRESETS, presetId: TERO_PRESETS[0].id,
};

// ---- sonification (visual instrument) ----
const sonifier = new Sonifier();
const fSound = gui.addFolder("Sonification");
const soundCtl = {
  sound: async () => {
    if (sonifier.running) await sonifier.stop();
    else await sonifier.start();
    soundBtn.name(sonifier.running ? "■ stop sound" : "▶ enable sound");
  },
};
const soundBtn = fSound.add(soundCtl, "sound").name("▶ enable sound");
fSound.add(sonifier, "masterVolume", 0, 1, 0.01).name("volume");
fSound.add(sonifier, "drive", 0, 2, 0.05).name("drive");
fSound.add(sonifier, "motionBias", 0, 1, 0.01).name("motion ↔ presence");
const waveState = { wave: "sine" as OscillatorType };
fSound.add(waveState, "wave", ["sine", "triangle", "sawtooth"]).name("waveform")
  .onChange((w: OscillatorType) => sonifier.setWaveform(w));
const fFx = fSound.addFolder("Motion FX");
fFx.add(sonifier, "brightness", 0, 1, 0.01).name("brightness");
fFx.add(sonifier, "shimmer", 0, 1, 0.01).name("shimmer");
fFx.add(sonifier, "tremolo", 0, 1, 0.01).name("tremolo");
fFx.add(sonifier, "reverb", 0, 1, 0.01).name("reverb");
fFx.add(sonifier, "delay", 0, 1, 0.01).name("delay");
const fFreq = fSound.addFolder("Frequencies");
sonifier.tones.forEach((t) => fFreq.add(t, "on").name(t.label));

// ---- audio input (beat-reactive) ----
const audioInput = new AudioInput();
const audioState = { gain: 0.6, status: "off" };
const fInput = gui.addFolder("Audio input (beat-reactive)");
const inputCtl = {
  mic: async () => {
    try { await audioInput.useMic(); audioState.status = "microphone"; }
    catch (e) { audioState.status = "mic denied"; console.error(e); }
    syncGui();
  },
  file: () => audioFileInput.click(),
  stop: () => { audioInput.stop(); audioState.status = "off"; syncGui(); },
};
fInput.add(inputCtl, "mic").name("🎤 use microphone");
fInput.add(inputCtl, "file").name("🎵 load mp3 / audio");
fInput.add(inputCtl, "stop").name("stop input");
fInput.add(audioState, "gain", 0, 1.2, 0.05).name("reactivity");
fInput.add(audioState, "status").name("source").disable();

const audioFileInput = document.createElement("input");
audioFileInput.type = "file";
audioFileInput.id = "smsAudioFile";
audioFileInput.accept = "audio/*";
audioFileInput.style.display = "none";
audioFileInput.addEventListener("change", async () => {
  const f = audioFileInput.files?.[0];
  if (!f) return;
  try { await audioInput.useFile(f); audioState.status = f.name.slice(0, 22); }
  catch (e) { audioState.status = "load failed"; console.error(e); }
  syncGui();
  audioFileInput.value = "";
});
document.body.appendChild(audioFileInput);

// ---- video export ----
const recorder = new VideoRecorder();
const fExport = gui.addFolder("Export video");
const exportState = { width: 1024, height: 1024, fps: "30", seconds: 8 };
// Type any width/height (px). The sim renders square at the larger edge and is
// cover-fit into the chosen output size; rebuild once a value is committed.
// cap the live sim at a GPU-safe resolution (a 4096² sim can lose the WebGL
// context → a blank canvas → a 0-byte export); the output video can still be
// larger, the recorder just upscales the cover-fit.
const syncSimRes = () => rebuildEngine(Math.max(128, Math.min(2048, Math.round(Math.max(exportState.width, exportState.height)))));
fExport.add(exportState, "width", 128, 4096, 1).name("width (px)").onFinishChange(syncSimRes);
fExport.add(exportState, "height", 128, 4096, 1).name("height (px)").onFinishChange(syncSimRes);
fExport.add(exportState, "fps", ["24", "30", "60"]).name("frame rate");
fExport.add(exportState, "seconds", 2, 60, 1).name("duration (s)");
const recBtn = fExport.add({ rec: recordVideo }, "rec").name("● render video");

function rebuildEngine(res: number) {
  simRes = res;
  engine.dispose();
  engine = makeActiveEngine();
  engine.setParams(slimeFamily(algoId) ? params : teroParams);
}
function activePresetId() { return slimeFamily(algoId) ? current.id : teroDesc.presetId; }

async function recordVideo() {
  if (recorder.recording) return;
  recBtn.name("● recording…");
  // Start the clip from the very first frame: restart the simulation (as RESTART does)
  // so the whole growth sequence is captured from the beginning, not mid-development.
  engine.paused = false;
  engine.reset();
  try {
    const { blob, ext } = await recorder.record(canvas, exportState.width, exportState.height, Number(exportState.fps), exportState.seconds, (p) =>
      recBtn.name(`● ${Math.round(p * 100)}%`));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sma-${algoId}-${activePresetId()}-${Date.now()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { console.error("recording failed", e); }
  recBtn.name("● render video");
}

// ---- algorithm + preset selection ----
const ALGOS: { id: AlgoId; label: string }[] = [
  { id: "jones", label: "Jones Agent Model · 2D (Jones 2010)" },
];
for (const a of ALGOS) {
  const o = document.createElement("option");
  o.value = a.id; o.textContent = a.label; algoSel.appendChild(o);
}

function populatePresets(id: AlgoId) {
  versionSel.innerHTML = "";
  const clean = (s: string) => s.replace(/^v\d+\s*·\s*/, ""); // drop the "vN · " prefix
  const list = slimeFamily(id)
    ? versionsFor(id).map((v) => ({ id: v.id, label: clean(v.label) }))
    : TERO_PRESETS.map((p) => ({ id: p.id, label: clean(p.label) }));
  for (const it of list) {
    const o = document.createElement("option");
    o.value = it.id; o.textContent = it.label; versionSel.appendChild(o);
  }
}
function showFolders() {
  const sf = slimeFamily(algoId);
  setVis(fSense, sf); setVis(fTrail, sf); setVis(fLook, sf);
  setVis(fFood, algoId === "jones"); setVis(fAgents, algoId === "jones");
  setVis(fTero, algoId === "tero");
}
populatePresets(algoId);
versionSel.value = current.id;
algoSel.value = algoId;
blurbEl.textContent = current.blurb;
showFolders();

function setEngineFor(v: Version) {
  const need3D = v.dimension === "3d";
  if (engine.is3D !== need3D) { engine.dispose(); engine = makeSlimeEngine(v); }
  else { engine.setParams(params); engine.reset(); }
}

function loadVersion(id: string) {
  const v = VERSION_BY_ID[id];
  if (!v) return;
  Object.assign(params, v.params);
  current = v;
  setEngineFor(v);
  blurbEl.textContent = v.blurb;
  versionSel.value = id;
  setHash(id);
  localStorage.setItem("p3-version", id);
  rebuildAgentSelect();
  if (v.audio) fSound.open();
  syncGui();
}

function loadTeroPreset(id: string) {
  const preset = TERO_PRESETS.find((p) => p.id === id) ?? TERO_PRESETS[0];
  Object.assign(teroParams, TERO_DEFAULTS, preset.params);
  teroDesc.presetId = preset.id; teroDesc.reactiveTargets = {};
  engine.setParams(teroParams); engine.reset();
  blurbEl.textContent = preset.blurb;
  versionSel.value = preset.id;
  syncGui();
}

function loadPreset(id: string) {
  if (slimeFamily(algoId)) loadVersion(id);
  else loadTeroPreset(id);
}
versionSel.addEventListener("change", () => loadPreset(versionSel.value));

function loadAlgorithm(id: AlgoId, presetId?: string) {
  engine.dispose();
  algoId = id;
  algoSel.value = id;
  localStorage.setItem("sms-algo", id);
  populatePresets(id);
  showFolders();
  if (slimeFamily(id)) {
    const list = versionsFor(id);
    let v = (presetId && VERSION_BY_ID[presetId]) || list[0];
    if (!list.includes(v)) v = list[0];
    current = v;
    Object.assign(params, v.params);
    engine = makeSlimeEngine(v);
    blurbEl.textContent = v.blurb;
    versionSel.value = v.id;
    rebuildAgentSelect();
    if (v.audio) fSound.open();
  } else {
    const preset = TERO_PRESETS.find((p) => p.id === (presetId || teroDesc.presetId)) ?? TERO_PRESETS[0];
    Object.assign(teroParams, TERO_DEFAULTS, preset.params);
    teroDesc.presetId = preset.id; teroDesc.reactiveTargets = {};
    engine = makeActiveEngine();
    blurbEl.textContent = preset.blurb;
    versionSel.value = preset.id;
  }
  syncGui();
}
algoSel.addEventListener("change", () => loadAlgorithm(algoSel.value as AlgoId));

// ---- settings snapshot + share ----
function sndState() {
  return { t: sonifier.tones.map((t) => (t.on ? 1 : 0)), vol: sonifier.masterVolume, drive: sonifier.drive, bias: sonifier.motionBias, wave: sonifier.waveform };
}
function applySnd(s?: Snapshot["snd"]) {
  if (!s) return;
  sonifier.masterVolume = s.vol; sonifier.drive = s.drive; sonifier.motionBias = s.bias ?? sonifier.motionBias;
  waveState.wave = s.wave; sonifier.setWaveform(s.wave);
  sonifier.tones.forEach((t, i) => (t.on = !!s.t[i]));
}
function snapshot(): Snapshot {
  if (slimeFamily(algoId)) {
    return { alg: algoId, v: current.id, p: { ...params }, snd: sndState(), auto: { sense: { ...autoSense }, trail: { ...autoTrail }, look: { ...autoLook } } };
  }
  return { alg: "tero", v: teroDesc.presetId, ap: { ...teroParams }, snd: sndState(), aauto: { ...teroAuto } };
}
function applySnapshot(s: Snapshot) {
  applySnd(s.snd);
  if ((s.alg ?? "jones") === "tero") {
    loadAlgorithm("tero", s.v);
    if (s.ap) Object.assign(teroParams, s.ap);
    if (s.aauto) Object.assign(teroAuto, s.aauto);
    engine.setParams(teroParams);
    syncGui();
    return;
  }
  const v = VERSION_BY_ID[s.v] ?? VERSIONS[0];
  const targetAlg: AlgoId = v.dimension === "3d" ? "mcpm" : "jones";
  if (algoId !== targetAlg) loadAlgorithm(targetAlg, s.v);
  Object.assign(params, v.params, s.p);
  current = v;
  setEngineFor(v);
  if (s.auto) { Object.assign(autoSense, s.auto.sense); Object.assign(autoTrail, s.auto.trail); Object.assign(autoLook, s.auto.look); }
  versionSel.value = current.id;
  blurbEl.textContent = current.blurb;
  rebuildAgentSelect();
  syncGui();
}

const fShare = gui.addFolder("Snapshot");
const shareCtl = {
  copy: async () => {
    const link = location.origin + location.pathname + "#s=" + encode(snapshot());
    setHash("s=" + encode(snapshot()));
    try { await navigator.clipboard.writeText(link); shareBtn.name("✓ link copied"); }
    catch { shareBtn.name("link in address bar"); }
    setTimeout(() => shareBtn.name("copy share link"), 1600);
  },
  download: () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sma-settings-${algoId}-${activePresetId()}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  load: () => fileInput.click(),
};
const shareBtn = fShare.add(shareCtl, "copy").name("copy share link");
fShare.add(shareCtl, "download").name("download .json");
fShare.add(shareCtl, "load").name("load .json");

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "application/json";
fileInput.style.display = "none";
fileInput.addEventListener("change", async () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  try { applySnapshot(JSON.parse(await f.text())); } catch (e) { console.error("bad settings file", e); }
  fileInput.value = "";
});
document.body.appendChild(fileInput);

// ---- actions ----
const actions = {
  pause: () => { engine.paused = !engine.paused; },
  reset: () => engine.reset(),
  randomize: () => {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    // a random hex colour, each channel in [lo,hi] (kept viewable: dark bg, bright highs)
    const rcol = (lo: number, hi: number) =>
      "#" + [0, 1, 2].map(() => Math.max(0, Math.min(255, Math.round(r(lo, hi)))).toString(16).padStart(2, "0")).join("");
    if (slimeFamily(algoId)) {
      // behaviour
      params.sensorAngle = r(3, 80); params.sensorDist = r(2, 34); params.turnSpeed = r(4, 72);
      params.stepSize = r(0.4, 3); params.deposit = r(0.02, 0.9); params.decay = r(0.8, 0.99);
      params.diffuse = Math.random(); params.avoid = Math.random();
      params.spawn = (["center", "ring", "random"] as const)[Math.floor(Math.random() * 3)];
      // look + colours (everything)
      params.displayMode = Math.random() < 0.5 ? "palette" : "rgb";
      params.intensity = r(0.6, 3.6); params.gamma = r(0.3, 1.6);
      params.bg = rcol(0, 46); params.lo = rcol(28, 150); params.hi = rcol(130, 256);
      params.colR = rcol(70, 256); params.colG = rcol(70, 256); params.colB = rcol(70, 256);
      engine.setParams(params);
    } else {
      for (const s of teroDesc.autoSpecs) if (!s.color) teroParams[s.k as keyof TeroParams] = (s.min! + Math.random() * (s.max! - s.min!)) as never;
      engine.setParams(teroParams);
    }
    syncGui();
  },
  savePNG: () => {
    engine.render();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `sma-${algoId}-${activePresetId()}-${Date.now()}.png`;
    a.click();
  },
};
gui.add(actions, "pause").name("pause / resume");
gui.add(actions, "savePNG").name("save PNG ⤓");
// RESTART / RANDOMISE live in the top-right bar (#topctl) over the display.
document.getElementById("p3-restart")?.addEventListener("click", actions.reset);
document.getElementById("p3-rand")?.addEventListener("click", actions.randomize);

// ---- pointer: 2D paint / 3D rotate ----
let dragging = false;
let lastX = 0, lastY = 0;
const pointerXY = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
};
canvas.addEventListener("pointerdown", (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  if (!(engine.is3D && engine.setView)) { const { nx, ny } = pointerXY(e); engine.setMouse?.(nx * simRes, (1 - ny) * simRes, true); }
});
canvas.addEventListener("pointermove", (e) => {
  if (engine.is3D && engine.setView) {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    engine.setView(engine.yaw! + dx * 0.01, Math.max(-1.4, Math.min(1.4, engine.pitch! + dy * 0.01)));
  } else {
    const { nx, ny } = pointerXY(e);
    engine.setMouse?.(nx * simRes, (1 - ny) * simRes, true);
  }
});
const endDrag = () => { dragging = false; if (!(engine.is3D && engine.setView)) engine.setMouse?.(0, 0, false); };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointerleave", endDrag);

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === " ") { e.preventDefault(); actions.pause(); }
  else if (e.key === "r") actions.reset();
  else if (e.key === "s") actions.savePNG();
});

// ---- sonification: derive bands from canvas motion ----
const COLS = 28;
const ROWS = sonifier.tones.length;
const probe = document.createElement("canvas");
probe.width = COLS; probe.height = ROWS;
const probeCtx = probe.getContext("2d", { willReadFrequently: true })!;
let prev = new Float32Array(COLS * ROWS);
function sampleBands(): Band[] {
  probeCtx.drawImage(canvas, 0, 0, COLS, ROWS);
  const d = probeCtx.getImageData(0, 0, COLS, ROWS).data;
  const bands: Band[] = [];
  const bias = sonifier.motionBias;
  for (let toneRow = 0; toneRow < ROWS; toneRow++) {
    const imgRow = ROWS - 1 - toneRow;
    let motion = 0, bright = 0, wSum = 0, wx = 0;
    for (let x = 0; x < COLS; x++) {
      const px = (imgRow * COLS + x) * 4;
      const b = (d[px] + d[px + 1] + d[px + 2]) / (3 * 255);
      const idx = imgRow * COLS + x;
      const m = Math.abs(b - prev[idx]);
      prev[idx] = b;
      motion += m; bright += b; wx += x * m; wSum += m;
    }
    motion /= COLS; bright /= COLS;
    const energy = Math.min(1, motion * 8 * bias + bright * 0.4 * (1 - bias));
    const pan = wSum > 1e-4 ? (wx / wSum / (COLS - 1)) * 2 - 1 : 0;
    bands.push({ energy, pan });
  }
  return bands;
}

window.addEventListener("hashchange", () => {
  if (suppressHash) { suppressHash = false; return; }
  const h = location.hash.replace("#", "");
  if (h.startsWith("s=")) { try { applySnapshot(decode(h.slice(2))); } catch { /* ignore */ } }
  else if (slimeFamily(algoId) && VERSION_BY_ID[h]) loadVersion(h);
});

// ---- auto-random ----
const TAU = Math.PI * 2;
function seedOf(k: string): number {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function wander(seed: number, tt: number): number {
  const ph = (seed % 1000) / 1000 * TAU;
  const fa = 0.11 + (seed % 7) * 0.017;
  const fb = 0.05 + (seed % 5) * 0.013;
  const n = 0.6 * Math.sin(tt * fa * TAU + ph) + 0.4 * Math.sin(tt * fb * TAU + ph * 1.7);
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, n));
}
function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}
const slimeAutoGroups: { state: { on: boolean; speed: number }; specs: AutoSpec[] }[] = [
  { state: autoSense, specs: [
    { k: "sensorAngle", min: 4, max: 80 }, { k: "sensorDist", min: 3, max: 30 },
    { k: "turnSpeed", min: 6, max: 70 }, { k: "stepSize", min: 0.4, max: 2.4 }, { k: "avoid", min: 0, max: 0.9 },
  ] },
  { state: autoTrail, specs: [
    { k: "deposit", min: 0.04, max: 0.45 }, { k: "decay", min: 0.86, max: 0.99 }, { k: "diffuse", min: 0.1, max: 0.9 },
  ] },
  { state: autoLook, specs: [
    { k: "intensity", min: 0.5, max: 2.6 }, { k: "gamma", min: 0.55, max: 1.7 },
    { k: "bg", color: true, s: 0.5, l: 0.05 }, { k: "lo", color: true, s: 0.7, l: 0.3 },
    { k: "hi", color: true, s: 0.85, l: 0.62 }, { k: "colR", color: true, s: 0.8, l: 0.55 },
    { k: "colG", color: true, s: 0.8, l: 0.55 }, { k: "colB", color: true, s: 0.8, l: 0.55 },
  ] },
];
let autoTick = 0;
function driftSpecs(t: number, state: { on: boolean; speed: number }, specs: AutoSpec[], target: any, ctlMap: Record<string, any>, salt: string, refresh: boolean) {
  if (!state.on) return;
  const tt = t * (0.012 * Math.pow(260, state.speed));
  for (const s of specs) {
    const seed = seedOf(salt + s.k);
    if (s.color) target[s.k] = hslToHex((wander(seed, tt * 0.6) + (seed % 360) / 360) % 1, s.s!, s.l!);
    else target[s.k] = s.min! + (s.max! - s.min!) * wander(seed, tt);
  }
  if (refresh) for (const s of specs) ctlMap[s.k]?.updateDisplay();
}
function applyAutoSlime(t: number) {
  const refresh = autoTick++ % 4 === 0;
  for (const g of slimeAutoGroups) driftSpecs(t, g.state, g.specs, params, ctl, "", refresh);
}
function applyAutoDesc(d: Desc, t: number) {
  driftSpecs(t, d.autoState, d.autoSpecs, d.params, d.ctl, d.id, autoTick++ % 4 === 0);
}

// ---- audio beats rhythmically randomise the reactive params ----
const AUDIO_BANDS = 44;
const slimeReactive: [string, number, number][] = [
  ["sensorAngle", 4, 80], ["sensorDist", 3, 30], ["turnSpeed", 6, 70], ["stepSize", 0.4, 2.4], ["avoid", 0, 0.9],
];
const slimeReactiveTargets: Record<string, number> = {};
let prevBass = 0;
let lastBeat = 0;
function driveBeats(now: number, target: any, reactive: [string, number, number][], targets: Record<string, number>, ctlMap: Record<string, any>) {
  if (!audioInput.active) return;
  const a = audioInput.read(AUDIO_BANDS);
  if (!a) return;
  for (const [k] of reactive) if (targets[k] === undefined) targets[k] = target[k];
  const flux = a.bass - prevBass;
  prevBass = a.bass;
  const beat = flux > 0.12 && a.bass > 0.2 && now - lastBeat > 110;
  if (beat) {
    lastBeat = now;
    const chaos = Math.min(1, audioState.gain);
    for (const [k, lo, hi] of reactive) targets[k] = target[k] * (1 - chaos) + (lo + Math.random() * (hi - lo)) * chaos;
  }
  for (const [k] of reactive) target[k] += (targets[k] - target[k]) * 0.35;
  if (autoTick % 4 === 0) for (const [k] of reactive) ctlMap[k]?.updateDisplay();
}

// ---- left "about the model" panel · responsive toggles (no live-math here) ----
const panelBody = document.getElementById("panelbody")!;
const panelToggle = document.getElementById("paneltoggle")!;
const ctrlToggle = document.getElementById("ctrltoggle")!;
const caret = panelToggle.querySelector(".caret")!;
function setPanel(v: boolean) { panelBody.classList.toggle("hidden", !v); caret.textContent = v ? "▾" : "▸"; }
function setCtrl(v: boolean) { gui.domElement.style.display = v ? "" : "none"; }
panelToggle.addEventListener("click", () => setPanel(panelBody.classList.contains("hidden")));
ctrlToggle.addEventListener("click", () => setCtrl(gui.domElement.style.display === "none"));
if (window.innerWidth < 820) { setPanel(false); setCtrl(false); }

// ---- loop ----
let last = performance.now();
let frames = 0;
let curFps = 60;
if (initSnap) applySnapshot(initSnap);
if (slimeFamily(algoId) && current.audio) fSound.open();

function loop(now: number) {
  if (__stopped) return;
  if (slimeFamily(algoId)) {
    applyAutoSlime(now / 1000);
    driveBeats(now, params, slimeReactive, slimeReactiveTargets, ctl);
    engine.setParams(params);
  } else {
    applyAutoDesc(teroDesc, now / 1000);
    driveBeats(now, teroParams, teroDesc.reactive, teroDesc.reactiveTargets, teroCtl);
    engine.setParams(teroParams);
  }
  engine.render();
  if (sonifier.running) sonifier.update(sampleBands());
  frames++;
  if (now - last > 500) {
    curFps = Math.round((frames * 1000) / (now - last));
    fpsEl.textContent = `${curFps} fps · ${(engine.agentCount() / 1e6).toFixed(2)}M cells`;
    frames = 0; last = now;
  }
  __rafId = requestAnimationFrame(loop);
}
__rafId = requestAnimationFrame(loop);

  return () => { __stopped = true; cancelAnimationFrame(__rafId); try { getAudioContext().suspend(); } catch { /* no audio */ } };
}
