// Biome engine — the headless Web Audio core extracted from biome.ts so it can be
// reused by the full player, a future mini builder, and embeds. No DOM here; pure
// audio graph + state. Same logic, same numbers as the original mount() closure.

import { ensureAudio } from "./shared";

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---- frequency atlas (from the research pass) ------------------------------

export type Ev = "R" | "T" | "N";
export interface Freq { hz: number; label: string; cat: string; claim: string; ev: Ev; }

export const ATLAS: Freq[] = [
  // Solfeggio (standard 6 + extended 3)
  { hz: 174, label: "174 · Foundation", cat: "Solfeggio", claim: "Pain relief, grounding, safety", ev: "N" },
  { hz: 285, label: "285 · Tissue", cat: "Solfeggio", claim: "Tissue & field repair", ev: "N" },
  { hz: 396, label: "396 · Liberation (UT)", cat: "Solfeggio", claim: "Releases fear & guilt · Root", ev: "N" },
  { hz: 417, label: "417 · Change (RE)", cat: "Solfeggio", claim: "Undoing situations · Sacral", ev: "N" },
  { hz: 528, label: "528 · Love / DNA (MI)", cat: "Solfeggio", claim: "Transformation, “DNA repair” · Solar Plexus", ev: "N" },
  { hz: 639, label: "639 · Connection (FA)", cat: "Solfeggio", claim: "Relationships, harmony · Heart", ev: "N" },
  { hz: 741, label: "741 · Awakening (SOL)", cat: "Solfeggio", claim: "Detox, expression · Throat", ev: "N" },
  { hz: 852, label: "852 · Intuition (LA)", cat: "Solfeggio", claim: "Inner wisdom · Third Eye", ev: "N" },
  { hz: 963, label: "963 · Crown (SI)", cat: "Solfeggio", claim: "Pineal, oneness · Crown", ev: "N" },
  // Tuning
  { hz: 432, label: "432 · Verdi tuning", cat: "Tuning", claim: "“Natural” calming pitch", ev: "N" },
  { hz: 440, label: "440 · Concert A", cat: "Tuning", claim: "Modern ISO standard", ev: "R" },
  // Earth / cosmic resonance
  { hz: 136.1, label: "136.1 · OM / Earth Year", cat: "Earth", claim: "OM chant tone, grounding", ev: "N" },
  { hz: 126.22, label: "126.22 · Sun", cat: "Earth", claim: "Centering, solar vitality", ev: "N" },
  { hz: 210.42, label: "210.42 · Moon", cat: "Earth", claim: "Emotional balance, intuition", ev: "N" },
  { hz: 194.18, label: "194.18 · Earth Day", cat: "Earth", claim: "Energising, vitality", ev: "N" },
  { hz: 172.06, label: "172.06 · Platonic Year", cat: "Earth", claim: "Clarity, cosmic consciousness", ev: "N" },
  { hz: 110, label: "110 · Hypogeum", cat: "Earth", claim: "Trance/hypnagogic shift", ev: "T" },
  // Chakra (note-set, 256-base)
  { hz: 256, label: "256 · Root (C)", cat: "Chakra", claim: "Grounding, security", ev: "N" },
  { hz: 288, label: "288 · Sacral (D)", cat: "Chakra", claim: "Creativity, emotion", ev: "N" },
  { hz: 320, label: "320 · Solar (E)", cat: "Chakra", claim: "Personal power", ev: "N" },
  { hz: 341.3, label: "341 · Heart (F)", cat: "Chakra", claim: "Love, compassion", ev: "N" },
  { hz: 384, label: "384 · Throat (G)", cat: "Chakra", claim: "Expression, truth", ev: "N" },
  { hz: 480, label: "480 · Crown (B)", cat: "Chakra", claim: "Spirit, connection", ev: "N" },
  // Tesla / numerology (angel numbers)
  { hz: 369, label: "369 · Tesla 3·6·9", cat: "Tesla", claim: "“Key to the universe”, manifestation", ev: "N" },
  { hz: 111, label: "111 · Angel — new starts", cat: "Numerology", claim: "Manifestation, clarity", ev: "N" },
  { hz: 222, label: "222 · Angel — balance", cat: "Numerology", claim: "Harmony, trust", ev: "N" },
  { hz: 444, label: "444 · Angel — protection", cat: "Numerology", claim: "Protection, alignment", ev: "N" },
  { hz: 528 + 0, label: "555 · Angel — change", cat: "Numerology", claim: "Transformation", ev: "N" }, // placeholder fixed below
  { hz: 777, label: "777 · Angel — luck", cat: "Numerology", claim: "Awakening, inner wisdom", ev: "N" },
  { hz: 888, label: "888 · Angel — abundance", cat: "Numerology", claim: "Prosperity, infinite flow", ev: "N" },
  { hz: 999, label: "999 · Angel — completion", cat: "Numerology", claim: "Release, new phase", ev: "N" },
];
ATLAS.find((f) => f.label.startsWith("555"))!.hz = 555; // fix the placeholder

