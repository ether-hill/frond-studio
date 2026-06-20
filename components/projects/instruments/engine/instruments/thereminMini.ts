// Theremin (mini) — a condensed, self-contained build for the homepage "featured
// instrument" teaser. It mirrors the full theremin's signal path (two slightly
// detuned oscillators for the heterodyne shimmer, a vibrato LFO, a brightness
// low-pass, a portamento glide and a reverb) and its autopilot presets, but in a
// compact frame: a clean control bar (power · voices · randomise), one playable
// field, and a live readout. Up to four voices stack into a breathing chord;
// Randomise re-rolls each voice's pattern and lets them play themselves. Kept
// separate from theremin.ts so the showcased full instrument is never touched.

import { mtof, noteName, ensureAudio, suspendAudio, MONO, reduceMotion } from "./shared";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rnd = () => Math.random();
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Scale = "off" | "major" | "minorPent";
const SCALES: Record<Exclude<Scale, "off">, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minorPent: [0, 3, 5, 7, 10],
};

interface VoiceParams {
  wave: OscillatorType;
  range: number;     // octaves spanned across the field
  vibRate: number;   // Hz
  vibDepth: number;  // 0..1
  glide: number;     // portamento time-constant (s)
  brightness: number;// 0..1 → lowpass cutoff
  reverb: number;    // 0..1
  scale: Scale;
}
const DEFAULTS: VoiceParams = {
  wave: "sine", range: 3, vibRate: 5, vibDepth: 0.3, glide: 0.12, brightness: 0.6, reverb: 0.5, scale: "off",
};

class MiniVoice {
  private ctx!: AudioContext;
  private p: VoiceParams = { ...DEFAULTS };
  private osc1!: OscillatorNode;
  private osc2!: OscillatorNode;
  private tone!: BiquadFilterNode;
  private vca!: GainNode;
  private reverbVol!: GainNode;
  private vibLfo!: OscillatorNode;
  private vibGain!: GainNode;
  private level!: GainNode;
  private panner!: StereoPannerNode;
  out!: AudioNode;
  private started = false;
  private sounding = false;
  private lowMidi = 48;
  private curFreq = mtof(60);
  private targetVol = 0;
  freqReadout = mtof(60);

  get ready(): boolean { return this.started; }

  async start(): Promise<void> {
    const ctx = await ensureAudio();
    if (this.started) return;
    this.ctx = ctx;

    this.panner = ctx.createStereoPanner();
    this.level = ctx.createGain(); this.level.gain.value = 1;
    this.level.connect(this.panner); this.out = this.panner;

    const dry = ctx.createGain(); dry.gain.value = 1; dry.connect(this.level);
    const conv = ctx.createConvolver(); conv.buffer = this.reverbIR(ctx, 2.6);
    const reverbSend = ctx.createGain();
    this.reverbVol = ctx.createGain(); this.reverbVol.gain.value = this.p.reverb;
    reverbSend.connect(conv); conv.connect(this.reverbVol); this.reverbVol.connect(this.level);

    this.vca = ctx.createGain(); this.vca.gain.value = 0;
    this.vca.connect(dry); this.vca.connect(reverbSend);

    this.tone = ctx.createBiquadFilter(); this.tone.type = "lowpass"; this.tone.Q.value = 0.7;
    this.tone.connect(this.vca);

    this.osc1 = ctx.createOscillator(); this.osc1.type = this.p.wave;
    this.osc2 = ctx.createOscillator(); this.osc2.type = this.p.wave; this.osc2.detune.value = 4;
    this.osc1.frequency.value = this.curFreq; this.osc2.frequency.value = this.curFreq;
    const oscMix = ctx.createGain(); oscMix.gain.value = 0.5;
    this.osc1.connect(oscMix); this.osc2.connect(oscMix); oscMix.connect(this.tone);

    this.vibLfo = ctx.createOscillator(); this.vibLfo.type = "sine"; this.vibLfo.frequency.value = this.p.vibRate;
    this.vibGain = ctx.createGain();
    this.vibLfo.connect(this.vibGain); this.vibGain.connect(this.osc1.detune); this.vibGain.connect(this.osc2.detune);

    this.osc1.start(); this.osc2.start(); this.vibLfo.start();
    this.started = true;
    this.applyAll();
  }

