import type { GenerativeSystem, Params, RenderSurface } from "./core/types";
import { defaultsOf } from "./core/types";
import { makeRng, randomSeedString } from "./core/rng";
import { createSurface, resizeSurface, disposeSurface } from "./surfaces";
import { createLoop, type Loop } from "./harness/loop";
import { buildPanel, type PanelHandle } from "./harness/panel";
import { exportCurrentPng, exportHiResPng, copyParamsJson, download } from "./harness/export";
import { loadPresets, savePreset } from "./harness/presets";
import { recordWebM } from "./harness/video";
import { SYSTEMS } from "./systems";
import { Biome, randomConfig } from "@/components/projects/instruments/engine/instruments/biomeEngine";
import { ensureAudio, suspendAudio } from "@/components/projects/instruments/engine/instruments/shared";

/**
 * Wire the engine to the StudioShell scaffold. Every system's panel gets the same
 * standard footer folders (Touch, Soundscape, Export Video, Snapshot) after its
 * own settings, matching the SMA Config studio template.
 */
export function mountLab(root: HTMLElement): () => void {
  const stage = root.querySelector("#alab-stage") as HTMLElement;
  const algoSel = root.querySelector("#alab-algo") as HTMLSelectElement;
  const presetSel = root.querySelector("#alab-preset") as HTMLSelectElement;
  const panelEl = root.querySelector("#alab-panel") as HTMLElement;
  const fpsEl = root.querySelector("#alab-fps") as HTMLElement;

  let active: GenerativeSystem | null = null;
  let params: Params = {};
  let seed = "fern-1042";
  let surface: RenderSurface | null = null;
  let loop: Loop | null = null;
  let panel: PanelHandle | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ro: ResizeObserver | null = null;
  let resizeT = 0;

  const setCine = (on: boolean) => root.classList.toggle("studio-cinematic", on);

  // ---- Soundscape (biome) — shared across systems; mixes into video export ----
  const biome = new Biome();
  let biomeOn = false;
  let biomeCtx: AudioContext | null = null;
  let biomeRecDest: MediaStreamAudioDestinationNode | null = null;
  const soundState = { volume: 0.7 };
  async function rollBiome(): Promise<void> {
    biomeCtx = await ensureAudio();
    await biome.start();
    const { strands, master, palette } = randomConfig();
    biome.setPalette(palette);
    biome.apply(strands, master);
    biome.setMaster({ volume: soundState.volume });
    biome.setMuted(false);
    biomeOn = true;
  }
  function biomeAudioStream(): MediaStream | null {
    if (!biomeOn || !biomeCtx) return null;
    if (!biomeRecDest) { biomeRecDest = biomeCtx.createMediaStreamDestination(); biome.tap(biomeRecDest); }
    return biomeRecDest.stream;
  }

  // ---- Touch — pointer over the canvas, exposed to systems via params.touch* ----
  const touchState = { strength: 0.6 };
  function onPointer(e: PointerEvent, down: boolean): void {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const p = params as Record<string, number | boolean>;
    p.touchX = (e.clientX - r.left) / Math.max(1, r.width);
    p.touchY = (e.clientY - r.top) / Math.max(1, r.height);
    p.touchActive = down;
    p.touchStrength = touchState.strength;
  }

  function dims() {
    const r = stage.getBoundingClientRect();
    return { w: Math.max(2, Math.floor(r.width)), h: Math.max(2, Math.floor(r.height)), dpr: Math.min(1.5, window.devicePixelRatio || 1) };
  }

  async function hiRes(scale: number): Promise<void> {
    if (!active || !surface || !loop) return;
    const blob = await exportHiResPng(active, params, seed, scale, surface.width, surface.height, loop.frameCount(), makeRng);
    download(blob, `${active.id}-${seed}-${scale}x.png`);
  }

  // The shared panel footer — added after each system's own settings.
  function addStandardFolders(): void {
    if (!panel) return;
    const pane = panel.pane;

    const fTouch = pane.addFolder({ title: "Touch", expanded: false });
    fTouch.addBinding(touchState, "strength", { min: 0, max: 1.5, step: 0.05, label: "strength" })
      .on("change", () => { (params as Record<string, number>).touchStrength = touchState.strength; });

    const fSound = pane.addFolder({ title: "Soundscape (biome)", expanded: false });
    const soundBtn = fSound.addButton({ title: biomeOn ? "■ stop sound" : "▶ enable sound" });
    soundBtn.on("click", async () => {
      if (biomeOn) {
        biome.setMuted(true); biomeOn = false;
        setTimeout(() => { if (!biomeOn) suspendAudio(); }, 240);
        soundBtn.title = "▶ enable sound";
      } else {
        soundBtn.title = "…"; await rollBiome(); soundBtn.title = "■ stop sound";
      }
    });
    fSound.addButton({ title: "⟲ new soundscape" }).on("click", () => { rollBiome(); });
    fSound.addBinding(soundState, "volume", { min: 0, max: 1, step: 0.01, label: "volume" })
      .on("change", () => biome.setMaster({ volume: soundState.volume }));

    const recState = { seconds: 10 };
    const fVid = pane.addFolder({ title: "Export Video", expanded: false });
    fVid.addBinding(recState, "seconds", { min: 3, max: 30, step: 1, label: "seconds" });
    const recBtn = fVid.addButton({ title: "● record video" });
    recBtn.on("click", async () => {
      if (!canvas) return;
      recBtn.disabled = true;
      try {
        const blob = await recordWebM(canvas, recState.seconds, 60, (p) => { recBtn.title = `● ${Math.round(p * 100)}%`; }, biomeAudioStream());
        download(blob, `${active?.id ?? "lab"}-${seed}-${recState.seconds}s.webm`);
      } catch (err) { console.error("recording failed", err); }
      recBtn.title = "● record video"; recBtn.disabled = false;
    });

    const fSnap = pane.addFolder({ title: "Snapshot", expanded: false });
    fSnap.addButton({ title: "PNG" }).on("click", async () => { if (surface && active) download(await exportCurrentPng(surface), `${active.id}-${seed}.png`); });
    fSnap.addButton({ title: "2× hi-res" }).on("click", () => hiRes(2));
    fSnap.addButton({ title: "4× hi-res" }).on("click", () => hiRes(4));
    fSnap.addButton({ title: "⛶ full-bleed" }).on("click", () => setCine(true));
    fSnap.addButton({ title: "copy params JSON" }).on("click", () => { if (active) copyParamsJson(active.id, seed, params); });
  }

  function selectSystem(sys: GenerativeSystem): void {
    active = sys;
    params = defaultsOf(sys.schema);
    ro?.disconnect();
    loop?.destroy();
    if (surface) disposeSurface(surface);
    canvas?.remove();
    canvas = document.createElement("canvas");
    stage.insertBefore(canvas, stage.firstChild);

    surface = createSurface(canvas, sys.tier);
    const { w, h, dpr } = dims();
    resizeSurface(surface, w, h, dpr);

    loop = createLoop(surface, makeRng, (info) => { fpsEl.textContent = `${info.fps} fps · ${sys.tier}`; });

    panel?.dispose();
    panelEl.innerHTML = "";
    const schemaWithSeed = { seed: { type: "seed", default: seed } as const, ...sys.schema };
    params = { seed, ...params };
    panel = buildPanel(panelEl, schemaWithSeed, params, {
      randomSeed: randomSeedString,
      onSeed: (s) => { seed = s; loop?.setSeed(s); loop?.reset(); },
      onChange: (_k, hot) => { if (!hot) loop?.reset(); },
    });
    addStandardFolders();

    loop.load(sys, params, seed);
    if (algoSel.value !== sys.id) algoSel.value = sys.id;

    ro = new ResizeObserver(() => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        if (!surface) return;
        const d = dims();
        resizeSurface(surface, d.w, d.h, d.dpr);
        loop?.reset();
      }, 120) as unknown as number;
    });
    ro.observe(stage);
  }

  // algorithm dropdown (below the summary)
  for (const sys of SYSTEMS) {
    const o = document.createElement("option");
    o.value = sys.id;
    o.textContent = `${sys.title} · ${sys.blurb}`;
    algoSel.appendChild(o);
  }
  algoSel.addEventListener("change", () => {
    const sys = SYSTEMS.find((s) => s.id === algoSel.value);
    if (sys) selectSystem(sys);
  });

  // art-window buttons: Presets (dropdown + save), Restart, Randomise
  function refreshPresetDropdown(): void {
    presetSel.innerHTML = `<option value="">none</option>`;
    for (const p of loadPresets()) {
      const o = document.createElement("option");
      o.value = String(p.savedAt);
      o.textContent = `${p.systemId} · ${p.name || p.seed}`;
      presetSel.appendChild(o);
    }
  }
  presetSel.addEventListener("change", () => {
    const p = loadPresets().find((x) => String(x.savedAt) === presetSel.value);
    if (!p) return;
    const sys = SYSTEMS.find((s) => s.id === p.systemId);
    if (!sys) return;
    selectSystem(sys);
    seed = p.seed;
    Object.assign(params, p.params, { seed: p.seed });
    panel?.refresh();
    loop?.setSeed(seed);
    loop?.reset();
  });
  root.querySelector("#alab-save")!.addEventListener("click", () => {
    if (!active) return;
    const name = prompt("Preset name", `${seed}`) || seed;
    savePreset({ name, systemId: active.id, seed, params: { ...params } });
    refreshPresetDropdown();
  });
  refreshPresetDropdown();

  root.querySelector("#alab-reset")!.addEventListener("click", () => loop?.reset());
  root.querySelector("#alab-randomise")!.addEventListener("click", () => {
    seed = randomSeedString();
    (params as Record<string, string>).seed = seed;
    panel?.refresh();
    loop?.setSeed(seed);
    loop?.reset();
  });
  root.querySelector("#alab-cine-exit")!.addEventListener("click", () => setCine(false));
  root.querySelector("#alab-ctrltoggle")?.addEventListener("click", () => panelEl.classList.toggle("studio-hide"));

  // touch on the canvas
  stage.addEventListener("pointerdown", (e) => onPointer(e, true));
  stage.addEventListener("pointermove", (e) => onPointer(e, (e.buttons & 1) === 1));
  stage.addEventListener("pointerup", (e) => onPointer(e, false));

  // About toggle
  const aboutBody = root.querySelector("#alab-panelbody") as HTMLElement | null;
  const aboutToggle = root.querySelector("#alab-paneltoggle") as HTMLElement | null;
  aboutToggle?.addEventListener("click", () => {
    const hidden = aboutBody?.classList.toggle("hidden");
    const caret = aboutToggle.querySelector(".caret");
    if (caret) caret.textContent = hidden ? "▸" : "▾";
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === " ") { e.preventDefault(); loop?.toggle(); }
    else if (e.key === "r") loop?.reset();
    else if (e.key === "Escape") setCine(false);
    else if (e.key === "f") setCine(!root.classList.contains("studio-cinematic"));
  };
  window.addEventListener("keydown", onKey);

  if (SYSTEMS.length) selectSystem(SYSTEMS[0]);

  return () => {
    window.removeEventListener("keydown", onKey);
    ro?.disconnect();
    window.clearTimeout(resizeT);
    loop?.destroy();
    panel?.dispose();
    if (surface) disposeSurface(surface);
    canvas?.remove();
    try { biome.setMuted(true); suspendAudio(); } catch { /* no audio */ }
    root.classList.remove("studio-cinematic");
  };
}
