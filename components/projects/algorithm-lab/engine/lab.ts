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
 * Mount the Algorithm Lab shell into `root`. Returns a teardown. Ported from the
 * standalone Vite `main.ts` so the framework-agnostic cores run inside the
 * Next.js site (the whole shell scopes under the `.alab` class the host adds).
 */
export function mountLab(root: HTMLElement): () => void {
  root.classList.add("alab");
  root.innerHTML = `
    <aside class="alab-side">
      <h1>Algorithm Lab <span>· Wave 2</span></h1>
      <nav class="alab-systems" id="alab-systems"></nav>
      <div class="alab-block">
        <div class="alab-row alab-transport">
          <button id="alab-play">▶ play</button>
          <button id="alab-step">step</button>
          <button id="alab-reset">reset</button>
        </div>
        <div class="alab-row"><button id="alab-cine">⛶ cinematic / full-bleed</button></div>
        <div class="alab-hud" id="alab-hud">—</div>
      </div>
      <div class="alab-block" id="alab-panel"></div>
      <div class="alab-block">
        <div class="alab-lbl">Export</div>
        <div class="alab-row"><button id="alab-png">PNG</button><button data-x="2">2×</button><button data-x="4">4×</button><button data-x="8">8×</button></div>
        <div class="alab-row"><button id="alab-rec">● record webm</button><select id="alab-recsec" class="alab-sel"><option value="5">5s</option><option value="10" selected>10s</option><option value="20">20s</option><option value="30">30s</option></select></div>
        <div class="alab-row"><button id="alab-copy">copy params JSON</button></div>
      </div>
      <div class="alab-block">
        <div class="alab-lbl">Presets (keepers)</div>
        <div class="alab-row"><button id="alab-save">★ save current</button></div>
        <div class="alab-presets" id="alab-presets"></div>
      </div>
    </aside>
    <main class="alab-stage" id="alab-stage">
      <button class="alab-cine-exit" id="alab-cine-exit">✕ controls</button>
    </main>
  `;

  const systemsNav = root.querySelector("#alab-systems") as HTMLElement;
  const stage = root.querySelector("#alab-stage") as HTMLElement;
  const panelEl = root.querySelector("#alab-panel") as HTMLElement;
  const hud = root.querySelector("#alab-hud") as HTMLElement;
  const presetsEl = root.querySelector("#alab-presets") as HTMLElement;

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
    return { w: Math.max(2, Math.floor(r.width)), h: Math.max(2, Math.floor(r.height)), dpr: Math.min(2, window.devicePixelRatio || 1) };
  }

  function selectSystem(sys: GenerativeSystem): void {
    active = sys;
    params = defaultsOf(sys.schema);
    ro?.disconnect();
    loop?.destroy();
    if (surface) disposeSurface(surface);
    canvas?.remove();
    canvas = document.createElement("canvas");
    canvas.className = "alab-view";
    stage.appendChild(canvas);

    surface = createSurface(canvas, sys.tier);
    const { w, h, dpr } = dims();
    resizeSurface(surface, w, h, dpr);

    loop = createLoop(surface, makeRng, (info) => {
      hud.textContent = `frame ${info.frame} · ${info.fps} fps · ${info.playing ? "playing" : "paused"}`;
      (root.querySelector("#alab-play") as HTMLButtonElement).textContent = info.playing ? "❚❚ pause" : "▶ play";
    });

    panel?.dispose();
    panelEl.innerHTML = "";
    const schemaWithSeed = { seed: { type: "seed", default: seed } as const, ...sys.schema };
    const paramsWithSeed: Params = { seed, ...params };
    params = paramsWithSeed;
    panel = buildPanel(panelEl, schemaWithSeed, params, {
      randomSeed: randomSeedString,
      onSeed: (s) => { seed = s; loop?.setSeed(s); loop?.reset(); },
      onChange: (_k, hot) => { if (!hot) loop?.reset(); },
    });

    loop.load(sys, params, seed);

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

    systemsNav.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === sys.id));
  }

  for (const sys of SYSTEMS) {
    const b = document.createElement("button");
    b.dataset.id = sys.id;
    b.innerHTML = `<span class="t">${sys.title}</span><span class="b">${sys.blurb}</span><span class="tier">${sys.tier}</span>`;
    b.addEventListener("click", () => selectSystem(sys));
    systemsNav.appendChild(b);
  }

  root.querySelector("#alab-play")!.addEventListener("click", () => loop?.toggle());
  root.querySelector("#alab-step")!.addEventListener("click", () => loop?.stepOnce());
  root.querySelector("#alab-reset")!.addEventListener("click", () => loop?.reset());

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

  // cinematic / full-bleed: hide the chrome so a system can be used or recorded
  // as a motion-graphic background. Esc or the floating chip restores controls.
  const setCine = (on: boolean) => root.classList.toggle("alab-cinematic", on);
  root.querySelector("#alab-cine")!.addEventListener("click", () => setCine(!root.classList.contains("alab-cinematic")));
  root.querySelector("#alab-cine-exit")!.addEventListener("click", () => setCine(false));

  // record the live canvas to a WebM clip you can drop into a motion-graphic comp
  root.querySelector("#alab-rec")!.addEventListener("click", async () => {
    if (!canvas) return;
    const btn = root.querySelector("#alab-rec") as HTMLButtonElement;
    const sel = root.querySelector("#alab-recsec") as HTMLSelectElement;
    const secs = Number(sel.value) || 10;
    btn.disabled = true;
    try {
      const blob = await recordWebM(canvas, secs, 60, (p) => { btn.textContent = `● rec ${Math.round(p * 100)}%`; });
      download(blob, `${active?.id ?? "lab"}-${seed}-${secs}s.webm`);
    } catch (err) {
      console.error("recording failed", err);
    }
    btn.textContent = "● record webm";
    btn.disabled = false;
  });

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
    if (e.target instanceof HTMLInputElement) return;
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
    root.innerHTML = "";
    root.classList.remove("alab");
  };
}
