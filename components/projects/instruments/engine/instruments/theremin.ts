// Theremin — a gesture instrument. There are no keys: a pointer (mouse, pen or
// finger) sweeping a field bends pitch on the X axis and volume on the Y axis, exactly
// like the two antennae of a real theremin. Under the hood it's two slightly detuned
// oscillators (for the heterodyne shimmer), a vibrato LFO, a brightness low-pass, a
// portamento glide so pitch slides continuously, and a reverb to give the tone air.
// Optional scale-snapping quantises the otherwise-continuous pitch to a key.

import {
  instrumentPage, panel, controlGrid, slider, segmented, powerButton,
  mtof, noteName, ensureAudio, suspendAudio, MONO, reduceMotion,
} from "./shared";

export function mount(root: HTMLElement) {

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Scale = "off" | "chromatic" | "major" | "minorPent";
const SCALES: Record<Exclude<Scale, "off">, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minorPent: [0, 3, 5, 7, 10],
};

interface ThereminParams {
  wave: OscillatorType;
  lowMidi: number;   // bottom of the field
  range: number;     // octaves spanned across the field
  vibRate: number;   // Hz
  vibDepth: number;  // 0..1
  glide: number;     // portamento time-constant (s)
  brightness: number;// 0..1 → lowpass cutoff
  reverb: number;    // 0..1
  volume: number;    // master 0..1
  scale: Scale;
}

const DEFAULTS: ThereminParams = {
  wave: "sine", lowMidi: 48, range: 3, vibRate: 5.5, vibDepth: 0.25,
  glide: 0.06, brightness: 0.6, reverb: 0.35, volume: 0.8, scale: "off",
};

class Theremin {
  private ctx!: AudioContext;
  private p: ThereminParams = { ...DEFAULTS };
  private osc1!: OscillatorNode;
  private osc2!: OscillatorNode;
  private tone!: BiquadFilterNode;
  private vca!: GainNode;
  private master!: GainNode;
  private dry!: GainNode;
  private reverbSend!: GainNode;
  private reverbVol!: GainNode;
  private vibLfo!: OscillatorNode;
  private vibGain!: GainNode;
  private panner!: StereoPannerNode;
  private analyser!: AnalyserNode;
  /** Final output node (post-compressor) — connect this into a shared mix bus. */
  out!: AudioNode;
  private started = false;
  private sounding = false;
  private curFreq = mtof(60);
  private targetVol = 0;

  /** Last resolved pitch, for the readout. */
  freqReadout = mtof(60);

  get ready(): boolean { return this.started; }
  get params(): ThereminParams { return { ...this.p }; }
  /** Route this voice's output into a shared mix node (call after start). */
  connect(node: AudioNode): void { this.out.connect(node); }
  setPan(p: number): void { if (this.started) this.panner.pan.setTargetAtTime(clamp(p, -1, 1), this.ctx.currentTime, 0.05); }

  async start(): Promise<void> {
    const ctx = await ensureAudio();   // always resume the shared context, even if already built
    if (this.started) return;
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    // final output: master → panner → comp → out (the page wires `out` into a mix bus)
    this.panner = ctx.createStereoPanner();
    comp.connect(this.panner); this.out = this.panner;

    this.master = ctx.createGain(); this.master.gain.value = this.p.volume * 0.5;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.analyser); this.master.connect(comp);

    this.dry = ctx.createGain(); this.dry.gain.value = 1; this.dry.connect(this.master);
    const conv = ctx.createConvolver(); conv.buffer = this.reverbIR(ctx, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbVol = ctx.createGain(); this.reverbVol.gain.value = this.p.reverb;
    this.reverbSend.connect(conv); conv.connect(this.reverbVol); this.reverbVol.connect(this.master);

    this.vca = ctx.createGain(); this.vca.gain.value = 0;
    this.vca.connect(this.dry); this.vca.connect(this.reverbSend);

    this.tone = ctx.createBiquadFilter(); this.tone.type = "lowpass"; this.tone.Q.value = 0.7;
    this.tone.connect(this.vca);

    this.osc1 = ctx.createOscillator(); this.osc1.type = this.p.wave;
    this.osc2 = ctx.createOscillator(); this.osc2.type = this.p.wave; this.osc2.detune.value = 4;
    this.osc1.frequency.value = this.curFreq; this.osc2.frequency.value = this.curFreq;
    const oscMix = ctx.createGain(); oscMix.gain.value = 0.5;
    this.osc1.connect(oscMix); this.osc2.connect(oscMix); oscMix.connect(this.tone);

    this.vibLfo = ctx.createOscillator(); this.vibLfo.type = "sine"; this.vibLfo.frequency.value = this.p.vibRate;
    this.vibGain = ctx.createGain();
    this.vibLfo.connect(this.vibGain);
    this.vibGain.connect(this.osc1.detune); this.vibGain.connect(this.osc2.detune);

    this.osc1.start(); this.osc2.start(); this.vibLfo.start();
    this.started = true;
    this.applyAll();
  }