// Brainwave bands — the binaural/isochronic beat (difference) frequencies
export interface Band { hz: number; label: string; note: string; }
export const BANDS: Band[] = [
  { hz: 2.0, label: "Delta 2 Hz", note: "deep sleep, restoration (R/T)" },
  { hz: 4.0, label: "Theta 4 Hz", note: "deep meditation" },
  { hz: 6.0, label: "Theta 6 Hz", note: "meditation, creativity" },
  { hz: 7.83, label: "Schumann 7.83", note: "Earth’s heartbeat (R physics)" },
  { hz: 10.0, label: "Alpha 10 Hz", note: "relaxed calm" },
  { hz: 14.0, label: "Beta 14 Hz", note: "alert focus" },
  { hz: 18.0, label: "Beta 18 Hz", note: "active focus" },
  { hz: 40.0, label: "Gamma 40 Hz", note: "peak focus; Alzheimer’s research (R)" },
];

// Carriers usable as audible base pitches (skip sub-audio earth tones as carriers)
export const CARRIERS = ATLAS.filter((f) => f.hz >= 100);
export const CARRIER_HZ = CARRIERS.map((f) => f.hz);

// ---- engine ----------------------------------------------------------------

export type StrandType = "tone" | "binaural" | "isochronic" | "noise" | "drone";

export interface Strand {
  enabled: boolean; type: StrandType; hz: number; beat: number;
  level: number; pan: number; breath: number; breathRate: number; tone: number;
}
export interface MasterState { volume: number; reverb: number; breath: number; breathRate: number; }

interface StrandNodes {
  filter: BiquadFilterNode; level: GainNode; panner: StereoPannerNode;
  breathLfo: OscillatorNode; breathGain: GainNode;
  sources: AudioNode[];
}

export const NSTRANDS = 8;
export const toneHz = (x: number) => 180 * Math.pow(48, clamp(x, 0, 1)); // 180..8600 Hz, log

export function defaultStrand(): Strand {
  return { enabled: false, type: "tone", hz: 432, beat: 7.83, level: 0.5, pan: 0, breath: 0.3, breathRate: 0.1, tone: 0.7 };
}

export class Biome {
  private ctx!: AudioContext;
  private bus!: GainNode; private masterGain!: GainNode; private analyser!: AnalyserNode;
  private reverbWet!: GainNode;
  private masterBreathLfo!: OscillatorNode; private masterBreathGain!: GainNode;
  private brown!: AudioBuffer;
  private strands: Strand[] = Array.from({ length: NSTRANDS }, defaultStrand);
  private nodes: StrandNodes[] = [];
  master: MasterState = { volume: 0.7, reverb: 0.45, breath: 0.4, breathRate: 0.08 };
  private started = false; private muted = false;
  // growth
  private growing = false; private growTimer = 0; private growRate = 0.5; private chaos = 0.3;
  palette: number[] = [136.1, 174, 285, 396, 432, 528, 639];
  onChange: ((i: number) => void) | null = null; // notify UI of autonomous edits

  get ready(): boolean { return this.started; }
  get state(): Strand[] { return this.strands; }

  async start(): Promise<void> {
    const ctx = await ensureAudio();   // always resume the shared context, even if already built
    if (this.started) return; this.ctx = ctx;
    this.brown = this.brownNoise(ctx, 4);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);

    this.masterGain = ctx.createGain(); this.masterGain.gain.value = this.master.volume * 0.4;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.masterGain.connect(this.analyser); this.masterGain.connect(comp);

