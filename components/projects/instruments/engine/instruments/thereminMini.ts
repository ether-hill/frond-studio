// Theremin (mini) — a condensed, self-contained build for the homepage "featured
// instrument" teaser. It mirrors the full theremin's signal path (two slightly
// detuned oscillators for the heterodyne shimmer, a vibrato LFO, a brightness
// low-pass, a portamento glide and a reverb) and its autopilot presets, but in a
// compact frame: a standard control bar (power · voices · randomise) built from
// the shared instrument design-system components, one playable field, and a live
// readout. Up to four voices stack into a breathing chord; Randomise re-rolls
// each voice's pattern. Kept separate from theremin.ts so the showcased full
// instrument is never touched.

import { mtof, noteName, MONO, reduceMotion, powerButton, segmented, slider, injectCss } from "./shared";

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

  async start(ctx: AudioContext): Promise<void> {
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

// ---- mount -------------------------------------------------------------------

const NVOICES = 4;
const PANS = [0, -0.55, 0.55, -0.25];

/**
 * Mount the condensed theremin into a host element: a control bar (power, voices
 * 1–4, randomise) using the shared instrument design-system controls, one
 * playable field (X = pitch, Y = volume) and a live readout. Power-on starts a
 * gentle drift; add voices to thicken the chord, hit Randomise to re-roll every
 * voice's pattern. Returns a disposer that silences and tears down the audio.
 */
export function mountMini(root: HTMLElement): () => void {
  injectCss(); // shared instrument control styles (.inst-power / .inst-seg / .inst-link …)

  const voices = Array.from({ length: NVOICES }, () => new MiniVoice());
  let ctx: AudioContext | null = null;        // the mini's OWN context, isolated
  let master: GainNode | null = null;         // from the hero biome's shared one,
  let powered = false;                         // so muting either never affects the other
  let count = 1;
  let masterVol = 0.7;                          // master volume, driven by the slider
  const FOCUS = 0; // the field always plays voice A

  interface Drv { mode: AutoMode | null; cur: { x: number; vol: number }; target: { x: number; vol: number }; nextChange: number; }
  const drv: Drv[] = Array.from({ length: NVOICES }, () => ({ mode: null, cur: { x: 0.5, vol: 0.5 }, target: { x: 0.5, vol: 0.5 }, nextChange: 0 }));
  let timer = 0;

  // Global FX: a feedback delay on the master bus; reverb + vibrato drive the
  // per-voice params. Defaults match the voice defaults so nothing jumps on load.
  let delayWet: GainNode | null = null;
  const fx = { delay: 0.22, reverb: 0.5, vib: 0.3 };
  function applyDelay(): void { if (delayWet) delayWet.gain.setTargetAtTime(fx.delay, delayWet.context.currentTime, 0.05); }
  function applyVoiceFx(): void { for (const v of voices) if (v.ready) { v.set("reverb", fx.reverb); v.set("vibDepth", fx.vib); } }

  // A dedicated AudioContext for this instrument — created on the first user
  // gesture and resumed/suspended on its own, independent of the shared context
  // the hero biome (and the full instruments) use.
  async function localAudio(): Promise<AudioContext> {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state !== "running") { try { await ctx.resume(); } catch { /* gesture needed */ } }
    return ctx;
  }
  async function ensureChain(): Promise<void> {
    const c = await localAudio();
    if (master) return;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(c.destination);
    master = c.createGain(); master.gain.value = 0;
    // dry path
    const dry = c.createGain(); dry.gain.value = 1; master.connect(dry); dry.connect(comp);
    // global feedback delay (wet level = fx.delay)
    const delay = c.createDelay(1.0); delay.delayTime.value = 0.3;
    const fbk = c.createGain(); fbk.gain.value = 0.36;
    master.connect(delay); delay.connect(fbk); fbk.connect(delay);
    delayWet = c.createGain(); delayWet.gain.value = fx.delay;
    delay.connect(delayWet); delayWet.connect(comp);
  }
  async function ensureVoice(i: number): Promise<void> {
    await ensureChain();
    const v = voices[i];
    if (!v.ready) { await v.start(ctx!); v.connect(master!); v.setPan(PANS[i]); }
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

  // --- DOM: control bar from the shared design system ---
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:16px";

  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;align-items:flex-end;gap:clamp(12px,1.6vw,22px);flex-wrap:wrap";

  // power (shared .inst-power)
  const power = powerButton(async (on) => { if (on) await powerOn(); else powerOff(); }, { on: "ON", off: "OFF" });

  // voices (shared segmented / .inst-seg)
  const voicesSeg = segmented<string>({
    label: "VOICES",
    value: "1",
    options: ["1", "2", "3", "4"].map((n) => ({ value: n, label: n })),
    onChange: (n) => setCount(parseInt(n, 10)),
  });
  voicesSeg.el.style.flex = "0 0 auto";

  // volume (shared slider / .inst-range) — master gain, default 70%
  const volume = slider({
    label: "VOLUME", min: 0, max: 1, step: 0.01, value: masterVol,
    format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => { masterVol = v; if (powered) setMaster(v); },
  });
  volume.el.style.cssText += ";flex:1 1 130px;min-width:120px;max-width:190px";

  // randomise (shared .inst-link button)
  const random = document.createElement("button");
  random.type = "button"; random.className = "inst-link";
  random.textContent = "Random Auto";
  random.addEventListener("click", () => randomise());

  // readout
  const readout = document.createElement("div");
  readout.style.cssText = `flex:1 1 auto;text-align:right;min-width:150px;font-family:${MONO};font-size:12px;letter-spacing:0.08em;color:var(--fg3);font-variant-numeric:tabular-nums`;
  readout.textContent = "TURN ON OR HIT RANDOM AUTO";

  bar.append(power.el, voicesSeg.el, volume.el, random, readout);

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
  // Huge faded "TOUCH ME" invitation over the pad; fades out on first interaction.
  const touchLabel = document.createElement("div");
  touchLabel.textContent = "TOUCH ME";
  touchLabel.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;" +
    "font-family:var(--font-display),sans-serif;font-weight:700;font-size:clamp(44px,13vw,128px);" +
    "letter-spacing:0.03em;line-height:1;color:rgba(var(--lw),0.085);white-space:nowrap;user-select:none;transition:opacity .5s ease";
  field.append(vline, hline, hint, touchLabel);

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
    powered = true; power.set(true); setMaster(masterVol);
    // No auto on power-on — the field is ready to play; auto only via Random Auto.
    readout.textContent = "ON · TOUCH TO PLAY · RANDOM AUTO";
  }
  function powerOff(): void {
    powered = false; power.set(false); setMaster(0);
    for (let i = 0; i < NVOICES; i++) stopAuto(i);
    readout.textContent = "TURN ON OR HIT RANDOM AUTO";
    // Suspend only THIS instrument's context — never the shared one, so the hero
    // biome keeps playing.
    setTimeout(() => { if (!powered && ctx && ctx.state === "running") ctx.suspend().catch(() => {}); }, 240);
  }
  async function setCount(n: number): Promise<void> {
    count = clamp(n, 1, NVOICES); voicesSeg.set(String(count));
    if (!powered) return;
    // Voice count only drives sound while auto is running (the field plays one
    // voice). Don't spin up auto here — that's the Random Auto button's job.
    if (drv.every((d) => d.mode === null)) return;
    for (let i = 0; i < NVOICES; i++) {
      if (i >= count) stopAuto(i);
      else if (!drv[i].mode) await startAuto(i, i === FOCUS ? "drift" : AUTO_MODES[Math.floor(rnd() * AUTO_MODES.length)]);
    }
  }
  async function randomise(): Promise<void> {
    if (!powered) { await ensureChain(); powered = true; power.set(true); setMaster(masterVol); }
    count = 2 + Math.floor(rnd() * 3); voicesSeg.set(String(count)); // 2..4
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
  function powerUpSilent(): void {
    if (powered) return;
    powered = true; power.set(true); setMaster(masterVol);
  }
  async function begin(clientX: number, clientY: number): Promise<void> {
    await ensureVoice(FOCUS); powerUpSilent();
    applyDelay(); voices[FOCUS].set("reverb", fx.reverb); voices[FOCUS].set("vibDepth", fx.vib);
    drv[FOCUS].mode = null; maybeStopTimer(); // manual takes over voice A
    showCrosshair(true); voices[FOCUS].gate(true); update(clientX, clientY);
  }
  function end(): void {
    voices[FOCUS].gate(false); activePointer = null;
    showCrosshair(false);
    // Stay silent on release — auto only runs when Random Auto is clicked.
    if (powered) readout.textContent = "ON · TOUCH TO PLAY · RANDOM AUTO";
  }
  const onDown = async (e: PointerEvent) => {
    if (activePointer !== null) return;
    touchLabel.style.opacity = "0"; // they touched — drop the invitation
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
    await ensureVoice(FOCUS); powerUpSilent();
    drv[FOCUS].mode = null; maybeStopTimer();
    if (!kHeld) { kHeld = true; voices[FOCUS].gate(true); showCrosshair(true); }
    const r = field.getBoundingClientRect();
    update(r.left + kx * r.width, r.top + (1 - ky) * r.height);
  };
  field.addEventListener("keydown", onKey);

  // --- effects rack (delay · reverb · vibrato) under the field ---
  const fxBar = document.createElement("div");
  fxBar.style.cssText = "display:flex;align-items:flex-end;gap:clamp(14px,2vw,28px);flex-wrap:wrap";
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const delaySlider = slider({ label: "DELAY", min: 0, max: 1, step: 0.01, value: fx.delay, format: pct, onInput: (v) => { fx.delay = v; applyDelay(); } });
  const reverbSlider = slider({ label: "REVERB", min: 0, max: 1, step: 0.01, value: fx.reverb, format: pct, onInput: (v) => { fx.reverb = v; applyVoiceFx(); } });
  const vibSlider = slider({ label: "VIBRATO", min: 0, max: 1, step: 0.01, value: fx.vib, format: pct, onInput: (v) => { fx.vib = v; applyVoiceFx(); } });
  for (const sl of [delaySlider, reverbSlider, vibSlider]) sl.el.style.cssText += ";flex:1 1 150px;min-width:120px";
  fxBar.append(delaySlider.el, reverbSlider.el, vibSlider.el);

  wrap.append(bar, field, fxBar);
  root.appendChild(wrap);

  return () => {
    if (timer) { clearInterval(timer); timer = 0; }
    field.removeEventListener("pointerdown", onDown);
    field.removeEventListener("pointermove", onMove);
    field.removeEventListener("pointerup", onUp);
    field.removeEventListener("pointercancel", onUp);
    field.removeEventListener("keydown", onKey);
    for (const v of voices) { try { v.gate(false); } catch { /* not started */ } }
    // Close this instrument's own context to free resources; the shared context
    // (hero biome) is untouched.
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    wrap.remove();
  };
}
