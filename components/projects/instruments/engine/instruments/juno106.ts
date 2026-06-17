// Juno-106 — a six-voice virtual analogue polysynth in Web Audio, laid out like the
// real hardware: a row of vertical faders grouped LFO · DCO · HPF · VCF · VCA · ENV ·
// CHORUS, then an EFFECTS rack (delay/reverb/chorus/drive/phaser) and a step SEQUENCER,
// with a playable keyboard at the foot.
//
// Signal path per voice: DCO (saw + PWM pulse + sub + noise) → 24 dB resonant VCF →
// VCA. One ADSR drives the VCA (or a gate) and, additively, the filter cutoff; one LFO
// modulates pitch / PWM / cutoff. The whole mix runs through the Juno chorus, then the
// effects rack. Voices are a fixed pool of 6 with continuously-running oscillators.
//
// Two things the first cut got wrong, fixed here:
//  • Filter cutoff/res now update LIVE on held notes — the envelope is an *additive*
//    modulation (a ConstantSource → depth → frequency) on top of a base cutoff set
//    straight from the slider, instead of scheduling an absolute frequency.
//  • Notes no longer "die until reset" — noteOn resumes a suspended AudioContext, and
//    voice bookkeeping always clears its gate on release (no orphaned stuck voices).

import {
  instrumentPage, panel, slider, segmented, powerButton,
  Keyboard, mtof, noteName, ensureAudio, suspendAudio, noiseBuffer, tapeCurve, MONO,
} from "./shared";

