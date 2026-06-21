import { Pane } from "tweakpane";
import { DATA, JONES_PRESETS, JONES_DEFAULT_PARAMS, PHYS_PRESETS } from "./algorithms";
import { renderArt } from "./artGenerators";
import { PhysMod, M_DEFAULTS, type MParams } from "./physmod";
import { Physarum, DEFAULTS, type Params } from "./physarum";
import { ReactionDiffusion, RD_DEFAULTS, RD_PRESETS, randomRDParams, type RDParams } from "./reactionDiffusion";
import { VoronoiGpu, V_DEFAULTS, V_PRESETS, randomVoronoiParams, type VParams } from "./voronoiGpu";
import { DLA, DLA_DEFAULTS, DLA_PRESETS, randomDLAParams, type DLAParams } from "./dlaEngine";
import { recordSequence } from "@/components/projects/algorithm-lab/engine/harness/video";
import { Biome, randomConfig } from "@/components/projects/instruments/engine/instruments/biomeEngine";
import { ensureAudio, suspendAudio } from "@/components/projects/instruments/engine/instruments/shared";

// Tweakpane shim (its published types re-export from @tweakpane/core, not installed)
type TpEvent = { value: unknown };
interface Binding { on(ev: "change", cb: (e: TpEvent) => void): Binding; }
interface TpButton { on(ev: "click", cb: () => void): TpButton; title: string; disabled: boolean; }
interface PaneLike {
  addBinding(o: object, k: string, opts?: Record<string, unknown>): Binding;
  addButton(o: { title: string }): TpButton;
  addFolder(o: { title: string; expanded?: boolean }): PaneLike;
  refresh(): void; dispose(): void;
}

type Def =
  | { key: string; label: string; type: "num"; min: number; max: number; step?: number; def: number }
  | { key: string; label: string; type: "sel"; options: string[]; def: string }
  | { key: string; label: string; type: "col"; def: string };

const n = (key: string, label: string, min: number, max: number, def: number, step?: number): Def => ({ key, label, type: "num", min, max, def, step });
const c = (key: string, label: string, def: string): Def => ({ key, label, type: "col", def });
const s = (key: string, label: string, options: string[], def: string): Def => ({ key, label, type: "sel", options, def });