  private reverbIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 2.2);
        d[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return buf;
  }

  // ---- gesture input -------------------------------------------------------

  /** X position 0..1 → pitch (log across the field, optionally scale-snapped). */
  setPitchNorm(x: number): void {
    if (!this.started) return;
    let midi = this.p.lowMidi + clamp(x, 0, 1) * this.p.range * 12;
    if (this.p.scale !== "off") midi = this.snap(midi);
    const f = mtof(midi);
    this.curFreq = f; this.freqReadout = f;
    const tc = Math.max(0.001, this.p.glide);
    this.osc1.frequency.setTargetAtTime(f, this.ctx.currentTime, tc);
    this.osc2.frequency.setTargetAtTime(f, this.ctx.currentTime, tc);
  }

  /** Convert an absolute frequency to a field X position (0..1), given the current range. */
  hzToNorm(hz: number): number {
    const midi = 12 * Math.log2(hz / 440) + 69;
    return clamp((midi - this.p.lowMidi) / (this.p.range * 12), 0, 1);
  }

  /** Y position 0..1 (1 = top = loud) → volume. */
  setVolNorm(y: number): void {
    this.targetVol = clamp(y, 0, 1);
    if (this.started && this.sounding) this.applyVol();
  }

  gate(on: boolean): void {
    this.sounding = on;
    if (!this.started) return;
    if (on) this.applyVol();
    else this.vca.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
  }

  private applyVol(): void {
    const g = Math.pow(this.targetVol, 1.6) * 0.9; // curve for finer control low down
    this.vca.gain.setTargetAtTime(g, this.ctx.currentTime, 0.03);
  }

  private snap(midiFloat: number): number {
    const pcs = SCALES[this.p.scale as Exclude<Scale, "off">];
    const base = Math.floor(midiFloat / 12) * 12;
    let best = base, bestD = Infinity;
    for (let oct = -1; oct <= 1; oct++) {
      for (const pc of pcs) {
        const cand = base + oct * 12 + pc;
        const d = Math.abs(cand - midiFloat);
        if (d < bestD) { bestD = d; best = cand; }
      }
    }
    return best;
  }

  // ---- params --------------------------------------------------------------

  set<K extends keyof ThereminParams>(key: K, value: ThereminParams[K]): void {
    this.p[key] = value;
    if (!this.started) return;
    if (key === "wave") { this.osc1.type = this.p.wave; this.osc2.type = this.p.wave; }
    this.applyAll();
  }

  private applyAll(): void {
    const t = this.ctx.currentTime, p = this.p;
    this.master.gain.setTargetAtTime(p.volume * 0.5, t, 0.05);
    this.vibLfo.frequency.setTargetAtTime(p.vibRate, t, 0.05);
    this.vibGain.gain.setTargetAtTime(p.vibDepth * 35, t, 0.05); // ±cents
    this.tone.frequency.setTargetAtTime(400 * Math.pow(40, p.brightness), t, 0.05); // ~400..16k
    this.reverbVol.gain.setTargetAtTime(p.reverb, t, 0.05);
  }

  setMuted(m: boolean): void {
    if (this.started) this.master.gain.setTargetAtTime(m ? 0 : this.p.volume * 0.5, this.ctx.currentTime, 0.05);
  }

  level(): number {
    if (!this.started) return 0;
    const buf = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
    return peak / 128;
  }
}

// ---- page · up to 4 mixed theremin voices ----------------------------------

const NVOICES = 4;
const LABELS = ["A", "B", "C", "D"];
const voices = Array.from({ length: NVOICES }, () => new Theremin());
const levels = [1, 0.8, 0.8, 0.8];
const pans = [0, -0.5, 0.5, 0];
let focus = 0, count = 1, masterVol = 0.9, masterMuted = true;
let masterGain: GainNode | null = null, masterAnalyser: AnalyserNode | null = null;