export function mount(root: HTMLElement) {

// ---- parameters ------------------------------------------------------------

interface JunoParams {
  lfoRate: number; lfoDelay: number;
  dcoLfo: number;                 // LFO → pitch (vibrato) 0..1
  pwm: number;                    // PWM amount 0..1
  pwmMode: "lfo" | "man" | "env";
  sawOn: boolean; pulseOn: boolean;
  sub: number; noise: number;     // levels 0..1
  range: number;                  // -12 | 0 | 12
  hpf: number;                    // 0..3
  vcfFreq: number; vcfRes: number; vcfEnv: number; vcfPolarity: number; vcfLfo: number; vcfKbd: number;
  envA: number; envD: number; envS: number; envR: number;
  vcaMode: "env" | "gate";
  chorus: "off" | "I" | "II" | "I+II";
  volume: number;
}

const DEFAULTS: JunoParams = {
  lfoRate: 5, lfoDelay: 0.15,
  dcoLfo: 0, pwm: 0.4, pwmMode: "lfo", sawOn: true, pulseOn: true,
  sub: 0.35, noise: 0, range: 0,
  hpf: 0,
  vcfFreq: 0.5, vcfRes: 0.18, vcfEnv: 0.5, vcfPolarity: 1, vcfLfo: 0, vcfKbd: 0.35,
  envA: 0.02, envD: 0.5, envS: 0.7, envR: 0.4, vcaMode: "env",
  chorus: "I", volume: 0.7,
};

const HPF_FREQ = [16, 110, 340, 820];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const cutoffHz = (x: number) => 60 * Math.pow(14000 / 60, clamp(x, 0, 1));

interface Voice {
  saw: OscillatorNode; pulseSaw: OscillatorNode; pulseDelay: DelayNode; sub: OscillatorNode;
  gSaw: GainNode; gPulse: GainNode; gSub: GainNode; noiseGain: GainNode;
  lp1: BiquadFilterNode; lp2: BiquadFilterNode; vca: GainNode;
  ampEnv: ConstantSourceNode; ampDepth: GainNode;
  filtEnv: ConstantSourceNode; filtDepth: GainNode; pwmEnvDepth: GainNode;
  midi: number; gate: boolean; startedAt: number;
}

// ---- effects ---------------------------------------------------------------

interface FxNode { input: AudioNode; output: AudioNode; setParam(k: string, v: number): void; }
interface FxModule { type: FxType; input: GainNode; output: GainNode; dry: GainNode; wet: GainNode; setParam(k: string, v: number): void; enabled: boolean; mix: number; }
type FxType = "delay" | "reverb" | "chorus" | "drive" | "phaser";

class Juno106 {
  private ctx!: AudioContext;
  private p: JunoParams = { ...DEFAULTS };
  private voices: Voice[] = [];
  private byMidi = new Map<number, Voice>();
  private bus!: GainNode; private hpfNode!: BiquadFilterNode; private master!: GainNode;
  private analyser!: AnalyserNode;
  private lfo!: OscillatorNode; private lfoDepth!: GainNode;
  private lfoPitchGain!: GainNode; private lfoPwmGain!: GainNode; private lfoFilterGain!: GainNode;
  private chorusWet!: GainNode; private chorusLfo!: OscillatorNode; private chorusDepthL!: GainNode; private chorusDepthR!: GainNode;
  // fx rack — a series chain of independent, layerable effects (all bypassed by default)
  private fxOut!: GainNode;
  private fxModules = new Map<FxType, FxModule>();
  private started = false; private muted = false;

  get ready(): boolean { return this.started; }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.started) this.master.gain.setTargetAtTime(m ? 0 : this.p.volume * 0.5, this.ctx.currentTime, 0.05);
  }

  async start(): Promise<void> {
    const ctx = await ensureAudio();   // always resume the shared context, even if already built
    if (this.started) return;
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(ctx.destination);

    // output + analyser tap
    this.fxOut = ctx.createGain();
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
    this.fxOut.connect(this.analyser); this.fxOut.connect(comp);

    // master → effects chain (drive → chorus → phaser → delay → reverb) → fxOut.
    // Every effect is always wired in series but starts fully bypassed (wet = 0), so
    // any combination can be layered live and each reacts to playing audio in real time.
    this.master = ctx.createGain(); this.master.gain.value = this.p.volume * 0.5;
    let prev: AudioNode = this.master;
    for (const type of ["drive", "chorus", "phaser", "delay", "reverb"] as FxType[]) {
      const m = this.buildModule(type);
      this.fxModules.set(type, m);
      prev.connect(m.input); prev = m.output;
    }
    prev.connect(this.fxOut);

    // chorus
    const chorusIn = ctx.createGain();
    const dry = ctx.createGain(); dry.gain.value = 1; chorusIn.connect(dry); dry.connect(this.master);
    const merger = ctx.createChannelMerger(2);
    this.chorusWet = ctx.createGain(); this.chorusWet.gain.value = 0;
    merger.connect(this.chorusWet); this.chorusWet.connect(this.master);
    const dL = ctx.createDelay(0.05), dR = ctx.createDelay(0.05);
    dL.delayTime.value = 0.0075; dR.delayTime.value = 0.0078;
    chorusIn.connect(dL); chorusIn.connect(dR);
    dL.connect(merger, 0, 0); dR.connect(merger, 0, 1);
    this.chorusLfo = ctx.createOscillator(); this.chorusLfo.type = "sine"; this.chorusLfo.frequency.value = 0.6;
    this.chorusDepthL = ctx.createGain(); this.chorusDepthR = ctx.createGain();
    this.chorusDepthL.gain.value = 0.0022; this.chorusDepthR.gain.value = -0.0022;
    this.chorusLfo.connect(this.chorusDepthL); this.chorusLfo.connect(this.chorusDepthR);
    this.chorusDepthL.connect(dL.delayTime); this.chorusDepthR.connect(dR.delayTime);
    this.chorusLfo.start();

    this.hpfNode = ctx.createBiquadFilter(); this.hpfNode.type = "highpass";
    this.hpfNode.frequency.value = HPF_FREQ[this.p.hpf]; this.hpfNode.Q.value = 0.4;
    this.hpfNode.connect(chorusIn);
    this.bus = ctx.createGain(); this.bus.gain.value = 0.9; this.bus.connect(this.hpfNode);

    // LFO
    this.lfo = ctx.createOscillator(); this.lfo.type = "triangle"; this.lfo.frequency.value = this.p.lfoRate;
    this.lfoDepth = ctx.createGain(); this.lfoDepth.gain.value = 1; this.lfo.connect(this.lfoDepth);
    this.lfoPitchGain = ctx.createGain(); this.lfoPwmGain = ctx.createGain(); this.lfoFilterGain = ctx.createGain();
    this.lfoDepth.connect(this.lfoPitchGain); this.lfoDepth.connect(this.lfoPwmGain); this.lfoDepth.connect(this.lfoFilterGain);
    this.lfo.start();

    const noise = noiseBuffer(ctx, 2);
    for (let i = 0; i < 6; i++) this.voices.push(this.buildVoice(noise));

    // resume if the OS/tab suspends the context later
    document.addEventListener("visibilitychange", () => { if (!document.hidden && this.ctx.state !== "running") this.ctx.resume(); });

    this.started = true;
    this.applyAll();
  }

  private buildVoice(noise: AudioBuffer): Voice {
    const ctx = this.ctx;
    const saw = ctx.createOscillator(); saw.type = "sawtooth";
    const pulseSaw = ctx.createOscillator(); pulseSaw.type = "sawtooth";
    const sub = ctx.createOscillator(); sub.type = "square";

    const pulseDelay = ctx.createDelay(0.05);
    const pulseInv = ctx.createGain(); pulseInv.gain.value = -1;
    const gPulse = ctx.createGain(); gPulse.gain.value = 0;
    pulseSaw.connect(gPulse); pulseSaw.connect(pulseDelay); pulseDelay.connect(pulseInv); pulseInv.connect(gPulse);

    const gSaw = ctx.createGain(); gSaw.gain.value = 0;
    saw.connect(gSaw);
    const gSub = ctx.createGain(); gSub.gain.value = 0; sub.connect(gSub);

    const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noise; noiseSrc.loop = true;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0; noiseSrc.connect(noiseGain);

    const mix = ctx.createGain(); mix.gain.value = 0.5;
    gSaw.connect(mix); gPulse.connect(mix); gSub.connect(mix); noiseGain.connect(mix);

    const lp1 = ctx.createBiquadFilter(); lp1.type = "lowpass";
    const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass";
    mix.connect(lp1); lp1.connect(lp2);

    const vca = ctx.createGain(); vca.gain.value = 0; lp2.connect(vca); vca.connect(this.bus);

    // amp envelope: ampEnv(0..1) × ampDepth(velocity) → vca.gain (intrinsic 0)
    const ampEnv = ctx.createConstantSource(); ampEnv.offset.value = 0;
    const ampDepth = ctx.createGain(); ampDepth.gain.value = 0.8;
    ampEnv.connect(ampDepth); ampDepth.connect(vca.gain); ampEnv.start();

    // filter envelope: filtEnv(0..1) × filtDepth(envAmt) → lp frequencies (additive)
    const filtEnv = ctx.createConstantSource(); filtEnv.offset.value = 0;
    const filtDepth = ctx.createGain(); filtDepth.gain.value = 0;
    filtEnv.connect(filtDepth); filtDepth.connect(lp1.frequency); filtDepth.connect(lp2.frequency);
    // optional env → PWM
    const pwmEnvDepth = ctx.createGain(); pwmEnvDepth.gain.value = 0;
    filtEnv.connect(pwmEnvDepth); pwmEnvDepth.connect(pulseDelay.delayTime);
    filtEnv.start();

    // LFO routing
    this.lfoPitchGain.connect(saw.detune); this.lfoPitchGain.connect(pulseSaw.detune); this.lfoPitchGain.connect(sub.detune);
    this.lfoPwmGain.connect(pulseDelay.delayTime);
    this.lfoFilterGain.connect(lp1.frequency); this.lfoFilterGain.connect(lp2.frequency);

    saw.start(); pulseSaw.start(); sub.start(); noiseSrc.start();
    return { saw, pulseSaw, pulseDelay, sub, gSaw, gPulse, gSub, noiseGain, lp1, lp2, vca, ampEnv, ampDepth, filtEnv, filtDepth, pwmEnvDepth, midi: -1, gate: false, startedAt: 0 };
  }

  // ---- notes ---------------------------------------------------------------

  noteOn(midi: number, velocity = 0.9): void {
    if (!this.started) return;
    if (this.ctx.state !== "running") this.ctx.resume();
    const v = this.alloc();
    if (v.gate && this.byMidi.get(v.midi) === v) this.byMidi.delete(v.midi); // stealing
    v.midi = midi; v.gate = true; v.startedAt = this.ctx.currentTime;
    this.byMidi.set(midi, v);
    v.ampDepth.gain.setTargetAtTime(clamp(velocity, 0.05, 1) * 0.8, this.ctx.currentTime, 0.005);
    this.tuneVoice(v);
    this.gateOn(v);
  }

  noteOff(midi: number): void {
    if (!this.started) return;
    const v = this.byMidi.get(midi);
    if (!v || v.midi !== midi || !v.gate) return;
    v.gate = false;
    this.byMidi.delete(midi);
    this.gateOff(v);
  }

  allNotesOff(): void {
    if (!this.started) return;
    for (const v of this.voices) { if (v.gate) { v.gate = false; this.gateOff(v); } }
    this.byMidi.clear();
  }

  private alloc(): Voice {
    let free: Voice | null = null;
    for (const v of this.voices) if (!v.gate && (!free || v.startedAt < free.startedAt)) free = v;
    if (free) return free;
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.startedAt < oldest.startedAt) oldest = v;
    return oldest;
  }

  private tuneVoice(v: Voice): void {
    const t = this.ctx.currentTime;
    const freq = mtof(v.midi + this.p.range);
    v.saw.frequency.setTargetAtTime(freq, t, 0.004);
    v.pulseSaw.frequency.setTargetAtTime(freq, t, 0.004);
    v.sub.frequency.setTargetAtTime(freq / 2, t, 0.004);
    const width = this.p.pwmMode === "man" ? 0.1 + this.p.pwm * 0.38 : 0.5;
    v.pulseDelay.delayTime.setTargetAtTime(clamp(width / freq, 0.00005, 0.045), t, 0.01);
    // base cutoff follows the slider + key tracking (live)
    const base = this.baseCutoff(v);
    v.lp1.frequency.setValueAtTime(base, t); v.lp2.frequency.setValueAtTime(base, t);
  }

  private baseCutoff(v: Voice): number {
    const track = Math.pow(2, this.p.vcfKbd * (v.midi - 60) / 12);
    return clamp(cutoffHz(this.p.vcfFreq) * track, 30, 18000);
  }

  private gateOn(v: Voice): void {
    const t = this.ctx.currentTime, { envA, envD, envS, vcaMode } = this.p;
    // amp
    v.ampEnv.offset.cancelAndHoldAtTime?.(t);
    if (!v.ampEnv.offset.cancelAndHoldAtTime) v.ampEnv.offset.cancelScheduledValues(t);
    if (vcaMode === "gate") {
      v.ampEnv.offset.linearRampToValueAtTime(1, t + 0.006);
    } else {
      v.ampEnv.offset.linearRampToValueAtTime(1, t + Math.max(0.001, envA));
      v.ampEnv.offset.linearRampToValueAtTime(envS, t + Math.max(0.001, envA) + Math.max(0.001, envD));
    }
    // filter env (always ADSR)
    const fe = v.filtEnv.offset;
    fe.cancelAndHoldAtTime?.(t); if (!fe.cancelAndHoldAtTime) fe.cancelScheduledValues(t);
    fe.linearRampToValueAtTime(1, t + Math.max(0.001, envA));
    fe.linearRampToValueAtTime(envS, t + Math.max(0.001, envA) + Math.max(0.001, envD));
    this.fadeLfo();
  }

  private gateOff(v: Voice): void {
    const t = this.ctx.currentTime, R = Math.max(0.01, this.p.envR);
    for (const param of [v.ampEnv.offset, v.filtEnv.offset]) {
      param.cancelAndHoldAtTime?.(t); if (!param.cancelAndHoldAtTime) param.cancelScheduledValues(t);
      param.linearRampToValueAtTime(0, t + R);
    }
  }

  private fadeLfo(): void {
    const t = this.ctx.currentTime, g = this.lfoDepth.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(1, t + this.p.lfoDelay + 0.001);
  }

  // ---- live params ---------------------------------------------------------

  set<K extends keyof JunoParams>(key: K, value: JunoParams[K]): void {
    this.p[key] = value;
    if (!this.started) return;
    this.applyAll();
    if (key === "range" || key === "pwm" || key === "pwmMode") for (const v of this.voices) if (v.gate) this.tuneVoice(v);
  }

  private applyAll(): void {
    const t = this.ctx.currentTime, p = this.p;
    this.master.gain.setTargetAtTime(this.muted ? 0 : p.volume * 0.5, t, 0.05);
    this.hpfNode.frequency.setTargetAtTime(HPF_FREQ[p.hpf], t, 0.05);
    this.lfo.frequency.setTargetAtTime(p.lfoRate, t, 0.05);
    this.lfoPitchGain.gain.setTargetAtTime(p.dcoLfo * 50, t, 0.05);
    this.lfoPwmGain.gain.setTargetAtTime(p.pwmMode === "lfo" ? p.pwm * 0.0018 : 0, t, 0.05);
    this.lfoFilterGain.gain.setTargetAtTime(p.vcfLfo * 2600, t, 0.05);
    // chorus
    this.chorusWet.gain.setTargetAtTime(p.chorus === "off" ? 0 : 0.5, t, 0.08);
    if (p.chorus === "I") { this.chorusLfo.frequency.setTargetAtTime(0.6, t, 0.05); this.setChorusDepth(0.0022); }
    else if (p.chorus === "II") { this.chorusLfo.frequency.setTargetAtTime(0.95, t, 0.05); this.setChorusDepth(0.0032); }
    else if (p.chorus === "I+II") { this.chorusLfo.frequency.setTargetAtTime(1.4, t, 0.05); this.setChorusDepth(0.0040); }
    const filtDepthVal = p.vcfEnv * p.vcfPolarity * 9000;
    for (const v of this.voices) {
      v.gSaw.gain.setTargetAtTime(p.sawOn ? 0.7 : 0, t, 0.02);
      v.gPulse.gain.setTargetAtTime(p.pulseOn ? 0.45 : 0, t, 0.02);
      v.gSub.gain.setTargetAtTime(p.sub * 0.8, t, 0.02);
      v.noiseGain.gain.setTargetAtTime(p.noise * 0.4, t, 0.02);
      v.lp1.Q.setTargetAtTime(0.7 + p.vcfRes * 16, t, 0.02);
      v.lp2.Q.setTargetAtTime(0.6, t, 0.02);
      v.filtDepth.gain.setTargetAtTime(filtDepthVal, t, 0.03);
      v.pwmEnvDepth.gain.setTargetAtTime(p.pwmMode === "env" ? p.pwm * 0.0018 : 0, t, 0.03);
      // base cutoff live (so FREQ/KYBD move held notes too)
      v.lp1.frequency.setTargetAtTime(this.baseCutoff(v), t, 0.03);
      v.lp2.frequency.setTargetAtTime(this.baseCutoff(v), t, 0.03);
    }
  }

  private setChorusDepth(d: number): void {
    const t = this.ctx.currentTime;
    this.chorusDepthL.gain.setTargetAtTime(d, t, 0.05);
    this.chorusDepthR.gain.setTargetAtTime(-d, t, 0.05);
  }

  // ---- effects rack (layerable series chain) -------------------------------

  /** Enable/bypass one effect. Bypassed = wet 0 (dry passes through untouched). */
  setFxEnabled(type: FxType, on: boolean): void {
    const m = this.fxModules.get(type); if (!m || !this.started) return;
    m.enabled = on;
    m.wet.gain.setTargetAtTime(on ? m.mix : 0, this.ctx.currentTime, 0.05);
  }

  /** Live-edit an effect param. `mix` is the wet amount; others are per-effect. */
  setFxParam(type: FxType, key: string, value: number): void {
    const m = this.fxModules.get(type); if (!m || !this.started) return;
    if (key === "mix") { m.mix = value; if (m.enabled) m.wet.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05); return; }
    m.setParam(key, value);
  }

  private buildModule(type: FxType): FxModule {
    const ctx = this.ctx;
    const input = ctx.createGain(), output = ctx.createGain();
    const dry = ctx.createGain(); dry.gain.value = 1;
    const wet = ctx.createGain(); wet.gain.value = 0; // bypassed by default
    input.connect(dry); dry.connect(output); wet.connect(output);
    const guts = this.buildGuts(type);
    input.connect(guts.input); guts.output.connect(wet);
    return { type, input, output, dry, wet, setParam: guts.setParam, enabled: false, mix: 0 };
  }

  private buildGuts(type: FxType): FxNode {
    const ctx = this.ctx, t = ctx.currentTime;
    if (type === "delay") {
      const input = ctx.createGain(), output = ctx.createGain();
      const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.3;
      const fb = ctx.createGain(); fb.gain.value = 0.4;
      const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 4000;
      input.connect(delay); delay.connect(tone); tone.connect(output); tone.connect(fb); fb.connect(delay);
      return { input, output, setParam: (k, v) => {
        if (k === "time") delay.delayTime.setTargetAtTime(v, ctx.currentTime, 0.05);
        if (k === "feedback") fb.gain.setTargetAtTime(clamp(v, 0, 0.95), ctx.currentTime, 0.05);
        if (k === "tone") tone.frequency.setTargetAtTime(v, ctx.currentTime, 0.05);
      } };
    }
    if (type === "reverb") {
      const input = ctx.createGain(), output = ctx.createGain();
      const conv = ctx.createConvolver(); conv.buffer = this.reverbIR(2.5);
      input.connect(conv); conv.connect(output);
      return { input, output, setParam: (k, v) => {
        if (k === "decay") conv.buffer = this.reverbIR(clamp(v, 0.2, 6));
      } };
    }
    if (type === "chorus") {
      const input = ctx.createGain(), output = ctx.createGain();
      const delay = ctx.createDelay(0.06); delay.delayTime.value = 0.025;
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 1.2;
      const depth = ctx.createGain(); depth.gain.value = 0.004;
      lfo.connect(depth); depth.connect(delay.delayTime); lfo.start();
      input.connect(delay); delay.connect(output);
      return { input, output, setParam: (k, v) => {
        if (k === "rate") lfo.frequency.setTargetAtTime(v, ctx.currentTime, 0.05);
        if (k === "depth") depth.gain.setTargetAtTime(v * 0.008, ctx.currentTime, 0.05);
      } };
    }
    if (type === "drive") {
      const input = ctx.createGain(), output = ctx.createGain();
      const shaper = ctx.createWaveShaper(); shaper.curve = tapeCurve(4) as Float32Array<ArrayBuffer>; shaper.oversample = "4x";
      const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 6000;
      input.connect(shaper); shaper.connect(tone); tone.connect(output);
      return { input, output, setParam: (k, v) => {
        if (k === "drive") shaper.curve = tapeCurve(1 + v * 8) as Float32Array<ArrayBuffer>;
        if (k === "tone") tone.frequency.setTargetAtTime(v, ctx.currentTime, 0.05);
      } };
    }
    // phaser
    const input = ctx.createGain(), output = ctx.createGain();
    const stages: BiquadFilterNode[] = [];
    let prev: AudioNode = input;
    for (let i = 0; i < 4; i++) { const ap = ctx.createBiquadFilter(); ap.type = "allpass"; ap.frequency.value = 800 + i * 300; prev.connect(ap); prev = ap; stages.push(ap); }
    prev.connect(output);
    const fb = ctx.createGain(); fb.gain.value = 0.3; prev.connect(fb); fb.connect(stages[0]);
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.5;
    const depth = ctx.createGain(); depth.gain.value = 700;
    lfo.connect(depth); for (const ap of stages) depth.connect(ap.frequency); lfo.start();
    void t;
    return { input, output, setParam: (k, v) => {
      if (k === "rate") lfo.frequency.setTargetAtTime(v, ctx.currentTime, 0.05);
      if (k === "depth") depth.gain.setTargetAtTime(v * 1400, ctx.currentTime, 0.05);
      if (k === "feedback") fb.gain.setTargetAtTime(clamp(v, 0, 0.9), ctx.currentTime, 0.05);
    } };
  }

  private reverbIR(seconds: number): AudioBuffer {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    return buf;
  }

  level(): number {
    if (!this.started) return 0;
    const buf = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(buf);
    let peak = 0; for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
    return peak / 128;
  }

  /** Spectral centroid (Hz) of the live output — used to verify the filter responds. */
  centroid(): number {
    if (!this.started) return 0;
    const n = this.analyser.frequencyBinCount, buf = new Uint8Array(n); this.analyser.getByteFrequencyData(buf);
    const nyq = this.ctx.sampleRate / 2; let num = 0, den = 0;
    for (let i = 0; i < n; i++) { const f = (i / n) * nyq; num += f * buf[i]; den += buf[i]; }
    return den > 0 ? num / den : 0;
  }

  get params(): JunoParams { return this.p; }
}

