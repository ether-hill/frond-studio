// Biome — a living sound-healing soundscape ecosystem in Web Audio. A soundboard of
// breathing "strands" (layers), each a healing-frequency generator: a pure tone, a
// binaural beat (two ears, difference = a brainwave band), an isochronic pulse (a tone
// gated on/off, no headphones needed), a noise bed, or a drone. Everything drifts on
// slow "breath" LFOs and runs through a deep reverb. You can layer presets, save your
// own, randomise, or switch on GROWTH and let the ecosystem bloom and wither on its own.
//
// The frequency atlas (solfeggio · chakra · earth-resonance · tuning · gamma · tesla ·
// numerology) and the binaural/isochronic mechanics come from a sourced research pass;
// claimed effects are reported as the sound-healing tradition frames them, with honest
// evidence levels (R research-backed · T traditional · N numerology/folklore). This is a
// relaxation instrument, not a medical device.

import {
  instrumentPage, panel, slider, segmented, powerButton, ensureAudio, suspendAudio, MONO,
} from "./shared";
import {
  Biome, ATLAS, BANDS, CARRIERS, PRESETS, NSTRANDS, randomConfig,
} from "./biomeEngine";
import type { Strand, StrandType, MasterState } from "./biomeEngine";
import { readSharedFromLocation, buildShareUrl, buildEmbedCode } from "./biomeShare";

