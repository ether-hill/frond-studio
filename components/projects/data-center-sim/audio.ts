// Data Center Sim — noise sonification.
//
// A self-contained Web Audio graph that turns the site's noise level into an
// actual HVAC drone: a low rumble + mains hum that, as the data center grows,
// gets louder AND harsher (a rising fan whine and brighter filter) so the sound
// itself demonstrates the noise-pollution problem. Uses its own AudioContext so
// it never cross-mutes any other audio feature on the site.

type Ctx = AudioContext;

const MASTER_MAX = 0.22; // hard ceiling so it can't hurt

function brownNoiseBuffer(ctx: Ctx, seconds = 3): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

function whiteNoiseBuffer(ctx: Ctx, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class NoiseAudio {
  private ctx: Ctx;
  private master: GainNode;
  private rumble: BufferSource & { gain: GainNode; lp: BiquadFilterNode };
  private whine: BufferSource & { gain: GainNode; bp: BiquadFilterNode };
  private hums: OscillatorNode[] = [];
  private humGain: GainNode;
  private started = false;
  private disposed = false;
  private intensity = 0;

  constructor() {
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // slow tremolo so the drone "breathes" like real plant equipment
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain).connect(this.master.gain);
    lfo.start();

    // --- low rumble: brown noise through a lowpass ---
    const rSrc = ctx.createBufferSource();
    rSrc.buffer = brownNoiseBuffer(ctx);
    rSrc.loop = true;
    const rLp = ctx.createBiquadFilter();
    rLp.type = "lowpass";
    rLp.frequency.value = 220;
    rLp.Q.value = 0.6;
    const rGain = ctx.createGain();
    rGain.gain.value = 0.9;
    rSrc.connect(rLp).connect(rGain).connect(this.master);
    this.rumble = Object.assign(rSrc, { gain: rGain, lp: rLp });

    // --- fan whine: white noise through a bandpass (only grows in as it gets loud) ---
    const wSrc = ctx.createBufferSource();
    wSrc.buffer = whiteNoiseBuffer(ctx);
    wSrc.loop = true;
    const wBp = ctx.createBiquadFilter();
    wBp.type = "bandpass";
    wBp.frequency.value = 950;
    wBp.Q.value = 3.5;
    const wGain = ctx.createGain();
    wGain.gain.value = 0;
    wSrc.connect(wBp).connect(wGain).connect(this.master);
    this.whine = Object.assign(wSrc, { gain: wGain, bp: wBp });

    // --- mains hum: 60 Hz + harmonic ---
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);
    for (const f of [60, 120]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f === 60 ? 0.5 : 0.25;
      o.connect(g).connect(this.humGain);
      this.hums.push(o);
    }
  }

  /** Begin playback (must be called from a user gesture). */
  async start() {
    if (this.disposed) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.started) {
      this.started = true;
      this.rumble.start();
      this.whine.start();
      for (const o of this.hums) o.start();
    }
    this.applyIntensity();
  }

  async stop() {
    if (this.disposed) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.15);
    // suspend shortly after the fade so we stop burning CPU
    window.setTimeout(() => {
      if (!this.disposed && this.ctx.state === "running") this.ctx.suspend().catch(() => {});
    }, 400);
  }

  /** 0..1 — how loud/harsh the plant sounds. */
  setIntensity(x: number) {
    this.intensity = Math.max(0, Math.min(1, x));
    if (this.started && this.ctx.state === "running") this.applyIntensity();
  }

  private applyIntensity() {
    const x = this.intensity;
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, t, 0.35);

    // steep master curve → quiet stays quiet, big sites get dramatically louder
    set(this.master.gain, Math.pow(x, 1.6) * MASTER_MAX);
    // brighter/harsher rumble as it grows
    set(this.rumble.lp.frequency, 180 + x * 1100);
    // fan whine only bites in once the site is substantial
    const whineAmt = Math.pow(Math.max(0, (x - 0.3) / 0.7), 2);
    set(this.whine.gain.gain, whineAmt * 0.7);
    set(this.humGain.gain, 0.15 + x * 0.5);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      if (this.started) {
        this.rumble.stop();
        this.whine.stop();
        for (const o of this.hums) o.stop();
      }
    } catch {
      /* already stopped */
    }
    this.ctx.close().catch(() => {});
  }
}

type BufferSource = AudioBufferSourceNode;
