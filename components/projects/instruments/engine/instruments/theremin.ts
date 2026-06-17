// Theremin — a gesture instrument. There are no keys: a pointer (mouse, pen or
// finger) sweeping a field bends pitch on the X axis and volume on the Y axis, exactly
// like the two antennae of a real theremin. Under the hood it's two slightly detuned
// oscillators (for the heterodyne shimmer), a vibrato LFO, a brightness low-pass, a
// portamento glide so pitch slides continuously, and a reverb to give the tone air.
// Optional scale-snapping quantises the otherwise-continuous pitch to a key.

import {
  instrumentPage, panel, controlGrid, slider, segmented, powerButton,
  mtof, noteName, ensureAudio, MONO, reduceMotion,
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
  private analyser!: AnalyserNode;
  private started = false;
  private sounding = false;
  private curFreq = mtof(60);
  private targetVol = 0;

  /** Last resolved pitch, for the readout. */
  freqReadout = mtof(60);

  get ready(): boolean { return this.started; }

  async start(): Promise<void> {
    if (this.started) return;
    const ctx = await ensureAudio();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(ctx.destination);

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

// ---- page ------------------------------------------------------------------

const theremin = new Theremin();

const page = instrumentPage(root, {
  kicker: "THEREMIN · GESTURE INSTRUMENT",
  title: "Theremin.",
  standfirst:
    "No keys, no contact — pitch and volume are pulled out of the air. Power on, then sweep across the field: left-to-right bends pitch, bottom-to-top swells the volume. Add vibrato, brightness and reverb, or snap to a scale if your hand wants help.",
});

// transport
const transport = panel("TRANSPORT");
const trow = document.createElement("div");
trow.style.cssText = "display:flex;flex-wrap:wrap;gap:18px;align-items:center";
const power = powerButton(async (on) => { if (on) await theremin.start(); theremin.setMuted(!on); });
const meterWrap = document.createElement("div");
meterWrap.style.cssText = "flex:1 1 160px;min-width:140px;display:flex;align-items:center;gap:10px";
meterWrap.innerHTML = `<span style="font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4)">OUT</span>`;
const meterBar = document.createElement("div");
meterBar.style.cssText = "flex:1;height:4px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden";
const meterFill = document.createElement("div");
meterFill.style.cssText = "height:100%;width:0%;background:var(--fg);transition:width .06s linear";
meterBar.append(meterFill); meterWrap.append(meterBar);
trow.append(power.el, meterWrap);
transport.body.append(trow);

// the field
const fieldPanel = panel("THE FIELD · SWEEP TO PLAY · X PITCH · Y VOLUME");
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

let activePointer: number | null = null;
function update(clientX: number, clientY: number) {
  const r = field.getBoundingClientRect();
  const x = clamp((clientX - r.left) / r.width, 0, 1);
  const yTop = clamp((clientY - r.top) / r.height, 0, 1);
  const vol = 1 - yTop;
  theremin.setPitchNorm(x);
  theremin.setVolNorm(vol);
  if (!reduceMotion()) { vline.style.left = `${x * 100}%`; hline.style.top = `${yTop * 100}%`; }
  readout.textContent = `${noteName(12 * Math.log2(theremin.freqReadout / 440) + 69)}  ·  ${theremin.freqReadout.toFixed(1)} Hz  ·  VOL ${Math.round(vol * 100)}%`;
}
async function begin(clientX: number, clientY: number) {
  if (!theremin.ready) { await theremin.start(); power.el.dataset.on = "1"; }
  vline.style.opacity = "1"; hline.style.opacity = "1"; hint.style.opacity = "0";
  theremin.gate(true); update(clientX, clientY);
}
function end() {
  theremin.gate(false); activePointer = null;
  vline.style.opacity = "0"; hline.style.opacity = "0";
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
  if (!theremin.ready) { await theremin.start(); power.el.dataset.on = "1"; }
  if (!kHeld) { kHeld = true; theremin.gate(true); vline.style.opacity = "1"; hline.style.opacity = "1"; hint.style.opacity = "0"; }
  const r = field.getBoundingClientRect();
  update(r.left + kx * r.width, r.top + (1 - ky) * r.height);
});

// controls
const ctrlPanel = panel("VOICE · MODULATION · SPACE");
const grid = controlGrid(150);
const waveSeg = segmented<OscillatorType>({
  label: "WAVE", value: DEFAULTS.wave,
  options: [{ value: "sine", label: "SINE" }, { value: "triangle", label: "TRI" }, { value: "sawtooth", label: "SAW" }, { value: "square", label: "SQR" }],
  onChange: (v) => theremin.set("wave", v),
});
grid.append(waveSeg.el);
const scaleSeg = segmented<Scale>({
  label: "SCALE SNAP", value: DEFAULTS.scale,
  options: [{ value: "off", label: "OFF" }, { value: "chromatic", label: "CHR" }, { value: "major", label: "MAJ" }, { value: "minorPent", label: "PENT" }],
  onChange: (v) => theremin.set("scale", v),
});
grid.append(scaleSeg.el);
addSlider(grid, "range", "RANGE", 1, 5, 1, DEFAULTS.range, (v) => `${v}oct`);
addSlider(grid, "glide", "GLIDE", 0, 0.4, 0.005, DEFAULTS.glide, (v) => `${(v * 1000).toFixed(0)}ms`);
addSlider(grid, "vibRate", "VIB RATE", 0.1, 12, 0.1, DEFAULTS.vibRate, (v) => `${v.toFixed(1)}Hz`);
addSlider(grid, "vibDepth", "VIB DEPTH", 0, 1, 0.01, DEFAULTS.vibDepth, pct);
addSlider(grid, "brightness", "BRIGHTNESS", 0, 1, 0.01, DEFAULTS.brightness, pct);
addSlider(grid, "reverb", "REVERB", 0, 1, 0.01, DEFAULTS.reverb, pct);
addSlider(grid, "volume", "VOLUME", 0, 1, 0.01, DEFAULTS.volume, pct);
ctrlPanel.body.append(grid);

page.stage.append(transport.el, fieldPanel.el, ctrlPanel.el);
page.finalize();

function meter() {
  meterFill.style.width = `${Math.min(100, theremin.level() * 140).toFixed(0)}%`;
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

(window as Window & { __theremin?: unknown }).__theremin = {
  engine: theremin,
  start: () => theremin.start(),
  play: (x: number, y: number) => { theremin.gate(true); theremin.setPitchNorm(x); theremin.setVolNorm(y); },
  stop: () => theremin.gate(false),
  level: () => theremin.level(),
};

// ---- helpers ---------------------------------------------------------------

function pct(v: number) { return `${Math.round(v * 100)}`; }
function addSlider(
  grid: HTMLElement, key: keyof ThereminParams, label: string,
  min: number, max: number, step: number, value: number, format: (v: number) => string,
) {
  const c = slider({ label, min, max, step, value, format, onInput: (v) => theremin.set(key, v as never) });
  grid.append(c.el);
}
}
