// Biome MINI — embeddable, chromeless versions of the Biome soundscape ecosystem.
// Reuses the SAME headless engine as the full player (biomeEngine.ts), wrapped in a
// compact dark CARD that fits a fixed-size iframe. Three sizes:
//   micro   — top bar only (power · randomise · spawn · vol · meter · brand)
//   compact — top bar + expandable panel (live visual + master sliders + realm select)
//   mini    — compact + a condensed 8-strand mixer (scrolls within the card)
// Self-contained: scoped .bmm-* CSS, no DOM helpers from shared except the proven
// controls. Audio starts on the first user gesture (power/randomise/spawn) per the
// browser autoplay policy — applying a snapshot up front does NOT start sound.

import { ensureAudio, MONO, reduceMotion } from "./shared";
import { Biome, PRESETS, NSTRANDS, randomConfig } from "./biomeEngine";
import type { StrandType } from "./biomeEngine";
import type { Snapshot } from "./biomeShare";

type MiniSize = "micro" | "compact" | "mini";

const TYPE_OPTS: { value: StrandType; label: string }[] = [
  { value: "tone", label: "Tone" },
  { value: "binaural", label: "Binaural" },
  { value: "isochronic", label: "Isochronic" },
  { value: "drone", label: "Drone" },
  { value: "noise", label: "Noise" },
];

// ---- one-time scoped CSS ---------------------------------------------------

