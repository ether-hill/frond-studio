// Diffusion-Limited Aggregation — the engine behind the Algorithms page's "DLA"
// system. DLA is inherently sequential (random walkers stick one at a time to a
// growing cluster), so this runs on the CPU and draws to a 2D canvas, growing
// the aggregate over a few seconds into the dense dendritic frost/coral forms in
// the reference renders.
//
// Each frame spawns a batch of walkers on a circle just outside the cluster;
// each random-walks until it touches an occupied cell and sticks (with a
// stickiness probability — lower = denser, smoother; higher = feathery). New
// particles are drawn as additive glow sprites coloured core→tip by radius, so
// the frontier glows and the core deepens. Implements the Eng interface (no GL).

export interface DLAParams {
  rate: number; // walkers attempted per frame (growth speed)
  stick: number; // stickiness 0..1 (low = dense fill, high = sparse dendrites)
  step: number; // walker step length (px)
  dotSize: number; // particle sprite radius (px)
  glow: number; // extra additive halo 0..1
  seedMode: "point" | "ring" | "line";
  core: string; // colour at the cluster core
  mid: string; // colour mid-radius
  tip: string; // colour at the glowing tips
  bg: string;
}

export const DLA_DEFAULTS: DLAParams = {
  rate: 2200,
  stick: 0.75,
  step: 1.0,
  dotSize: 2.0,
  glow: 0.55,
  seedMode: "point",
  core: "#4a1402",
  mid: "#c4673a",
  tip: "#fff1e2",
  bg: "#08070a",
};