// ---- presets ---------------------------------------------------------------

const PRESETS: Record<string, Partial<JunoParams>> = {
  "Strings": { sawOn: true, pulseOn: true, sub: 0.2, noise: 0, pwm: 0.5, pwmMode: "lfo", vcfFreq: 0.42, vcfEnv: 0.3, vcfRes: 0.08, envA: 0.5, envD: 0.8, envS: 0.85, envR: 0.9, chorus: "I+II" },
  "Brass":   { sawOn: true, pulseOn: true, sub: 0.3, vcfFreq: 0.32, vcfEnv: 0.7, vcfRes: 0.22, envA: 0.06, envD: 0.4, envS: 0.6, envR: 0.4, chorus: "I" },
  "Bass":    { sawOn: true, pulseOn: false, sub: 0.8, noise: 0, vcfFreq: 0.26, vcfEnv: 0.6, vcfRes: 0.32, envA: 0.005, envD: 0.25, envS: 0.2, envR: 0.2, chorus: "off", vcfKbd: 0.45, range: 0 },
  "Pluck":   { sawOn: false, pulseOn: true, sub: 0.2, vcfFreq: 0.55, vcfEnv: 0.6, vcfRes: 0.3, envA: 0.005, envD: 0.3, envS: 0.0, envR: 0.25, chorus: "II" },
  "Pad":     { sawOn: true, pulseOn: true, sub: 0.3, pwm: 0.6, pwmMode: "lfo", vcfFreq: 0.4, vcfEnv: 0.3, vcfLfo: 0.12, envA: 1.1, envD: 1.0, envS: 0.85, envR: 1.6, chorus: "I+II", vcfRes: 0.1 },
};