// The "key algorithm settings" exposed per generator (every generator already
// reads these via gp(params, …) / setParams).
const SCHEMA: Record<string, Def[]> = {
  // GPU Gray–Scott. The radial feed/kill knobs are what carry it across Turing
  // regimes in one frame (rings → labyrinth → spots → radial stripes).
  "gray-scott": [
    n("feed", "feed F", 0.01, 0.08, 0.0367, 0.0005), n("kill", "kill k", 0.04, 0.075, 0.0649, 0.0005),
    n("feedAmp", "radial feed", -0.03, 0.03, 0.008, 0.001), n("killAmp", "radial kill", -0.02, 0.02, -0.002, 0.0005),
    n("feedMid", "radial centre", 0, 1.4, 0.5, 0.02), n("dV", "V diffusion", 0.2, 0.7, 0.5, 0.01),
    n("stepsPerFrame", "sim speed", 1, 80, 34, 1),
    s("palette", "palette", ["duo", "tri", "rainbow"], "tri"),
    c("bg", "background", "#04060a"), c("lo", "mid", "#1fbf52"), c("hi", "ink", "#ff3b1f"),
    n("t0", "edge low", 0, 1, 0.12, 0.01), n("t1", "edge high", 0, 1, 0.32, 0.01),
    n("hueScale", "rainbow bands", 1, 12, 5, 0.5),
    s("seedMode", "seed", ["center", "random", "ring"], "random"),
  ],
  boids: [n("count", "flock size", 100, 900, 380, 10), n("separation", "separation", 0.4, 3, 1.5, 0.1), n("trailFade", "trail fade", 4, 40, 17, 1), n("speed", "speed", 4, 20, 12, 0.5), n("wander", "wander", 0, 1.5, 0.55, 0.05)],
  "l-system": [n("plants", "plants", 2, 12, 5, 1)],
  // GPU jump-flooding Voronoi (Raven-Kwok-inspired cellular tissue): drifting
  // agent-seeds, organic membranes, nested sub-cells, breathing.
  "voronoi-recursive": [
    n("seeds", "cells", 40, 600, 240, 5), n("drift", "drift", 0, 2.5, 1, 0.05), n("relax", "evenness", 0, 1, 0.45, 0.01),
    n("membrane", "membrane", 0, 8, 2.4, 0.1), n("cellGlow", "nucleus", 0, 1, 0.62, 0.02),
    n("subdiv", "sub-cells", 0, 1, 0.5, 0.02), n("subScale", "sub-scale", 2, 14, 7, 0.5),
    n("pulse", "breathe", 0, 1.5, 0.5, 0.05),
    s("palette", "palette", ["iridescent", "ink", "tissue", "circuit", "plasma"], "iridescent"),
    n("sat", "saturation", 0, 1, 0.72, 0.02),
    c("bg", "background", "#04050a"), c("edge", "membrane col", "#05060c"),
    c("cellA", "cell A", "#1b2a6b"), c("cellB", "cell B", "#7df3ff"),
  ],
  // CPU diffusion-limited aggregation — dendritic frost/coral, coloured core→tip.
  dla: [
    n("rate", "growth", 300, 4000, 2200, 50), n("stick", "stickiness", 0.2, 1, 0.75, 0.01),
    n("dotSize", "grain", 1, 4, 2, 0.1), n("glow", "glow", 0, 1, 0.55, 0.02),
    s("seedMode", "seed", ["point", "ring", "line"], "point"),
    c("bg", "background", "#08070a"), c("core", "core", "#4a1402"), c("mid", "mid", "#c4673a"), c("tip", "tip", "#fff1e2"),
  ],
  "organic-turbulence": [n("noiseScale", "noise scale", 0.0005, 0.005, 0.0018, 0.0001), n("particles", "particles", 200, 1600, 700, 20), n("speed", "speed", 0.5, 8, 3.3, 0.1), n("evolve", "evolve", 0, 0.02, 0.005, 0.001)],
  "quantum-harmonics": [n("symmetry", "symmetry", 3, 14, 8, 1), n("sources", "sources", 3, 14, 8, 1), n("phaseSpeed", "phase speed", 0, 3, 1, 0.05)],
  "recursive-whispers": [n("splitAngle", "split angle", 0.2, 1.2, 0.55, 0.01), n("maxDepth", "max depth", 4, 12, 9, 1)],
  "field-dynamics": [n("singularities", "singularities", 2, 8, 4, 1), n("fade", "fade", 1, 20, 5, 1), n("particles", "particles", 200, 1600, 700, 20), n("speed", "speed", 0.5, 8, 4, 0.1)],
  "stochastic-crystallization": [n("breathe", "breathe", 0, 0.2, 0.05, 0.005), n("churn", "churn", 0, 2, 0.5, 0.05), n("count", "count", 300, 1600, 950, 10)],
  mycelium: [s("preset", "habit", ["wild", "filigree", "cords", "bloom"], "bloom"), n("tips", "tips", 10, 400, 120, 5)],
  physarum: [n("SensorDistance0", "sensor dist", 0, 15, 0, 0.5), n("SD_exponent", "SD power", 1, 10, 4, 0.1), n("SD_amplitude", "SD amp", 0, 0.6, 0.3, 0.01), n("SensorAngle0", "sensor angle", 0.1, 1.2, 0.4, 0.01), n("RotationAngle0", "turn angle", 0.1, 1, 0.45, 0.01), n("MoveDistance0", "move dist", 0.2, 1.5, 0.4, 0.01), n("MD_exponent", "MD power", 1, 12, 3, 0.1), n("MD_amplitude", "MD amp", 0, 0.3, 0.1, 0.01), n("defaultScalingFactor", "scaling", 10, 40, 22, 1), n("depositFactor", "deposit", 0.001, 0.02, 0.0075, 0.0005), n("decayFactor", "decay", 0.6, 0.95, 0.78, 0.01), n("exposure", "exposure", 0.4, 2.5, 1, 0.05)],
  // Jones agent model — same control set + ranges as the SMA Config studio, with the
  // hero scene (v7 · Monochrome Drift) as the defaults so it opens identically.
  "physarum-jones": [
    n("sensorAngle", "sensor angle°", 1, 90, 20, 1), n("sensorDist", "sensor dist", 1, 40, 14, 0.5),
    n("turnSpeed", "turn speed°", 1, 90, 32, 1), n("stepSize", "step size", 0.2, 4, 1.7, 0.1),
    n("avoid", "species avoid", 0, 1, 0, 0.01),
    n("deposit", "deposit", 0.01, 1, 0.09, 0.01), n("decay", "decay", 0.7, 0.999, 0.89, 0.001),
    n("diffuse", "diffuse", 0, 1, 0, 0.01), n("stepsPerFrame", "sim speed", 1, 6, 3, 1),
    n("intensity", "intensity", 0.2, 4, 3, 0.05), n("gamma", "gamma", 0.3, 2.5, 0.3, 0.05),
    s("displayMode", "color mode", ["palette", "rgb"], "palette"),
    c("bg", "background", "#000000"), c("lo", "low / far", "#3a3a3a"), c("hi", "high / near", "#ffffff"),
    c("colR", "species 1", "#ff2d6b"), c("colG", "species 2", "#22e0c8"), c("colB", "species 3", "#ffd23d"),
    s("spawn", "spawn", ["center", "ring", "random"], "random"),
    n("mouseFood", "touch strength", 0, 1.5, 0, 0.05), n("foodRadius", "touch radius", 8, 120, 36, 1),
  ],
};