  connect(node: AudioNode): void { this.out.connect(node); }
  setPan(pan: number): void { if (this.started) this.panner.pan.setTargetAtTime(clamp(pan, -1, 1), this.ctx.currentTime, 0.05); }
  setLevel(g: number): void { if (this.started) this.level.gain.setTargetAtTime(clamp(g, 0, 1), this.ctx.currentTime, 0.05); }

  private reverbIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    return buf;
  }

  set<K extends keyof VoiceParams>(key: K, value: VoiceParams[K]): void {
    this.p[key] = value;
    if (!this.started) return;
    if (key === "wave") { this.osc1.type = this.p.wave; this.osc2.type = this.p.wave; }
    this.applyAll();
  }

  private applyAll(): void {
    const t = this.ctx.currentTime, p = this.p;
    this.vibLfo.frequency.setTargetAtTime(p.vibRate, t, 0.05);
    this.vibGain.gain.setTargetAtTime(p.vibDepth * 35, t, 0.05);
    this.tone.frequency.setTargetAtTime(400 * Math.pow(40, p.brightness), t, 0.05);
    this.reverbVol.gain.setTargetAtTime(p.reverb, t, 0.05);
  }

  hzToNorm(hz: number): number {
    const midi = 12 * Math.log2(hz / 440) + 69;
    return clamp((midi - this.lowMidi) / (this.p.range * 12), 0, 1);
  }

  private snap(midiFloat: number): number {
    const pcs = SCALES[this.p.scale as Exclude<Scale, "off">];
    const base = Math.floor(midiFloat / 12) * 12;
    let best = base, bestD = Infinity;
    for (let oct = -1; oct <= 1; oct++) for (const pc of pcs) {
      const cand = base + oct * 12 + pc, d = Math.abs(cand - midiFloat);
      if (d < bestD) { bestD = d; best = cand; }
    }
    return best;
  }

  setPitchNorm(x: number): void {
    if (!this.started) return;
    let midi = this.lowMidi + clamp(x, 0, 1) * this.p.range * 12;
    if (this.p.scale !== "off") midi = this.snap(midi);
    const f = mtof(midi);
    this.curFreq = f; this.freqReadout = f;
    const tc = Math.max(0.001, this.p.glide);
    this.osc1.frequency.setTargetAtTime(f, this.ctx.currentTime, tc);
    this.osc2.frequency.setTargetAtTime(f, this.ctx.currentTime, tc);
  }

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
    this.vca.gain.setTargetAtTime(Math.pow(this.targetVol, 1.6) * 0.9, this.ctx.currentTime, 0.03);
  }
}

// ---- autopilot presets — a voice plays itself --------------------------------

type AutoMode = "healing" | "drift" | "chaos" | "whale" | "ascend" | "penta";
const AUTO_MODES: AutoMode[] = ["healing", "drift", "chaos", "whale", "ascend", "penta"];
const HEALING_HZ = [136.1, 174, 210.42, 285, 396, 417, 432, 528, 639, 741, 852, 963];

