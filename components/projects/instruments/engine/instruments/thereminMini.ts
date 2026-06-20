// Theremin (mini) — a condensed, self-contained voice for the homepage "featured
// instrument" teaser. It mirrors the full theremin's signal path (two slightly
// detuned oscillators for the heterodyne shimmer, a vibrato LFO, a brightness
// low-pass, a portamento glide and a reverb) but exposes just one playable field
// with a power button and a live readout — no panels, no mixer. Kept separate
// from theremin.ts so the showcased full instrument is never touched.

import { mtof, noteName, ensureAudio, suspendAudio, MONO, reduceMotion, powerButton, injectCss } from "./shared";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

class MiniVoice {
  private ctx!: AudioContext;
  private osc1!: OscillatorNode;
  private osc2!: OscillatorNode;
  private tone!: BiquadFilterNode;
  private vca!: GainNode;
  private master!: GainNode;
  private vibLfo!: OscillatorNode;
  out!: AudioNode;
  private started = false;
  private curFreq = mtof(60);
  private targetVol = 0;
  private sounding = false;
  freqReadout = mtof(60);

  private lowMidi = 48;
  private range = 3;     // octaves across the field
  private glide = 0.12;  // portamento (s)

  get ready(): boolean { return this.started; }

  async start(): Promise<void> {
    const ctx = await ensureAudio();
    if (this.started) return;
    this.ctx = ctx;

    this.master = ctx.createGain(); this.master.gain.value = 0.5;
    this.out = this.master;

    const dry = ctx.createGain(); dry.gain.value = 1; dry.connect(this.master);
    const conv = ctx.createConvolver(); conv.buffer = this.reverbIR(ctx, 2.6);
    const reverbSend = ctx.createGain();
    const reverbVol = ctx.createGain(); reverbVol.gain.value = 0.5;
    reverbSend.connect(conv); conv.connect(reverbVol); reverbVol.connect(this.master);

    this.vca = ctx.createGain(); this.vca.gain.value = 0;
    this.vca.connect(dry); this.vca.connect(reverbSend);

    this.tone = ctx.createBiquadFilter(); this.tone.type = "lowpass"; this.tone.Q.value = 0.7;
    this.tone.frequency.value = 400 * Math.pow(40, 0.6); // brightness ~0.6
    this.tone.connect(this.vca);

    this.osc1 = ctx.createOscillator(); this.osc1.type = "sine";
    this.osc2 = ctx.createOscillator(); this.osc2.type = "sine"; this.osc2.detune.value = 4;
    this.osc1.frequency.value = this.curFreq; this.osc2.frequency.value = this.curFreq;
    const oscMix = ctx.createGain(); oscMix.gain.value = 0.5;
    this.osc1.connect(oscMix); this.osc2.connect(oscMix); oscMix.connect(this.tone);

    this.vibLfo = ctx.createOscillator(); this.vibLfo.type = "sine"; this.vibLfo.frequency.value = 5;
    const vibGain = ctx.createGain(); vibGain.gain.value = 0.3 * 35; // ±cents
    this.vibLfo.connect(vibGain); vibGain.connect(this.osc1.detune); vibGain.connect(this.osc2.detune);

    this.osc1.start(); this.osc2.start(); this.vibLfo.start();
    this.started = true;
  }

  connect(node: AudioNode): void { this.out.connect(node); }