let cssDone = false;
function injectCss(): void {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
/* Self-contained token bridge: the full player inherits --bg/--fg2..4/--lw from
   .inst-root, but an embed mounts on a bare <div> on someone else's page — so the
   card defines them itself, with hard dark fallbacks so it stays a dark card on any
   host even if theme vars are absent. */
.bmm-card{box-sizing:border-box;width:100%;min-height:100vh;max-height:100vh;overflow-y:auto;
  --bg:var(--bg-0,#0b0a08);--fg:var(--fg,#f1ede5);--fg2:var(--fg-dim,#a39d92);
  --fg3:color-mix(in srgb,var(--fg-dim,#a39d92) 80%,var(--fg-faint,#8a8479));--fg4:var(--fg-faint,#8a8479);
  --lw:var(--algo-lw,241,237,229);
  background:var(--bg-1,#100e0b);color:var(--fg);border:1px solid rgba(var(--lw),0.16);border-radius:12px;padding:12px 13px;font-family:${MONO};-webkit-font-smoothing:antialiased}
.bmm-card *,.bmm-card *::before,.bmm-card *::after{box-sizing:border-box}
.bmm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.bmm-pow{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--fg);border:1px solid rgba(var(--lw),0.3);border-radius:40px;padding:8px 14px;font-family:${MONO};font-size:10px;letter-spacing:0.12em;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.bmm-pow:hover{border-color:rgba(var(--lw),0.6)}
.bmm-pow[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.bmm-pow:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.bmm-dot{width:7px;height:7px;border-radius:50%;background:var(--fg4);transition:background .2s}
.bmm-pow[data-on="1"] .bmm-dot{background:var(--bg);animation:bmmPulse 1.6s ease-in-out infinite}
@keyframes bmmPulse{0%,100%{opacity:1}50%{opacity:0.3}}
.bmm-btn{appearance:none;background:transparent;color:var(--fg);border:1px solid rgba(var(--lw),0.26);border-radius:5px;font-family:${MONO};font-size:10px;letter-spacing:0.1em;padding:8px 11px;cursor:pointer;transition:background .2s,color .2s,border-color .2s;white-space:nowrap}
.bmm-btn:hover{background:var(--fg);color:var(--bg)}
.bmm-btn[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.bmm-btn:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.bmm-vol{display:inline-flex;align-items:center;gap:6px}
.bmm-vol span{font-family:${MONO};font-size:9px;letter-spacing:0.12em;color:var(--fg4)}
.bmm-range{-webkit-appearance:none;appearance:none;height:2px;background:rgba(var(--lw),0.24);border-radius:2px;outline:none;cursor:pointer}
.bmm-range::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--fg);border:2px solid var(--bg);cursor:pointer}
.bmm-range::-moz-range-thumb{width:10px;height:10px;border-radius:50%;background:var(--fg);border:2px solid var(--bg);cursor:pointer}
.bmm-range:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.bmm-meter{flex:1 1 60px;min-width:54px;display:flex;align-items:center;gap:7px}
.bmm-meter span{font-family:${MONO};font-size:9px;letter-spacing:0.12em;color:var(--fg4)}
.bmm-meterbar{flex:1;height:3px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden}
.bmm-meterfill{height:100%;width:0%;background:var(--fg);transition:width .1s linear}
.bmm-link{display:inline-flex;align-items:center;text-decoration:none;color:var(--fg3);font-family:${MONO};font-size:9px;letter-spacing:0.12em;padding:6px 4px;transition:color .2s;white-space:nowrap}
.bmm-link:hover{color:var(--fg)}
.bmm-link:focus-visible{outline:2px solid var(--fg);outline-offset:2px;border-radius:3px}
.bmm-expand{margin-top:11px;padding-top:11px;border-top:1px solid rgba(var(--lw),0.12)}
.bmm-canvas{display:block;width:100%;height:56px;border-radius:6px;background:rgba(var(--lw),0.05)}
.bmm-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:11px}
.bmm-mini{display:flex;flex-direction:column;gap:2px}
.bmm-mini .bmm-minihead{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.bmm-mini label{font-family:${MONO};font-size:8.5px;letter-spacing:0.08em;color:var(--fg4)}
.bmm-mini .bmm-val{font-family:${MONO};font-size:9px;color:var(--fg);font-variant-numeric:tabular-nums}
.bmm-mini input{width:100%}
.bmm-realm{margin-top:11px;display:flex;align-items:center;gap:7px}
.bmm-realm label{font-family:${MONO};font-size:9px;letter-spacing:0.12em;color:var(--fg4)}
.bmm-sel{flex:1;appearance:none;background:var(--bg);color:var(--fg);border:1px solid rgba(var(--lw),0.24);border-radius:4px;font-family:${MONO};font-size:10px;letter-spacing:0.02em;padding:6px 8px;cursor:pointer}
.bmm-sel:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.bmm-mixer{margin-top:11px;display:flex;flex-direction:column;gap:5px;max-height:148px;overflow-y:auto}
.bmm-srow{display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid rgba(var(--lw),0.1);border-radius:5px;opacity:0.5;transition:opacity .2s,border-color .2s}
.bmm-srow[data-on="1"]{opacity:1;border-color:rgba(var(--lw),0.32)}
.bmm-srow .bmm-no{font-family:${MONO};font-size:8.5px;letter-spacing:0.1em;color:var(--fg4);width:16px;flex:0 0 auto}
.bmm-srow .bmm-stog{appearance:none;background:transparent;border:1px solid rgba(var(--lw),0.28);border-radius:4px;color:var(--fg3);font-family:${MONO};font-size:8.5px;letter-spacing:0.06em;padding:3px 7px;cursor:pointer;flex:0 0 auto}
.bmm-srow .bmm-stog[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.bmm-srow .bmm-ssel{flex:1 1 0;min-width:0;appearance:none;background:var(--bg);color:var(--fg);border:1px solid rgba(var(--lw),0.22);border-radius:4px;font-family:${MONO};font-size:9px;padding:4px 5px;cursor:pointer}
.bmm-srow .bmm-slvl{flex:0 0 70px}
.bmm-srow .bmm-stog:focus-visible,.bmm-srow .bmm-ssel:focus-visible,.bmm-srow input:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
@media (prefers-reduced-motion: reduce){.bmm-pow[data-on="1"] .bmm-dot{animation:none}}
`;
  document.head.appendChild(s);
}

const pct = (v: number) => `${Math.round(v * 100)}`;

// ---- mount -----------------------------------------------------------------

export function mountMini(root: HTMLElement, opts: { size: MiniSize; state?: Snapshot | null }): void {
  injectCss();
  const { size } = opts;
  const biome = new Biome();
  let poweredOn = false;
  let growing = false;

  const card = document.createElement("div");
  card.className = "bmm-card";

  // ---- power ---------------------------------------------------------------
  // Self-built power button (rather than shared powerButton) so randomise/spawn can
  // flip it on programmatically and have the label re-render — shared.powerButton
  // only re-renders on its own click.
  const power = document.createElement("button");
  power.className = "bmm-pow"; power.type = "button"; power.dataset.on = "0";
  power.setAttribute("aria-pressed", "false");
  power.setAttribute("aria-label", "Power");
  const renderPower = () => {
    power.innerHTML = `<span class="bmm-dot"></span>${poweredOn ? "ON" : "POWER"}`;
    power.dataset.on = poweredOn ? "1" : "0";
    power.setAttribute("aria-pressed", String(poweredOn));
  };
  renderPower();

  // Turn audio on from a user gesture; safe to call repeatedly.
  async function powerUp(): Promise<void> {
    await ensureAudio();
    await biome.start();
    biome.setMuted(false);
    poweredOn = true;
    renderPower();
  }

  let powerBusy = false;
  power.addEventListener("click", async () => {
    if (powerBusy) return; powerBusy = true;
    try {
      if (!poweredOn) {
        await powerUp();
      } else {
        biome.setMuted(true); // embeds mute on off (don't suspend — spawn/randomise may continue)
        poweredOn = false;
        renderPower();
      }
    } finally { powerBusy = false; }
  });

  // ---- randomise -----------------------------------------------------------
  const randomBtn = document.createElement("button");
  randomBtn.className = "bmm-btn"; randomBtn.type = "button"; randomBtn.textContent = "⟲ RANDOMISE";
  randomBtn.setAttribute("aria-label", "Randomise the soundscape");
  randomBtn.addEventListener("click", async () => {
    await powerUp();
    const { strands, master, palette } = randomConfig();
    biome.setPalette(palette);
    biome.apply(strands, master);
    syncAll();
  });

  // ---- spawn ---------------------------------------------------------------
  const spawnBtn = document.createElement("button");
  spawnBtn.className = "bmm-btn"; spawnBtn.type = "button"; spawnBtn.textContent = "❀ SPAWN";
  spawnBtn.setAttribute("aria-label", "Toggle autonomous growth");
  spawnBtn.addEventListener("click", async () => {
    await powerUp();
    growing = !growing;
    biome.setGrowing(growing);
    spawnBtn.textContent = growing ? "❀ SPAWNING…" : "❀ SPAWN";
    spawnBtn.dataset.on = growing ? "1" : "0";
  });

  // ---- volume --------------------------------------------------------------
  const volWrap = document.createElement("div");
  volWrap.className = "bmm-vol";
  const volLab = document.createElement("span"); volLab.textContent = "VOL";
  const vol = document.createElement("input");
  vol.type = "range"; vol.className = "bmm-range";
  vol.min = "0"; vol.max = "1"; vol.step = "0.01"; vol.value = String(biome.master.volume);
  vol.style.width = "62px";
  vol.setAttribute("aria-label", "Master volume");
  vol.addEventListener("input", () => biome.setMaster({ volume: parseFloat(vol.value) }));
  volWrap.append(volLab, vol);

  // ---- meter ---------------------------------------------------------------
  const meterWrap = document.createElement("div");
  meterWrap.className = "bmm-meter";
  const meterLab = document.createElement("span"); meterLab.textContent = "FIELD";
  const meterBar = document.createElement("div"); meterBar.className = "bmm-meterbar";
  const meterFill = document.createElement("div"); meterFill.className = "bmm-meterfill";
  meterBar.append(meterFill); meterWrap.append(meterLab, meterBar);

  // ---- brand link ----------------------------------------------------------
  const brand = document.createElement("a");
  brand.className = "bmm-link"; brand.textContent = "BIOME ↗";
  brand.href = "/projects/instruments/biome";
  brand.target = "_blank"; brand.rel = "noopener";
  brand.title = "Open the full Biome player";

  // ---- expand toggle (compact + mini) -------------------------------------
  let expandBtn: HTMLButtonElement | null = null;
  let expandPanel: HTMLElement | null = null;
  if (size !== "micro") {
    expandBtn = document.createElement("button");
    expandBtn.className = "bmm-btn"; expandBtn.type = "button"; expandBtn.textContent = "▸ MORE";
    expandBtn.setAttribute("aria-expanded", "false");
    expandBtn.setAttribute("aria-label", "Show more controls");
    expandBtn.addEventListener("click", () => {
      const open = expandPanel!.style.display === "none";
      expandPanel!.style.display = open ? "block" : "none";
      expandBtn!.textContent = open ? "▾ LESS" : "▸ MORE";
      expandBtn!.dataset.on = open ? "1" : "0";
      expandBtn!.setAttribute("aria-expanded", String(open));
    });
  }

  // ---- bar assembly --------------------------------------------------------
  const bar = document.createElement("div");
  bar.className = "bmm-bar";
  bar.append(power, randomBtn, spawnBtn, volWrap, meterWrap);
  if (expandBtn) bar.append(expandBtn);
  bar.append(brand);
  card.append(bar);

  // ---- expand panel --------------------------------------------------------
  let canvas: HTMLCanvasElement | null = null;
  let cctx: CanvasRenderingContext2D | null = null;
  const masterSetters: Array<() => void> = []; // re-sync expand sliders after randomise/preset
  let realmSel: HTMLSelectElement | null = null;
  const stripRefreshers: Array<(i: number) => void> = [];

  if (size !== "micro") {
    expandPanel = document.createElement("div");
    expandPanel.className = "bmm-expand";
    expandPanel.style.display = "none";

    // live visual canvas
    canvas = document.createElement("canvas");
    canvas.className = "bmm-canvas";
    canvas.setAttribute("aria-hidden", "true");
    expandPanel.append(canvas);
    cctx = canvas.getContext("2d");

    // master sliders (2-col grid)
    const grid = document.createElement("div");
    grid.className = "bmm-grid";
    const reverb = miniSlider("REVERB", 0, 1, 0.01, biome.master.reverb, pct, (v) => biome.setMaster({ reverb: v }));
    const breath = miniSlider("BREATH", 0, 1, 0.01, biome.master.breath, pct, (v) => biome.setMaster({ breath: v }));
    const breathRate = miniSlider("BR RATE", 0.01, 0.4, 0.005, biome.master.breathRate, (v) => `${v.toFixed(2)}Hz`, (v) => biome.setMaster({ breathRate: v }));
    const spawnSpeed = miniSlider("SPAWN SPD", 0, 1, 0.01, 0.5, pct, (v) => biome.setGrowRate(v));
    const chaos = miniSlider("CHAOS", 0, 1, 0.01, 0.3, pct, (v) => biome.setChaos(v));
    for (const c of [reverb, breath, breathRate, spawnSpeed, chaos]) grid.append(c.el);
    expandPanel.append(grid);
    // these reflect engine state on randomise/preset (spawn speed + chaos are local, leave as-is)
    masterSetters.push(() => reverb.set(biome.master.reverb));
    masterSetters.push(() => breath.set(biome.master.breath));
    masterSetters.push(() => breathRate.set(biome.master.breathRate));

    // realm preset selector
    const realmWrap = document.createElement("div");
    realmWrap.className = "bmm-realm";
    const realmLab = document.createElement("label");
    realmLab.textContent = "REALM"; realmLab.htmlFor = "bmm-realm-sel";
    realmSel = document.createElement("select");
    realmSel.className = "bmm-sel"; realmSel.id = "bmm-realm-sel";
    realmSel.setAttribute("aria-label", "Realm preset");
    realmSel.innerHTML = PRESETS.map((p) => `<option value="${p.name}">${p.name}</option>`).join("");
    realmSel.addEventListener("change", async () => {
      const p = PRESETS.find((x) => x.name === realmSel!.value);
      if (!p) return;
      await powerUp();
      const pal = p.strands.map((s) => s.hz).filter((h): h is number => typeof h === "number");
      if (pal.length) biome.setPalette(pal);
      biome.apply(p.strands, p.master);
      syncAll();
    });
    realmWrap.append(realmLab, realmSel);
    expandPanel.append(realmWrap);

    // condensed 8-strand mixer (mini only)
    if (size === "mini") {
      const mixer = document.createElement("div");
      mixer.className = "bmm-mixer";
      for (let i = 0; i < NSTRANDS; i++) {
        const row = document.createElement("div");
        row.className = "bmm-srow"; row.dataset.on = "0";

        const no = document.createElement("span");
        no.className = "bmm-no"; no.textContent = String(i + 1).padStart(2, "0");

        const tog = document.createElement("button");
        tog.type = "button"; tog.className = "bmm-stog"; tog.textContent = "ON";
        tog.setAttribute("aria-label", `Strand ${i + 1} enabled`);
        tog.addEventListener("click", () => {
          biome.setStrand(i, { enabled: biome.state[i].enabled ? false : true });
          refreshStrip(i);
        });

        const typeSel = document.createElement("select");
        typeSel.className = "bmm-ssel";
        typeSel.setAttribute("aria-label", `Strand ${i + 1} type`);
        typeSel.innerHTML = TYPE_OPTS.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
        typeSel.addEventListener("change", () => {
          biome.setStrand(i, { type: typeSel.value as StrandType });
          refreshStrip(i);
        });

        const lvl = document.createElement("input");
        lvl.type = "range"; lvl.className = "bmm-range bmm-slvl";
        lvl.min = "0"; lvl.max = "1"; lvl.step = "0.01"; lvl.value = String(biome.state[i].level);
        lvl.setAttribute("aria-label", `Strand ${i + 1} level`);
        lvl.addEventListener("input", () => biome.setStrand(i, { level: parseFloat(lvl.value) }));

        row.append(no, tog, typeSel, lvl);
        mixer.append(row);

        const refreshStrip = (idx: number) => {
          if (idx !== i) return;
          const st = biome.state[i];
          row.dataset.on = st.enabled ? "1" : "0";
          tog.dataset.on = st.enabled ? "1" : "0";
          typeSel.value = st.type;
          lvl.value = String(st.level);
        };
        refreshStrip(i);
        stripRefreshers.push(refreshStrip);
      }
      expandPanel.append(mixer);
      // engine notifies us when growth mutates a strand → refresh that row
      biome.onChange = (i) => { for (const r of stripRefreshers) r(i); };
    }

    card.append(expandPanel);
  }

  root.append(card);

  // ---- sync helpers --------------------------------------------------------
  function syncAll(): void {
    vol.value = String(biome.master.volume);
    for (const set of masterSetters) set();
    for (let i = 0; i < NSTRANDS; i++) for (const r of stripRefreshers) r(i);
  }

  // ---- initial state -------------------------------------------------------
  if (opts.state) {
    biome.apply(opts.state.strands, opts.state.master);
  } else {
    const p = PRESETS[0];
    const pal = p.strands.map((s) => s.hz).filter((h): h is number => typeof h === "number");
    biome.setPalette(pal);
    biome.apply(p.strands, p.master);
  }
  syncAll();

  // ---- rAF meter + visual loop ---------------------------------------------
  const reduce = reduceMotion();
  const history: number[] = []; // rolling level for the visual
  const HIST = 96;
  let frame = 0;
  function loop(): void {
    const lvl = biome.level();
    meterFill.style.width = `${Math.min(100, lvl * 150).toFixed(0)}%`;

    if (canvas && cctx) {
      frame++;
      // reduced-motion: update the rolling buffer roughly 4×/sec instead of every frame
      if (!reduce || frame % 15 === 0) {
        history.push(lvl);
        if (history.length > HIST) history.shift();
        drawVisual(cctx, canvas, history, reduce);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ---- live visual: a scrolling, breathing monochrome waveform ---------------

function drawVisual(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, hist: number[], reduce: boolean): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const mid = h / 2;
  const n = hist.length;
  if (n < 2) return;

  const css = getComputedStyle(canvas);
  const fg = css.getPropertyValue("--fg").trim() || "#fff";

  // mirrored area fill — an organic "field" that breathes with the rolling level
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const v = hist[i];
    const amp = v * (h * 0.42);
    const y = mid - amp;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = (i / (n - 1)) * w;
    const v = hist[i];
    const amp = v * (h * 0.42);
    ctx.lineTo(x, mid + amp);
  }
  ctx.closePath();
  ctx.globalAlpha = reduce ? 0.16 : 0.13;
  ctx.fillStyle = fg;
  ctx.fill();

  // top contour line
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const y = mid - hist[i] * (h * 0.42);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.strokeStyle = fg;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---- compact slider (labelled, with live readout) --------------------------

function miniSlider(
  label: string, min: number, max: number, step: number, value: number,
  format: (v: number) => string, onInput: (v: number) => void,
): { el: HTMLElement; set(v: number): void } {
  const wrap = document.createElement("div");
  wrap.className = "bmm-mini";
  const head = document.createElement("div"); head.className = "bmm-minihead";
  const l = document.createElement("label"); l.textContent = label;
  const val = document.createElement("span"); val.className = "bmm-val"; val.textContent = format(value);
  head.append(l, val);
  const inp = document.createElement("input");
  inp.type = "range"; inp.className = "bmm-range";
  inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(value);
  inp.setAttribute("aria-label", label);
  inp.addEventListener("input", () => {
    const v = parseFloat(inp.value);
    val.textContent = format(v);
    onInput(v);
  });
  wrap.append(head, inp);
  return { el: wrap, set: (v) => { inp.value = String(v); val.textContent = format(v); } };
}