interface AutoCfg {
  ease: number; volEase: number; holdMin: number; holdMax: number; breath: number;
  setup(v: MiniVoice): void;
  pick(v: MiniVoice, prevX: number): { x: number; vol: number };
}
const MODES: Record<AutoMode, AutoCfg> = {
  healing: {
    ease: 0.06, volEase: 0.05, holdMin: 2600, holdMax: 4600, breath: 0.08,
    setup(v) { v.set("wave", "sine"); v.set("scale", "off"); v.set("glide", 0.12); v.set("reverb", 0.55); v.set("brightness", 0.55); v.set("vibRate", 4.5); v.set("vibDepth", 0.3); v.set("range", 3); },
    pick(v) { return { x: v.hzToNorm(HEALING_HZ[Math.floor(rnd() * HEALING_HZ.length)]), vol: 0.55 + rnd() * 0.3 }; },
  },
  drift: {
    ease: 0.04, volEase: 0.04, holdMin: 3000, holdMax: 6000, breath: 0.1,
    setup(v) { v.set("wave", "triangle"); v.set("scale", "off"); v.set("glide", 0.16); v.set("reverb", 0.5); v.set("brightness", 0.5); v.set("vibDepth", 0.2); v.set("vibRate", 4); v.set("range", 3); },
    pick(_v, prev) { return { x: clamp(prev + (rnd() - 0.5) * 0.5, 0, 1), vol: 0.4 + rnd() * 0.4 }; },
  },
  chaos: {
    ease: 0.5, volEase: 0.6, holdMin: 180, holdMax: 600, breath: 0,
    setup(v) { v.set("wave", "sawtooth"); v.set("scale", "off"); v.set("glide", 0.02); v.set("reverb", 0.3); v.set("brightness", 0.7); v.set("vibRate", 7); v.set("vibDepth", 0.4); v.set("range", 4); },
    pick() { return { x: rnd(), vol: 0.2 + rnd() * 0.8 }; },
  },
  whale: {
    ease: 0.025, volEase: 0.03, holdMin: 4000, holdMax: 8000, breath: 0.12,
    setup(v) { v.set("wave", "sine"); v.set("scale", "off"); v.set("glide", 0.28); v.set("reverb", 0.6); v.set("brightness", 0.4); v.set("vibRate", 3); v.set("vibDepth", 0.55); v.set("range", 2); },
    pick() { return { x: rnd() * 0.45, vol: 0.4 + rnd() * 0.4 }; },
  },
  ascend: {
    ease: 0.05, volEase: 0.05, holdMin: 1100, holdMax: 2100, breath: 0.06,
    setup(v) { v.set("wave", "triangle"); v.set("scale", "off"); v.set("glide", 0.1); v.set("reverb", 0.5); v.set("brightness", 0.55); v.set("vibDepth", 0.25); v.set("vibRate", 4); v.set("range", 4); },
    pick(_v, prev) { let x = prev + 0.13; if (x > 1) x -= 1; return { x, vol: 0.6 + rnd() * 0.2 }; },
  },
  penta: {
    ease: 0.22, volEase: 0.3, holdMin: 340, holdMax: 820, breath: 0.04,
    setup(v) { v.set("wave", "triangle"); v.set("scale", "minorPent"); v.set("glide", 0.06); v.set("reverb", 0.4); v.set("brightness", 0.6); v.set("vibDepth", 0.3); v.set("vibRate", 5); v.set("range", 3); },
    pick() { return { x: rnd(), vol: 0.6 + rnd() * 0.3 }; },
  },
};

// ---- one-time CSS for the mini control bar (scoped, tm- prefix) --------------