const page = instrumentPage(root, {
  kicker: "THEREMIN · GESTURE INSTRUMENT",
  title: "Theremin.",
  standfirst:
    "No keys, no contact — pitch and volume are pulled out of the air. Power on and sweep the field (X bends pitch, Y swells volume). Stack up to four voices, set each to play itself on an autopilot preset, and mix them into one breathing chord.",
});

// shared mix bus so the 4 voices sum through one master + meter
async function ensureMaster(): Promise<void> {
  if (masterGain) return;
  const ctx = await ensureAudio();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
  masterAnalyser = ctx.createAnalyser(); masterAnalyser.fftSize = 1024;
  masterGain = ctx.createGain(); masterGain.gain.value = masterMuted ? 0 : masterVol;
  masterGain.connect(masterAnalyser); masterAnalyser.connect(comp);
}
async function ensureVoice(i: number): Promise<void> {
  await ensureMaster();
  const v = voices[i];
  if (!v.ready) { await v.start(); v.connect(masterGain!); }
  v.set("volume", levels[i]); v.setPan(pans[i]); v.setMuted(i >= count);
}
async function powerOn(): Promise<void> {
  await ensureMaster();
  for (let i = 0; i < count; i++) await ensureVoice(i);
  masterMuted = false; masterGain!.gain.setTargetAtTime(masterVol, masterGain!.context.currentTime, 0.05);
  power.el.dataset.on = "1";
}
function powerOff(): void { masterMuted = true; if (masterGain) masterGain.gain.setTargetAtTime(0, masterGain.context.currentTime, 0.05); }
function masterLevel(): number {
  if (!masterAnalyser) return 0;
  const buf = new Uint8Array(masterAnalyser.fftSize); masterAnalyser.getByteTimeDomainData(buf);
  let peak = 0; for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
  return peak / 128;
}

// transport
const transport = panel("TRANSPORT · VOICES · MIX");
const trow = document.createElement("div");
trow.style.cssText = "display:flex;flex-wrap:wrap;gap:18px;align-items:center";
const power = powerButton(async (on) => { if (on) { await ensureAudio(); await powerOn(); } else { powerOff(); setTimeout(() => { if (power.el.dataset.on !== "1") suspendAudio(); }, 240); } });
const voicesSeg = segmented<string>({
  label: "VOICES", value: "1",
  options: ["1", "2", "3", "4"].map((n) => ({ value: n, label: n })),
  onChange: (n) => setCount(parseInt(n, 10)),
});
const masterVolCtl = slider({ label: "MASTER", min: 0, max: 1, step: 0.01, value: masterVol, format: pct, onInput: (v) => { masterVol = v; if (masterGain && !masterMuted) masterGain.gain.setTargetAtTime(v, masterGain.context.currentTime, 0.05); } });
masterVolCtl.el.style.cssText += ";flex:1 1 150px;min-width:140px";
const meterWrap = document.createElement("div");
meterWrap.style.cssText = "flex:1 1 150px;min-width:130px;display:flex;align-items:center;gap:10px";
meterWrap.innerHTML = `<span style="font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4)">OUT</span>`;
const meterBar = document.createElement("div");
meterBar.style.cssText = "flex:1;height:4px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden";
const meterFill = document.createElement("div");
meterFill.style.cssText = "height:100%;width:0%;background:var(--fg);transition:width .06s linear";
meterBar.append(meterFill); meterWrap.append(meterBar);
trow.append(power.el, voicesSeg.el, masterVolCtl.el, meterWrap);
transport.body.append(trow);

// the field
const fieldPanel = panel("THE FIELD · SWEEP TO PLAY · X PITCH · Y VOLUME");