export function mount(root: HTMLElement) {

// ===========================================================================
//  PAGE
// ===========================================================================

const biome = new Biome();

const page = instrumentPage(root, {
  kicker: "BIOME · SOUND HEALING SOUNDSCAPE ECOSYSTEM",
  title: "Biome.",
  standfirst:
    "A living soundscape mixer built on the frequencies of sound healing — solfeggio, binaural & isochronic beats, Schumann and 40 Hz gamma, drones and noise beds — each a breathing channel. Power on, load a realm, randomise, save your own, or hit SPAWN and let the ecosystem grow itself — dial its SPEED and CHAOS. Best with headphones; a relaxation instrument, not a medical device.",
});

const style = document.createElement("style");
style.textContent = `
.bm-row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.bm-strips{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.bm-strip{flex:0 0 auto;width:122px;display:flex;flex-direction:column;gap:9px;padding:11px 10px 12px;border:1px solid rgba(var(--lw),0.13);border-radius:7px;background:var(--panel);transition:border-color .2s,opacity .2s;opacity:0.55}
.bm-strip[data-on="1"]{border-color:rgba(var(--lw),0.4);opacity:1}
.bm-striphead{display:flex;justify-content:space-between;align-items:center}
.bm-no{font-family:${MONO};font-size:9px;letter-spacing:0.14em;color:var(--fg4)}
.bm-sel{width:100%;appearance:none;background:var(--bg);color:var(--fg);border:1px solid rgba(var(--lw),0.24);border-radius:4px;font-family:${MONO};font-size:9.5px;letter-spacing:0.02em;padding:6px 7px;cursor:pointer}
.bm-sel:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.bm-faderwrap{display:flex;flex-direction:column;align-items:center;gap:4px}
.bm-fader{appearance:auto;accent-color:var(--fg);writing-mode:vertical-lr;direction:rtl;width:20px;height:96px;cursor:pointer}
.bm-mini{display:flex;flex-direction:column;gap:2px}
.bm-mini label{font-family:${MONO};font-size:8px;letter-spacing:0.08em;color:var(--fg4)}
.bm-mini input{appearance:auto;accent-color:var(--fg);width:100%;cursor:pointer}
.bm-tog{appearance:none;background:transparent;border:1px solid rgba(var(--lw),0.28);border-radius:4px;color:var(--fg3);font-family:${MONO};font-size:9px;letter-spacing:0.06em;padding:4px 8px;cursor:pointer}
.bm-tog[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.bm-atlas{width:100%;border-collapse:collapse;font-size:12px}
.bm-atlas th{text-align:left;font-family:${MONO};font-size:9px;letter-spacing:0.14em;color:var(--fg4);font-weight:400;padding:6px 10px;border-bottom:1px solid rgba(var(--lw),0.14)}
.bm-atlas td{padding:7px 10px;border-bottom:1px solid rgba(var(--lw),0.07);color:var(--fg2);vertical-align:top}
.bm-ev{font-family:${MONO};font-size:9px;letter-spacing:0.08em;padding:2px 6px;border-radius:20px;border:1px solid rgba(var(--lw),0.2);color:var(--fg3)}
.bm-ev[data-ev="R"]{border-color:var(--fg);color:var(--fg)}
.bm-disc{font-family:${MONO};font-size:10px;letter-spacing:0.06em;color:var(--fg4);line-height:1.6}
`;
document.head.appendChild(style);

// ---- transport -------------------------------------------------------------
const transport = panel("TRANSPORT · SPAWN");
const trow = document.createElement("div"); trow.className = "bm-row";
const power = powerButton(async (on) => { if (on) { await ensureAudio(); await biome.start(); biome.setMuted(false); } else { biome.setMuted(true); setTimeout(() => { if (power.el.dataset.on !== "1") suspendAudio(); }, 240); } });
const growBtn = document.createElement("button"); growBtn.className = "inst-link"; growBtn.type = "button"; growBtn.textContent = "❀ SPAWN";
let growing = false;
growBtn.addEventListener("click", async () => {
  await biome.start(); power.el.dataset.on = "1"; biome.setMuted(false);
  growing = !growing; biome.setGrowing(growing);
  growBtn.textContent = growing ? "❀ SPAWNING…" : "❀ SPAWN"; growBtn.dataset.on = growing ? "1" : "0";
});
const randomBtn = document.createElement("button"); randomBtn.className = "inst-link"; randomBtn.type = "button"; randomBtn.textContent = "⟲ RANDOMISE";
randomBtn.addEventListener("click", async () => { await biome.start(); power.el.dataset.on = "1"; biome.setMuted(false); randomise(); });
const meterWrap = document.createElement("div");
meterWrap.style.cssText = "flex:1 1 150px;min-width:130px;display:flex;align-items:center;gap:10px";
meterWrap.innerHTML = `<span style="font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4)">FIELD</span>`;
const meterBar = document.createElement("div"); meterBar.style.cssText = "flex:1;height:4px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden";
const meterFill = document.createElement("div"); meterFill.style.cssText = "height:100%;width:0%;background:var(--fg);transition:width .1s linear"; meterBar.append(meterFill); meterWrap.append(meterBar);
trow.append(power.el, growBtn, randomBtn, meterWrap);
const mrow = document.createElement("div"); mrow.className = "bm-row"; mrow.style.marginTop = "16px";
const volCtl = slider({ label: "MASTER VOLUME", min: 0, max: 1, step: 0.01, value: biome.master.volume, format: pct, onInput: (v) => biome.setMaster({ volume: v }) });
const revCtl = slider({ label: "SPACE · REVERB", min: 0, max: 1, step: 0.01, value: biome.master.reverb, format: pct, onInput: (v) => biome.setMaster({ reverb: v }) });
const brCtl = slider({ label: "BREATH DEPTH", min: 0, max: 1, step: 0.01, value: biome.master.breath, format: pct, onInput: (v) => biome.setMaster({ breath: v }) });
const brrCtl = slider({ label: "BREATH RATE", min: 0.01, max: 0.4, step: 0.005, value: biome.master.breathRate, format: (v) => `${v.toFixed(2)}Hz`, onInput: (v) => biome.setMaster({ breathRate: v }) });
const speedCtl = slider({ label: "SPAWN · SPEED", min: 0, max: 1, step: 0.01, value: 0.5, format: pct, onInput: (v) => biome.setGrowRate(v) });
const chaosCtl = slider({ label: "SPAWN · CHAOS", min: 0, max: 1, step: 0.01, value: 0.3, format: pct, onInput: (v) => biome.setChaos(v) });
for (const c of [volCtl, revCtl, brCtl, brrCtl, speedCtl, chaosCtl]) { c.el.style.cssText += ";flex:1 1 150px;min-width:140px"; mrow.append(c.el); }
transport.body.append(trow, mrow);

// ---- mixer (channel strips) ------------------------------------------------
const mixer = panel("MIXER · 8 BREATHING STRANDS");
const strips = document.createElement("div"); strips.className = "bm-strips"; mixer.body.append(strips);

interface StripUI { card: HTMLElement; refresh(): void; }
const stripUIs: StripUI[] = [];

for (let i = 0; i < NSTRANDS; i++) {
  const s = biome.state[i];
  const card = document.createElement("div"); card.className = "bm-strip"; card.dataset.on = "0";
  const head = document.createElement("div"); head.className = "bm-striphead";
  const no = document.createElement("span"); no.className = "bm-no"; no.textContent = String(i + 1).padStart(2, "0");
  const onTog = document.createElement("button"); onTog.type = "button"; onTog.className = "bm-tog"; onTog.textContent = "ON";
  onTog.addEventListener("click", () => { const on = card.dataset.on !== "1"; biome.setStrand(i, { enabled: on }); refresh(); });
  head.append(no, onTog);

  const typeSel = mkSelect([
    { value: "tone", label: "Pure Tone" }, { value: "binaural", label: "Binaural" },
    { value: "isochronic", label: "Isochronic" }, { value: "drone", label: "Drone" }, { value: "noise", label: "Noise Bed" },
  ], s.type, (v) => { biome.setStrand(i, { type: v as StrandType }); refresh(); });
  const freqSel = mkSelect(CARRIERS.map((f) => ({ value: String(f.hz), label: f.label })), String(s.hz), (v) => biome.setStrand(i, { hz: parseFloat(v) }));
  const beatSel = mkSelect(BANDS.map((b) => ({ value: String(b.hz), label: b.label })), String(s.beat), (v) => biome.setStrand(i, { beat: parseFloat(v) }));

  const lvl = document.createElement("input"); lvl.type = "range"; lvl.className = "bm-fader"; lvl.min = "0"; lvl.max = "1"; lvl.step = "0.01"; lvl.value = String(s.level); lvl.setAttribute("aria-label", `strand ${i + 1} level`);
  lvl.addEventListener("input", () => biome.setStrand(i, { level: parseFloat(lvl.value) }));
  const faderWrap = document.createElement("div"); faderWrap.className = "bm-faderwrap";
  const flab = document.createElement("span"); flab.style.cssText = `font-family:${MONO};font-size:8px;letter-spacing:0.1em;color:var(--fg4)`; flab.textContent = "LEVEL";
  faderWrap.append(lvl, flab);

  const pan = mkMini("PAN", -1, 1, 0.02, s.pan, (v) => biome.setStrand(i, { pan: v }));
  const breath = mkMini("BREATH", 0, 1, 0.01, s.breath, (v) => biome.setStrand(i, { breath: v }));
  const tone = mkMini("TONE", 0, 1, 0.01, s.tone, (v) => biome.setStrand(i, { tone: v }));

  card.append(head, typeSel.el, freqSel.el, beatSel.el, faderWrap, pan.el, breath.el, tone.el);
  strips.append(card);

  const refresh = () => {
    const st = biome.state[i];
    card.dataset.on = st.enabled ? "1" : "0";
    onTog.dataset.on = st.enabled ? "1" : "0";
    typeSel.set(st.type); freqSel.set(String(st.hz)); beatSel.set(String(st.beat));
    lvl.value = String(st.level); pan.set(st.pan); breath.set(st.breath); tone.set(st.tone);
    const showBeat = st.type === "binaural" || st.type === "isochronic";
    beatSel.el.style.display = showBeat ? "" : "none";
    freqSel.el.style.display = st.type === "noise" ? "none" : "";
  };
  refresh();
  stripUIs.push({ card, refresh });
}

// the engine notifies us when growth mutates a strand → refresh that strip
biome.onChange = (i) => stripUIs[i]?.refresh();

// ---- presets ---------------------------------------------------------------
const presets = panel("REALMS · PRESETS · SAVE");
const prow = document.createElement("div"); prow.className = "bm-row";
const presetSeg = segmented<string>({
  label: "REALM", value: PRESETS[0].name,
  options: PRESETS.map((p) => ({ value: p.name, label: p.name.toUpperCase() })),
  onChange: (name) => loadPreset(name),
});
prow.append(presetSeg.el);
const saveWrap = document.createElement("div"); saveWrap.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap";
const nameInput = document.createElement("input"); nameInput.type = "text"; nameInput.placeholder = "name your soundscape";
nameInput.style.cssText = `background:var(--bg);color:var(--fg);border:1px solid rgba(var(--lw),0.24);border-radius:4px;font-family:${MONO};font-size:11px;padding:9px 11px;min-width:170px`;
const saveBtn = document.createElement("button"); saveBtn.className = "inst-link"; saveBtn.type = "button"; saveBtn.textContent = "SAVE";
saveBtn.addEventListener("click", () => saveUserPreset());
const userSel = mkSelect([{ value: "", label: "— saved soundscapes —" }], "", () => { /* load on button */ });
userSel.el.style.minWidth = "190px";
const loadBtn = document.createElement("button"); loadBtn.className = "inst-link"; loadBtn.type = "button"; loadBtn.textContent = "LOAD";
loadBtn.addEventListener("click", () => loadUserPreset(userSel.value()));
const delBtn = document.createElement("button"); delBtn.className = "inst-link"; delBtn.type = "button"; delBtn.textContent = "DELETE";
delBtn.addEventListener("click", () => deleteUserPreset(userSel.value()));
saveWrap.append(nameInput, saveBtn, userSel.el, loadBtn, delBtn);
const spacer = document.createElement("div"); spacer.style.height = "14px";
presets.body.append(prow, spacer, saveWrap);

// ---- share & embed ---------------------------------------------------------
const share = panel("SHARE · EMBED");
const ioStyle = `width:100%;box-sizing:border-box;background:var(--bg);color:var(--fg);border:1px solid rgba(var(--lw),0.24);border-radius:4px;font-family:${MONO};font-size:11px;letter-spacing:0.02em;padding:9px 11px`;

const shareIntro = document.createElement("p"); shareIntro.className = "bm-disc"; shareIntro.style.margin = "0 0 14px";
shareIntro.textContent = "Share this exact soundscape, or embed a mini player anywhere.";

// COPY LINK row
const linkRow = document.createElement("div"); linkRow.className = "bm-row"; linkRow.style.alignItems = "stretch";
const copyLinkBtn = document.createElement("button"); copyLinkBtn.className = "inst-link"; copyLinkBtn.type = "button"; copyLinkBtn.textContent = "⧉ COPY LINK";
copyLinkBtn.setAttribute("aria-label", "Copy a shareable link to this soundscape");
const linkField = document.createElement("input"); linkField.type = "text"; linkField.readOnly = true;
linkField.setAttribute("aria-label", "Shareable link to this soundscape");
linkField.style.cssText = ioStyle + ";flex:1 1 260px;min-width:200px";
let linkRestore: ReturnType<typeof setTimeout> | undefined;
function refreshShareUrl(): string {
  const url = buildShareUrl(location.origin, biome.snapshot());
  linkField.value = url;
  return url;
}
copyLinkBtn.addEventListener("click", async () => {
  const url = refreshShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    copyLinkBtn.textContent = "COPIED ✓";
    if (linkRestore) clearTimeout(linkRestore);
    linkRestore = setTimeout(() => { copyLinkBtn.textContent = "⧉ COPY LINK"; }, 1400);
  } catch {
    linkField.focus(); linkField.select();
  }
});
linkRow.append(copyLinkBtn, linkField);