export type DLAPreset = { name: string; params: DLAParams };
const mk = (o: Partial<DLAParams>): DLAParams => ({ ...DLA_DEFAULTS, ...o });
export const DLA_PRESETS: DLAPreset[] = [
  { name: "Frost", params: mk({}) },
  { name: "Hoarfrost", params: mk({ stick: 0.5, dotSize: 1.7, glow: 0.4, core: "#1f2d3a", mid: "#7d99ad", tip: "#eef5fb", bg: "#000000" }) },
  { name: "Ash", params: mk({ stick: 0.62, dotSize: 1.8, glow: 0.35, core: "#1a1a1a", mid: "#7a7a7a", tip: "#efefef", bg: "#000000" }) },
  { name: "Coral", params: mk({ stick: 0.85, dotSize: 2.2, glow: 0.7, core: "#5e0b0b", mid: "#e0533a", tip: "#ffd9a8", bg: "#0a0404" }) },
  { name: "Gold Vein", params: mk({ stick: 0.8, dotSize: 2.0, glow: 0.65, core: "#3a2600", mid: "#cf9a2b", tip: "#fff3c4", bg: "#070502" }) },
  { name: "Electric", params: mk({ stick: 0.7, dotSize: 2.0, glow: 0.85, core: "#10204a", mid: "#2bb6ff", tip: "#eaffff", bg: "#01030a" }) },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function ramp(core: [number, number, number], mid: [number, number, number], tip: [number, number, number], t: number): [number, number, number] {
  if (t < 0.5) {
    const u = t * 2;
    return [lerp(core[0], mid[0], u), lerp(core[1], mid[1], u), lerp(core[2], mid[2], u)];
  }
  const u = (t - 0.5) * 2;
  return [lerp(mid[0], tip[0], u), lerp(mid[1], tip[1], u), lerp(mid[2], tip[2], u)];
}

const BUCKETS = 28;

export class DLA {
  readonly is3D = false as const;
  paused = false;

  private res: number;
  private ctx: CanvasRenderingContext2D;
  private p: DLAParams;
  private grid: Uint8Array;
  private cx: number;
  private cy: number;
  private clusterR = 1;
  private maxR: number;
  private done = false;
  private sprites: HTMLCanvasElement[] = [];

  constructor(canvas: HTMLCanvasElement, res: number, params: DLAParams) {
    this.res = res;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.p = params;
    this.cx = res / 2;
    this.cy = res / 2;
    this.maxR = res * 0.47;
    this.grid = new Uint8Array(res * res);
    this.buildSprites();
    this.reset();
  }

  // Pre-render one additive glow sprite per colour bucket so per-particle draws
  // are a fast drawImage rather than a fresh radial gradient each time.
  private buildSprites() {
    const core = hexToRgb(this.p.core), mid = hexToRgb(this.p.mid), tip = hexToRgb(this.p.tip);
    // Small grains so the dendritic structure stays legible (big soft sprites
    // merge it into a blob). A faint soft halo gives glow without blowing out.
    const rad = Math.max(1.1, this.p.dotSize * 0.55 + this.p.glow * 1.8);
    const S = Math.ceil(rad * 2) + 2;
    this.sprites = [];
    for (let i = 0; i < BUCKETS; i++) {
      const t = i / (BUCKETS - 1);
      const [r, g, b] = ramp(core, mid, tip, t);
      const cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const cc = cv.getContext("2d")!;
      const cxp = S / 2;
      const grad = cc.createRadialGradient(cxp, cxp, 0, cxp, cxp, rad);
      grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},1)`);
      grad.addColorStop(0.55, `rgba(${r | 0},${g | 0},${b | 0},${0.55 + this.p.glow * 0.35})`);
      grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
      cc.fillStyle = grad;
      cc.fillRect(0, 0, S, S);
      this.sprites.push(cv);
    }
  }

  reset() {
    this.grid.fill(0);
    this.clusterR = 1;
    this.done = false;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = this.p.bg;
    this.ctx.fillRect(0, 0, this.res, this.res);
    // source-over (not additive) keeps the radius colour-ramp intact instead of
    // every dense region blowing out to white.
    this.seed();
  }

  private seed() {
    const R = this.res;
    if (this.p.seedMode === "line") {
      for (let x = 0; x < R; x++) this.place(x, R - 2, 1);
    } else if (this.p.seedMode === "ring") {
      const rr = R * 0.16;
      for (let a = 0; a < 360; a += 2) {
        const x = Math.round(this.cx + Math.cos((a * Math.PI) / 180) * rr);
        const y = Math.round(this.cy + Math.sin((a * Math.PI) / 180) * rr);
        this.place(x, y, rr / this.maxR);
      }
      this.clusterR = rr;
    } else {
      this.place(this.cx | 0, this.cy | 0, 0);
    }
  }

  private place(x: number, y: number, t: number) {
    const R = this.res;
    if (x < 0 || y < 0 || x >= R || y >= R) return;
    this.grid[y * R + x] = 1;
    const sp = this.sprites[Math.min(BUCKETS - 1, Math.max(0, (t * (BUCKETS - 1)) | 0))];
    const s = sp.width;
    this.ctx.drawImage(sp, x - s / 2, y - s / 2);
  }

  setParams(p: DLAParams) {
    const rebuild = p.core !== this.p.core || p.mid !== this.p.mid || p.tip !== this.p.tip || p.dotSize !== this.p.dotSize || p.glow !== this.p.glow;
    const reseed = p.seedMode !== this.p.seedMode || p.bg !== this.p.bg;
    this.p = p;
    if (rebuild) this.buildSprites();
    if (reseed) this.reset();
  }

  setMouse() {}

  private colorAt(x: number, y: number): number {
    if (this.p.seedMode === "line") return (this.res - y) / this.res;
    return Math.hypot(x - this.cx, y - this.cy) / this.maxR;
  }

  render() {
    if (this.paused || this.done) return;
    const R = this.res, g = this.grid, p = this.p;
    const line = p.seedMode === "line";
    const maxSteps = 5000; // high cap is cheap: far walkers take big adaptive jumps
    let added = 0;
    for (let w = 0; w < p.rate; w++) {
      // spawn just outside the current cluster
      let x: number, y: number;
      if (line) {
        x = (Math.random() * R) | 0;
        y = 1;
      } else {
        const ang = Math.random() * Math.PI * 2;
        const sr = Math.min(this.maxR + 4, this.clusterR + 5);
        x = (this.cx + Math.cos(ang) * sr) | 0;
        y = (this.cy + Math.sin(ang) * sr) | 0;
      }
      // Generous kill radius so walkers diffuse all the way around the cluster
      // (a tight one starves the short sides and the cluster grows one-directionally).
      const killR = line ? 0 : this.clusterR * 2.2 + 80;
      let stuck = false;
      for (let s = 0; s < maxSteps; s++) {
        // step — far walkers take a safe big jump (they can't overshoot the
        // cluster, which is bounded by clusterR), so convergence is fast.
        let stepLen = p.step;
        if (!line) {
          const dc = Math.hypot(x - this.cx, y - this.cy);
          if (dc > this.clusterR + 2) stepLen = Math.min(32, Math.max(p.step, (dc - this.clusterR) * 0.85));
        }
        const a = Math.random() * Math.PI * 2;
        x = (x + Math.cos(a) * stepLen) | 0;
        y = (y + Math.sin(a) * stepLen) | 0;
        if (line) {
          if (y < 0 || y >= R) break;
          if (x < 0) x = 0; else if (x >= R) x = R - 1;
        } else {
          if (x < 1 || y < 1 || x >= R - 1 || y >= R - 1) break;
          const d = Math.hypot(x - this.cx, y - this.cy);
          if (d > killR) break;
        }
        // adjacency test (4-neighbourhood is enough and cheaper)
        const idx = y * R + x;
        if (g[idx - 1] || g[idx + 1] || g[idx - R] || g[idx + R]) {
          if (Math.random() <= p.stick) {
            this.place(x, y, this.colorAt(x, y));
            const d = line ? 0 : Math.hypot(x - this.cx, y - this.cy);
            if (d > this.clusterR) this.clusterR = d;
            stuck = true;
            added++;
          }
          break;
        }
      }
      void stuck;
    }
    if (!line && this.clusterR >= this.maxR) this.done = true;
    if (added === 0 && this.clusterR < 4) this.done = false; // keep trying early on
  }

  dispose() {
    this.sprites = [];
  }
}

// ── RANDOMISE ───────────────────────────────────────────────────────────────
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}

export function randomDLAParams(): DLAParams {
  const hue = rnd(0, 360);
  const mono = Math.random() < 0.25;
  return {
    ...DLA_DEFAULTS,
    rate: Math.round(rnd(1100, 2200)),
    stick: rnd(0.45, 0.92),
    step: 1.0,
    dotSize: rnd(1.7, 2.4),
    glow: rnd(0.35, 0.85),
    seedMode: pick<DLAParams["seedMode"]>(["point", "point", "ring", "line"]),
    core: mono ? "#1a1a1a" : hsl(hue, rnd(0.6, 0.95), rnd(0.08, 0.16)),
    mid: mono ? "#7a7a7a" : hsl(hue + rnd(-20, 30), rnd(0.6, 0.95), rnd(0.42, 0.56)),
    tip: mono ? "#efefef" : hsl(hue + rnd(20, 60), rnd(0.3, 0.7), rnd(0.86, 0.95)),
    bg: "#000000",
  };
}
