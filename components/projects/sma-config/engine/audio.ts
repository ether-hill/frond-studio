// Sonification engine — a *visual instrument*. The slime mould's motion doesn't
// just set loudness; it sculpts timbre and space:
//   • each tone maps to a horizontal canvas band (low pitch bottom → high top)
//   • a band's loudness tracks how much the slime is MOVING there
//   • movement opens a per-voice low-pass (brighter) and raises a shimmer
//     harmonic, so motion is audible as a change in tone colour
//   • the stereo pan follows where in the band the motion happens
//   • overall activity sweeps a master filter + a motion tremolo, and feeds
//     reverb + a feedback delay so gestures leave a trail in sound
//
// Healing frequencies: Solfeggio set + 369 Hz and 432 Hz. Start from a gesture.

import { getAudioContext } from "./audioCtx";

export interface Tone { hz: number; label: string; on: boolean; }

export const TONES: Tone[] = [
  { hz: 174, label: "174 · foundation", on: true },
  { hz: 285, label: "285 · tissue", on: false },
  { hz: 369, label: "369 · Tesla", on: true },
  { hz: 396, label: "396 · liberation (UT)", on: true },
  { hz: 417, label: "417 · change (RE)", on: false },
  { hz: 432, label: "432 · natural", on: false },
  { hz: 528, label: "528 · transformation (MI)", on: true },
  { hz: 639, label: "639 · connection (FA)", on: true },
  { hz: 741, label: "741 · awakening (SOL)", on: false },
  { hz: 852, label: "852 · intuition (LA)", on: false },
  { hz: 963, label: "963 · crown (SI)", on: true },
];

export interface Band { energy: number; pan: number; }

interface Voice {
  osc: OscillatorNode;
  shimmer: OscillatorNode;
  shimmerGain: GainNode;
  lp: BiquadFilterNode;
  amp: GainNode;
  pan: StereoPannerNode;
  hz: number;
}

export class Sonifier {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterLP: BiquadFilterNode | null = null;
  private tremGain: GainNode | null = null;
  private revGain: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private fbGain: GainNode | null = null;
  private voices: Voice[] = [];

  // configurable
  masterVolume = 0.5;
  drive = 1.0;          // motion → amplitude
  motionBias = 0.85;    // movement ↔ presence
  brightness = 0.7;     // motion → filter opening
  shimmer = 0.5;        // motion → harmonic
  tremolo = 0.4;        // activity → tremolo depth
  reverb = 0.35;        // wet
  delay = 0.25;         // wet
  waveform: OscillatorType = "sine";
  readonly tones = TONES.map((t) => ({ ...t }));
  private on = false;

  get running(): boolean { return this.on; }

  private makeReverbIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 2.5);
        ch[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return buf;
  }

  async start(): Promise<void> {
    const ctx = getAudioContext();
    await ctx.resume();
    if (this.ctx) { this.on = true; this.master!.gain.setTargetAtTime(this.masterVolume, ctx.currentTime, 0.4); return; }

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 12;
    comp.connect(ctx.destination);

    const master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp);

    const masterLP = ctx.createBiquadFilter();
    masterLP.type = "lowpass"; masterLP.frequency.value = 1200; masterLP.Q.value = 0.4;
    masterLP.connect(master);

    const bus = ctx.createGain(); bus.gain.value = 1;
    bus.connect(masterLP);

    // reverb send
    const conv = ctx.createConvolver(); conv.buffer = this.makeReverbIR(ctx, 2.4);
    const revGain = ctx.createGain(); revGain.gain.value = this.reverb;
    bus.connect(conv); conv.connect(revGain); revGain.connect(comp);

    // feedback-delay send
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.28;
    const delayGain = ctx.createGain(); delayGain.gain.value = this.delay;
    const fbGain = ctx.createGain(); fbGain.gain.value = 0.35;
    bus.connect(delay); delay.connect(fbGain); fbGain.connect(delay);
    delay.connect(delayGain); delayGain.connect(comp);

    // motion tremolo LFO → fans into every voice amp
    const tremLFO = ctx.createOscillator(); tremLFO.type = "sine"; tremLFO.frequency.value = 5.5;
    const tremGain = ctx.createGain(); tremGain.gain.value = 0;
    tremLFO.connect(tremGain); tremLFO.start();

    for (const t of this.tones) {
      const osc = ctx.createOscillator(); osc.type = this.waveform; osc.frequency.value = t.hz;
      const shimmer = ctx.createOscillator(); shimmer.type = "sine"; shimmer.frequency.value = t.hz * 2;
      const shimmerGain = ctx.createGain(); shimmerGain.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = t.hz * 2; lp.Q.value = 0.7;
      const amp = ctx.createGain(); amp.gain.value = 0;
      const pan = ctx.createStereoPanner();

      osc.connect(lp);
      shimmer.connect(shimmerGain); shimmerGain.connect(lp);
      lp.connect(amp); amp.connect(pan); pan.connect(bus);
      tremGain.connect(amp.gain); // AM around the base amplitude
      osc.start(); shimmer.start();

      this.voices.push({ osc, shimmer, shimmerGain, lp, amp, pan, hz: t.hz });
    }

    this.ctx = ctx; this.master = master; this.masterLP = masterLP;
    this.tremGain = tremGain; this.revGain = revGain; this.delayGain = delayGain; this.fbGain = fbGain;
    this.on = true;
    master.gain.setTargetAtTime(this.masterVolume, ctx.currentTime, 0.4);
  }

  // mute instead of suspending — the AudioContext is shared with the input
  async stop(): Promise<void> {
    if (!this.ctx || !this.master) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  setWaveform(w: OscillatorType) {
    this.waveform = w;
    for (const v of this.voices) v.osc.type = w;
  }

  update(bands: Band[]) {
    if (!this.on || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    let activity = 0;

    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      const tone = this.tones[i];
      const b = bands[i] ?? { energy: 0, pan: 0 };
      const e = b.energy;
      activity += e;

      const amp = tone.on ? Math.min(0.2, Math.pow(e, 0.6) * this.drive * 0.2) : 0;
      v.amp.gain.setTargetAtTime(amp, t, 0.09);
      // movement opens the filter and adds the shimmer harmonic
      const cutoff = v.hz * 1.0 + this.brightness * (300 + e * 7000);
      v.lp.frequency.setTargetAtTime(cutoff, t, 0.1);
      v.shimmerGain.gain.setTargetAtTime(tone.on ? e * this.shimmer * 0.5 : 0, t, 0.1);
      v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, b.pan)), t, 0.12);
    }

    activity = Math.min(1, activity / Math.max(1, this.voices.length) * 3);
    this.master.gain.setTargetAtTime(this.masterVolume, t, 0.15);
    this.masterLP?.frequency.setTargetAtTime(500 + activity * 9000, t, 0.15);
    this.tremGain?.gain.setTargetAtTime(activity * this.tremolo * 0.12, t, 0.1);
    this.revGain?.gain.setTargetAtTime(this.reverb, t, 0.2);
    this.delayGain?.gain.setTargetAtTime(this.delay, t, 0.2);
    this.fbGain?.gain.setTargetAtTime(0.25 + this.delay * 0.3, t, 0.2);
  }
}