// ---- effect param tables (UI) ---------------------------------------------

interface FxParam { key: string; label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string; }
// Every effect ships OFF with MIX at 0. `onMix` is the wet level applied when you flip
// the effect on while its MIX is still 0, so enabling is immediately audible without
// hunting for the fader. The non-mix params have musical defaults but stay inaudible
// until the effect is on and wet.
const FX_TABLE: { type: FxType; label: string; onMix: number; params: FxParam[] }[] = [
  { type: "delay", label: "DELAY", onMix: 0.35, params: [
    { key: "time", label: "TIME", min: 0.02, max: 1.2, step: 0.01, value: 0.3, fmt: secs },
    { key: "feedback", label: "FEEDBACK", min: 0, max: 0.95, step: 0.01, value: 0.4, fmt: pct },
    { key: "tone", label: "TONE", min: 300, max: 12000, step: 50, value: 4000, fmt: hz },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, value: 0, fmt: pct },
  ] },
  { type: "reverb", label: "REVERB", onMix: 0.3, params: [
    { key: "decay", label: "DECAY", min: 0.3, max: 6, step: 0.1, value: 2.5, fmt: secs },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, value: 0, fmt: pct },
  ] },
  { type: "chorus", label: "CHORUS", onMix: 0.5, params: [
    { key: "rate", label: "RATE", min: 0.05, max: 6, step: 0.05, value: 1.2, fmt: hz1 },
    { key: "depth", label: "DEPTH", min: 0, max: 1, step: 0.01, value: 0.5, fmt: pct },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, value: 0, fmt: pct },
  ] },
  { type: "drive", label: "DRIVE", onMix: 0.6, params: [
    { key: "drive", label: "DRIVE", min: 0, max: 1, step: 0.01, value: 0.4, fmt: pct },
    { key: "tone", label: "TONE", min: 500, max: 12000, step: 50, value: 6000, fmt: hz },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, value: 0, fmt: pct },
  ] },
  { type: "phaser", label: "PHASER", onMix: 0.5, params: [
    { key: "rate", label: "RATE", min: 0.05, max: 6, step: 0.05, value: 0.5, fmt: hz1 },
    { key: "depth", label: "DEPTH", min: 0, max: 1, step: 0.01, value: 0.6, fmt: pct },
    { key: "feedback", label: "FEEDBACK", min: 0, max: 0.9, step: 0.01, value: 0.3, fmt: pct },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, value: 0, fmt: pct },
  ] },
];

