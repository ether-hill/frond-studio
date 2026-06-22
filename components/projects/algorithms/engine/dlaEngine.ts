// Diffusion-Limited Aggregation — the engine behind the Algorithms page's "DLA"
// system. DLA is inherently sequential (random walkers stick one at a time), so
// this runs on the CPU and draws to a 2D canvas, growing the aggregate over a
// couple of seconds into the dense dendritic frost / coral forms of the
// reference renders.
//
// Speed + density come from three things: (1) lost walkers re-spawn on the birth
// circle rather than being thrown away, so almost every walker contributes;
// (2) walkers far from the cluster take a safe big jump (they can't overshoot a
// cluster bounded by clusterR), so approach is cheap; (3) low stickiness lets
// walkers slide along the surface and pack into the concavities, giving the
// dense, organic, high-fractal-dimension look rather than a sparse snowflake.
// Particles are drawn as soft grains coloured core→tip by radius, with the tips
// carrying a wider glow halo. Implements the Eng interface (no GL).

export interface DLAParams {
  rate: number; // walkers per frame (growth speed)
  stick: number; // stickiness 0..1 (low = dense pack, high = feathery dendrites)
  dotSize: number; // grain radius (px)
  glow: number; // tip glow halo 0..1
  seedMode: "point" | "ring" | "line";
  core: string;
  mid: string;
  tip: string;
  bg: string;
}

export const DLA_DEFAULTS: DLAParams = {
  rate: 1700,
  stick: 0.55,
  dotSize: 2.4,
  glow: 0.55,
  seedMode: "point",
  core: "#4a1002",
  mid: "#d2693a",
  tip: "#fff0df",
  bg: "#070608",
};