let cssDone = false;
function injectMiniCss(): void {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
.tm-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tm-btn{display:inline-flex;align-items:center;gap:9px;appearance:none;cursor:pointer;background:transparent;color:var(--fg);border:1px solid rgba(var(--lw),0.26);border-radius:999px;padding:10px 18px;font-family:${MONO};font-size:11px;letter-spacing:0.12em;transition:background .18s,border-color .18s,color .18s}
.tm-btn:hover{border-color:rgba(var(--lw),0.55)}
.tm-btn:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.tm-power[data-on="1"]{background:rgba(var(--lw),0.10);border-color:rgba(var(--lw),0.5)}
.tm-dot{width:8px;height:8px;border-radius:50%;background:var(--fg4);transition:background .2s}
.tm-power[data-on="1"] .tm-dot{background:var(--fg);animation:tmPulse 1.6s ease-in-out infinite}
@keyframes tmPulse{0%,100%{opacity:1}50%{opacity:.3}}
.tm-seg{display:inline-flex;border:1px solid rgba(var(--lw),0.26);border-radius:999px;overflow:hidden}
.tm-seg-label{font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4);align-self:center;margin-right:2px}
.tm-seg button{appearance:none;background:transparent;color:var(--fg3);border:none;border-left:1px solid rgba(var(--lw),0.16);padding:10px 14px;font-family:${MONO};font-size:11px;letter-spacing:0.04em;cursor:pointer;transition:background .15s,color .15s}
.tm-seg button:first-child{border-left:none}
.tm-seg button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.tm-seg button:not([aria-pressed="true"]):hover{color:var(--fg)}
.tm-seg button:focus-visible{outline:2px solid var(--fg);outline-offset:-2px}
.tm-randomise:active{transform:translateY(1px)}
@media (prefers-reduced-motion: reduce){.tm-power[data-on="1"] .tm-dot{animation:none}}
`;
  document.head.appendChild(s);
}

// ---- mount -------------------------------------------------------------------

const NVOICES = 4;
const PANS = [0, -0.55, 0.55, -0.25];

/**
 * Mount the condensed theremin into a host element: a control bar (power, voices
 * 1–4, randomise), one playable field (X = pitch, Y = volume) and a live
 * readout. Power-on starts a gentle drift; add voices to thicken the chord, hit
 * Randomise to re-roll every voice's pattern. Returns a disposer that silences
 * and tears down the audio.
 */
export function mountMini(root: HTMLElement): () => void {
  injectMiniCss();

  const voices = Array.from({ length: NVOICES }, () => new MiniVoice());
  let master: GainNode | null = null;
  let powered = false;
  let count = 1;
  const FOCUS = 0; // the field always plays voice A

  // per-voice autopilot driver
  interface Drv { mode: AutoMode | null; cur: { x: number; vol: number }; target: { x: number; vol: number }; nextChange: number; }
  const drv: Drv[] = Array.from({ length: NVOICES }, () => ({ mode: null, cur: { x: 0.5, vol: 0.5 }, target: { x: 0.5, vol: 0.5 }, nextChange: 0 }));
  let timer = 0;

  async function ensureChain(): Promise<void> {
    if (master) return;
    const ctx = await ensureAudio();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
  }
  async function ensureVoice(i: number): Promise<void> {
    await ensureChain();
    const v = voices[i];
    if (!v.ready) { await v.start(); v.connect(master!); v.setPan(PANS[i]); }
  }
  function setMaster(g: number): void {
    if (master) master.gain.setTargetAtTime(g, master.context.currentTime, 0.05);
  }

  function ensureTimer(): void { if (!timer) timer = window.setInterval(tick, 70); }
  function maybeStopTimer(): void { if (timer && drv.every((d) => d.mode === null)) { clearInterval(timer); timer = 0; } }
  function tick(): void {
    const now = performance.now();
    for (let i = 0; i < NVOICES; i++) {
      const d = drv[i];
      if (!d.mode || !voices[i].ready) continue;
      const cfg = MODES[d.mode];
      if (now >= d.nextChange) { const t = cfg.pick(voices[i], d.target.x); d.target = t; d.nextChange = now + lerp(cfg.holdMin, cfg.holdMax, rnd()); }
      d.cur.x += (d.target.x - d.cur.x) * cfg.ease;
      d.cur.vol += (d.target.vol - d.cur.vol) * Math.min(0.9, cfg.volEase);
      const breath = cfg.breath ? cfg.breath * Math.sin(now * 0.0009) : 0;
      const x = clamp(d.cur.x, 0, 1), vol = clamp(d.cur.vol + breath, 0, 1);
      voices[i].setPitchNorm(x); voices[i].setVolNorm(vol);
      if (i === FOCUS) paint(x, vol);
    }
  }

  async function startAuto(i: number, mode: AutoMode): Promise<void> {
    await ensureVoice(i);
    MODES[mode].setup(voices[i]);
    drv[i].mode = mode; drv[i].target = { ...drv[i].cur }; drv[i].nextChange = 0;
    voices[i].gate(true);
    if (i === FOCUS) showCrosshair(true);
    ensureTimer();
  }
  function stopAuto(i: number): void {
    drv[i].mode = null; voices[i].gate(false);
    if (i === FOCUS) showCrosshair(false);
    maybeStopTimer();
  }

  // --- DOM ---
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:16px";

  const bar = document.createElement("div");
  bar.className = "tm-bar";

  // power
  const power = document.createElement("button");
  power.type = "button"; power.className = "tm-btn tm-power"; power.dataset.on = "0";
  power.setAttribute("aria-pressed", "false");
  const renderPower = () => {
    power.innerHTML = `<span class="tm-dot"></span>${powered ? "PLAYING" : "POWER ON"}`;
    power.dataset.on = powered ? "1" : "0";
    power.setAttribute("aria-pressed", String(powered));
  };
  renderPower();
  let busy = false;
  power.addEventListener("click", async () => {
    if (busy) return; busy = true;
    try { if (powered) await powerOff(); else await powerOn(); }
    finally { busy = false; }
  });

  // voices segmented
  const seg = document.createElement("div");
  seg.className = "tm-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Voices");
  const segLabel = document.createElement("span"); segLabel.className = "tm-seg-label"; segLabel.textContent = "VOICES";
  const segBtns: HTMLButtonElement[] = [];
  for (let n = 1; n <= NVOICES; n++) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = String(n);
    b.setAttribute("aria-pressed", n === count ? "true" : "false");
    b.addEventListener("click", () => setCount(n));
    seg.append(b); segBtns.push(b);
  }
  function renderSeg(): void { segBtns.forEach((b, i) => b.setAttribute("aria-pressed", i + 1 === count ? "true" : "false")); }

  // randomise
  const random = document.createElement("button");
  random.type = "button"; random.className = "tm-btn tm-randomise";
  random.innerHTML = "✦ RANDOMISE";
  random.addEventListener("click", () => randomise());

  // readout
  const readout = document.createElement("div");
  readout.style.cssText = `flex:1 1 auto;text-align:right;min-width:160px;font-family:${MONO};font-size:12px;letter-spacing:0.08em;color:var(--fg3);font-variant-numeric:tabular-nums`;
  readout.textContent = "POWER ON OR HIT RANDOMISE";

  bar.append(power, segLabel, seg, random, readout);

  // the field
  const field = document.createElement("div");
  field.tabIndex = 0; field.setAttribute("role", "application");
  field.setAttribute("aria-label", "Theremin field — drag to play voice A; arrow keys move pitch and volume, space sustains");
  field.style.cssText =
    "position:relative;width:100%;height:clamp(220px,32vh,360px);border:1px solid rgba(var(--lw),0.2);border-radius:8px;" +
    "background:repeating-linear-gradient(90deg,transparent,transparent calc(8.333% - 1px),rgba(var(--lw),0.07) 8.333%)," +
    "linear-gradient(180deg,rgba(var(--lw),0.10),rgba(var(--lw),0.01));cursor:crosshair;overflow:hidden;touch-action:none;outline:none";
  const vline = document.createElement("div");
  vline.style.cssText = "position:absolute;top:0;bottom:0;width:1px;background:var(--fg);left:50%;opacity:0;transition:opacity .15s";
  const hline = document.createElement("div");
  hline.style.cssText = "position:absolute;left:0;right:0;height:1px;background:var(--fg);top:50%;opacity:0;transition:opacity .15s";
  const hint = document.createElement("div");
  hint.style.cssText = `position:absolute;right:14px;bottom:12px;font-family:${MONO};font-size:10px;letter-spacing:0.16em;color:var(--fg4);pointer-events:none`;
  hint.textContent = "X PITCH · Y VOLUME";
  field.append(vline, hline, hint);

  function showCrosshair(on: boolean): void {
    if (reduceMotion()) return;
    vline.style.opacity = on ? "1" : "0"; hline.style.opacity = on ? "1" : "0";
  }
  function paint(x: number, vol: number): void {
    if (!reduceMotion()) { vline.style.left = `${x * 100}%`; hline.style.top = `${(1 - vol) * 100}%`; }
    const v = voices[FOCUS];
    readout.textContent = `${noteName(12 * Math.log2(v.freqReadout / 440) + 69)} · ${v.freqReadout.toFixed(1)} Hz · VOL ${Math.round(vol * 100)}%`;
  }

  // --- power / count / randomise ---
  async function powerOn(): Promise<void> {
    await ensureChain();
    powered = true; renderPower(); setMaster(0.9);
    // bring the active voices to life with autopilot
    await startAuto(FOCUS, "drift");
    for (let i = 1; i < count; i++) await startAuto(i, AUTO_MODES[Math.floor(rnd() * AUTO_MODES.length)]);
  }
  async function powerOff(): Promise<void> {
    powered = false; renderPower(); setMaster(0);
    for (let i = 0; i < NVOICES; i++) stopAuto(i);
    readout.textContent = "POWER ON OR HIT RANDOMISE";
    setTimeout(() => { if (!powered) suspendAudio(); }, 240);
  }
  async function setCount(n: number): Promise<void> {
    count = clamp(n, 1, NVOICES); renderSeg();
    if (!powered) return;
    for (let i = 0; i < NVOICES; i++) {
      if (i >= count) stopAuto(i);
      else if (!drv[i].mode) await startAuto(i, i === FOCUS ? "drift" : AUTO_MODES[Math.floor(rnd() * AUTO_MODES.length)]);
    }
  }
  async function randomise(): Promise<void> {
    if (!powered) { powered = true; renderPower(); await ensureChain(); setMaster(0.9); }
    count = 2 + Math.floor(rnd() * 3); renderSeg(); // 2..4
    for (let i = 0; i < NVOICES; i++) {
      if (i >= count) { stopAuto(i); continue; }
      await ensureVoice(i);
      voices[i].setPan(clamp(PANS[i] + (rnd() - 0.5) * 0.4, -1, 1));
      await startAuto(i, AUTO_MODES[Math.floor(rnd() * AUTO_MODES.length)]);
    }
  }

  // --- manual play on voice A ---
  let activePointer: number | null = null;
  function update(clientX: number, clientY: number): void {
    const r = field.getBoundingClientRect();
    const x = clamp((clientX - r.left) / r.width, 0, 1);
    const vol = 1 - clamp((clientY - r.top) / r.height, 0, 1);
    voices[FOCUS].setPitchNorm(x); voices[FOCUS].setVolNorm(vol); paint(x, vol);
  }
  async function begin(clientX: number, clientY: number): Promise<void> {
    await ensureVoice(FOCUS);
    if (!powered) { powered = true; renderPower(); setMaster(0.9); }
    drv[FOCUS].mode = null; maybeStopTimer(); // manual takes over voice A
    showCrosshair(true); voices[FOCUS].gate(true); update(clientX, clientY);
  }
  function end(): void {
    voices[FOCUS].gate(false); activePointer = null;
    // resume a gentle drift on voice A so the teaser keeps breathing
    if (powered) startAuto(FOCUS, "drift"); else showCrosshair(false);
  }
  const onDown = async (e: PointerEvent) => {
    if (activePointer !== null) return;
    activePointer = e.pointerId; field.setPointerCapture(e.pointerId); e.preventDefault();
    await begin(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent) => { if (e.pointerId === activePointer) update(e.clientX, e.clientY); };
  const onUp = (e: PointerEvent) => { if (e.pointerId === activePointer) end(); };
  field.addEventListener("pointerdown", onDown);
  field.addEventListener("pointermove", onMove);
  field.addEventListener("pointerup", onUp);
  field.addEventListener("pointercancel", onUp);

  // keyboard accessibility
  let kx = 0.5, ky = 0.5, kHeld = false;
  const onKey = async (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.02 : 0.06;
    if (e.key === "ArrowLeft") kx = clamp(kx - step, 0, 1);
    else if (e.key === "ArrowRight") kx = clamp(kx + step, 0, 1);
    else if (e.key === "ArrowUp") ky = clamp(ky + step, 0, 1);
    else if (e.key === "ArrowDown") ky = clamp(ky - step, 0, 1);
    else if (e.key === " ") { kHeld = !kHeld; if (!kHeld) { end(); return; } }
    else return;
    e.preventDefault();
    await ensureVoice(FOCUS);
    if (!powered) { powered = true; renderPower(); setMaster(0.9); }
    drv[FOCUS].mode = null; maybeStopTimer();
    if (!kHeld) { kHeld = true; voices[FOCUS].gate(true); showCrosshair(true); }
    const r = field.getBoundingClientRect();
    update(r.left + kx * r.width, r.top + (1 - ky) * r.height);
  };
  field.addEventListener("keydown", onKey);

  wrap.append(bar, field);
  root.appendChild(wrap);

  return () => {
    if (timer) { clearInterval(timer); timer = 0; }
    field.removeEventListener("pointerdown", onDown);
    field.removeEventListener("pointermove", onMove);
    field.removeEventListener("pointerup", onUp);
    field.removeEventListener("pointercancel", onUp);
    field.removeEventListener("keydown", onKey);
    for (const v of voices) { try { v.gate(false); } catch { /* not started */ } }
    suspendAudio();
    wrap.remove();
  };
}