// focus tabs — which voice the field + controls + autopilot edit
const tabs = document.createElement("div");
tabs.style.cssText = "display:flex;gap:8px;margin-bottom:12px";
const tabBtns: HTMLButtonElement[] = [];
for (let i = 0; i < NVOICES; i++) {
  const b = document.createElement("button"); b.type = "button"; b.className = "inst-link";
  b.textContent = `VOICE ${LABELS[i]}`;
  b.addEventListener("click", () => setFocus(i));
  tabs.append(b); tabBtns.push(b);
}
fieldPanel.body.append(tabs);
const field = document.createElement("div");
field.tabIndex = 0;
field.setAttribute("role", "application");
field.setAttribute("aria-label", "Theremin field — drag to play; arrow keys move pitch and volume, space sustains");
field.style.cssText =
  "position:relative;width:100%;height:clamp(280px,46vh,460px);border:1px solid rgba(var(--lw),0.2);border-radius:8px;" +
  "background:repeating-linear-gradient(90deg,transparent,transparent calc(8.333% - 1px),rgba(var(--lw),0.07) 8.333%)," +
  "linear-gradient(180deg,rgba(var(--lw),0.10),rgba(var(--lw),0.01));cursor:crosshair;overflow:hidden;touch-action:none;outline:none";
const vline = document.createElement("div");
vline.style.cssText = "position:absolute;top:0;bottom:0;width:1px;background:var(--fg);left:50%;opacity:0;transition:opacity .15s";
const hline = document.createElement("div");
hline.style.cssText = "position:absolute;left:0;right:0;height:1px;background:var(--fg);top:50%;opacity:0;transition:opacity .15s";
const readout = document.createElement("div");
readout.style.cssText = `position:absolute;left:14px;top:12px;font-family:${MONO};font-size:12px;letter-spacing:0.08em;color:var(--fg);pointer-events:none`;
readout.textContent = "—";
const hint = document.createElement("div");
hint.style.cssText = `position:absolute;right:14px;bottom:12px;font-family:${MONO};font-size:10px;letter-spacing:0.16em;color:var(--fg4);pointer-events:none`;
hint.textContent = "DRAG TO PLAY";
field.append(vline, hline, readout, hint);
fieldPanel.body.append(field);

function unmuteMaster(): void {
  if (masterMuted) { masterMuted = false; if (masterGain) masterGain.gain.setTargetAtTime(masterVol, masterGain.context.currentTime, 0.05); power.el.dataset.on = "1"; }
}

let activePointer: number | null = null;
// drive the FOCUSED voice's audio + (when focused) the crosshair, from field coords
function updateVisual(x: number, vol: number): void {
  if (!reduceMotion()) { vline.style.left = `${x * 100}%`; hline.style.top = `${(1 - vol) * 100}%`; }
  readout.textContent = `${LABELS[focus]} · ${noteName(12 * Math.log2(voices[focus].freqReadout / 440) + 69)}  ·  ${voices[focus].freqReadout.toFixed(1)} Hz  ·  VOL ${Math.round(vol * 100)}%`;
}
function applyVoiceXY(i: number, x: number, vol: number): void {
  voices[i].setPitchNorm(x); voices[i].setVolNorm(vol);
  if (i === focus) updateVisual(x, vol);
}
function update(clientX: number, clientY: number) {
  const r = field.getBoundingClientRect();
  const x = clamp((clientX - r.left) / r.width, 0, 1);
  const vol = 1 - clamp((clientY - r.top) / r.height, 0, 1);
  applyVoiceXY(focus, x, vol);
}
function showCrosshair(on: boolean) {
  vline.style.opacity = on ? "1" : "0"; hline.style.opacity = on ? "1" : "0";
  if (on) hint.style.opacity = "0";
}
async function begin(clientX: number, clientY: number) {
  if (drv[focus].mode !== "off") stopAuto(focus); // manual takes over the focused voice
  await ensureVoice(focus); unmuteMaster(); voices[focus].setMuted(false);
  showCrosshair(true); voices[focus].gate(true); update(clientX, clientY);
}
function end() {
  voices[focus].gate(false); activePointer = null;
  if (drv[focus].mode === "off") showCrosshair(false);
}
field.addEventListener("pointerdown", async (e) => {
  if (activePointer !== null) return;
  activePointer = e.pointerId; field.setPointerCapture(e.pointerId);
  e.preventDefault();
  await begin(e.clientX, e.clientY);
});
field.addEventListener("pointermove", (e) => { if (e.pointerId === activePointer) update(e.clientX, e.clientY); });
field.addEventListener("pointerup", (e) => { if (e.pointerId === activePointer) end(); });
field.addEventListener("pointercancel", (e) => { if (e.pointerId === activePointer) end(); });
// keyboard accessibility
let kx = 0.5, ky = 0.5, kHeld = false;
field.addEventListener("keydown", async (e) => {
  const step = e.shiftKey ? 0.02 : 0.06;
  if (e.key === "ArrowLeft") kx = clamp(kx - step, 0, 1);
  else if (e.key === "ArrowRight") kx = clamp(kx + step, 0, 1);
  else if (e.key === "ArrowUp") ky = clamp(ky + step, 0, 1);
  else if (e.key === "ArrowDown") ky = clamp(ky - step, 0, 1);
  else if (e.key === " ") { kHeld = !kHeld; if (kHeld) await begin(0, 0); else { end(); return; } }
  else return;
  e.preventDefault();
  if (drv[focus].mode !== "off") stopAuto(focus);
  await ensureVoice(focus); unmuteMaster(); voices[focus].setMuted(false);
  if (!kHeld) { kHeld = true; voices[focus].gate(true); showCrosshair(true); }
  const r = field.getBoundingClientRect();
  update(r.left + kx * r.width, r.top + (1 - ky) * r.height);
});