export type DLAPreset = { name: string; params: DLAParams };
const mk = (o: Partial<DLAParams>): DLAParams => ({ ...DLA_DEFAULTS, ...o });
export const DLA_PRESETS: DLAPreset[] = [
  { name: "Coral", params: mk({}) },
  { name: "Hoarfrost", params: mk({ stick: 0.32, dotSize: 2.2, glow: 0.35, core: "#222f3c", mid: "#8aa6ba", tip: "#f0f6fb", bg: "#000000" }) },
  { name: "Ash", params: mk({ stick: 0.35, dotSize: 2.2, glow: 0.3, core: "#171717", mid: "#7e7e7e", tip: "#f0f0f0", bg: "#000000" }) },
  { name: "Ember", params: mk({ stick: 0.62, dotSize: 2.4, glow: 0.75, core: "#3a0606", mid: "#e8492a", tip: "#ffd27a", bg: "#0a0303" }) },
  { name: "Gold Vein", params: mk({ stick: 0.5, dotSize: 2.3, glow: 0.6, core: "#2e1d00", mid: "#cf9a2b", tip: "#fff3c4", bg: "#070502" }) },
  { name: "Electric", params: mk({ stick: 0.45, dotSize: 2.2, glow: 0.85, core: "#0c1a40", mid: "#2bb6ff", tip: "#eaffff", bg: "#01030a" }) },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function ramp(core: number[], mid: number[], tip: number[], t: number): number[] {
  if (t < 0.5) { const u = t * 2; return [lerp(core[0], mid[0], u), lerp(core[1], mid[1], u), lerp(core[2], mid[2], u)]; }
  const u = (t - 0.5) * 2;
  return [lerp(mid[0], tip[0], u), lerp(mid[1], tip[1], u), lerp(mid[2], tip[2], u)];
}

const BUCKETS = 32;

export class DLA {
  readonly is3D = false as const;
  paused = false;

  private res: number;
  private ctx: CanvasRenderingContext2D;
  private p: DLAParams;
  private grid: Uint8Array;
  // coarse occupancy → cheap "distance to nearest cluster cell" for safe big
  // jumps that DON'T break the walk's isotropy (the cause of one-sided growth).
  private CS = 6;
  private cw = 0;
  private ch = 0;
  private coarse: Uint8Array = new Uint8Array(0);
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
    this.maxR = res * 0.48;
    this.grid = new Uint8Array(res * res);
    this.cw = Math.ceil(res / this.CS);
    this.ch = this.cw;
    this.coarse = new Uint8Array(this.cw * this.ch);
    this.buildSprites();
    this.reset();
  }

  // Distance (px) it's safe to step in ANY direction without reaching the
  // cluster — the chebyshev ring distance to the nearest occupied coarse cell.
  private safeJump(x: number, y: number): number {
    const CS = this.CS, cw = this.cw, ch = this.ch, co = this.coarse;
    const gx = (x / CS) | 0, gy = (y / CS) | 0;
    const MAX = 13;
    for (let r = 0; r <= MAX; r++) {
      if (r === 0) {
        if (co[gy * cw + gx]) return 1;
        continue;
      }
      const x0 = gx - r, x1 = gx + r, y0 = gy - r, y1 = gy + r;
      let hit = false;
      for (let cxp = x0; cxp <= x1 && !hit; cxp++) {
        if (cxp < 0 || cxp >= cw) continue;
        if (y0 >= 0 && co[y0 * cw + cxp]) hit = true;
        else if (y1 < ch && co[y1 * cw + cxp]) hit = true;
      }
      for (let cyp = y0 + 1; cyp < y1 && !hit; cyp++) {
        if (cyp < 0 || cyp >= ch) continue;
        if (x0 >= 0 && co[cyp * cw + x0]) hit = true;
        else if (x1 < cw && co[cyp * cw + x1]) hit = true;
      }
      if (hit) return Math.max(1, (r - 1) * CS);
    }
    return MAX * CS;
  }

  // One soft grain per colour bucket; the tip buckets get a wider, softer glow
  // halo (the coral-glow look), the core a tight bright dot.
  private buildSprites() {
    const core = hexToRgb(this.p.core), mid = hexToRgb(this.p.mid), tip = hexToRgb(this.p.tip);
    const grain = Math.max(0.8, this.p.dotSize * 0.5);
    this.sprites = [];
    for (let i = 0; i < BUCKETS; i++) {
      const t = i / (BUCKETS - 1);
      const [r, g, b] = ramp(core, mid, tip, t);
      const halo = grain + this.p.glow * (1.5 + t * t * 5.5);
      const S = Math.ceil(halo * 2) + 2;
      const cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const cc = cv.getContext("2d")!;
      const m = S / 2;
      const grad = cc.createRadialGradient(m, m, 0, m, m, halo);
      grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},1)`);
      grad.addColorStop(Math.min(0.85, grain / halo), `rgba(${r | 0},${g | 0},${b | 0},${0.55 + this.p.glow * 0.3})`);
      grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
      cc.fillStyle = grad;
      cc.fillRect(0, 0, S, S);
      this.sprites.push(cv);
    }
  }

  reset() {
    this.grid.fill(0);
    this.coarse.fill(0);
    this.clusterR = 1;
    this.done = false;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = this.p.bg;
    this.ctx.fillRect(0, 0, this.res, this.res);
    this.seed();
  }

  private seed() {
    const R = this.res;
    if (this.p.seedMode === "line") {
      for (let x = 0; x < R; x++) this.place(x, R - 2);
      this.clusterR = 1;
    } else if (this.p.seedMode === "ring") {
      const rr = R * 0.17;
      for (let a = 0; a < 360; a += 1.5) {
        this.place((this.cx + Math.cos((a * Math.PI) / 180) * rr) | 0, (this.cy + Math.sin((a * Math.PI) / 180) * rr) | 0);
      }
    } else {
      this.place(this.cx | 0, this.cy | 0);
    }
  }

  private place(x: number, y: number) {
    const R = this.res;
    if (x < 0 || y < 0 || x >= R || y >= R) return;
    this.grid[y * R + x] = 1;
    this.coarse[((y / this.CS) | 0) * this.cw + ((x / this.CS) | 0)] = 1;
    const t = this.colorAt(x, y);
    if (this.p.seedMode !== "line") {
      const d = Math.hypot(x - this.cx, y - this.cy);
      if (d > this.clusterR) this.clusterR = d;
    }
    const sp = this.sprites[Math.min(BUCKETS - 1, Math.max(0, (t * (BUCKETS - 1)) | 0))];
    this.ctx.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
  }

  private colorAt(x: number, y: number): number {
    if (this.p.seedMode === "line") return (this.res - y) / this.res;
    return Math.min(1, Math.hypot(x - this.cx, y - this.cy) / this.maxR);
  }

  setParams(p: DLAParams) {
    const rebuild = p.core !== this.p.core || p.mid !== this.p.mid || p.tip !== this.p.tip || p.dotSize !== this.p.dotSize || p.glow !== this.p.glow;
    const reseed = p.seedMode !== this.p.seedMode || p.bg !== this.p.bg;
    this.p = p;
    if (rebuild) this.buildSprites();
    if (reseed) this.reset();
  }

  setMouse() {}

  render() {
    if (this.paused || this.done) return;
    const R = this.res, g = this.grid, p = this.p;
    const line = p.seedMode === "line";
    const killR = this.clusterR * 2 + 90;
    for (let w = 0; w < p.rate; w++) {
      let x = 0, y = 0;
      const birth = () => {
        if (line) { x = (Math.random() * R) | 0; y = 1; return; }
        const a = Math.random() * Math.PI * 2;
        const sr = Math.min(this.maxR + 8, this.clusterR + 8);
        x = (this.cx + Math.cos(a) * sr) | 0;
        y = (this.cy + Math.sin(a) * sr) | 0;
      };
      birth();
      for (let s = 0; s < 4000; s++) {
        const j = line ? 1 : this.safeJump(x, y);
        if (j <= 2) {
          // touching distance — unit random step, then test the fine grid
          const a = Math.random() * Math.PI * 2;
          x = (x + Math.cos(a) * 1.4) | 0;
          y = (y + Math.sin(a) * 1.4) | 0;
          if (x < 1 || y < 1 || x >= R - 1 || y >= R - 1) { birth(); continue; }
          if (!line && Math.hypot(x - this.cx, y - this.cy) > killR) { birth(); continue; }
          const i = y * R + x;
          if (g[i - 1] || g[i + 1] || g[i - R] || g[i + R] || g[i - R - 1] || g[i - R + 1] || g[i + R - 1] || g[i + R + 1]) {
            if (Math.random() <= p.stick) { this.place(x, y); break; }
          }
        } else {
          // safe isotropic jump toward nothing in particular — keeps the walk
          // diffusive (so growth stays radial) while skipping empty space fast
          const a = Math.random() * Math.PI * 2;
          const step = Math.min(60, j);
          x = (x + Math.cos(a) * step) | 0;
          y = (y + Math.sin(a) * step) | 0;
          if (line) { if (y < 1) { birth(); continue; } if (y >= R - 1) break; if (x < 0) x = 0; else if (x >= R) x = R - 1; continue; }
          if (x < -R || y < -R || x >= 2 * R || y >= 2 * R || Math.hypot(x - this.cx, y - this.cy) > killR) { birth(); continue; }
        }
      }
    }
    if (!line && this.clusterR >= this.maxR * 0.99) this.done = true;
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
  const mono = Math.random() < 0.22;
  return {
    ...DLA_DEFAULTS,
    rate: Math.round(rnd(1300, 2200)),
    stick: rnd(0.3, 0.72),
    dotSize: rnd(2.0, 2.6),
    glow: rnd(0.35, 0.85),
    seedMode: pick<DLAParams["seedMode"]>(["point", "point", "point", "ring", "line"]),
    core: mono ? "#161616" : hsl(hue, rnd(0.7, 0.95), rnd(0.06, 0.14)),
    mid: mono ? "#7e7e7e" : hsl(hue + rnd(-15, 35), rnd(0.7, 0.95), rnd(0.44, 0.58)),
    tip: mono ? "#f0f0f0" : hsl(hue + rnd(20, 70), rnd(0.25, 0.65), rnd(0.88, 0.96)),
    bg: "#000000",
  };
}