type Eng = { render(): void; dispose(): void; reset(): void; setParams(p: unknown): void; setMouse(x: number, y: number, a: boolean): void };

type Kind = "physmod" | "physarum" | "rd" | "voronoi" | "dla" | "p5";
const kindOf = (gen: string): Kind =>
  gen === "physarum" ? "physmod" : gen === "physarum-jones" ? "physarum" : gen === "gray-scott" ? "rd" : gen === "voronoi-recursive" ? "voronoi" : gen === "dla" ? "dla" : "p5";

function presetsFor(gen: string): { label: string; params: Record<string, unknown> }[] {
  if (gen === "physarum") return PHYS_PRESETS.map((p) => ({ label: p.name, params: p.p as Record<string, unknown> }));
  if (gen === "physarum-jones") return JONES_PRESETS.map((p) => ({ label: p.label, params: p.params as unknown as Record<string, unknown> }));
  if (gen === "gray-scott") return RD_PRESETS.map((p) => ({ label: p.name, params: p.params as unknown as Record<string, unknown> }));
  if (gen === "voronoi-recursive") return V_PRESETS.map((p) => ({ label: p.name, params: p.params as unknown as Record<string, unknown> }));
  if (gen === "dla") return DLA_PRESETS.map((p) => ({ label: p.name, params: p.params as unknown as Record<string, unknown> }));
  if (gen === "mycelium") return [
    { label: "Wild", params: { preset: "wild", color: 0 } },
    { label: "Filigree", params: { preset: "filigree", color: 1 } },
    { label: "Cords", params: { preset: "cords", color: 1 } },
    { label: "Bloom", params: { preset: "bloom", color: 1 } },
  ];
  return [];
}