// registry of slider controls so the autopilot / focus-switch can sync the UI
const controls: Partial<Record<keyof ThereminParams, { set(v: number): void }>> = {};

// per-voice voice/modulation controls (edit the FOCUSED voice)
const ctrlPanel = panel("VOICE · MODULATION · SPACE  ·  EDITS FOCUSED VOICE");
const grid = controlGrid(150);
const waveSeg = segmented<OscillatorType>({
  label: "WAVE", value: DEFAULTS.wave,
  options: [{ value: "sine", label: "SINE" }, { value: "triangle", label: "TRI" }, { value: "sawtooth", label: "SAW" }, { value: "square", label: "SQR" }],
  onChange: (v) => voices[focus].set("wave", v),
});
grid.append(waveSeg.el);
const scaleSeg = segmented<Scale>({
  label: "SCALE SNAP", value: DEFAULTS.scale,
  options: [{ value: "off", label: "OFF" }, { value: "chromatic", label: "CHR" }, { value: "major", label: "MAJ" }, { value: "minorPent", label: "PENT" }],
  onChange: (v) => voices[focus].set("scale", v),
});
grid.append(scaleSeg.el);
addSlider(grid, "range", "RANGE", 1, 5, 1, DEFAULTS.range, (v) => `${v}oct`);
addSlider(grid, "glide", "GLIDE", 0, 0.4, 0.005, DEFAULTS.glide, (v) => `${(v * 1000).toFixed(0)}ms`);
addSlider(grid, "vibRate", "VIB RATE", 0.1, 12, 0.1, DEFAULTS.vibRate, (v) => `${v.toFixed(1)}Hz`);
addSlider(grid, "vibDepth", "VIB DEPTH", 0, 1, 0.01, DEFAULTS.vibDepth, pct);
addSlider(grid, "brightness", "BRIGHTNESS", 0, 1, 0.01, DEFAULTS.brightness, pct);
addSlider(grid, "reverb", "REVERB", 0, 1, 0.01, DEFAULTS.reverb, pct);
ctrlPanel.body.append(grid);

// ---- autopilot — presets that play a voice on its own ----------------------
type AutoMode = "off" | "healing" | "drift" | "chaos" | "whale" | "ascend" | "penta";
const HEALING_HZ = [136.1, 174, 210.42, 285, 396, 417, 432, 528, 639, 741, 852, 963];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = () => Math.random();

// set a param on voice i; if it's the focused voice, mirror it into the UI controls
function setP<K extends keyof ThereminParams>(i: number, key: K, val: ThereminParams[K]): void {
  voices[i].set(key, val);
  if (i !== focus) return;
  if (key === "wave") waveSeg.set(val as OscillatorType);
  else if (key === "scale") scaleSeg.set(val as Scale);
  else controls[key]?.set(val as number);
}