    // master breath — the whole ecosystem swells gently
    this.masterBreathLfo = ctx.createOscillator(); this.masterBreathLfo.type = "sine"; this.masterBreathLfo.frequency.value = this.master.breathRate;
    this.masterBreathGain = ctx.createGain(); this.masterBreathGain.gain.value = 0;
    this.masterBreathLfo.connect(this.masterBreathGain); this.masterBreathGain.connect(this.masterGain.gain);
    this.masterBreathLfo.start();

    // reverb (deep hall) + dry
    const conv = ctx.createConvolver(); conv.buffer = this.hallIR(ctx, 4.5);
    this.reverbWet = ctx.createGain(); this.reverbWet.gain.value = this.master.reverb;
    const dry = ctx.createGain(); dry.gain.value = 1;
    this.bus = ctx.createGain(); this.bus.gain.value = 0.9;
    this.bus.connect(dry); dry.connect(this.masterGain);
    this.bus.connect(conv); conv.connect(this.reverbWet); this.reverbWet.connect(this.masterGain);

    for (let i = 0; i < NSTRANDS; i++) this.nodes.push(this.buildStrand(this.strands[i]));

    document.addEventListener("visibilitychange", () => { if (!document.hidden && this.ctx.state !== "running") this.ctx.resume(); });
    this.started = true;
    this.applyMaster();
    for (let i = 0; i < NSTRANDS; i++) this.applyStrand(i);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.started) this.masterGain.gain.setTargetAtTime(m ? 0 : this.master.volume * 0.4, this.ctx.currentTime, 0.1);
  }

  private buildStrand(s: Strand): StrandNodes {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = toneHz(s.tone); filter.Q.value = 0.5;
    const level = ctx.createGain(); level.gain.value = 0;
    const panner = ctx.createStereoPanner(); panner.pan.value = 0;
    filter.connect(level); level.connect(panner); panner.connect(this.bus);
    const breathLfo = ctx.createOscillator(); breathLfo.type = "sine"; breathLfo.frequency.value = s.breathRate;
    const breathGain = ctx.createGain(); breathGain.gain.value = 0;
    breathLfo.connect(breathGain); breathGain.connect(level.gain); breathLfo.start();
    const st: StrandNodes = { filter, level, panner, breathLfo, breathGain, sources: [] };
    this.buildSource(s, st);
    return st;
  }

  private buildSource(s: Strand, st: StrandNodes): void {
    const ctx = this.ctx, dest = st.filter;
    for (const n of st.sources) { try { (n as OscillatorNode).stop?.(); } catch { /* noop */ } try { n.disconnect(); } catch { /* noop */ } }
    st.sources = [];
    const add = (n: AudioNode) => st.sources.push(n);
    if (s.type === "tone") {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = s.hz; o.connect(dest); o.start(); add(o);
    } else if (s.type === "drone") {
      for (const [mult, det, lvl, wave] of [[0.5, 0, 0.5, "sine"], [1, -6, 0.32, "sawtooth"], [1, 7, 0.3, "sawtooth"], [2, 2, 0.12, "sine"]] as [number, number, number, OscillatorType][]) {
        const o = ctx.createOscillator(); o.type = wave; o.frequency.value = s.hz * mult; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = lvl; o.connect(g); g.connect(dest); o.start(); add(o); add(g);
      }
    } else if (s.type === "binaural") {
      const oL = ctx.createOscillator(); oL.type = "sine"; oL.frequency.value = s.hz;
      const oR = ctx.createOscillator(); oR.type = "sine"; oR.frequency.value = s.hz + s.beat;
      const pL = ctx.createStereoPanner(); pL.pan.value = -1; const pR = ctx.createStereoPanner(); pR.pan.value = 1;
      oL.connect(pL); pL.connect(dest); oR.connect(pR); pR.connect(dest); oL.start(); oR.start();
      add(oL); add(oR); add(pL); add(pR);
    } else if (s.type === "isochronic") {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = s.hz;
      const gate = ctx.createGain(); gate.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = s.beat;
      const gd = ctx.createGain(); gd.gain.value = 0.5; lfo.connect(gd); gd.connect(gate.gain);
      o.connect(gate); gate.connect(dest); o.start(); lfo.start();
      add(o); add(gate); add(lfo); add(gd);
    } else { // noise
      const src = ctx.createBufferSource(); src.buffer = this.brown; src.loop = true; src.connect(dest); src.start(); add(src);
    }
  }

  /** Update a strand. `fade` (s) gives an organic ramp for growth; default snappy. */
  setStrand(i: number, partial: Partial<Strand>, fade = 0.06): void {
    const s = this.strands[i];
    const rebuild = ("type" in partial && partial.type !== s.type) || ("hz" in partial && partial.hz !== s.hz) || ("beat" in partial && partial.beat !== s.beat);
    Object.assign(s, partial);
    if (!this.started) return;
    if (rebuild) this.buildSource(s, this.nodes[i]);
    this.applyStrand(i, fade);
  }

  private applyStrand(i: number, fade = 0.06): void {
    const s = this.strands[i], st = this.nodes[i], t = this.ctx.currentTime;
    const base = s.enabled ? s.level * 0.45 : 0;
    st.level.gain.setTargetAtTime(base, t, fade);
    st.panner.pan.setTargetAtTime(s.type === "binaural" ? 0 : s.pan, t, fade);
    st.breathLfo.frequency.setTargetAtTime(clamp(s.breathRate, 0.01, 1), t, 0.1);
    st.breathGain.gain.setTargetAtTime(s.enabled ? s.breath * base * 0.95 : 0, t, fade);
    st.filter.frequency.setTargetAtTime(toneHz(s.tone), t, 0.1);
  }

  setMaster(partial: Partial<MasterState>): void {
    Object.assign(this.master, partial);
    if (this.started) this.applyMaster();
  }
  private applyMaster(): void {
    const t = this.ctx.currentTime, m = this.master;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : m.volume * 0.4, t, 0.1);
    this.reverbWet.gain.setTargetAtTime(m.reverb, t, 0.1);
    this.masterBreathLfo.frequency.setTargetAtTime(clamp(m.breathRate, 0.01, 1), t, 0.1);
    this.masterBreathGain.gain.setTargetAtTime(m.volume * 0.4 * m.breath * 0.6, t, 0.1);
  }

  // ---- autonomous growth ---------------------------------------------------

  setGrowing(on: boolean): void {
    this.growing = on;
    clearInterval(this.growTimer);
    if (on) this.growTimer = window.setInterval(() => this.growTick(), this.growIntervalMs());
  }
  setGrowRate(r: number): void {
    this.growRate = clamp(r, 0, 1);
    if (this.growing) { clearInterval(this.growTimer); this.growTimer = window.setInterval(() => this.growTick(), this.growIntervalMs()); }
  }
  private growIntervalMs(): number { return Math.round(9000 - this.growRate * 7000); } // 9s slow → 2s fast
  /** 0 = calm & consonant (gentle blooms, palette-only) · 1 = wild (off-palette, fast turnover). */
  setChaos(c: number): void { this.chaos = clamp(c, 0, 1); }
  setPalette(freqs: number[]): void { if (freqs.length) this.palette = [...new Set(freqs)]; }

  private growTick(): void {
    if (!this.started) return;
    const c = this.chaos;
    const active = this.strands.map((s, i) => ({ s, i })).filter((x) => x.s.enabled);
    const dormant = this.strands.map((s, i) => ({ s, i })).filter((x) => !x.s.enabled);
    const r = this.rand();
    // chaos raises turnover (more withers/shifts) and shrinks the calm "keep blooming" bias
    const minActive = c < 0.5 ? 3 : 2;
    const fade = (lo: number, hi: number) => this.lerp(hi, lo, c) + this.rand() * (2 + c * 3); // higher chaos → snappier fades

    if (dormant.length && (active.length < minActive || r < 0.45 - c * 0.2)) {
      // BLOOM — a new strand fades in
      const slot = dormant[Math.floor(this.rand() * dormant.length)].i;
      // calm chaos favours pads & tones; high chaos invites noise & isochronic pulses
      const calm: StrandType[] = ["tone", "drone", "tone", "binaural", "drone"];
      const wild: StrandType[] = ["noise", "isochronic", "binaural", "tone", "drone", "noise"];
      const type = (this.rand() < c ? wild : calm)[Math.floor(this.rand() * (this.rand() < c ? 6 : 5))];
      // frequency: usually from the consonant palette, but chaos wanders off it / detunes
      let hz = this.palette[Math.floor(this.rand() * this.palette.length)];
      if (this.rand() < c) {
        if (this.rand() < 0.5) hz = CARRIER_HZ[Math.floor(this.rand() * CARRIER_HZ.length)];
        else hz = hz * (1 + (this.rand() - 0.5) * 0.6 * c); // detune → beating / dissonance
      }
      this.setStrand(slot, {
        enabled: true, type, hz, beat: BANDS[Math.floor(this.rand() * BANDS.length)].hz,
        level: 0.22 + this.rand() * (0.3 + c * 0.45), pan: (this.rand() * 2 - 1) * (0.35 + c * 0.6),
        breath: 0.2 + this.rand() * 0.6, breathRate: 0.04 + this.rand() * (0.12 + c * 0.3),
        tone: type === "noise" ? 0.25 + this.rand() * 0.35 : 0.45 + this.rand() * 0.55,
      }, fade(2.5, 8));
      this.onChange?.(slot);
    } else if (active.length > minActive && r < 0.35 + c * 0.4) {
      // WITHER — a strand fades out (more often at high chaos)
      const pick = active[Math.floor(this.rand() * active.length)].i;
      this.setStrand(pick, { enabled: false }, fade(2.5, 7));
      this.onChange?.(pick);
    } else if (active.length) {
      // DRIFT — nudge a living strand; the nudge grows with chaos
      const pick = active[Math.floor(this.rand() * active.length)].i;
      const s = this.strands[pick];
      const k = 0.15 + c * 0.6;
      this.setStrand(pick, {
        pan: clamp(s.pan + (this.rand() * 2 - 1) * k, -1, 1),
        tone: clamp(s.tone + (this.rand() * 2 - 1) * k * 0.6, 0.1, 1),
        level: clamp(s.level + (this.rand() * 2 - 1) * k * 0.6, 0.15, 0.9),
        breathRate: clamp(s.breathRate + (this.rand() * 2 - 1) * 0.05, 0.02, 0.35),
      }, fade(3, 7));
      this.onChange?.(pick);
    }
  }

  private rand(): number { return Math.random(); } // grow is runtime-only; randomness ok here
  private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

  // ---- bulk state ----------------------------------------------------------

  /** Apply a full soundscape: disable all, then set the given strands + master. */
  apply(strands: Partial<Strand>[], master?: Partial<MasterState>): void {
    if (master) this.setMaster(master);
    for (let i = 0; i < NSTRANDS; i++) {
      if (i < strands.length) this.setStrand(i, { ...defaultStrand(), enabled: true, ...strands[i] }, 1.5);
      else this.setStrand(i, { enabled: false }, 1.5);
    }
    const pal = strands.map((s) => s.hz).filter((h): h is number => typeof h === "number");
    if (pal.length) this.setPalette(pal);
    for (let i = 0; i < NSTRANDS; i++) this.onChange?.(i);
  }

  snapshot(): { strands: Strand[]; master: MasterState } {
    return { strands: this.strands.map((s) => ({ ...s })), master: { ...this.master } };
  }

  level(): number {
    if (!this.started) return 0;
    const buf = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(buf);
    let peak = 0; for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
    return peak / 128;
  }

  private brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return buf;
  }
  private hallIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    return buf;
  }
}