  private reverbIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    return buf;
  }

  setPitchNorm(x: number): void {
    if (!this.started) return;
    const f = mtof(this.lowMidi + clamp(x, 0, 1) * this.range * 12);
    this.curFreq = f; this.freqReadout = f;
    const tc = Math.max(0.001, this.glide);
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

/**
 * Mount the condensed theremin into a host element: a power button, one playable
 * field (X = pitch, Y = volume) and a live readout. On power-on it gently plays
 * itself until you grab the field, then manual sweeping takes over. Returns a
 * disposer that silences and tears down the audio.
 */
export function mountMini(root: HTMLElement): () => void {
  injectCss();

  const v = new MiniVoice();
  let master: GainNode | null = null;
  let muted = true;
  let auto = false;
  let autoTimer = 0;
  let ax = 0.5, ay = 0.55, atx = 0.5, aty = 0.6, nextChange = 0;

  async function ensureChain(): Promise<void> {
    if (master) return;
    const ctx = await ensureAudio();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
    if (!v.ready) { await v.start(); v.connect(master); }
  }
  function setMasterTarget(g: number): void {
    if (master) master.gain.setTargetAtTime(g, master.context.currentTime, 0.05);
  }
  function powerUp(): void {
    if (!muted) return;
    muted = false; setMasterTarget(0.9); power.el.dataset.on = "1";
  }

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:14px";

  // power + live readout
  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:center;gap:16px;flex-wrap:wrap";
  const power = powerButton(async (on) => {
    if (on) { await ensureChain(); powerUp(); startAuto(); }
    else {
      muted = true; setMasterTarget(0); stopAuto(); v.gate(false);
      readout.textContent = "SWEEP THE FIELD TO PLAY";
      setTimeout(() => { if (power.el.dataset.on !== "1") suspendAudio(); }, 240);
    }
  });
  const readout = document.createElement("div");
  readout.style.cssText = `font-family:${MONO};font-size:12px;letter-spacing:0.08em;color:var(--fg3);font-variant-numeric:tabular-nums`;
  readout.textContent = "SWEEP THE FIELD TO PLAY";
  top.append(power.el, readout);

  // the field
  const field = document.createElement("div");
  field.tabIndex = 0;
  field.setAttribute("role", "application");
  field.setAttribute("aria-label", "Theremin field — drag to play; arrow keys move pitch and volume, space sustains");
  field.style.cssText =
    "position:relative;width:100%;height:clamp(220px,34vh,380px);border:1px solid rgba(var(--lw),0.2);border-radius:8px;" +
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
    readout.textContent = `${noteName(12 * Math.log2(v.freqReadout / 440) + 69)}  ·  ${v.freqReadout.toFixed(1)} Hz  ·  VOL ${Math.round(vol * 100)}%`;
  }
  function drive(x: number, vol: number): void { v.setPitchNorm(x); v.setVolNorm(vol); paint(x, vol); }

  // gentle autopilot so the teaser sounds alive until touched
  function startAuto(): void {
    if (auto) return;
    auto = true; v.gate(true); showCrosshair(true); nextChange = 0;
    if (!autoTimer) autoTimer = window.setInterval(() => {
      const now = performance.now();
      if (now >= nextChange) { atx = Math.random(); aty = 0.45 + Math.random() * 0.4; nextChange = now + 2600 + Math.random() * 2400; }
      ax += (atx - ax) * 0.05; ay += (aty - ay) * 0.05;
      const breath = 0.06 * Math.sin(now * 0.0009);
      drive(clamp(ax, 0, 1), clamp(ay + breath, 0, 1));
    }, 70);
  }
  function stopAuto(): void {
    auto = false;
    if (autoTimer) { clearInterval(autoTimer); autoTimer = 0; }
  }

  // manual play
  let activePointer: number | null = null;
  function update(clientX: number, clientY: number): void {
    const r = field.getBoundingClientRect();
    const x = clamp((clientX - r.left) / r.width, 0, 1);
    const vol = 1 - clamp((clientY - r.top) / r.height, 0, 1);
    drive(x, vol);
  }
  async function begin(clientX: number, clientY: number): Promise<void> {
    await ensureChain(); powerUp(); stopAuto();
    showCrosshair(true); v.gate(true); update(clientX, clientY);
  }
  function end(): void { v.gate(false); activePointer = null; showCrosshair(false); }

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
    await ensureChain(); powerUp(); stopAuto();
    if (!kHeld) { kHeld = true; v.gate(true); showCrosshair(true); }
    const r = field.getBoundingClientRect();
    update(r.left + kx * r.width, r.top + (1 - ky) * r.height);
  };
  field.addEventListener("keydown", onKey);

  wrap.append(top, field);
  root.appendChild(wrap);

  return () => {
    stopAuto();
    field.removeEventListener("pointerdown", onDown);
    field.removeEventListener("pointermove", onMove);
    field.removeEventListener("pointerup", onUp);
    field.removeEventListener("pointercancel", onUp);
    field.removeEventListener("keydown", onKey);
    try { v.gate(false); } catch { /* not started */ }
    suspendAudio();
    wrap.remove();
  };
}