interface AutoCfg { ease: number; volEase: number; holdMin: number; holdMax: number; breath: number; setup(i: number): void; pick(prevX: number): { x: number; vol: number }; }
const MODES: Record<Exclude<AutoMode, "off">, AutoCfg> = {
  healing: {
    ease: 0.06, volEase: 0.05, holdMin: 2600, holdMax: 4600, breath: 0.08,
    setup(i) { setP(i, "wave", "sine"); setP(i, "scale", "off"); setP(i, "glide", 0.12); setP(i, "reverb", 0.55); setP(i, "brightness", 0.55); setP(i, "vibRate", 4.5); setP(i, "vibDepth", 0.3); setP(i, "range", 3); },
    pick() { const hz = HEALING_HZ[Math.floor(rnd() * HEALING_HZ.length)]; return { x: voices[focus].hzToNorm(hz), vol: 0.55 + rnd() * 0.3 }; },
  },
  drift: {
    ease: 0.04, volEase: 0.04, holdMin: 3000, holdMax: 6000, breath: 0.1,
    setup(i) { setP(i, "wave", "triangle"); setP(i, "scale", "off"); setP(i, "glide", 0.16); setP(i, "reverb", 0.5); setP(i, "brightness", 0.5); setP(i, "vibDepth", 0.2); setP(i, "vibRate", 4); setP(i, "range", 3); },
    pick(prev) { return { x: clamp(prev + (rnd() - 0.5) * 0.5, 0, 1), vol: 0.4 + rnd() * 0.4 }; },
  },
  chaos: {
    ease: 0.5, volEase: 0.6, holdMin: 180, holdMax: 600, breath: 0,
    setup(i) { setP(i, "wave", "sawtooth"); setP(i, "scale", "off"); setP(i, "glide", 0.02); setP(i, "reverb", 0.3); setP(i, "brightness", 0.7); setP(i, "vibRate", 7); setP(i, "vibDepth", 0.4); setP(i, "range", 4); },
    pick() { return { x: rnd(), vol: 0.2 + rnd() * 0.8 }; },
  },
  whale: {
    ease: 0.025, volEase: 0.03, holdMin: 4000, holdMax: 8000, breath: 0.12,
    setup(i) { setP(i, "wave", "sine"); setP(i, "scale", "off"); setP(i, "glide", 0.28); setP(i, "reverb", 0.6); setP(i, "brightness", 0.4); setP(i, "vibRate", 3); setP(i, "vibDepth", 0.55); setP(i, "range", 2); },
    pick() { return { x: rnd() * 0.45, vol: 0.4 + rnd() * 0.4 }; },
  },
  ascend: {
    ease: 0.05, volEase: 0.05, holdMin: 1100, holdMax: 2100, breath: 0.06,
    setup(i) { setP(i, "wave", "triangle"); setP(i, "scale", "off"); setP(i, "glide", 0.1); setP(i, "reverb", 0.5); setP(i, "brightness", 0.55); setP(i, "vibDepth", 0.25); setP(i, "vibRate", 4); setP(i, "range", 4); },
    pick(prev) { let x = prev + 0.13; if (x > 1) x -= 1; return { x, vol: 0.6 + rnd() * 0.2 }; },
  },
  penta: {
    ease: 0.22, volEase: 0.3, holdMin: 340, holdMax: 820, breath: 0.04,
    setup(i) { setP(i, "wave", "triangle"); setP(i, "scale", "minorPent"); setP(i, "glide", 0.06); setP(i, "reverb", 0.4); setP(i, "brightness", 0.6); setP(i, "vibDepth", 0.3); setP(i, "vibRate", 5); setP(i, "range", 3); },
    pick() { return { x: rnd(), vol: 0.6 + rnd() * 0.3 }; },
  },
};

interface Drv { mode: AutoMode; cur: { x: number; vol: number }; target: { x: number; vol: number }; nextChange: number; cfg: AutoCfg | null; }
const drv: Drv[] = Array.from({ length: NVOICES }, () => ({ mode: "off" as AutoMode, cur: { x: 0.5, vol: 0.5 }, target: { x: 0.5, vol: 0.5 }, nextChange: 0, cfg: null }));
let autoSpeed = 0.5;
let autoTimer = 0;