// EMBED row
let embedSize: "micro" | "compact" | "mini" = "compact";
const embedSeg = segmented<"micro" | "compact" | "mini">({
  label: "EMBED SIZE", value: "compact",
  options: [{ value: "micro", label: "MICRO" }, { value: "compact", label: "COMPACT" }, { value: "mini", label: "MINI" }],
  onChange: (size) => updateEmbed(size),
});
const embedField = document.createElement("textarea"); embedField.readOnly = true; embedField.rows = 3;
embedField.setAttribute("aria-label", "Embed snippet for this soundscape");
embedField.style.cssText = ioStyle + ";font-size:10px;line-height:1.5;resize:vertical;margin-top:12px";
const copyEmbedBtn = document.createElement("button"); copyEmbedBtn.className = "inst-link"; copyEmbedBtn.type = "button"; copyEmbedBtn.textContent = "⧉ COPY EMBED";
copyEmbedBtn.setAttribute("aria-label", "Copy the embed snippet");
copyEmbedBtn.style.marginTop = "12px";
let embedRestore: ReturnType<typeof setTimeout> | undefined;
function updateEmbed(size: "micro" | "compact" | "mini"): void {
  embedSize = size;
  embedField.value = buildEmbedCode(location.origin, embedSize, biome.snapshot());
}
copyEmbedBtn.addEventListener("click", async () => {
  updateEmbed(embedSize);
  try {
    await navigator.clipboard.writeText(embedField.value);
    copyEmbedBtn.textContent = "COPIED ✓";
    if (embedRestore) clearTimeout(embedRestore);
    embedRestore = setTimeout(() => { copyEmbedBtn.textContent = "⧉ COPY EMBED"; }, 1400);
  } catch {
    embedField.focus(); embedField.select();
  }
});