// ===========================================================================
//  PAGE
// ===========================================================================

const synth = new Juno106();

const page = instrumentPage(root, {
  kicker: "ROLAND JUNO-106 · 6-VOICE POLYSYNTH",
  title: "Juno-106.",
  standfirst:
    "A faithful Web Audio Juno-106 in the hardware's own layout. Power on, then play your computer keyboard (A–K, Z/X for octave) or the keys below — or run the step sequencer. Sliders are grouped LFO · DCO · HPF · VCF · VCA · ENV · CHORUS, just like the panel.",
});

// page-local styling for the compact hardware panel
const style = document.createElement("style");
style.textContent = `
.jpanel{display:flex;flex-wrap:wrap;gap:10px}
.jsec{display:flex;flex-direction:column;gap:10px;padding:12px 12px 10px;border:1px solid rgba(var(--lw),0.13);border-radius:7px;background:var(--panel)}
.jsec h4{margin:0;font-family:${MONO};font-size:9px;letter-spacing:0.18em;color:var(--fg4)}
.jrow{display:flex;gap:9px;align-items:flex-end}
.jfader-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;width:30px}
.jfader{appearance:auto;accent-color:var(--fg);writing-mode:vertical-lr;direction:rtl;width:20px;height:104px;cursor:pointer;background:transparent}
.jfader:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.jfader-lab{font-family:${MONO};font-size:8px;letter-spacing:0.04em;color:var(--fg3);text-align:center;line-height:1.1;height:18px;display:flex;align-items:center}
.jfader-val{font-family:${MONO};font-size:8px;color:var(--fg4);font-variant-numeric:tabular-nums}
.jsw{display:flex;flex-direction:column;gap:6px}
.jtog{appearance:none;background:transparent;border:1px solid rgba(var(--lw),0.26);border-radius:4px;color:var(--fg3);font-family:${MONO};font-size:9px;letter-spacing:0.08em;padding:7px 9px;cursor:pointer;transition:background .15s,color .15s}
.jtog[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.jtog:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.jseq{display:grid;gap:3px}
.jcell{aspect-ratio:1/1;min-height:15px;border:1px solid rgba(var(--lw),0.14);border-radius:3px;background:transparent;cursor:pointer;padding:0}
.jcell[data-on="1"]{background:var(--fg);border-color:var(--fg)}
.jcell[data-play="1"]{box-shadow:inset 0 0 0 2px rgba(var(--lw),0.5)}
.jcol-now{background:rgba(var(--lw),0.07)}
.jfx{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.jfxcard{border:1px solid rgba(var(--lw),0.13);border-radius:7px;padding:14px 16px 16px;background:var(--panel);display:flex;flex-direction:column;gap:14px;transition:border-color .2s,opacity .2s;opacity:0.62}
.jfxcard[data-on="1"]{border-color:rgba(var(--lw),0.4);opacity:1}
.jfxhead{display:flex;justify-content:space-between;align-items:center;gap:10px}
.jfxname{font-family:${MONO};font-size:11px;letter-spacing:0.16em;color:var(--fg2)}
.jfxcard[data-on="1"] .jfxname{color:var(--fg)}
`;
document.head.appendChild(style);

const controls: Partial<Record<keyof JunoParams, { set(v: number): void }>> = {};