function ensureTimer(): void { if (!autoTimer) autoTimer = window.setInterval(autoTickAll, 70); }
function maybeStopTimer(): void { if (autoTimer && drv.every((d) => d.mode === "off")) { clearInterval(autoTimer); autoTimer = 0; } }
function autoTickAll(): void {
  const now = performance.now();
  for (let i = 0; i < NVOICES; i++) {
    const d = drv[i];
    if (!d.cfg || !voices[i].ready) continue;
    if (now >= d.nextChange) {
      const t = d.cfg.pick(d.target.x); d.target.x = t.x; d.target.vol = t.vol;
      d.nextChange = now + lerp(d.cfg.holdMin, d.cfg.holdMax, rnd()) / (0.4 + autoSpeed * 1.8);
    }
    const ease = clamp(d.cfg.ease * (0.6 + autoSpeed * 1.1), 0, 0.9);
    d.cur.x += (d.target.x - d.cur.x) * ease;
    d.cur.vol += (d.target.vol - d.cur.vol) * Math.min(0.9, d.cfg.volEase * (0.6 + autoSpeed));
    const breath = d.cfg.breath ? d.cfg.breath * Math.sin(now * 0.0009) : 0;
    applyVoiceXY(i, clamp(d.cur.x, 0, 1), clamp(d.cur.vol + breath, 0, 1));
  }
}
async function beginAuto(i: number): Promise<void> {
  await ensureVoice(i); unmuteMaster(); voices[i].setMuted(false); voices[i].gate(true);
}
function startAuto(i: number, mode: Exclude<AutoMode, "off">): void {
  drv[i].mode = mode; drv[i].cfg = MODES[mode]; drv[i].cfg.setup(i);
  drv[i].target = { ...drv[i].cur }; drv[i].nextChange = 0;
  ensureTimer();
  if (i === focus) { showCrosshair(true); autoSeg.set(mode); }
  refreshMix();
}
function stopAuto(i: number): void {
  drv[i].mode = "off"; drv[i].cfg = null; voices[i].gate(false);
  if (i === focus) { showCrosshair(false); autoSeg.set("off"); }
  maybeStopTimer(); refreshMix();
}

const autoPanel = panel("AUTOPILOT · LET A VOICE PLAY ITSELF");
const autoRow = document.createElement("div"); autoRow.style.cssText = "display:flex;flex-wrap:wrap;gap:18px;align-items:center";
const autoSeg = segmented<AutoMode>({
  label: "MODE · FOCUSED VOICE", value: "off",
  options: [
    { value: "off", label: "OFF" }, { value: "healing", label: "HEALING" }, { value: "drift", label: "DRIFT" },
    { value: "chaos", label: "CHAOS" }, { value: "whale", label: "WHALE" }, { value: "ascend", label: "ASCEND" }, { value: "penta", label: "PENTA" },
  ],
  onChange: async (m) => { if (m === "off") { stopAuto(focus); return; } await beginAuto(focus); startAuto(focus, m); },
});
const speedCtl = slider({ label: "SPEED", min: 0, max: 1, step: 0.01, value: autoSpeed, format: pct, onInput: (v) => { autoSpeed = v; } });
speedCtl.el.style.cssText += ";flex:1 1 180px;min-width:160px";
autoRow.append(autoSeg.el, speedCtl.el);
const autoHint = document.createElement("p");
autoHint.style.cssText = `margin:14px 0 0;font-family:${MONO};font-size:10px;letter-spacing:0.06em;color:var(--fg4);line-height:1.6`;
autoHint.textContent = "Each voice keeps its own autopilot — focus VOICE B, set it DRIFTING, focus C, set it to WHALE, and play VOICE A on the field by hand. HEALING bounces solfeggio & earth tones · DRIFT wanders · CHAOS jumps · WHALE swoops · ASCEND climbs · PENTA hops a scale.";
autoPanel.body.append(autoRow, autoHint);

