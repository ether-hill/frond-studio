// Space Echo — a Roland RE-201 emulator in Web Audio. The RE-201 is a tape-loop
// delay: a record head writes to a loop of tape that passes three playback heads at
// fixed spacings, with a spring reverb alongside. We model it as three modulated
// delay taps fed from a common tape line, summed into a feedback path that is darkened
// and tape-saturated on every pass (so repeats decay into mush, not clones), plus a
// synthesised spring reverb. The "repeat rate" knob scales all three head times at once
// (tape speed); the mode selector picks which heads are live. Wow & flutter modulate
// the head times for the characteristic seasick pitch drift.
//
// You play it with an onboard mono-saw synth (computer keys / on-screen), an audition
// phrase, or your live microphone routed straight through the tape.

import {
  instrumentPage, panel, controlGrid, slider, segmented, powerButton,
  Keyboard, mtof, ensureAudio, suspendAudio, tapeCurve, MONO,
} from "./shared";

export function mount(root: HTMLElement) {

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const HEAD_RATIO = [1, 1.78, 2.6]; // fixed physical spacing of the three heads

interface EchoParams {
  inputVol: number;     // 0..1
  repeat: number;       // 0..1 → base head time
  intensity: number;    // 0..1 → feedback (self-oscillates near 1)
  echoVol: number;      // 0..1 wet echo
  reverbVol: number;    // 0..1 spring
  wowFlutter: number;   // 0..1
  tape: number;         // 0..1 saturation + repeat darkening (tape age)
  bass: number;         // -1..1
  treble: number;       // -1..1
  heads: boolean[];     // [h1, h2, h3] active
}

const DEFAULTS: EchoParams = {
  inputVol: 0.8, repeat: 0.45, intensity: 0.45, echoVol: 0.7, reverbVol: 0.3,
  wowFlutter: 0.3, tape: 0.5, bass: 0.1, treble: 0, heads: [true, true, false],
};

class SpaceEcho {
  private ctx!: AudioContext;
  private p: EchoParams = { ...DEFAULTS, heads: [...DEFAULTS.heads] };
  private input!: GainNode;        // everything to be echoed enters here
  private tapeIn!: GainNode;       // record head / feedback junction
  private heads: DelayNode[] = [];
  private headGains: GainNode[] = [];
  private echoSum!: GainNode;
  private fb!: GainNode;
  private fbLow!: BiquadFilterNode;
  private fbHigh!: BiquadFilterNode;
  private saturate!: WaveShaperNode;
  private echoVol!: GainNode;
  private reverbSend!: GainNode;
  private reverbVol!: GainNode;
  private bass!: BiquadFilterNode;
  private treble!: BiquadFilterNode;
  private out!: GainNode;
  private analyser!: AnalyserNode;
  private wowLfo!: OscillatorNode;
  private flutterLfo!: OscillatorNode;
  private wowDepth!: GainNode;
  private flutterDepth!: GainNode;
  private synthVoices = new Map<number, { osc: OscillatorNode; amp: GainNode }>();
  private micStream: MediaStream | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private started = false;

  setMuted(m: boolean): void {
    if (!this.started) return;
    this.out.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  async start(): Promise<void> {
    const ctx = await ensureAudio();   // always resume the shared context, even if already built
    if (this.started) return;
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -8; comp.ratio.value = 6; comp.knee.value = 8;
    comp.connect(ctx.destination);

    this.out = ctx.createGain(); this.out.gain.value = 0.9;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.out.connect(this.analyser); this.out.connect(comp);

    // output tone
    this.treble = ctx.createBiquadFilter(); this.treble.type = "highshelf"; this.treble.frequency.value = 3200;
    this.bass = ctx.createBiquadFilter(); this.bass.type = "lowshelf"; this.bass.frequency.value = 200;
    this.treble.connect(this.out); this.bass.connect(this.treble);

    // input bus → dry to output + sends
    this.input = ctx.createGain(); this.input.gain.value = this.p.inputVol;
    this.input.connect(this.bass); // dry

    // ---- echo (tape) ----
    this.tapeIn = ctx.createGain(); this.tapeIn.gain.value = 1;
    this.input.connect(this.tapeIn);
    this.echoSum = ctx.createGain(); this.echoSum.gain.value = 1;

    this.wowLfo = ctx.createOscillator(); this.wowLfo.type = "sine"; this.wowLfo.frequency.value = 0.7;
    this.flutterLfo = ctx.createOscillator(); this.flutterLfo.type = "sine"; this.flutterLfo.frequency.value = 6.4;
    this.wowDepth = ctx.createGain(); this.flutterDepth = ctx.createGain();
    this.wowLfo.connect(this.wowDepth); this.flutterLfo.connect(this.flutterDepth);
    this.wowLfo.start(); this.flutterLfo.start();

    for (let i = 0; i < 3; i++) {
      const d = ctx.createDelay(2.0);
      const g = ctx.createGain(); g.gain.value = this.p.heads[i] ? 1 : 0;
      this.tapeIn.connect(d); d.connect(g); g.connect(this.echoSum);
      this.wowDepth.connect(d.delayTime); this.flutterDepth.connect(d.delayTime);
      this.heads.push(d); this.headGains.push(g);
    }

    // feedback: darken + thin + saturate each pass, then recirculate
    this.fbHigh = ctx.createBiquadFilter(); this.fbHigh.type = "highpass"; this.fbHigh.frequency.value = 160;
    this.fbLow = ctx.createBiquadFilter(); this.fbLow.type = "lowpass"; this.fbLow.frequency.value = 3200;
    this.saturate = ctx.createWaveShaper(); this.saturate.curve = tapeCurve(2.4) as Float32Array<ArrayBuffer>; this.saturate.oversample = "2x";
    this.fb = ctx.createGain(); this.fb.gain.value = 0;
    this.echoSum.connect(this.fbHigh); this.fbHigh.connect(this.fbLow); this.fbLow.connect(this.saturate);
    this.saturate.connect(this.fb); this.fb.connect(this.tapeIn);

    // wet echo to output
    this.echoVol = ctx.createGain(); this.echoVol.gain.value = this.p.echoVol;
    this.echoSum.connect(this.echoVol); this.echoVol.connect(this.bass);

    // ---- spring reverb ----
    const conv = ctx.createConvolver(); conv.buffer = this.springIR(ctx, 2.4);
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 1;
    this.reverbVol = ctx.createGain(); this.reverbVol.gain.value = this.p.reverbVol;
    this.input.connect(this.reverbSend); this.echoSum.connect(this.reverbSend);
    this.reverbSend.connect(conv); conv.connect(this.reverbVol); this.reverbVol.connect(this.bass);

    this.started = true;
    this.applyAll();
  }

  private springIR(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const detune = ch === 0 ? 1 : 1.013;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 5.2);
        // dispersive "boing": frequency rises early, plus a noise tail
        const f = (1400 + 2200 * Math.min(1, t * 2.4)) * detune;
        const chirp = Math.sin(2 * Math.PI * f * t) * 0.55;
        d[i] = (chirp + (Math.random() * 2 - 1) * 0.45) * env;
      }
    }
    return buf;
  }

  // ---- onboard synth (a simple saw voice so there's something to echo) -----

  noteOn(midi: number): void {
    if (!this.started || this.synthVoices.has(midi)) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = mtof(midi);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.Q.value = 0.6;
    const amp = ctx.createGain(); amp.gain.value = 0;
    osc.connect(lp); lp.connect(amp); amp.connect(this.input);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(0.28, t + 0.008);
    amp.gain.linearRampToValueAtTime(0.2, t + 0.12);
    osc.start();
    this.synthVoices.set(midi, { osc, amp });
  }

  noteOff(midi: number): void {
    const v = this.synthVoices.get(midi);
    if (!v) return;
    const t = this.ctx.currentTime;
    v.amp.gain.cancelScheduledValues(t);
    v.amp.gain.setValueAtTime(v.amp.gain.value, t);
    v.amp.gain.setTargetAtTime(0, t, 0.08);
    v.osc.stop(t + 0.6);
    this.synthVoices.delete(midi);
  }

  /** Play a short phrase so the echo is audible without touching the keyboard. */
  audition(): void {
    if (!this.started) return;
    const seq = [60, 64, 67, 72, 67, 64];
    seq.forEach((m, i) => {
      setTimeout(() => { this.noteOn(m); setTimeout(() => this.noteOff(m), 180); }, i * 240);
    });
  }

  // ---- mic ----------------------------------------------------------------

  async enableMic(): Promise<boolean> {
    if (!this.started) await this.start();
    if (this.micNode) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      this.micStream = stream;
      this.micNode = this.ctx.createMediaStreamSource(stream);
      this.micNode.connect(this.input);
      return true;
    } catch { return false; }
  }
  disableMic(): void {
    this.micNode?.disconnect(); this.micNode = null;
    this.micStream?.getTracks().forEach((t) => t.stop()); this.micStream = null;
  }

  // ---- params -------------------------------------------------------------

  set<K extends keyof EchoParams>(key: K, value: EchoParams[K]): void {
    this.p[key] = value;
    if (this.started) this.applyAll();
  }
  setHead(i: number, on: boolean): void {
    this.p.heads[i] = on;
    if (this.started) this.applyAll();
  }

  private applyAll(): void {
    const t = this.ctx.currentTime, p = this.p;
    this.input.gain.setTargetAtTime(p.inputVol, t, 0.05);
    // repeat rate → base head time (0.06..0.75s), heads scaled by spacing
    const baseT = 0.06 + p.repeat * 0.69;
    for (let i = 0; i < 3; i++) {
      this.heads[i].delayTime.setTargetAtTime(clamp(baseT * HEAD_RATIO[i], 0.02, 1.95), t, 0.06);
      this.headGains[i].gain.setTargetAtTime(p.heads[i] ? 1 : 0, t, 0.04);
    }
    // intensity → feedback. allow gentle self-oscillation at the top.
    const activeHeads = p.heads.filter(Boolean).length || 1;
    this.fb.gain.setTargetAtTime(clamp(p.intensity * 1.08, 0, 1.1) / Math.sqrt(activeHeads), t, 0.05);
    this.echoVol.gain.setTargetAtTime(p.echoVol, t, 0.05);
    this.reverbVol.gain.setTargetAtTime(p.reverbVol * 1.4, t, 0.05);
    // tape age: more saturation + darker repeats
    this.fbLow.frequency.setTargetAtTime(4800 - p.tape * 3200, t, 0.06);
    this.saturate.curve = tapeCurve(1.6 + p.tape * 3.5) as Float32Array<ArrayBuffer>;
    // wow & flutter depth (seconds)
    this.wowDepth.gain.setTargetAtTime(p.wowFlutter * 0.0045, t, 0.05);
    this.flutterDepth.gain.setTargetAtTime(p.wowFlutter * 0.0009, t, 0.05);
    // tone
    this.bass.gain.setTargetAtTime(p.bass * 12, t, 0.05);
    this.treble.gain.setTargetAtTime(p.treble * 12, t, 0.05);
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

const echo = new SpaceEcho();

const page = instrumentPage(root, {
  kicker: "ROLAND RE-201 · TAPE DELAY + SPRING REVERB",
  title: "Space Echo.",
  standfirst:
    "The RE-201 in your browser — three tape heads, wow & flutter, tape saturation that smears each repeat, and a spring reverb. Power on, play the onboard synth (A–K) or feed your microphone, and chase the feedback toward self-oscillation.",
});

const transport = panel("TRANSPORT · SOURCE");
const trow = document.createElement("div");
trow.style.cssText = "display:flex;flex-wrap:wrap;gap:18px;align-items:center";
const power = powerButton(async (on) => { if (on) { await ensureAudio(); await echo.start(); echo.setMuted(false); } else { echo.setMuted(true); setTimeout(() => { if (power.el.dataset.on !== "1") suspendAudio(); }, 240); } });
const auditionBtn = document.createElement("button");
auditionBtn.className = "inst-link"; auditionBtn.type = "button"; auditionBtn.textContent = "▶ AUDITION";
auditionBtn.addEventListener("click", async () => { await echo.start(); power.el.dataset.on = "1"; echo.audition(); });
const micSeg = segmented<"synth" | "mic">({
  label: "INPUT", value: "synth",
  options: [{ value: "synth", label: "SYNTH" }, { value: "mic", label: "MIC" }],
  onChange: async (v) => {
    if (v === "mic") {
      await echo.start(); power.el.dataset.on = "1";
      const ok = await echo.enableMic();
      if (!ok) { micSeg.set("synth"); alert("Microphone permission denied or unavailable."); }
    } else echo.disableMic();
  },
});
const meterWrap = document.createElement("div");
meterWrap.style.cssText = "flex:1 1 160px;min-width:140px;display:flex;align-items:center;gap:10px";
meterWrap.innerHTML = `<span style="font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg4)">OUT</span>`;
const meterBar = document.createElement("div");
meterBar.style.cssText = "flex:1;height:4px;border-radius:3px;background:rgba(var(--lw),0.14);overflow:hidden";
const meterFill = document.createElement("div");
meterFill.style.cssText = "height:100%;width:0%;background:var(--fg);transition:width .06s linear";
meterBar.append(meterFill); meterWrap.append(meterBar);
trow.append(power.el, auditionBtn, micSeg.el, meterWrap);
transport.body.append(trow);

// mode (heads)
const modePanel = panel("MODE · TAPE HEADS");
const modeGrid = controlGrid(150);
const modeSeg = segmented<string>({
  label: "HEAD SELECT", value: "1+2",
  options: [
    { value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" },
    { value: "1+2", label: "1+2" }, { value: "2+3", label: "2+3" }, { value: "all", label: "ALL" },
  ],
  onChange: (v) => {
    const map: Record<string, boolean[]> = {
      "1": [true, false, false], "2": [false, true, false], "3": [false, false, true],
      "1+2": [true, true, false], "2+3": [false, true, true], "all": [true, true, true],
    };
    const heads = map[v]; heads.forEach((on, i) => echo.setHead(i, on));
  },
});
modeGrid.append(modeSeg.el);
addSlider(modeGrid, "repeat", "REPEAT RATE", 0, 1, 0.005, DEFAULTS.repeat, pct);
addSlider(modeGrid, "intensity", "INTENSITY", 0, 1, 0.005, DEFAULTS.intensity, pct);
addSlider(modeGrid, "wowFlutter", "WOW · FLUTTER", 0, 1, 0.01, DEFAULTS.wowFlutter, pct);
addSlider(modeGrid, "tape", "TAPE AGE", 0, 1, 0.01, DEFAULTS.tape, pct);
modePanel.body.append(modeGrid);

// levels + tone
const mixPanel = panel("ECHO · REVERB · TONE");
const mixGrid = controlGrid(150);
addSlider(mixGrid, "inputVol", "INPUT", 0, 1, 0.01, DEFAULTS.inputVol, pct);
addSlider(mixGrid, "echoVol", "ECHO VOL", 0, 1, 0.01, DEFAULTS.echoVol, pct);
addSlider(mixGrid, "reverbVol", "REVERB VOL", 0, 1, 0.01, DEFAULTS.reverbVol, pct);
addSlider(mixGrid, "bass", "BASS", -1, 1, 0.02, DEFAULTS.bass, signed);
addSlider(mixGrid, "treble", "TREBLE", -1, 1, 0.02, DEFAULTS.treble, signed);
mixPanel.body.append(mixGrid);

// keyboard
const kbdPanel = panel("ONBOARD SYNTH · CLICK OR PLAY A–K");
const keyboard = new Keyboard({
  startMidi: 48, octaves: 2,
  onNoteOn: (m) => echo.noteOn(m),
  onNoteOff: (m) => echo.noteOff(m),
});
kbdPanel.body.append(keyboard.el);

page.stage.append(transport.el, modePanel.el, mixPanel.el, kbdPanel.el);
page.finalize();

function meter() {
  meterFill.style.width = `${Math.min(100, echo.level() * 140).toFixed(0)}%`;
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

(window as Window & { __echo?: unknown }).__echo = {
  engine: echo,
  start: () => echo.start(),
  audition: () => echo.audition(),
  noteOn: (m: number) => echo.noteOn(m),
  noteOff: (m: number) => echo.noteOff(m),
  level: () => echo.level(),
};

// ---- helpers ---------------------------------------------------------------

function pct(v: number) { return `${Math.round(v * 100)}`; }
function signed(v: number) { return `${v > 0 ? "+" : ""}${Math.round(v * 100)}`; }

function addSlider(
  grid: HTMLElement, key: keyof EchoParams, label: string,
  min: number, max: number, step: number, value: number, format: (v: number) => string,
) {
  const c = slider({ label, min, max, step, value, format, onInput: (v) => echo.set(key, v as never) });
  grid.append(c.el);
}
}