share.body.append(shareIntro, linkRow, embedSeg.el, embedField, copyEmbedBtn);
refreshShareUrl();
updateEmbed("compact");

// ---- frequency atlas -------------------------------------------------------
const atlas = panel("FREQUENCY ATLAS · WHAT EACH TONE IS SAID TO DO");
const legend = document.createElement("p"); legend.className = "bm-disc"; legend.style.margin = "0 0 14px";
legend.innerHTML = `Evidence — <b style="color:var(--fg)">R</b> research-backed · T traditional/anecdotal · N numerology/folklore. Claims are reported as the sound-healing tradition frames them.`;
const table = document.createElement("table"); table.className = "bm-atlas";
table.innerHTML = `<thead><tr><th>HZ</th><th>FREQUENCY</th><th>CATEGORY</th><th>SAID TO</th><th>EV</th></tr></thead><tbody>` +
  ATLAS.map((f) => `<tr><td style="font-family:${MONO};color:var(--fg)">${f.hz}</td><td>${f.label.replace(/^[0-9.]+ · /, "")}</td><td style="color:var(--fg3)">${f.cat}</td><td>${f.claim}</td><td><span class="bm-ev" data-ev="${f.ev}">${f.ev}</span></td></tr>`).join("") +
  `</tbody>`;
