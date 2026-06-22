// Shared toolkit for the playable /instruments rack — a monochrome control kit that
// extends FROND's tokens (--fg/--bg/--lw...), the page scaffold (header → hero →
// stage → footer), and a reusable musical keyboard (on-screen + computer-key, multi-
// touch). Every instrument (Juno-106, Space Echo, Theremin) builds on these so the
// three feel like one rack. Controls are native <input>/<button> for keyboard
// operability and focus-visible; nothing here is skeuomorphic — tone does the work.

import { getAudioContext } from "../audioCtx";

export const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
export const HELV = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export const reduceMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// ---- audio helpers ---------------------------------------------------------

/** Equal-tempered MIDI note → frequency (A4 = 69 = 440 Hz). */
export const mtof = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
/** MIDI → name with octave, e.g. 60 → "C4". */
export const noteName = (midi: number) => {
  const m = Math.round(midi);
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
};

/** A reusable resumed AudioContext — call from a user gesture before building a graph. */
export async function ensureAudio(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state !== "running") await ctx.resume();
  return ctx;
}

/** Hard-stop all audio (used on power-off): suspends the shared context so every
 *  oscillator and node is frozen — guaranteed silence, not just a gain ramp. */
export function suspendAudio(): void {
  try { const ctx = getAudioContext(); if (ctx.state === "running") ctx.suspend(); } catch { /* no context yet */ }
}

// ---- one-time CSS ----------------------------------------------------------