// ---- transport -------------------------------------------------------------
const transport = panel("TRANSPORT");
const trow = document.createElement("div");
trow.style.cssText = "display:flex;flex-wrap:wrap;gap:16px;align-items:center";
const power = powerButton(async (on) => { if (on) { await ensureAudio(); await synth.start(); applyAllFx(); synth.setMuted(false); } else { synth.setMuted(true); setTimeout(() => { if (power.el.dataset.on !== "1") suspendAudio(); }, 240); } });
const presetSeg = segmented({
  label: "PATCH", value: "Init" as string,
  options: [{ value: "Init", label: "INIT" }, ...Object.keys(PRESETS).map((k) => ({ value: k, label: k.toUpperCase() }))],
  onChange: (k) => applyPreset(k),
});
const meterWrap = document.createElement("div");
meterWrap.style.cssText = "flex:1 1 140px;min-width:120px;display:flex;align-items:center;gap:10px";
meterWrap.innerHTML = `<span style="font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4)">OUT</span>`;
const meterBar = document.createElement("div");
meterBar.style.cssText = "flex:1;height:4px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden";
const meterFill = document.createElement("div"); meterFill.style.cssText = "height:100%;width:0%;background:var(--fg);transition:width .06s linear";
meterBar.append(meterFill); meterWrap.append(meterBar);
trow.append(power.el, presetSeg.el, meterWrap);
transport.body.append(trow);

// ---- synth panel (hardware layout) ----------------------------------------
// switch refs kept for preset re-sync (segmented/toggle controls)
const swRefs = {
  pwmMode: null as null | { set(v: "lfo" | "man" | "env"): void },
  saw: null as null | { set(v: boolean): void },
  pulse: null as null | { set(v: boolean): void },
  range: null as null | { set(v: "16" | "8" | "4"): void },
  pol: null as null | { set(v: "+" | "−"): void },
  vca: null as null | { set(v: "env" | "gate"): void },
  chorus: null as null | { set(v: JunoParams["chorus"]): void },
};
const synthPanel = panel("SYNTHESIZER");
const jp = document.createElement("div"); jp.className = "jpanel"; synthPanel.body.append(jp);

// LFO
jp.append(section("LFO", (row) => {
  row.append(fader("lfoRate", "RATE", 0.1, 15, 0.1, DEFAULTS.lfoRate, hz1));
  row.append(fader("lfoDelay", "DELAY", 0, 3, 0.05, DEFAULTS.lfoDelay, secs));
}));

// DCO
jp.append(section("DCO", (row) => {
  row.append(fader("dcoLfo", "LFO", 0, 1, 0.01, DEFAULTS.dcoLfo, pct));
  row.append(fader("pwm", "PWM", 0, 1, 0.01, DEFAULTS.pwm, pct));
  row.append(fader("sub", "SUB", 0, 1, 0.01, DEFAULTS.sub, pct));
  row.append(fader("noise", "NOISE", 0, 1, 0.01, DEFAULTS.noise, pct));
}, (sw) => {
  const pwmMode = segmented<"lfo" | "man" | "env">({ value: DEFAULTS.pwmMode,
    options: [{ value: "lfo", label: "LFO" }, { value: "man", label: "MAN" }, { value: "env", label: "ENV" }],
    onChange: (v) => synth.set("pwmMode", v) });
  const saw = toggle("SAW", DEFAULTS.sawOn, (on) => synth.set("sawOn", on));
  const pulse = toggle("PULSE", DEFAULTS.pulseOn, (on) => synth.set("pulseOn", on));
  const range = segmented<"16" | "8" | "4">({ value: "8",
    options: [{ value: "16", label: "16'" }, { value: "8", label: "8'" }, { value: "4", label: "4'" }],
    onChange: (v) => synth.set("range", v === "16" ? -12 : v === "4" ? 12 : 0) });
  swRefs.pwmMode = pwmMode; swRefs.saw = saw; swRefs.pulse = pulse; swRefs.range = range;
  sw.append(labeledSwitch("PWM MODE", pwmMode.el), labeledSwitch("WAVE", row2(saw.el, pulse.el)), labeledSwitch("RANGE", range.el));
}));

// HPF
jp.append(section("HPF", (row) => {
  row.append(fader("hpf", "FREQ", 0, 3, 1, DEFAULTS.hpf, (v) => String(Math.round(v))));
}));

// VCF
jp.append(section("VCF", (row) => {
  row.append(fader("vcfFreq", "FREQ", 0, 1, 0.005, DEFAULTS.vcfFreq, pct));
  row.append(fader("vcfRes", "RES", 0, 1, 0.01, DEFAULTS.vcfRes, pct));
  row.append(fader("vcfEnv", "ENV", 0, 1, 0.01, DEFAULTS.vcfEnv, pct));
  row.append(fader("vcfLfo", "LFO", 0, 1, 0.01, DEFAULTS.vcfLfo, pct));
  row.append(fader("vcfKbd", "KYBD", 0, 1, 0.01, DEFAULTS.vcfKbd, pct));
}, (sw) => {
  const pol = segmented<"+" | "−">({ value: "+",
    options: [{ value: "+", label: "+" }, { value: "−", label: "−" }],
    onChange: (v) => synth.set("vcfPolarity", v === "−" ? -1 : 1) });
  swRefs.pol = pol;
  sw.append(labeledSwitch("ENV POL", pol.el));
}));

// VCA
jp.append(section("VCA", (row) => {
  row.append(fader("volume", "LEVEL", 0, 1, 0.01, DEFAULTS.volume, pct));
}, (sw) => {
  const mode = segmented<"env" | "gate">({ value: "env",
    options: [{ value: "env", label: "ENV" }, { value: "gate", label: "GATE" }],
    onChange: (v) => synth.set("vcaMode", v) });
  swRefs.vca = mode;
  sw.append(labeledSwitch("MODE", mode.el));
}));

// ENV
jp.append(section("ENV", (row) => {
  row.append(fader("envA", "A", 0.001, 3, 0.001, DEFAULTS.envA, secs));
  row.append(fader("envD", "D", 0.001, 3, 0.001, DEFAULTS.envD, secs));
  row.append(fader("envS", "S", 0, 1, 0.01, DEFAULTS.envS, pct));
  row.append(fader("envR", "R", 0.001, 4, 0.001, DEFAULTS.envR, secs));
}));

