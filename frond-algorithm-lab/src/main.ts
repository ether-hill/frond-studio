import "./style.css";
import type { GenerativeSystem, Params, RenderSurface } from "./core/types";
import { defaultsOf } from "./core/types";
import { makeRng, randomSeedString } from "./core/rng";
import { createSurface, resizeSurface, disposeSurface } from "./surfaces";
import { createLoop, type Loop } from "./harness/loop";
import { buildPanel, type PanelHandle } from "./harness/panel";
import { exportCurrentPng, exportHiResPng, copyParamsJson, download } from "./harness/export";
import { loadPresets, savePreset, deletePreset, downloadPreset, type Preset } from "./harness/presets";
import { SYSTEMS } from "./systems";

const app = document.getElementById("app")!;
app.innerHTML = `
  <aside class="side">
    <h1>Algorithm Lab <span>· Wave 2</span></h1>
    <nav class="systems" id="systems"></nav>
    <div class="block">
      <div class="row transport">
        <button id="play">▶ play</button>
        <button id="step">step</button>
        <button id="reset">reset</button>
      </div>
      <div class="hud" id="hud">—</div>
    </div>
    <div class="block" id="panel"></div>
    <div class="block">
      <div class="lbl">Export</div>
      <div class="row"><button id="png">PNG</button><button data-x="2">2×</button><button data-x="4">4×</button><button data-x="8">8×</button></div>
      <div class="row"><button id="copy">copy params JSON</button></div>
    </div>
    <div class="block">
      <div class="lbl">Presets (keepers)</div>
      <div class="row"><button id="save">★ save current</button></div>
      <div class="presets" id="presets"></div>
    </div>
  </aside>
  <main class="stage" id="stage"></main>
`;

const systemsNav = document.getElementById("systems")!;
const stage = document.getElementById("stage")!;
const panelEl = document.getElementById("panel")!;
const hud = document.getElementById("hud")!;
const presetsEl = document.getElementById("presets")!;

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
  // a fresh canvas per system (a canvas can't switch 2d ⇄ webgl contexts)
  ro?.disconnect();
  loop?.destroy();
  if (surface) disposeSurface(surface);
  canvas?.remove();
  canvas = document.createElement("canvas");
  canvas.className = "view";
  stage.appendChild(canvas);

  surface = createSurface(canvas, sys.tier);
  const { w, h, dpr } = dims();
  resizeSurface(surface, w, h, dpr);

  loop = createLoop(surface, makeRng, (info) => {
    hud.textContent = `frame ${info.frame} · ${info.fps} fps · ${info.playing ? "playing" : "paused"}`;
    (document.getElementById("play") as HTMLButtonElement).textContent = info.playing ? "❚❚ pause" : "▶ play";
  });

  panel?.dispose();
  panelEl.innerHTML = "";
  // seed lives in the panel too, as a `seed` param wouldn't otherwise exist
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
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (!surface) return;
      const d = dims();
      resizeSurface(surface, d.w, d.h, d.dpr);
      loop?.reset();
    }, 120) as unknown as number;
  });
  ro.observe(stage);

  // mark active in the nav
  systemsNav.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === sys.id));
}

// ── build the system list ─────────────────────────────────────────────────────
for (const sys of SYSTEMS) {
  const b = document.createElement("button");
  b.dataset.id = sys.id;
  b.innerHTML = `<span class="t">${sys.title}</span><span class="b">${sys.blurb}</span><span class="tier">${sys.tier}</span>`;
  b.addEventListener("click", () => selectSystem(sys));
  systemsNav.appendChild(b);
}

// ── transport ─────────────────────────────────────────────────────────────────
document.getElementById("play")!.addEventListener("click", () => loop?.toggle());
document.getElementById("step")!.addEventListener("click", () => loop?.stepOnce());
document.getElementById("reset")!.addEventListener("click", () => loop?.reset());

// ── export ────────────────────────────────────────────────────────────────────
document.getElementById("png")!.addEventListener("click", async () => {
  if (!surface || !active) return;
  download(await exportCurrentPng(surface), `${active.id}-${seed}.png`);
});
document.querySelectorAll<HTMLButtonElement>("[data-x]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!active || !surface || !loop) return;
    const scale = Number(btn.dataset.x);
    btn.textContent = "…";
    const blob = await exportHiResPng(active, params, seed, scale, surface.width, surface.height, loop.frameCount(), makeRng);
    download(blob, `${active.id}-${seed}-${scale}x.png`);
    btn.textContent = `${scale}×`;
  });
});
document.getElementById("copy")!.addEventListener("click", () => { if (active) copyParamsJson(active.id, seed, params); });

// ── presets ───────────────────────────────────────────────────────────────────
function renderPresets(list: Preset[]): void {
  presetsEl.innerHTML = "";
  for (const p of list) {
    const row = document.createElement("div");
    row.className = "preset";
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
document.getElementById("save")!.addEventListener("click", () => {
  if (!active) return;
  const name = prompt("Preset name", `${seed}`) || seed;
  renderPresets(savePreset({ name, systemId: active.id, seed, params: { ...params } }));
});
renderPresets(loadPresets());

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === " ") { e.preventDefault(); loop?.toggle(); }
  else if (e.key === "r") loop?.reset();
});

// boot into the first system
if (SYSTEMS.length) selectSystem(SYSTEMS[0]);