// ---- curated presets -------------------------------------------------------

export interface Preset { name: string; master: MasterState; strands: Partial<Strand>[]; }
export const PRESETS: Preset[] = [
  { name: "Deep Rest", master: { volume: 0.7, reverb: 0.55, breath: 0.5, breathRate: 0.05 }, strands: [
    { type: "tone", hz: 174, level: 0.5, pan: -0.2, breath: 0.5, breathRate: 0.05, tone: 0.5 },
    { type: "binaural", hz: 200, beat: 2.0, level: 0.5, breath: 0.3, breathRate: 0.06 },
    { type: "noise", hz: 120, level: 0.3, tone: 0.35, breath: 0.6, breathRate: 0.04 },
    { type: "drone", hz: 136.1, level: 0.35, pan: 0.3, breath: 0.4, breathRate: 0.05, tone: 0.5 },
  ] },
  { name: "Heart Field", master: { volume: 0.72, reverb: 0.5, breath: 0.45, breathRate: 0.07 }, strands: [
    { type: "tone", hz: 528, level: 0.45, pan: -0.3, breath: 0.4, breathRate: 0.07, tone: 0.7 },
    { type: "tone", hz: 639, level: 0.4, pan: 0.3, breath: 0.4, breathRate: 0.06, tone: 0.7 },
    { type: "binaural", hz: 432, beat: 6.0, level: 0.45, breath: 0.3, breathRate: 0.05 },
    { type: "drone", hz: 341.3, level: 0.3, breath: 0.5, breathRate: 0.04, tone: 0.6 },
  ] },
  { name: "Gamma Clarity", master: { volume: 0.7, reverb: 0.3, breath: 0.25, breathRate: 0.12 }, strands: [
    { type: "isochronic", hz: 432, beat: 40, level: 0.42, pan: 0, breath: 0.15, breathRate: 0.1, tone: 0.8 },
    { type: "tone", hz: 963, level: 0.28, pan: 0.4, breath: 0.3, breathRate: 0.09, tone: 0.9 },
    { type: "drone", hz: 216, level: 0.3, pan: -0.3, breath: 0.3, breathRate: 0.08, tone: 0.7 },
  ] },
  { name: "Earth Ground", master: { volume: 0.72, reverb: 0.45, breath: 0.5, breathRate: 0.04 }, strands: [
    { type: "drone", hz: 136.1, level: 0.45, breath: 0.5, breathRate: 0.04, tone: 0.5 },
    { type: "isochronic", hz: 110, beat: 7.83, level: 0.35, pan: 0.2, breath: 0.2, breathRate: 0.06, tone: 0.6 },
    { type: "noise", hz: 100, level: 0.32, tone: 0.3, breath: 0.6, breathRate: 0.03 },
    { type: "tone", hz: 194.18, level: 0.28, pan: -0.3, breath: 0.4, breathRate: 0.05, tone: 0.6 },
  ] },
  { name: "Crown Opening", master: { volume: 0.68, reverb: 0.65, breath: 0.4, breathRate: 0.06 }, strands: [
    { type: "tone", hz: 963, level: 0.36, pan: -0.4, breath: 0.4, breathRate: 0.06, tone: 0.95 },
    { type: "tone", hz: 852, level: 0.34, pan: 0.4, breath: 0.4, breathRate: 0.05, tone: 0.9 },
    { type: "tone", hz: 888, level: 0.26, breath: 0.5, breathRate: 0.07, tone: 1 },
    { type: "binaural", hz: 528, beat: 10, level: 0.4, breath: 0.3, breathRate: 0.05 },
  ] },
  { name: "Schumann Drift", master: { volume: 0.72, reverb: 0.5, breath: 0.55, breathRate: 0.04 }, strands: [
    { type: "drone", hz: 136.1, level: 0.4, pan: -0.2, breath: 0.5, breathRate: 0.04, tone: 0.5 },
    { type: "binaural", hz: 256, beat: 7.83, level: 0.45, breath: 0.3, breathRate: 0.05 },
    { type: "noise", hz: 120, level: 0.28, tone: 0.32, breath: 0.6, breathRate: 0.03 },
  ] },
];