// CHORUS
jp.append(section("CHORUS", (_row, sw) => {
  const ch = segmented<JunoParams["chorus"]>({ value: DEFAULTS.chorus,
    options: [{ value: "off", label: "OFF" }, { value: "I", label: "I" }, { value: "II", label: "II" }, { value: "I+II", label: "I·II" }],
    onChange: (v) => synth.set("chorus", v) });
  swRefs.chorus = ch;
  sw.append(labeledSwitch("MODE", ch.el));
}));

// ---- effects (layerable; all off by default) ------------------------------
const fxPanel = panel("EFFECTS · LAYERABLE · ALL OFF BY DEFAULT");
const fxGrid = document.createElement("div"); fxGrid.className = "jfx"; fxPanel.body.append(fxGrid);

// remembered UI state so we can (re)push everything to the engine after power-on
interface FxCardState { enabled: boolean; values: Record<string, number>; toggle: { set(v: boolean): void }; mixCtrl: { set(v: number): void }; onMix: number; }
const fxCards: Record<string, FxCardState> = {};

for (const def of FX_TABLE) {
  const card = document.createElement("div"); card.className = "jfxcard"; card.dataset.on = "0";
  const head = document.createElement("div"); head.className = "jfxhead";
  const name = document.createElement("span"); name.className = "jfxname"; name.textContent = def.label;
  const values: Record<string, number> = {};
  for (const pr of def.params) values[pr.key] = pr.value;

  const tog = toggle("ON", false, (on) => {
    fxCards[def.type].enabled = on;
    card.dataset.on = on ? "1" : "0";
    // flip on with mix still 0 → bump to a useful wet level so it's instantly audible
    if (on && values.mix === 0) { values.mix = def.onMix; mixCtrl.set(def.onMix); synth.setFxParam(def.type, "mix", def.onMix); }
    synth.setFxEnabled(def.type, on);
  });
  head.append(name, tog.el);

  const params = document.createElement("div");
  params.style.cssText = "display:flex;flex-direction:column;gap:14px";
  let mixCtrl!: { set(v: number): void };
  for (const pr of def.params) {
    const c = slider({ label: pr.label, min: pr.min, max: pr.max, step: pr.step, value: pr.value, format: pr.fmt,
      onInput: (v) => { values[pr.key] = v; synth.setFxParam(def.type, pr.key, v); } });
    if (pr.key === "mix") mixCtrl = c;
    params.append(c.el);
  }
  card.append(head, params); fxGrid.append(card);
  fxCards[def.type] = { enabled: false, values, toggle: tog, mixCtrl, onMix: def.onMix };
}

// push all current FX state to the engine (called after the graph exists)
function applyAllFx(): void {
  for (const def of FX_TABLE) {
    const st = fxCards[def.type];
    for (const k in st.values) synth.setFxParam(def.type, k, st.values[k]);
    synth.setFxEnabled(def.type, st.enabled);
  }
}

// ---- sequencer -------------------------------------------------------------
const STEPS = 16;
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12]; // major octave, low→high index
const ROWS = SCALE.length; // 8 rows
const seqPanel = panel("SEQUENCER");
const seqHead = document.createElement("div");
seqHead.style.cssText = "display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:16px";
let playing = false, bpm = 110, seqRoot = 60;
const pattern: (number | null)[] = Array(STEPS).fill(null); // row index per step or null
// a friendly default arpeggio
[0, 2, 4, 7, 4, 2, 0, 4, 0, 2, 4, 7, 4, 2, 0, 5].forEach((r, i) => { pattern[i] = r; });

const playBtn = document.createElement("button"); playBtn.className = "inst-link"; playBtn.type = "button"; playBtn.textContent = "▶ PLAY";
playBtn.addEventListener("click", () => togglePlay());
const clearBtn = document.createElement("button"); clearBtn.className = "inst-link"; clearBtn.type = "button"; clearBtn.textContent = "CLEAR";
clearBtn.addEventListener("click", () => { for (let i = 0; i < STEPS; i++) setCell(i, null); });
const tempo = slider({ label: "TEMPO", min: 50, max: 200, step: 1, value: bpm, format: (v) => `${Math.round(v)} BPM`, onInput: (v) => { bpm = v; } });
const rootSel = segmented<string>({ label: "ROOT", value: "C",
  options: [{ value: "C", label: "C" }, { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "G", label: "G" }, { value: "A", label: "A" }],
  onChange: (v) => { seqRoot = ({ C: 60, D: 62, E: 64, G: 67, A: 69 } as Record<string, number>)[v]; } });
seqHead.append(playBtn, clearBtn, tempo.el, rootSel.el);

const seqGrid = document.createElement("div");
seqGrid.className = "jseq";
seqGrid.style.gridTemplateColumns = `repeat(${STEPS},1fr)`;
const cells: HTMLButtonElement[][] = [];
for (let r = 0; r < ROWS; r++) {
  const rowCells: HTMLButtonElement[] = [];
  const deg = ROWS - 1 - r; // top row = highest degree
  for (let s = 0; s < STEPS; s++) {
    const c = document.createElement("button"); c.type = "button"; c.className = "jcell";
    c.setAttribute("aria-label", `step ${s + 1}, ${noteName(seqRoot + SCALE[deg])}`);
    c.addEventListener("click", () => setCell(s, pattern[s] === deg ? null : deg));
    rowCells.push(c);
  }
  cells.push(rowCells);
}
for (let r = 0; r < ROWS; r++) for (let s = 0; s < STEPS; s++) seqGrid.append(cells[r][s]);
seqPanel.body.append(seqHead, seqGrid);

function setCell(step: number, degree: number | null) {
  pattern[step] = degree;
  for (let r = 0; r < ROWS; r++) {
    const deg = ROWS - 1 - r;
    cells[r][step].dataset.on = pattern[step] === deg ? "1" : "0";
  }
}
// paint initial
for (let s = 0; s < STEPS; s++) setCell(s, pattern[s]);

