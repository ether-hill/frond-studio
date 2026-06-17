// Audio input for v6 · Resonator — analyses a microphone or an audio file and
// exposes a log-spaced spectrum plus level/bass/mid/treble so the simulation can
// be sculpted by sound (a music visualiser that drives the slime).

import { getAudioContext } from "./audioCtx";

export interface Spectrum {
  bands: number[]; // log-spaced magnitudes 0..1
  level: number; // overall loudness 0..1
  bass: number;
  mid: number;
  treble: number;
}

export class AudioInput {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array = new Uint8Array(0);
  private node: AudioNode | null = null;
  private el: HTMLAudioElement | null = null;
  active = false;
  label = "";

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = getAudioContext();
    return this.ctx;
  }

  private wire(src: AudioNode, toSpeakers: boolean) {
    this.disconnectSource();
    const ctx = this.ensureCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3; // low, so bass transients (beats) survive
    src.connect(analyser);
    if (toSpeakers) src.connect(ctx.destination);
    this.analyser = analyser;
    this.node = src;
    this.data = new Uint8Array(analyser.frequencyBinCount);
    this.active = true;
  }

  async useMic(): Promise<void> {
    const ctx = this.ensureCtx();
    await ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.wire(ctx.createMediaStreamSource(stream), false);
    this.label = "microphone";
  }

  async useFile(file: File): Promise<void> {
    const ctx = this.ensureCtx();
    await ctx.resume();
    const el = new Audio();
    el.src = URL.createObjectURL(file);
    el.loop = true;
    el.crossOrigin = "anonymous";
    this.el = el;
    this.wire(ctx.createMediaElementSource(el), true);
    this.label = file.name;
    // fire-and-forget: play() can hang while another audio node is active, so
    // don't await it — the analyser starts delivering data once playback begins
    el.play().catch(() => { /* will start on a later gesture */ });
  }

  private disconnectSource() {
    try { this.node?.disconnect(); } catch { /* noop */ }
    try { this.analyser?.disconnect(); } catch { /* noop */ }
  }

  stop() {
    this.el?.pause();
    if (this.el) { URL.revokeObjectURL(this.el.src); this.el = null; }
    this.disconnectSource();
    this.analyser = null;
    this.active = false;
    this.label = "";
  }

  read(nBands = 48): Spectrum | null {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.data as Uint8Array<ArrayBuffer>);
    const bins = this.data.length;
    // log-spaced bands over the musically useful range (skip the top octave)
    const top = Math.floor(bins * 0.7);
    const bands: number[] = [];
    let level = 0;
    for (let i = 0; i < nBands; i++) {
      const a = Math.floor(Math.pow(i / nBands, 2) * top);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / nBands, 2) * top));
      let s = 0;
      for (let j = a; j < b; j++) s += this.data[j];
      const v = s / ((b - a) * 255);
      bands.push(v);
      level += v;
    }
    level /= nBands;
    const slice = (lo: number, hi: number) => {
      let s = 0, n = 0;
      for (let j = Math.floor(bins * lo); j < Math.floor(bins * hi); j++) { s += this.data[j]; n++; }
      return n ? s / (n * 255) : 0;
    };
    // bass = sub-bass PEAK (not a wide average) so a kick reads strongly for beat detection
    let bass = 0;
    for (let j = 1; j < 10; j++) bass = Math.max(bass, this.data[j] / 255);
    return { bands, level, bass, mid: slice(0.08, 0.3), treble: slice(0.3, 0.65) };
  }
}
