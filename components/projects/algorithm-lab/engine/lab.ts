import type { GenerativeSystem, Params, RenderSurface } from "./core/types";
import { defaultsOf } from "./core/types";
import { makeRng, randomSeedString } from "./core/rng";
import { createSurface, resizeSurface, disposeSurface } from "./surfaces";
import { createLoop, type Loop } from "./harness/loop";
import { buildPanel, type PanelHandle } from "./harness/panel";
import { exportCurrentPng, exportHiResPng, copyParamsJson, download } from "./harness/export";
import { loadPresets, savePreset, deletePreset, downloadPreset, type Preset } from "./harness/presets";
import { recordWebM } from "./harness/video";
import { SYSTEMS } from "./systems";

/**
 * Wire the engine to a scaffold (provided by AlgorithmLab.tsx) read by id:
 * #alab-stage (visual host), #alab-algo (algorithm dropdown), #alab-panel
 * (Tweakpane host), #alab-fps, transport/capture buttons. Returns a teardown.
 */
export function mountLab(root: HTMLElement): () => void {
  const stage = root.querySelector("#alab-stage") as HTMLElement;
  const algoSel = root.querySelector("#alab-algo") as HTMLSelectElement;
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
    stage.appendChild(canvas); // overlay chips keep their z-index above it

    surface = createSurface(canvas, sys.tier);
    const { w, h, dpr } = dims();
    resizeSurface(surface, w, h, dpr);

    loop = createLoop(surface, makeRng, (info) => {
      fpsEl.textContent = `${info.fps} fps · ${sys.tier}`;
      playBtn.textContent = info.playing ? "❚❚ pause" : "▶ play";
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

  // populate the dropdown (replaces the old left menu)
  for (const sys of SYSTEMS) {
    const o = document.createElement("option");
    o.value = sys.id;
    o.textContent = `${sys.title} — ${sys.blurb}`;
    algoSel.appendChild(o);
  }
  algoSel.addEventListener("change", () => {
    const sys = SYSTEMS.find((s) => s.id === algoSel.value);
    if (sys) selectSystem(sys);
  });

  // transport
  playBtn.addEventListener("click", () => loop?.toggle());
  root.querySelector("#alab-reset")!.addEventListener("click", () => loop?.reset());

  // cinematic / full-bleed (covers the nav for a true background preview)
  const setCine = (on: boolean) => root.classList.toggle("alab-cinematic", on);
  root.querySelector("#alab-cine")!.addEventListener("click", () => setCine(!root.classList.contains("alab-cinematic")));
  root.querySelector("#alab-cine-exit")!.addEventListener("click", () => setCine(false));

  // record the live canvas to a WebM background loop
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
    btn.textContent = "● record webm";
    btn.disabled = false;
  });

  // export
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

  // presets
  function renderPresets(list: Preset[]): void {
    presetsEl.innerHTML = "";
    for (const p of list) {
      const row = document.createElement("div");
      row.className = "alab-preset";
      row.innerHTML = `<button class="load">${p.systemId} · ${p.name || p.seed}</button><button class="dl" title="download">⤓</button><button class="del" title="delete">✕</button>`;
      row.querySelector(".load")!.addEventListener("click", () => {
        const sys = SYSTEMS.find((s) => s.id === p.systemId);
        if (!sys) return;
        selectSystem(sys);
        seed = p.seed;
        Object.assign(params, p.params, { seed: p.seed });
        panel?.refresh();
        loop?.setSeed(seed);
        loop?.reset();
      });
      row.querySelector(".dl")!.addEventListener("click", () => downloadPreset(p));
      row.querySelector(".del")!.addEventListener("click", () => renderPresets(deletePreset(p.savedAt)));
      presetsEl.appendChild(row);
    }
  }
  root.querySelector("#alab-save")!.addEventListener("click", () => {
    if (!active) return;
    const name = prompt("Preset name", `${seed}`) || seed;
    renderPresets(savePreset({ name, systemId: active.id, seed, params: { ...params } }));
  });
  renderPresets(loadPresets());

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === " ") { e.preventDefault(); loop?.toggle(); }
    else if (e.key === "r") loop?.reset();
    else if (e.key === "Escape") setCine(false);
    else if (e.key === "f") setCine(!root.classList.contains("alab-cinematic"));
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
    root.classList.remove("alab-cinematic");
  };
}