// lookahead scheduler
let curStep = 0, nextTime = 0, schedTimer = 0;
const queue: { step: number; time: number }[] = [];
function togglePlay() {
  if (playing) { stopSeq(); return; }
  playSeq();
}
async function playSeq() {
  await synth.start(); applyAllFx(); power.el.dataset.on = "1"; synth.setMuted(false);
  playing = true; playBtn.textContent = "■ STOP";
  curStep = 0; nextTime = getCtx().currentTime + 0.05;
  schedTimer = window.setInterval(scheduler, 25);
}
function stopSeq() {
  playing = false; playBtn.textContent = "▶ PLAY";
  clearInterval(schedTimer);
  synth.allNotesOff();
  cells.forEach((row) => row.forEach((c) => c.classList.remove("jcol-now")));
}
function getCtx(): AudioContext { return (synth as unknown as { ctx: AudioContext }).ctx; }
function scheduler() {
  const ctx = getCtx(); if (!ctx) return;
  const stepDur = 60 / bpm / 4;
  while (nextTime < ctx.currentTime + 0.12) {
    const deg = pattern[curStep];
    if (deg != null) {
      const midi = seqRoot + SCALE[deg];
      const at = nextTime, gate = stepDur * 0.85;
      schedNote(midi, at, gate);
    }
    queue.push({ step: curStep, time: nextTime });
    nextTime += stepDur; curStep = (curStep + 1) % STEPS;
  }
}
function schedNote(midi: number, at: number, gate: number) {
  const ctx = getCtx(); const delay = Math.max(0, (at - ctx.currentTime) * 1000);
  window.setTimeout(() => { if (playing) synth.noteOn(midi, 0.85); }, delay);
  window.setTimeout(() => { synth.noteOff(midi); }, delay + gate * 1000);
}
function seqDraw() {
  const ctx = getCtx();
  if (playing && ctx) {
    while (queue.length && queue[0].time <= ctx.currentTime) {
      const { step } = queue.shift()!;
      cells.forEach((row) => row.forEach((c, s) => c.classList.toggle("jcol-now", s === step)));
    }
  }
  requestAnimationFrame(seqDraw);
}
requestAnimationFrame(seqDraw);

// ---- keyboard --------------------------------------------------------------
const kbdPanel = panel("KEYBOARD · CLICK OR PLAY A–K");
const keyboard = new Keyboard({ startMidi: 48, octaves: 2, onNoteOn: (m) => synth.noteOn(m), onNoteOff: (m) => synth.noteOff(m) });
kbdPanel.body.append(keyboard.el);

page.stage.append(transport.el, synthPanel.el, fxPanel.el, seqPanel.el, kbdPanel.el);
page.finalize();

function meter() { meterFill.style.width = `${Math.min(100, synth.level() * 140).toFixed(0)}%`; requestAnimationFrame(meter); }
requestAnimationFrame(meter);

(window as Window & { __juno?: unknown }).__juno = {
  engine: synth,
  start: () => synth.start(),
  noteOn: (m: number) => synth.noteOn(m),
  noteOff: (m: number) => synth.noteOff(m),
  set: (k: string, v: unknown) => synth.set(k as keyof JunoParams, v as never),
  level: () => synth.level(),
  centroid: () => synth.centroid(),
  playSeq: () => playSeq(),
  stopSeq: () => stopSeq(),
};

// ---- builders / helpers ----------------------------------------------------

function pct(v: number) { return `${Math.round(v * 100)}`; }
function secs(v: number) { return v < 1 ? `${(v * 1000).toFixed(0)}m` : `${v.toFixed(1)}s`; }
function hz(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`; }
function hz1(v: number) { return `${v.toFixed(1)}`; }

function fader(key: keyof JunoParams, label: string, min: number, max: number, step: number, value: number, fmt: (v: number) => string): HTMLElement {
  const wrap = document.createElement("div"); wrap.className = "jfader-wrap";
  const input = document.createElement("input"); input.type = "range"; input.className = "jfader";
  input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value);
  input.setAttribute("aria-label", label);
  const val = document.createElement("span"); val.className = "jfader-val"; val.textContent = fmt(value);
  const lab = document.createElement("span"); lab.className = "jfader-lab"; lab.textContent = label;
  input.addEventListener("input", () => { const v = parseFloat(input.value); val.textContent = fmt(v); synth.set(key, v as never); });
  controls[key] = { set: (v: number) => { input.value = String(v); val.textContent = fmt(v); } };
  wrap.append(val, input, lab);
  return wrap;
}

function section(title: string, faders?: (row: HTMLElement, sw: HTMLElement) => void, switches?: (sw: HTMLElement) => void): HTMLElement {
  const sec = document.createElement("div"); sec.className = "jsec";
  const h = document.createElement("h4"); h.textContent = title;
  const body = document.createElement("div"); body.style.cssText = "display:flex;gap:12px;align-items:flex-end";
  const row = document.createElement("div"); row.className = "jrow";
  const sw = document.createElement("div"); sw.className = "jsw";
  if (faders) faders(row, sw);
  if (switches) switches(sw);
  if (row.children.length) body.append(row);
  if (sw.children.length) body.append(sw);
  sec.append(h, body);
  return sec;
}

function toggle(label: string, on: boolean, cb: (on: boolean) => void): { el: HTMLButtonElement; set(v: boolean): void } {
  const b = document.createElement("button"); b.type = "button"; b.className = "jtog"; b.textContent = label;
  b.dataset.on = on ? "1" : "0"; b.setAttribute("aria-pressed", String(on));
  b.addEventListener("click", () => { const next = b.dataset.on !== "1"; b.dataset.on = next ? "1" : "0"; b.setAttribute("aria-pressed", String(next)); cb(next); });
  return { el: b, set: (v) => { b.dataset.on = v ? "1" : "0"; b.setAttribute("aria-pressed", String(v)); } };
}

function row2(...els: HTMLElement[]): HTMLElement { const d = document.createElement("div"); d.style.cssText = "display:flex;gap:5px"; d.append(...els); return d; }
function labeledSwitch(label: string, el: HTMLElement): HTMLElement {
  const d = document.createElement("div"); d.style.cssText = "display:flex;flex-direction:column;gap:5px";
  const l = document.createElement("span"); l.style.cssText = `font-family:${MONO};font-size:8px;letter-spacing:0.1em;color:var(--fg4)`; l.textContent = label;
  d.append(l, el); return d;
}

function applyPreset(name: string): void {
  const patch = name === "Init" ? DEFAULTS : { ...DEFAULTS, ...PRESETS[name] };
  for (const k of Object.keys(patch) as (keyof JunoParams)[]) {
    synth.set(k, patch[k] as never);
    const c = controls[k]; if (c) c.set(patch[k] as number);
  }
  swRefs.pwmMode?.set(patch.pwmMode);
  swRefs.saw?.set(patch.sawOn); swRefs.pulse?.set(patch.pulseOn);
  swRefs.range?.set(patch.range === -12 ? "16" : patch.range === 12 ? "4" : "8");
  swRefs.pol?.set(patch.vcfPolarity === -1 ? "−" : "+");
  swRefs.vca?.set(patch.vcaMode);
  swRefs.chorus?.set(patch.chorus);
}
}