// ---- mixer — per-voice level + pan + at-a-glance autopilot ------------------
const mixPanel = panel("MIX · STACK UP TO FOUR VOICES");
interface MixRow { row: HTMLElement; modeLabel: HTMLElement; lvl: { set(v: number): void }; pan: { set(v: number): void }; }
const mixRows: MixRow[] = [];
for (let i = 0; i < NVOICES; i++) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;padding:12px 0;border-top:1px solid rgba(var(--lw),0.08)";
  const head = document.createElement("div"); head.style.cssText = "display:flex;align-items:center;gap:10px;flex:0 0 160px";
  const tag = document.createElement("span"); tag.style.cssText = `font-family:${MONO};font-size:12px;letter-spacing:0.14em;color:var(--fg)`; tag.textContent = `VOICE ${LABELS[i]}`;
  const modeLabel = document.createElement("span"); modeLabel.style.cssText = `font-family:${MONO};font-size:10px;letter-spacing:0.1em;color:var(--fg4)`; modeLabel.textContent = "MANUAL";
  head.append(tag, modeLabel);
  const lvl = slider({ label: "LEVEL", min: 0, max: 1, step: 0.01, value: levels[i], format: pct, onInput: (v) => { levels[i] = v; voices[i].set("volume", v); } });
  lvl.el.style.cssText += ";flex:1 1 150px;min-width:130px";
  const pan = slider({ label: "PAN", min: -1, max: 1, step: 0.02, value: pans[i], format: (v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`, onInput: (v) => { pans[i] = v; voices[i].setPan(v); } });
  pan.el.style.cssText += ";flex:1 1 130px;min-width:120px";
  row.append(head, lvl.el, pan.el);
  mixPanel.body.append(row);
  mixRows.push({ row, modeLabel, lvl, pan });
}
function refreshMix(): void {
  for (let i = 0; i < NVOICES; i++) {
    mixRows[i].row.style.display = i < count ? "" : "none";
    mixRows[i].modeLabel.textContent = drv[i].mode === "off" ? "MANUAL" : drv[i].mode.toUpperCase();
    mixRows[i].lvl.set(levels[i]); mixRows[i].pan.set(pans[i]);
  }
}

// ---- focus / count ---------------------------------------------------------
function refreshTabs(): void {
  for (let i = 0; i < NVOICES; i++) {
    tabBtns[i].style.display = i < count ? "" : "none";
    const on = i === focus;
    tabBtns[i].style.background = on ? "var(--fg)" : "transparent";
    tabBtns[i].style.color = on ? "var(--bg)" : "var(--fg)";
  }
}
function refreshControls(): void {
  const p = voices[focus].params;
  waveSeg.set(p.wave); scaleSeg.set(p.scale);
  controls.range?.set(p.range); controls.glide?.set(p.glide); controls.vibRate?.set(p.vibRate);
  controls.vibDepth?.set(p.vibDepth); controls.brightness?.set(p.brightness); controls.reverb?.set(p.reverb);
}
function setFocus(i: number): void {
  focus = clamp(i, 0, count - 1);
  refreshTabs(); refreshControls();
  autoSeg.set(drv[focus].mode);
  if (drv[focus].mode !== "off") { showCrosshair(true); updateVisual(drv[focus].cur.x, drv[focus].cur.vol); }
  else { showCrosshair(false); readout.textContent = `VOICE ${LABELS[focus]} · —`; }
}
async function setCount(n: number): Promise<void> {
  count = clamp(n, 1, NVOICES);
  for (let i = 0; i < NVOICES; i++) {
    if (i >= count) { if (drv[i].mode !== "off") stopAuto(i); if (voices[i].ready) voices[i].setMuted(true); }
    else if (masterGain && !masterMuted) await ensureVoice(i);
    else if (voices[i].ready) voices[i].setMuted(false);
  }
  if (focus >= count) setFocus(count - 1);
  refreshTabs(); refreshMix();
}

page.stage.append(transport.el, fieldPanel.el, autoPanel.el, mixPanel.el, ctrlPanel.el);
page.finalize();

setFocus(0); refreshTabs(); refreshMix();

function meter() {
  meterFill.style.width = `${Math.min(100, masterLevel() * 140).toFixed(0)}%`;
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

(window as Window & { __theremin?: unknown }).__theremin = {
  voices,
  start: () => powerOn(),
  level: () => masterLevel(),
  freq: () => voices[focus].freqReadout,
  setCount: (n: number) => setCount(n),
  setFocus: (i: number) => setFocus(i),
  play: (x: number, y: number) => { unmuteMaster(); voices[focus].setMuted(false); voices[focus].gate(true); voices[focus].setPitchNorm(x); voices[focus].setVolNorm(y); },
  stop: () => voices[focus].gate(false),
  setAuto: async (m: AutoMode) => { if (m === "off") { stopAuto(focus); return; } await beginAuto(focus); startAuto(focus, m); },
};

// ---- helpers ---------------------------------------------------------------

function pct(v: number) { return `${Math.round(v * 100)}`; }
function addSlider(
  grid: HTMLElement, key: keyof ThereminParams, label: string,
  min: number, max: number, step: number, value: number, format: (v: number) => string,
) {
  const c = slider({ label, min, max, step, value, format, onInput: (v) => voices[focus].set(key, v as never) });
  controls[key] = c;
  grid.append(c.el);
}
}
