import type { GenerativeSystem, Params, RenderSurface } from "./core/types";
import { defaultsOf } from "./core/types";
import { makeRng, randomSeedString } from "./core/rng";
import { createSurface, resizeSurface, disposeSurface } from "./surfaces";
import { createLoop, type Loop } from "./harness/loop";
import { buildPanel, type PanelHandle } from "./harness/panel";
import { exportCurrentPng, exportHiResPng, copyParamsJson, download } from "./harness/export";
import { loadPresets, savePreset, deletePreset, downloadPreset } from "./harness/presets";
import { recordWebM } from "./harness/video";
import { SYSTEMS } from "./systems";

/** Wire the engine to the StudioShell scaffold (read by id). Returns teardown. */
export function mountLab(root: HTMLElement): () => void {
  const stage = root.querySelector("#alab-stage") as HTMLElement;
  const algoSel = root.querySelector("#alab-algo") as HTMLSelectElement;
  const presetSel = root.querySelector("#alab-preset") as HTMLSelectElement;
  const panelEl = root.querySelector("#alab-panel") as HTMLElement;
  const fpsEl = root.querySelector("#alab-fps") as HTMLElement;
  const presetsEl = root.querySelector("#alab-presets") as HTMLElement;
  const playBtn = root.querySelector("#alab-play") as HTMLButtonElement;

  let active: GenerativeSystem | null = null;
  let params: Params = {};
  let seed = "fern-1042";
  let surface: RenderSurface | null = null;
  let loop: Loop | null = null;
  let panel: PanelHandle | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ro: ResizeObserver | null = null;
  let resizeT = 0;

  function dims() {
    const r = stage.getBoundingClientRect();
    return { w: Math.max(2, Math.floor(r.width)), h: Math.max(2, Math.floor(r.height)), dpr: Math.min(1.5, window.devicePixelRatio || 1) };
  }

  function selectSystem(sys: GenerativeSystem): void {
    active = sys;
    params = defaultsOf(sys.schema);
    ro?.disconnect();
    loop?.destroy();
    if (surface) disposeSurface(surface);
    canvas?.remove();
    canvas = document.createElement("canvas");
    stage.insertBefore(canvas, stage.firstChild); // behind the overlay chips

    surface = createSurface(canvas, sys.tier);
    const { w, h, dpr } = dims();
    resizeSurface(surface, w, h, dpr);

    loop = createLoop(surface, makeRng, (info) => {
      fpsEl.textContent = `${info.fps} fps · ${sys.tier}`;
      playBtn.textContent = info.playing ? "PAUSE" : "PLAY";
    });

    panel?.dispose();
    panelEl.innerHTML = "";
    const schemaWithSeed = { seed: { type: "seed", default: seed } as const, ...sys.schema };
    params = { seed, ...params };
    panel = buildPanel(panelEl, schemaWithSeed, params, {
      randomSeed: randomSeedString,
      onSeed: (s) => { seed = s; loop?.setSeed(s); loop?.reset(); },
      onChange: (_k, hot) => { if (!hot) loop?.reset(); },
    });

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

  // algorithm dropdown (the preset-style picker, like SMA's)
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

  // transport: RANDOMISE rolls a fresh seed, RESTART reseeds the same look
  playBtn.addEventListener("click", () => loop?.toggle());
  root.querySelector("#alab-randomise")!.addEventListener("click", () => {
    seed = randomSeedString();
    (params as Record<string, string>).seed = seed;
    panel?.refresh();
    loop?.setSeed(seed);
    loop?.reset();
  });
  root.querySelector("#alab-reset")!.addEventListener("click", () => loop?.reset());

  // cinematic / full-bleed
  const setCine = (on: boolean) => root.classList.toggle("studio-cinematic", on);
  root.querySelector("#alab-cine")!.addEventListener("click", () => setCine(!root.classList.contains("studio-cinematic")));
  root.querySelector("#alab-cine-exit")!.addEventListener("click", () => setCine(false));

  // mobile controls toggle
  root.querySelector("#alab-ctrltoggle")?.addEventListener("click", () => {
    panelEl.classList.toggle("studio-hide");
  });

  // capture: record video + snapshot PNG (+ hi-res)
  root.querySelector("#alab-rec")!.addEventListener("click", async () => {
    if (!canvas) return;
    const btn = root.querySelector("#alab-rec") as HTMLButtonElement;
    const sel = root.querySelector("#alab-recsec") as HTMLSelectElement;
    const secs = Number(sel.value) || 10;
    btn.disabled = true;
    try {
      const blob = await recordWebM(canvas, secs, 60, (p) => { btn.textContent = `● rec ${Math.round(p * 100)}%`; });
      download(blob, `${active?.id ?? "lab"}-${seed}-${secs}s.webm`);
    } catch (err) { console.error("recording failed", err); }
    btn.textContent = "● record video";
    btn.disabled = false;
  });
  root.querySelector("#alab-png")!.addEventListener("click", async () => {
    if (!surface || !active) return;
    download(await exportCurrentPng(surface), `${active.id}-${seed}.png`);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-x]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!active || !surface || !loop) return;
      const scale = Number(btn.dataset.x);
      btn.textContent = "…";
      const blob = await exportHiResPng(active, params, seed, scale, surface.width, surface.height, loop.frameCount(), makeRng);
      download(blob, `${active.id}-${seed}-${scale}x.png`);
      btn.textContent = `${scale}×`;
    });
  });
  root.querySelector("#alab-copy")!.addEventListener("click", () => { if (active) copyParamsJson(active.id, seed, params); });

  // presets — a dropdown (like SMA) + a managed list for download/delete
  function refreshPresetDropdown(): void {
    presetSel.innerHTML = `<option value="">none</option>`;
    for (const p of loadPresets()) {
      const o = document.createElement("option");
      o.value = String(p.savedAt);
      o.textContent = `${p.systemId} · ${p.name || p.seed}`;
      presetSel.appendChild(o);
    }
  }
  function applyPreset(savedAt: string): void {
    const p = loadPresets().find((x) => String(x.savedAt) === savedAt);
    if (!p) return;
    const sys = SYSTEMS.find((s) => s.id === p.systemId);
    if (!sys) return;
    selectSystem(sys);
    seed = p.seed;
    Object.assign(params, p.params, { seed: p.seed });
    panel?.refresh();
    loop?.setSeed(seed);
    loop?.reset();
  }
  presetSel.addEventListener("change", () => { if (presetSel.value) applyPreset(presetSel.value); });

  function renderPresets(): void {
    presetsEl.innerHTML = "";
    for (const p of loadPresets()) {
      const row = document.createElement("div");
      row.className = "studio-preset";
      row.innerHTML = `<button class="studio-btn load">${p.systemId} · ${p.name || p.seed}</button><button class="studio-btn dl" title="download">⤓</button><button class="studio-btn del" title="delete">✕</button>`;
      row.querySelector(".load")!.addEventListener("click", () => applyPreset(String(p.savedAt)));
      row.querySelector(".dl")!.addEventListener("click", () => downloadPreset(p));
      row.querySelector(".del")!.addEventListener("click", () => { deletePreset(p.savedAt); renderPresets(); refreshPresetDropdown(); });
      presetsEl.appendChild(row);
    }
  }
  root.querySelector("#alab-save")!.addEventListener("click", () => {
    if (!active) return;
    const name = prompt("Preset name", `${seed}`) || seed;
    savePreset({ name, systemId: active.id, seed, params: { ...params } });
    renderPresets();
    refreshPresetDropdown();
  });
  refreshPresetDropdown();
  renderPresets();

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
    root.classList.remove("studio-cinematic");
  };
}