// ---- soundscape generation -------------------------------------------------

/** Pure config generator for the page-level RANDOMISE — returns the soundscape
 *  config (strands + master + palette) with no UI side-effects. Same ranges/logic
 *  as the original page randomise(). */
export function randomConfig(): { strands: Partial<Strand>[]; master: Partial<MasterState>; palette: number[] } {
  const roots = [136.1, 174, 256, 396, 432, 528];
  const root = roots[Math.floor(Math.random() * roots.length)];
  const ratios = [1, 1.5, 2, 4 / 3, 5 / 4, 0.5];
  const palette = ratios.map((r) => root * r);
  const n = 3 + Math.floor(Math.random() * 3);
  const types: StrandType[] = ["tone", "drone", "binaural", "isochronic", "noise"];
  const strands: Partial<Strand>[] = [];
  for (let i = 0; i < n; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    strands.push({
      type, hz: palette[Math.floor(Math.random() * palette.length)],
      beat: BANDS[Math.floor(Math.random() * BANDS.length)].hz,
      level: 0.3 + Math.random() * 0.4, pan: (Math.random() * 2 - 1) * 0.8,
      breath: 0.2 + Math.random() * 0.6, breathRate: 0.03 + Math.random() * 0.16,
      tone: type === "noise" ? 0.25 + Math.random() * 0.3 : 0.5 + Math.random() * 0.5,
    });
  }
  const master: Partial<MasterState> = {
    volume: 0.7, reverb: 0.35 + Math.random() * 0.35, breath: 0.3 + Math.random() * 0.4, breathRate: 0.04 + Math.random() * 0.1,
  };
  return { strands, master, palette };
}