const baseSeed = (i: number) => 1000 + i * 131 + 7;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function mountAlgoStudio(root: HTMLElement): () => void {
  const stage = root.querySelector("#algo-stage") as HTMLElement;
  const algoSel = root.querySelector("#algo-algo") as HTMLSelectElement;
  const presetSel = root.querySelector("#algo-preset") as HTMLSelectElement;
  const panelHost = root.querySelector("#algo-panel") as HTMLElement;
  const fpsEl = root.querySelector("#algo-fps") as HTMLElement;
  const aboutBody = root.querySelector("#algo-about-body") as HTMLElement;

  let sel = 0;
  let seed = baseSeed(0);
  let instance: { remove?: () => void } | null = null;
  let engine: Eng | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let pane: PaneLike | null = null;
  let raf = 0;
  let recreateT = 0;
  const values: Record<string, number | string> = {};
  let gpuBase: Record<string, unknown> = {};

  // ---- Soundscape (biome) — shared, mixes into video export ----
  const biome = new Biome();
  let biomeOn = false;
  let biomeCtx: AudioContext | null = null;
  let biomeRecDest: MediaStreamAudioDestinationNode | null = null;
  const soundState = { volume: 0.7 };
  async function rollBiome() {
    biomeCtx = await ensureAudio();
    await biome.start();
    const cfg = randomConfig();
    biome.setPalette(cfg.palette); biome.apply(cfg.strands, cfg.master);
    biome.setMaster({ volume: soundState.volume }); biome.setMuted(false); biomeOn = true;
  }
  function biomeStream(): MediaStream | null {
    if (!biomeOn || !biomeCtx) return null;
    if (!biomeRecDest) { biomeRecDest = biomeCtx.createMediaStreamDestination(); biome.tap(biomeRecDest); }
    return biomeRecDest.stream;
  }

  const curGen = () => DATA[sel].gen;

  function teardownArt() {
    cancelAnimationFrame(raf);
    try { instance?.remove?.(); } catch { /* noop */ }
    try { engine?.dispose(); } catch { /* noop */ }
    instance = null; engine = null;
    canvas?.remove(); canvas = null;
  }

  function p5Params(): Record<string, unknown> {
    return { ...values, color: 1 };
  }

  function runGpuLoop() {
    let n0 = 0, t0 = performance.now();
    const loop = () => {
      engine!.render();
      n0++;
      const now = performance.now();
      if (now - t0 > 500) { fpsEl.textContent = `${Math.round((n0 * 1000) / (now - t0))} fps · GPU`; n0 = 0; t0 = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function buildArt() {
    teardownArt();
    const gen = curGen();
    const kind = kindOf(gen);
    if (kind === "p5") {
      instance = renderArt(stage, gen, seed, 840, 30, p5Params() as Parameters<typeof renderArt>[5]);
      canvas = stage.querySelector("canvas");
      fpsEl.textContent = "p5 · 30 fps";
      return;
    }
    canvas = document.createElement("canvas");
    stage.insertBefore(canvas, stage.firstChild);
    try {
      if (kind === "physmod") {
        gpuBase = { ...M_DEFAULTS, agentTexW: 768, ...values };
        engine = new PhysMod(canvas, 640, gpuBase as unknown as MParams);
      } else if (kind === "rd") {
        gpuBase = { ...RD_DEFAULTS, ...values };
        engine = new ReactionDiffusion(canvas, 1024, gpuBase as unknown as RDParams);
      } else if (kind === "voronoi") {
        gpuBase = { ...V_DEFAULTS, ...values };
        engine = new VoronoiGpu(canvas, 1024, gpuBase as unknown as VParams);
      } else if (kind === "dla") {
        gpuBase = { ...DLA_DEFAULTS, ...values };
        engine = new DLA(canvas, 1024, gpuBase as unknown as DLAParams);
      } else {
        // Jones opens on SMA Config's hero scene (v7) rather than the bare defaults.
        const base = gen === "physarum-jones" ? (JONES_DEFAULT_PARAMS as Params) : DEFAULTS;
        gpuBase = { ...base, ...values };
        // Render at SMA Config's 1024² sim resolution (was 512² — visibly pixelated).
        engine = new Physarum(canvas, 1024, gpuBase as unknown as Params);
      }
      runGpuLoop();
    } catch { fpsEl.textContent = "WebGL2 unavailable"; }
  }

  function onParamChange() {
    if (kindOf(curGen()) === "p5") {
      window.clearTimeout(recreateT);
      recreateT = window.setTimeout(buildArt, 170) as unknown as number;
    } else {
      for (const k in values) gpuBase[k] = values[k];
      engine?.setParams(gpuBase);
    }
  }

  function buildControls() {
    pane?.dispose();
    panelHost.innerHTML = "";
    pane = new Pane({ container: panelHost }) as unknown as PaneLike;
    const gen = curGen();
    for (const k of Object.keys(values)) delete values[k];
    for (const d of SCHEMA[gen] || []) values[d.key] = d.def;

    const fSet = pane.addFolder({ title: "Settings", expanded: true });
    for (const d of SCHEMA[gen] || []) {
      const opts: Record<string, unknown> = { label: d.label };
      if (d.type === "num") { opts.min = d.min; opts.max = d.max; opts.step = d.step; }
      else if (d.type === "sel") opts.options = Object.fromEntries(d.options.map((o) => [o, o]));
      fSet.addBinding(values, d.key, opts).on("change", onParamChange);
    }
    addStandardFolders(pane);
  }

  function addStandardFolders(p: PaneLike) {
    const fSound = p.addFolder({ title: "Soundscape (biome)", expanded: false });
    const sb = fSound.addButton({ title: biomeOn ? "■ stop sound" : "▶ enable sound" });
    sb.on("click", async () => {
      if (biomeOn) { biome.setMuted(true); biomeOn = false; setTimeout(() => { if (!biomeOn) suspendAudio(); }, 240); sb.title = "▶ enable sound"; }
      else { sb.title = "…"; await rollBiome(); sb.title = "■ stop sound"; }
    });
    fSound.addButton({ title: "⟲ new soundscape" }).on("click", () => { rollBiome(); });
    fSound.addBinding(soundState, "volume", { min: 0, max: 1, step: 0.01, label: "volume" }).on("change", () => biome.setMaster({ volume: soundState.volume }));

    const recState = { width: 1280, height: 720, fps: 30, seconds: 10 };
    const fVid = p.addFolder({ title: "Export Video", expanded: false });
    fVid.addBinding(recState, "width", { min: 256, max: 3840, step: 2, label: "width" });
    fVid.addBinding(recState, "height", { min: 256, max: 3840, step: 2, label: "height" });
    fVid.addBinding(recState, "fps", { min: 12, max: 60, step: 1, label: "fps" });
    fVid.addBinding(recState, "seconds", { min: 3, max: 30, step: 1, label: "seconds" });
    const rb = fVid.addButton({ title: "● render video" });
    rb.on("click", async () => {
      rb.disabled = true;
      try { await recordVideo(recState.width, recState.height, recState.fps, recState.seconds, (pr) => { rb.title = `● ${Math.round(pr * 100)}%`; }); }
      catch (err) { console.error(err); }
      rb.title = "● render video"; rb.disabled = false;
    });

    const fSnap = p.addFolder({ title: "Snapshot", expanded: false });
    fSnap.addButton({ title: "PNG" }).on("click", () => snapshot());
    fSnap.addButton({ title: "⛅ Preview in new tab" }).on("click", () => window.open(previewUrl(), "_blank"));
  }

  function snapshot() {
    if (!canvas) return;
    canvas.toBlob((b) => { if (b) download(b, `${curGen()}-${seed}.png`); }, "image/png");
  }
  function download(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // cover-fit the live square render into the target W×H without distortion
  function coverDraw(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, W: number, H: number) {
    const sw = src.width, sh = src.height, sa = sw / sh, da = W / H;
    let sx = 0, sy = 0, scw = sw, sch = sh;
    if (sa > da) { scw = sh * da; sx = (sw - scw) / 2; } else { sch = sw / da; sy = (sh - sch) / 2; }
    ctx.drawImage(src, sx, sy, scw, sch, 0, 0, W, H);
  }
  async function recordVideo(W: number, H: number, fps: number, seconds: number, onP: (p: number) => void) {
    if (!canvas) return;
    const src = canvas;
    const blob = await recordSequence(W, H, fps, seconds, (ctx) => coverDraw(ctx, src, W, H), onP, biomeStream());
    download(blob, `${curGen()}-${seed}-${W}x${H}.webm`);
  }
  function previewUrl(): string {
    const u = new URL(window.location.href);
    u.searchParams.set("preview", "1");
    u.searchParams.set("algo", String(sel));
    u.searchParams.set("seed", String(seed));
    try { u.searchParams.set("p", btoa(JSON.stringify(values))); } catch { /* too big */ }
    return u.toString();
  }

  function refreshPresets() {
    const list = presetsFor(curGen());
    presetSel.innerHTML = `<option value="">default</option>`;
    list.forEach((p, idx) => { const o = document.createElement("option"); o.value = String(idx); o.textContent = p.label; presetSel.appendChild(o); });
    presetSel.style.display = list.length ? "" : "none";
  }
  function applyPreset(idx: number) {
    const list = presetsFor(curGen());
    const preset = list[idx];
    if (!preset) return;
    const gen = curGen();
    if (kindOf(gen) === "p5") {
      for (const k of Object.keys(preset.params)) if (k in values) values[k] = preset.params[k] as number | string;
      pane?.refresh();
      buildArt();
    } else {
      const k = kindOf(gen);
      const base = k === "physmod" ? { ...M_DEFAULTS, agentTexW: 768 } : k === "rd" ? { ...RD_DEFAULTS } : k === "voronoi" ? { ...V_DEFAULTS } : k === "dla" ? { ...DLA_DEFAULTS } : { ...DEFAULTS };
      gpuBase = { ...base, ...preset.params };
      for (const d of SCHEMA[gen] || []) if (d.key in gpuBase) values[d.key] = gpuBase[d.key] as number | string;
      pane?.refresh();
      engine?.setParams(gpuBase);
    }
  }

  function updateAbout() {
    const d = DATA[sel];
    const at = root.querySelector("#algo-about-title");
    if (at) at.textContent = d.name;
    const steps = d.steps.map((st) => `<li><b>${esc(st.title)}</b> — ${esc(st.text)}</li>`).join("");
    const facts = d.params.map((pf) => `<li><b>${esc(pf.label)}</b>: ${esc(pf.value)}</li>`).join("");
    aboutBody.innerHTML =
      `<p class="studio-about-lead">${d.paras.map(esc).join('</p><p style="margin:0 0 18px">')}</p>` +
      `<div class="studio-about-cols"><div><h4>How it works</h4><ul>${steps}</ul></div>` +
      `<div><h4>Parameters</h4><ul>${facts}</ul></div></div>`;
  }

  function setCine(on: boolean) { root.classList.toggle("studio-cinematic", on); }

  function selectAlgo(i: number) {
    sel = i; seed = baseSeed(i);
    buildControls();
    buildArt();
    refreshPresets();
    updateAbout();
    if (algoSel.selectedIndex !== i) algoSel.selectedIndex = i;
    if (biomeOn) rollBiome(); // selecting an algorithm restarts the soundscape
  }

  // dropdown
  DATA.forEach((d, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = `${d.name} · ${d.sub.toLowerCase()}`; algoSel.appendChild(o); });
  algoSel.addEventListener("change", () => selectAlgo(Number(algoSel.value)));
  presetSel.addEventListener("change", () => { if (presetSel.value) applyPreset(Number(presetSel.value)); });

  root.querySelector("#algo-reset")!.addEventListener("click", () => { if (engine) engine.reset(); else buildArt(); });
  root.querySelector("#algo-randomise")!.addEventListener("click", () => {
    seed = Math.floor(Math.abs(Math.sin(seed * 99991 + 1.7) * 1e6)) + 1;
    // Reaction–Diffusion rolls a fully random scene (regime + ramp + palette +
    // colours), not just one of the fixed presets — far more variety.
    if (curGen() === "gray-scott" && engine) {
      gpuBase = { ...RD_DEFAULTS, ...(randomRDParams() as unknown as Record<string, unknown>) };
      for (const d of SCHEMA["gray-scott"]) if (d.key in gpuBase) values[d.key] = gpuBase[d.key] as number | string;
      pane?.refresh();
      engine.setParams(gpuBase);
      engine.reset();
      presetSel.value = "";
      if (biomeOn) rollBiome();
      return;
    }
    if (curGen() === "voronoi-recursive" && engine) {
      gpuBase = { ...V_DEFAULTS, ...(randomVoronoiParams() as unknown as Record<string, unknown>) };
      for (const d of SCHEMA["voronoi-recursive"]) if (d.key in gpuBase) values[d.key] = gpuBase[d.key] as number | string;
      pane?.refresh();
      engine.setParams(gpuBase);
      engine.reset();
      presetSel.value = "";
      if (biomeOn) rollBiome();
      return;
    }
    if (curGen() === "dla" && engine) {
      gpuBase = { ...DLA_DEFAULTS, ...(randomDLAParams() as unknown as Record<string, unknown>) };
      for (const d of SCHEMA["dla"]) if (d.key in gpuBase) values[d.key] = gpuBase[d.key] as number | string;
      pane?.refresh();
      engine.setParams(gpuBase);
      engine.reset();
      presetSel.value = "";
      if (biomeOn) rollBiome();
      return;
    }
    const list = presetsFor(curGen());
    if (list.length) { const idx = seed % list.length; presetSel.value = String(idx); applyPreset(idx); }
    if (kindOf(curGen()) === "p5") { if (!list.length) buildArt(); }
    else engine?.reset();
    if (biomeOn) rollBiome(); // a fresh roll also restarts a random soundscape
  });
  root.querySelector("#algo-cine-exit")!.addEventListener("click", () => setCine(false));
  root.querySelector("#algo-ctrltoggle")?.addEventListener("click", () => panelHost.classList.toggle("studio-hide"));


  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === "Escape") setCine(false);
  };
  window.addEventListener("keydown", onKey);

  // boot — honour a ?preview=1 link (full-bleed with the given algo/params)
  function boot() {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("preview")) {
      selectAlgo(Math.min(DATA.length - 1, Math.max(0, Number(sp.get("algo")) || 0)));
      const sd = sp.get("seed"); if (sd) seed = Number(sd) || seed;
      const pp = sp.get("p"); if (pp) { try { Object.assign(values, JSON.parse(atob(pp))); pane?.refresh(); } catch { /* bad payload */ } }
      buildArt();
      setCine(true);
    } else {
      selectAlgo(0);
    }
  }
  boot();

  return () => {
    window.removeEventListener("keydown", onKey);
    window.clearTimeout(recreateT);
    teardownArt();
    pane?.dispose();
    try { biome.setMuted(true); suspendAudio(); } catch { /* no audio */ }
    root.classList.remove("studio-cinematic");
  };
}