let cssDone = false;
export function injectCss(): void {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
.inst-stage{max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter) clamp(64px,8vw,110px)}
.inst-panel{border:1px solid rgba(var(--lw),0.13);border-radius:8px;background:var(--panel);padding:clamp(18px,2.4vw,28px)}
.inst-cap{font-family:${MONO};font-size:10px;letter-spacing:0.22em;color:var(--fg4);margin:0 0 18px}
.inst-ctl{display:flex;flex-direction:column;gap:8px;min-width:0}
.inst-ctl-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.inst-ctl-label{font-family:${MONO};font-size:10px;letter-spacing:0.14em;color:var(--fg3);text-transform:uppercase}
.inst-ctl-val{font-family:${MONO};font-size:11px;color:var(--fg);white-space:nowrap;font-variant-numeric:tabular-nums}
.inst-range{-webkit-appearance:none;appearance:none;width:100%;height:2px;margin:7px 0;background:rgba(var(--lw),0.22);border-radius:2px;outline:none;cursor:pointer}
.inst-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:var(--fg);border:2px solid var(--bg);cursor:pointer;transition:transform .12s}
.inst-range::-webkit-slider-thumb:hover{transform:scale(1.18)}
.inst-range::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:var(--fg);border:2px solid var(--bg);cursor:pointer}
.inst-range:focus-visible{outline:2px solid var(--fg);outline-offset:6px}
.inst-seg{display:inline-flex;flex-wrap:wrap;border:1px solid rgba(var(--lw),0.22);border-radius:5px;overflow:hidden}
.inst-seg button{appearance:none;background:transparent;color:var(--fg3);border:none;border-left:1px solid rgba(var(--lw),0.14);padding:8px 12px;font-family:${MONO};font-size:11px;letter-spacing:0.04em;cursor:pointer;transition:background .15s,color .15s}
.inst-seg button:first-child{border-left:none}
.inst-seg button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.inst-seg button:not([aria-pressed="true"]):hover{color:var(--fg)}
.inst-seg button:focus-visible{outline:2px solid var(--fg);outline-offset:-2px}
.inst-power{display:inline-flex;align-items:center;gap:11px;background:transparent;color:var(--fg);border:1px solid rgba(var(--lw),0.3);border-radius:40px;padding:12px 22px;font-family:${MONO};font-size:12px;letter-spacing:0.14em;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.inst-power:hover{border-color:rgba(var(--lw),0.6)}
.inst-power[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.inst-power:focus-visible{outline:2px solid var(--fg);outline-offset:4px}
.inst-dot{width:8px;height:8px;border-radius:50%;background:var(--fg4);transition:background .2s}
.inst-power[data-on="1"] .inst-dot{background:var(--bg);animation:instPulse 1.6s ease-in-out infinite}
@keyframes instPulse{0%,100%{opacity:1}50%{opacity:0.3}}
.inst-kbd{position:relative;display:flex;width:100%;height:clamp(120px,18vw,190px);touch-action:none;user-select:none;-webkit-user-select:none}
.inst-wkey{position:relative;flex:1 1 0;border:1px solid rgba(var(--lw),0.25);border-radius:0 0 4px 4px;background:linear-gradient(180deg,rgba(var(--lw),0.02),rgba(var(--lw),0.09));cursor:pointer}
.inst-wkey[data-down="1"]{background:var(--fg)}
.inst-bkey{position:absolute;top:0;width:5.5%;height:62%;transform:translateX(-50%);border:1px solid rgba(var(--lw),0.4);border-radius:0 0 3px 3px;background:linear-gradient(180deg,#101010,#272727);cursor:pointer;z-index:2}
:root[data-theme=light] .inst-bkey{background:linear-gradient(180deg,#3a362d,#1d1b15)}
.inst-bkey[data-down="1"]{background:var(--fg3)}
.inst-link{display:inline-flex;align-items:center;gap:8px;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;text-decoration:none;color:var(--fg);font-family:${MONO};font-size:11px;letter-spacing:0.14em;padding:11px 16px;border:1px solid rgba(var(--lw),0.26);border-radius:4px;transition:background .2s,color .2s}
.inst-link:hover{background:var(--fg);color:var(--bg)}
.inst-link[data-on="1"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.inst-link:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
@media (prefers-reduced-motion: reduce){.inst-power[data-on="1"] .inst-dot{animation:none}}
`;
  document.head.appendChild(s);
}

// ---- page scaffold ---------------------------------------------------------

export interface PageHandle {
  root: HTMLElement;
  /** The centred content column — append panels here. */
  stage: HTMLElement;
  /** Call once all content is appended; mounts the shared footer + animations. */
  finalize(): void;
}

export function instrumentPage(root: HTMLElement, opts: {
  active?: string;
  kicker: string;
  title: string;
  standfirst: string;
}): PageHandle {
  injectCss();

  const hero = document.createElement("section");
  hero.style.cssText =
    "padding:var(--pad-top) 0 clamp(28px,4vw,48px);border-bottom:1px solid rgba(var(--lw),0.1)";
  hero.innerHTML =
    `<div style="max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter)">` +
      `<a href="/projects/instruments" class="inst-link" style="margin-bottom:clamp(20px,3vw,30px)">← THE RACK</a>` +
      `<div style="font-family:${MONO};font-size:11px;letter-spacing:0.26em;color:var(--fg4);margin:clamp(20px,3vw,30px) 0 16px">${opts.kicker}</div>` +
      `<h1 style="margin:0;font-weight:700;font-size:clamp(36px,6.5vw,86px);line-height:0.95;letter-spacing:-0.03em;max-width:16ch">${opts.title}</h1>` +
      `<p style="margin:22px 0 0;max-width:54ch;font-size:clamp(15px,1.9vw,19px);line-height:1.6;color:var(--fg2)">${opts.standfirst}</p>` +
    `</div>`;
  root.appendChild(hero);

  const stage = document.createElement("section");
  stage.className = "inst-stage";
  stage.style.cssText += ";padding-top:clamp(28px,4vw,48px);display:flex;flex-direction:column;gap:clamp(16px,2.2vw,24px)";
  root.appendChild(stage);

  return {
    root, stage,
    finalize() { /* Frond layout provides the footer */ },
  };
}

/** A bordered module with a mono caption. Returns the panel and its body element. */
export function panel(caption: string): { el: HTMLElement; body: HTMLElement } {
  const el = document.createElement("div");
  el.className = "inst-panel";
  const cap = document.createElement("div");
  cap.className = "inst-cap";
  cap.textContent = caption;
  const body = document.createElement("div");
  el.append(cap, body);
  return { el, body };
}

/** Responsive grid of controls inside a panel body. */
export function controlGrid(min = 150): HTMLElement {
  const g = document.createElement("div");
  g.style.cssText = `display:grid;grid-template-columns:repeat(auto-fit,minmax(${min}px,1fr));gap:clamp(16px,2.4vw,30px) clamp(20px,3vw,40px)`;
  return g;
}

// ---- controls --------------------------------------------------------------

export interface SliderOpts {
  label: string; min: number; max: number; step?: number; value: number;
  /** Format the live value readout. */
  format?: (v: number) => string;
  onInput: (v: number) => void;
}
export interface Control { el: HTMLElement; set(v: number): void; }

export function slider(o: SliderOpts): Control {
  const fmt = o.format ?? ((v) => String(v));
  const wrap = document.createElement("div");
  wrap.className = "inst-ctl";
  const head = document.createElement("div");
  head.className = "inst-ctl-head";
  const label = document.createElement("span");
  label.className = "inst-ctl-label"; label.textContent = o.label;
  const val = document.createElement("span");
  val.className = "inst-ctl-val"; val.textContent = fmt(o.value);
  head.append(label, val);
  const input = document.createElement("input");
  input.type = "range"; input.className = "inst-range";
  input.min = String(o.min); input.max = String(o.max);
  input.step = String(o.step ?? (o.max - o.min) / 100);
  input.value = String(o.value);
  input.setAttribute("aria-label", o.label);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    val.textContent = fmt(v);
    o.onInput(v);
  });
  wrap.append(head, input);
  return { el: wrap, set(v) { input.value = String(v); val.textContent = fmt(v); } };
}

export interface SegOpts<T extends string> {
  label?: string; options: { value: T; label: string }[]; value: T;
  onChange: (v: T) => void;
}
export function segmented<T extends string>(o: SegOpts<T>): { el: HTMLElement; set(v: T): void } {
  const wrap = document.createElement("div");
  wrap.className = "inst-ctl";
  if (o.label) {
    const head = document.createElement("div");
    head.className = "inst-ctl-head";
    const label = document.createElement("span");
    label.className = "inst-ctl-label"; label.textContent = o.label;
    head.append(label);
    wrap.append(head);
  }
  const seg = document.createElement("div");
  seg.className = "inst-seg";
  seg.setAttribute("role", "group");
  if (o.label) seg.setAttribute("aria-label", o.label);
  let current = o.value;
  const btns = o.options.map((opt) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = opt.label;
    b.setAttribute("aria-pressed", String(opt.value === current));
    b.addEventListener("click", () => { set(opt.value); o.onChange(opt.value); });
    seg.append(b);
    return { b, value: opt.value };
  });
  function set(v: T) {
    current = v;
    for (const { b, value } of btns) b.setAttribute("aria-pressed", String(value === v));
  }
  wrap.append(seg);
  return { el: wrap, set };
}

/** Big POWER control that wires audio start/stop. onToggle resolves before the UI flips. */
export function powerButton(
  onToggle: (on: boolean) => Promise<void> | void,
  labels?: { on: string; off: string },
): { el: HTMLButtonElement; set(on: boolean): void } {
  const onLabel = labels?.on ?? "SOUND ON";
  const offLabel = labels?.off ?? "POWER ON";
  const b = document.createElement("button");
  b.className = "inst-power"; b.type = "button";
  b.dataset.on = "0";
  b.setAttribute("aria-pressed", "false");
  const render = () => {
    const on = b.dataset.on === "1";
    b.innerHTML = `<span class="inst-dot"></span>${on ? onLabel : offLabel}`;
    b.setAttribute("aria-pressed", String(on));
  };
  render();
  // Reflect state set elsewhere (e.g. when interacting auto-powers the instrument)
  // so the label never desyncs from the data-on visual.
  const set = (on: boolean) => { b.dataset.on = on ? "1" : "0"; render(); };
  let busy = false;
  b.addEventListener("click", async () => {
    if (busy) return; busy = true;
    const next = b.dataset.on !== "1";
    try { await onToggle(next); set(next); }
    finally { busy = false; }
  });
  return { el: b, set };
}

// ---- musical keyboard ------------------------------------------------------

const COMPUTER_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ";": 16,
};
const BLACK = new Set([1, 3, 6, 8, 10]);

export interface KeyboardOpts {
  /** Lowest MIDI note shown (default C3 = 48). */
  startMidi?: number;
  /** Number of octaves rendered (default 2). */
  octaves?: number;
  onNoteOn: (midi: number, velocity?: number) => void;
  onNoteOff: (midi: number) => void;
}

/** Playable keyboard: on-screen (multi-touch, glide on drag) + computer keys. */
export class Keyboard {
  readonly el: HTMLElement;
  private start: number;
  private octaves: number;
  private base = 60; // computer-key octave anchor (C4)
  private keyEls = new Map<number, HTMLElement>();
  private pointers = new Map<number, number>(); // pointerId → midi
  private held = new Set<number>();             // currently-sounding notes (dedup)
  private computerHeld = new Set<string>();

  constructor(private o: KeyboardOpts) {
    this.start = o.startMidi ?? 48;
    this.octaves = o.octaves ?? 2;
    this.el = document.createElement("div");
    this.el.className = "inst-kbd";
    this.el.setAttribute("role", "application");
    this.el.setAttribute("aria-label", "Musical keyboard — click or use your computer keys (A–K)");
    this.build();
    this.wirePointer();
    this.wireComputer();
  }

  private build(): void {
    const n = this.octaves * 12;
    const whites: number[] = [];
    for (let i = 0; i < n; i++) if (!BLACK.has(i % 12)) whites.push(this.start + i);
    // white keys fill the row
    for (const midi of whites) {
      const k = document.createElement("div");
      k.className = "inst-wkey"; k.dataset.midi = String(midi);
      this.el.append(k);
      this.keyEls.set(midi, k);
    }
    // black keys positioned over the gaps
    const whiteW = 100 / whites.length;
    let wIdx = 0;
    for (let i = 0; i < n; i++) {
      const midi = this.start + i;
      const semi = i % 12;
      if (BLACK.has(semi)) {
        const k = document.createElement("div");
        k.className = "inst-bkey"; k.dataset.midi = String(midi);
        k.style.left = `${wIdx * whiteW}%`;
        k.style.width = `${whiteW * 0.62}%`;
        this.el.append(k);
        this.keyEls.set(midi, k);
      } else {
        wIdx++;
      }
    }
  }

  private midiAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const m = el?.dataset?.midi;
    return m ? Number(m) : null;
  }

  private down(midi: number): void {
    if (this.held.has(midi)) return;
    this.held.add(midi);
    this.keyEls.get(midi)?.setAttribute("data-down", "1");
    this.o.onNoteOn(midi);
  }
  private up(midi: number): void {
    if (!this.held.has(midi)) return;
    this.held.delete(midi);
    this.keyEls.get(midi)?.removeAttribute("data-down");
    this.o.onNoteOff(midi);
  }

  private wirePointer(): void {
    this.el.addEventListener("pointerdown", (e) => {
      const midi = this.midiAt(e.clientX, e.clientY);
      if (midi == null) return;
      e.preventDefault();
      this.el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, midi);
      this.down(midi);
    });
    this.el.addEventListener("pointermove", (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const midi = this.midiAt(e.clientX, e.clientY);
      const prev = this.pointers.get(e.pointerId)!;
      if (midi == null || midi === prev) return;
      // glide: release the old note (unless another pointer holds it), play the new
      if (![...this.pointers.entries()].some(([id, m]) => id !== e.pointerId && m === prev)) this.up(prev);
      this.pointers.set(e.pointerId, midi);
      this.down(midi);
    });
    const release = (e: PointerEvent) => {
      const midi = this.pointers.get(e.pointerId);
      if (midi == null) return;
      this.pointers.delete(e.pointerId);
      if (![...this.pointers.values()].includes(midi)) this.up(midi);
    };
    this.el.addEventListener("pointerup", release);
    this.el.addEventListener("pointercancel", release);
    this.el.addEventListener("lostpointercapture", release);
  }

  private wireComputer(): void {
    window.addEventListener("keydown", (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      // Only text-entry fields should swallow the play keys — sliders, buttons and
      // checkboxes must NOT block playing (you can tweak a fader and still play notes;
      // the letter keys don't move a range, which uses arrow keys).
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const isTextField = tag === "TEXTAREA" || el?.isContentEditable === true ||
        (tag === "INPUT" && !["range", "checkbox", "radio", "button", "submit", "color"].includes((el as HTMLInputElement).type));
      if (isTextField) return;
      const key = e.key.toLowerCase();
      if (key === "z") { this.base = Math.max(24, this.base - 12); return; }
      if (key === "x") { this.base = Math.min(96, this.base + 12); return; }
      const off = COMPUTER_MAP[key];
      if (off == null || this.computerHeld.has(key)) return;
      this.computerHeld.add(key);
      this.down(this.base + off);
    });
    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      const off = COMPUTER_MAP[key];
      if (off == null) return;
      this.computerHeld.delete(key);
      this.up(this.base + off);
    });
    // panic on blur — release everything so notes don't hang
    window.addEventListener("blur", () => { for (const m of [...this.held]) this.up(m); });
  }
}

// ---- white-noise buffer (shared shape) -------------------------------------

export function noiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return buf;
}

/** A soft saturation curve for tape/drive waveshapers. */
export function tapeCurve(amount = 2.2, n = 1024): Float32Array {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return c;
}