const disc = document.createElement("p"); disc.className = "bm-disc"; disc.style.marginTop = "18px";
disc.innerHTML = `Mechanics — <b>binaural</b> beats need headphones (a tone in each ear; the brain hears the difference as a brainwave-rate beat). <b>Isochronic</b> tones pulse a single tone on/off, so they work on speakers. Keep the volume gentle. Avoid if prone to seizures; not for use while driving. A relaxation instrument — <b>not a medical device</b>.`;
atlas.body.append(legend, table, disc);

page.stage.append(transport.el, mixer.el, presets.el, share.el, atlas.el);
page.finalize();

// initial realm
loadPreset(PRESETS[0].name);
refreshUserList();

// restore an exact soundscape from a shared #s= link (state only — no autoplay)
const shared = readSharedFromLocation();
if (shared) {
  biome.apply(shared.strands, shared.master);
  syncMasterUI();
  stripUIs.forEach((u) => u.refresh());
}

function meter() { meterFill.style.width = `${Math.min(100, biome.level() * 150).toFixed(0)}%`; requestAnimationFrame(meter); }
requestAnimationFrame(meter);

(window as Window & { __biome?: unknown }).__biome = {
  engine: biome,
  start: () => biome.start(),
  level: () => biome.level(),
  randomise: () => randomise(),
  grow: (on: boolean) => biome.setGrowing(on),
  loadPreset: (n: string) => loadPreset(n),
};

// ---- behaviours ------------------------------------------------------------

function loadPreset(name: string): void {
  const p = PRESETS.find((x) => x.name === name); if (!p) return;
  biome.apply(p.strands, p.master);
  syncMasterUI();
  stripUIs.forEach((u) => u.refresh());
}

function randomise(): void {
  const { strands, master, palette } = randomConfig();
  biome.setPalette(palette);
  biome.apply(strands, master);
  syncMasterUI();
  stripUIs.forEach((u) => u.refresh());
}

function syncMasterUI(): void {
  volCtl.set(biome.master.volume); revCtl.set(biome.master.reverb);
  brCtl.set(biome.master.breath); brrCtl.set(biome.master.breathRate);
}

// ---- user presets (localStorage) ------------------------------------------
const LS_KEY = "frond-biome-presets";
function readUser(): Record<string, { strands: Strand[]; master: MasterState }> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function writeUser(o: Record<string, unknown>): void { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch { /* quota */ } }
function refreshUserList(): void {
  const all = readUser();
  const names = Object.keys(all);
  userSel.setOptions([{ value: "", label: names.length ? "— saved soundscapes —" : "— none saved yet —" }, ...names.map((n) => ({ value: n, label: n }))]);
}
function saveUserPreset(): void {
  const name = (nameInput.value || "").trim() || `Soundscape ${Object.keys(readUser()).length + 1}`;
  const all = readUser(); all[name] = biome.snapshot(); writeUser(all);
  nameInput.value = ""; refreshUserList(); userSel.set(name);
}
async function loadUserPreset(name: string): Promise<void> {
  if (!name) return; const all = readUser(); const snap = all[name]; if (!snap) return;
  await biome.start(); power.el.dataset.on = "1"; biome.setMuted(false);
  biome.apply(snap.strands, snap.master);
  syncMasterUI(); stripUIs.forEach((u) => u.refresh());
}
function deleteUserPreset(name: string): void {
  if (!name) return; const all = readUser(); delete all[name]; writeUser(all); refreshUserList();
}

// ---- tiny UI helpers -------------------------------------------------------

function pct(v: number) { return `${Math.round(v * 100)}`; }

function mkSelect(options: { value: string; label: string }[], value: string, onChange: (v: string) => void): { el: HTMLSelectElement; set(v: string): void; value(): string; setOptions(o: { value: string; label: string }[]): void } {
  const sel = document.createElement("select"); sel.className = "bm-sel";
  const fill = (opts: { value: string; label: string }[]) => { sel.innerHTML = opts.map((o) => `<option value="${o.value}">${o.label}</option>`).join(""); };
  fill(options); sel.value = value;
  sel.addEventListener("change", () => onChange(sel.value));
  return { el: sel, set: (v) => { sel.value = v; }, value: () => sel.value, setOptions: (o) => { const cur = sel.value; fill(o); sel.value = cur; } };
}

function mkMini(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void): { el: HTMLElement; set(v: number): void } {
  const wrap = document.createElement("div"); wrap.className = "bm-mini";
  const l = document.createElement("label"); l.textContent = label;
  const inp = document.createElement("input"); inp.type = "range"; inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(value);
  inp.setAttribute("aria-label", label);
  inp.addEventListener("input", () => onInput(parseFloat(inp.value)));
  wrap.append(l, inp);
  return { el: wrap, set: (v) => { inp.value = String(v); } };
}
}
