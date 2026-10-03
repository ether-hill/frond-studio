/* Differential Growth, slowed, for the Futures Atlas page. Built with esbuild from the Atlas's own piece (futures-atlas-02, generatives/src/pieces/differentialGrowth.ts, MIT) plus simplex-noise (MIT). Rebuild from source rather than editing this file. */
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/core/color/oklch.ts
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  var toGamma = (c) => c <= 31308e-7 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  function oklabToLinear(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }
  var D2R = Math.PI / 180;
  function oklchToOklab(L, C, h) {
    return { L, a: C * Math.cos(h * D2R), b: C * Math.sin(h * D2R) };
  }
  function oklabToRgb(L, a, b) {
    const lin = oklabToLinear(L, a, b);
    return [
      Math.round(clamp01(toGamma(clamp01(lin[0]))) * 255),
      Math.round(clamp01(toGamma(clamp01(lin[1]))) * 255),
      Math.round(clamp01(toGamma(clamp01(lin[2]))) * 255)
    ];
  }
  var unGamma = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  function hexToRgb(hex) {
    const s = hex.replace("#", "").trim();
    const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
    return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
  }
  function hexToOklab(hex) {
    const [r8, g8, b8] = hexToRgb(hex);
    const r = unGamma(r8 / 255);
    const g = unGamma(g8 / 255);
    const b = unGamma(b8 / 255);
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return {
      L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
    };
  }
  function hexToOklch(hex) {
    const { L, a, b } = hexToOklab(hex);
    return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) / D2R };
  }

  // src/core/color/theme.ts
  var S = (L, C, h) => ({ L, C, h });
  var PALETTES = {
    "quantum-ink": {
      id: "quantum-ink",
      label: "Quantum Ink",
      bg: "#05070d",
      stops: [S(0.16, 0.07, 265), S(0.42, 0.16, 270), S(0.64, 0.16, 215), S(0.82, 0.15, 190), S(0.95, 0.1, 160)]
    },
    aurora: {
      id: "aurora",
      label: "Aurora",
      bg: "#04080a",
      stops: [S(0.18, 0.06, 200), S(0.5, 0.16, 165), S(0.72, 0.18, 150), S(0.86, 0.16, 120), S(0.96, 0.12, 95)]
    },
    spectral: {
      id: "spectral",
      label: "Spectral",
      bg: "#08060c",
      stops: [S(0.2, 0.16, 300), S(0.45, 0.2, 260), S(0.62, 0.19, 200), S(0.76, 0.2, 130), S(0.9, 0.2, 70), S(0.96, 0.18, 35)]
    },
    ember: {
      id: "ember",
      label: "Ember",
      bg: "#0a0604",
      stops: [S(0.12, 0.05, 30), S(0.4, 0.16, 35), S(0.64, 0.2, 55), S(0.84, 0.16, 80), S(0.97, 0.06, 95)]
    },
    mono: {
      id: "mono",
      label: "Mono",
      bg: "#060708",
      stops: [S(0.12, 0.01, 250), S(0.4, 0.015, 250), S(0.68, 0.02, 250), S(0.9, 0.01, 250), S(0.99, 0, 250)]
    }
  };
  var PALETTE_IDS = Object.keys(PALETTES);
  function makePaletteFromColors(c) {
    const bg = hexToOklch(c.bg);
    const lo = hexToOklch(c.lo);
    const hi = hexToOklch(c.hi);
    return {
      id: "custom",
      label: "Custom",
      bg: c.bg,
      stops: [
        { L: bg.L, C: bg.C, h: bg.h },
        { L: lo.L, C: lo.C, h: lo.h },
        { L: hi.L, C: hi.C, h: hi.h }
      ]
    };
  }
  function sample(palette, t) {
    const stops = palette.stops;
    const x = (t < 0 ? 0 : t > 1 ? 1 : t) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    const a = oklchToOklab(stops[i].L, stops[i].C, stops[i].h);
    const b = oklchToOklab(stops[i + 1].L, stops[i + 1].C, stops[i + 1].h);
    return oklabToRgb(a.L + (b.L - a.L) * f, a.a + (b.a - a.a) * f, a.b + (b.b - a.b) * f);
  }

  // src/core/meta.ts
  var lerp = (a, b, t) => a + (b - a) * t;
  var clamp012 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  var range = (t, a, b) => lerp(a, b, clamp012(t));
  var count = (t, a, b) => Math.round(range(t, a, b));

  // src/pieces/differentialGrowth.ts
  var TAU = Math.PI * 2;
  var rate = () => {
    var _a;
    return Number((_a = globalThis.__RATE) != null ? _a : 1);
  };
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  var DifferentialGrowth = class {
    constructor() {
      __publicField(this, "id", "differential-growth");
      __publicField(this, "title", "Differential Growth");
      __publicField(this, "tags", ["nature", "flow"]);
      __publicField(this, "backend", "canvas2d");
      __publicField(this, "schema", {
        lineWidth: { type: "number", min: 0.4, max: 3, step: 0.1, default: 1, label: "line width" },
        flow: { type: "number", min: 0, max: 1, step: 0.01, default: 0.35, label: "flow field" },
        fieldScale: { type: "number", min: 0.4, max: 4, step: 0.05, default: 1.4, label: "field scale" }
      });
      __publicField(this, "ctx");
      __publicField(this, "w", 1);
      __publicField(this, "h", 1);
      __publicField(this, "unit", 1);
      __publicField(this, "pal");
      __publicField(this, "rng");
      __publicField(this, "noise");
      __publicField(this, "xs", []);
      __publicField(this, "ys", []);
      __publicField(this, "age", []);
      __publicField(this, "maxNodes", 4e3);
      __publicField(this, "chaos", 0.45);
      __publicField(this, "lw", 1);
      __publicField(this, "pFlow", 0.35);
      __publicField(this, "pFieldScale", 1.4);
      __publicField(this, "step", 0);
      __publicField(this, "framesSincePrune", 0);
      // spatial-hash scratch
      __publicField(this, "head", new Int32Array(0));
      __publicField(this, "next", new Int32Array(0));
      __publicField(this, "cols", 1);
      __publicField(this, "rows", 1);
      __publicField(this, "cell", 1);
      // per-node force accumulators
      __publicField(this, "fx", new Float32Array(0));
      __publicField(this, "fy", new Float32Array(0));
    }
    init(ctx) {
      if (ctx.surface.kind !== "canvas2d") throw new Error("growth: canvas2d");
      this.ctx = ctx.surface.ctx;
      this.w = ctx.width;
      this.h = ctx.height;
      this.unit = Number(globalThis.__UNIT) || Math.min(this.w, this.h);
      this.pal = ctx.palette;
      this.rng = ctx.rng;
      this.noise = ctx.noise;
      this.lw = Number(ctx.params.lineWidth);
      this.pFlow = Number(ctx.params.flow);
      this.pFieldScale = Number(ctx.params.fieldScale);
      this.applyMeta(ctx.meta.complexity, ctx.meta.chaos);
      this.seed();
      this.clear();
    }
    applyMeta(complexity2, chaos) {
      this.maxNodes = Number(globalThis.__MAX_NODES) || count(complexity2, 1200, 8e3);
      this.chaos = chaos;
    }
    clear() {
      this.ctx.fillStyle = this.pal.bg;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    seed() {
      const n = 44;
      const r = this.unit * 0.05;
      const wob = this.rng.range(0, TAU);
      this.xs = [];
      this.ys = [];
      this.age = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const rr = r * (1 + 0.06 * Math.sin(a * 3 + wob) + this.rng.range(-0.02, 0.02));
        this.xs.push(this.w / 2 + Math.cos(a) * rr);
        this.ys.push(this.h / 2 + Math.sin(a) * rr);
        this.age.push(0);
      }
      this.step = 0;
    }
    restLen() {
      return this.unit * 0.012;
    }
    rebuildHash(repelR) {
      const n = this.xs.length;
      this.cell = repelR;
      this.cols = Math.max(1, Math.ceil(this.w / this.cell));
      this.rows = Math.max(1, Math.ceil(this.h / this.cell));
      const ncells = this.cols * this.rows;
      if (this.head.length < ncells) this.head = new Int32Array(ncells);
      this.head.fill(-1, 0, ncells);
      if (this.next.length < n) this.next = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const gx = clamp(this.xs[i] / this.cell | 0, 0, this.cols - 1);
        const gy = clamp(this.ys[i] / this.cell | 0, 0, this.rows - 1);
        const c = gy * this.cols + gx;
        this.next[i] = this.head[c];
        this.head[c] = i;
      }
    }
    relax(repelR, repelStr, springStr, jitter) {
      const n = this.xs.length;
      const { xs, ys } = this;
      if (this.fx.length < n) {
        this.fx = new Float32Array(n);
        this.fy = new Float32Array(n);
      }
      const fx = this.fx;
      const fy = this.fy;
      fx.fill(0, 0, n);
      fy.fill(0, 0, n);
      const rest = this.restLen();
      const minSpace = Math.max(rest * 0.85, repelR * 0.45);
      const r2 = repelR * repelR;
      this.rebuildHash(repelR);
      for (let i = 0; i < n; i++) {
        const xi = xs[i];
        const yi = ys[i];
        const gx = clamp(xi / this.cell | 0, 0, this.cols - 1);
        const gy = clamp(yi / this.cell | 0, 0, this.rows - 1);
        for (let oy = -1; oy <= 1; oy++) {
          const cy = gy + oy;
          if (cy < 0 || cy >= this.rows) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const cx = gx + ox;
            if (cx < 0 || cx >= this.cols) continue;
            let j = this.head[cy * this.cols + cx];
            while (j !== -1) {
              if (j > i) {
                const dx = xi - xs[j];
                const dy = yi - ys[j];
                const d2 = dx * dx + dy * dy;
                if (d2 < r2 && d2 > 1e-6) {
                  const d = Math.sqrt(d2);
                  const target = Math.max(minSpace, d);
                  const push = (repelR - d) / repelR * repelStr * target;
                  const inv = 1 / d;
                  const px = dx * inv * push;
                  const py = dy * inv * push;
                  fx[i] += px;
                  fy[i] += py;
                  fx[j] -= px;
                  fy[j] -= py;
                }
              }
              j = this.next[j];
            }
          }
        }
      }
      const ns = this.pFieldScale * 2.4 / this.unit;
      const flowAmp = this.pFlow * this.unit * 6e-3;
      const RATE = rate();
      const ph = this.step * 3e-3 * RATE;
      for (let i = 0; i < n; i++) {
        const a = (i - 1 + n) % n;
        const b = (i + 1) % n;
        const mx = (xs[a] + xs[b]) * 0.5;
        const my = (ys[a] + ys[b]) * 0.5;
        fx[i] += (mx - xs[i]) * springStr * 0.5;
        fy[i] += (my - ys[i]) * springStr * 0.5;
        for (const nb of [a, b]) {
          const dx = xs[nb] - xs[i];
          const dy = ys[nb] - ys[i];
          const d = Math.hypot(dx, dy) || 1e-6;
          const diff = (d - rest) / d * springStr * 0.5;
          fx[i] += dx * diff;
          fy[i] += dy * diff;
        }
        if (flowAmp > 0) {
          const [cxn, cyn] = this.noise.curl(xs[i] * ns + ph, ys[i] * ns - ph);
          fx[i] += cxn * flowAmp;
          fy[i] += cyn * flowAmp;
        }
        if (jitter > 0) {
          fx[i] += this.rng.gaussian(0, 1) * jitter;
          fy[i] += this.rng.gaussian(0, 1) * jitter;
        }
      }
      const maxMove = repelR * 0.9;
      const m = this.unit * 0.02;
      for (let i = 0; i < n; i++) {
        let dx = fx[i];
        let dy = fy[i];
        const mm2 = dx * dx + dy * dy;
        if (mm2 > maxMove * maxMove) {
          const sc = maxMove / Math.sqrt(mm2);
          dx *= sc;
          dy *= sc;
        }
        let nx = xs[i] + dx * RATE;
        let ny = ys[i] + dy * RATE;
        if (nx < m) nx += (m - nx) * 0.5;
        else if (nx > this.w - m) nx -= (nx - (this.w - m)) * 0.5;
        if (ny < m) ny += (m - ny) * 0.5;
        else if (ny > this.h - m) ny -= (ny - (this.h - m)) * 0.5;
        xs[i] = nx;
        ys[i] = ny;
      }
    }
    grow() {
      const { xs, ys, age } = this;
      const n = xs.length;
      if (n >= this.maxNodes) return;
      const splitLen = this.restLen() * 1.7;
      const split2 = splitLen * splitLen;
      let room = this.maxNodes - n;
      const start = 0;
      const nx = [];
      const ny = [];
      const na = [];
      for (let k = 0; k < n; k++) {
        const i = (start + k) % n;
        nx.push(xs[i]);
        ny.push(ys[i]);
        na.push(age[i]);
        if (room <= 0) continue;
        const b = (i + 1) % n;
        const dx = xs[b] - xs[i];
        const dy = ys[b] - ys[i];
        if (dx * dx + dy * dy > split2) {
          nx.push((xs[i] + xs[b]) * 0.5);
          ny.push((ys[i] + ys[b]) * 0.5);
          na.push(this.step);
          room--;
        }
      }
      this.xs = nx;
      this.ys = ny;
      this.age = na;
    }
    prune() {
      const n = this.xs.length;
      const remove = clamp(Math.round(n * (0.12 + this.chaos * 0.12)), 1, n - 60);
      const start = this.rng.int(0, n - 1);
      const end = Math.min(n, start + remove);
      this.xs.splice(start, end - start);
      this.ys.splice(start, end - start);
      this.age.splice(start, end - start);
    }
    update() {
      const repelR = this.unit * 0.02;
      const repelStr = 0.5;
      const springStr = 0.32;
      const jitter = this.unit * 4e-4 * (0.5 + this.chaos);
      const subSteps = 2 + Math.round(2 * this.chaos);
      for (let s = 0; s < subSteps; s++) this.relax(repelR, repelStr, springStr, jitter);
      this.step++;
      if (this.xs.length < this.maxNodes) {
        this.grow();
      } else if (!globalThis.__NO_PRUNE && ++this.framesSincePrune >= 4) {
        this.framesSincePrune = 0;
        this.prune();
      }
    }
    render() {
      var _a, _b;
      const { ctx, xs, ys } = this;
      const n = xs.length;
      ctx.fillStyle = this.pal.bg;
      ctx.fillRect(0, 0, this.w, this.h);
      if (n < 3) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const P = (i) => {
        const k = (i % n + n) % n;
        return [xs[k], ys[k]];
      };
      const path = new Path2D();
      path.moveTo(xs[0], ys[0]);
      for (let i = 0; i < n; i++) {
        const [p0x, p0y] = P(i - 1);
        const [p1x, p1y] = P(i);
        const [p2x, p2y] = P(i + 1);
        const [p3x, p3y] = P(i + 2);
        const c1x = p1x + (p2x - p0x) / 6;
        const c1y = p1y + (p2y - p0y) / 6;
        const c2x = p2x - (p3x - p1x) / 6;
        const c2y = p2y - (p3y - p1y) / 6;
        path.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
      }
      path.closePath();
      const OX = Number((_a = globalThis.__OX) != null ? _a : 0);
      const OY = Number((_b = globalThis.__OY) != null ? _b : 0);
      ctx.save();
      ctx.translate(-OX, -OY);
      const lw = this.lw;
      const c = (t) => {
        const rgb = sample(this.pal, t);
        return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      };
      ctx.strokeStyle = c(0.45);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = lw * 3;
      ctx.stroke(path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c(0.92);
      ctx.lineWidth = lw;
      ctx.stroke(path);
      ctx.restore();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.unit = Number(globalThis.__UNIT) || Math.min(w, h);
      this.seed();
      this.clear();
    }
    reseed() {
      this.seed();
      this.clear();
    }
    dispose() {
    }
  };
  var createDifferentialGrowth = () => new DifferentialGrowth();

  // src/core/surface.ts
  function createSurface(canvas2, backend) {
    if (backend === "webgl2") {
      const gl = canvas2.getContext("webgl2", {
        antialias: false,
        preserveDrawingBuffer: true,
        premultipliedAlpha: false
      });
      if (!gl) throw new Error("surface: WebGL2 unavailable");
      return { kind: "webgl2", canvas: canvas2, gl, width: 1, height: 1, dpr: 1 };
    }
    if (backend === "three") {
      return { kind: "three", canvas: canvas2, width: 1, height: 1, dpr: 1 };
    }
    const ctx = canvas2.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("surface: 2d context unavailable");
    return { kind: "canvas2d", canvas: canvas2, ctx, width: 1, height: 1, dpr: 1 };
  }

  // src/core/rng.ts
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return () => {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return () => {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      let t = a + b | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = c << 21 | c >>> 11;
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const s = xmur3(seed);
    const next = sfc32(s(), s(), s(), s());
    for (let i = 0; i < 12; i++) next();
    let spare = null;
    return {
      seed,
      next,
      range: (min, max) => min + next() * (max - min),
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      gaussian: (mean = 0, sd = 1) => {
        if (spare !== null) {
          const v2 = spare;
          spare = null;
          return mean + v2 * sd;
        }
        let u = 0;
        let v = 0;
        let r = 0;
        do {
          u = next() * 2 - 1;
          v = next() * 2 - 1;
          r = u * u + v * v;
        } while (r === 0 || r >= 1);
        const f = Math.sqrt(-2 * Math.log(r) / r);
        spare = v * f;
        return mean + u * f * sd;
      }
    };
  }

  // ../../../../../../../../Users/user/Documents/futures-atlas-02/generatives/node_modules/simplex-noise/dist/esm/simplex-noise.js
  var SQRT3 = /* @__PURE__ */ Math.sqrt(3);
  var SQRT5 = /* @__PURE__ */ Math.sqrt(5);
  var F2 = 0.5 * (SQRT3 - 1);
  var G2 = (3 - SQRT3) / 6;
  var F3 = 1 / 3;
  var G3 = 1 / 6;
  var F4 = (SQRT5 - 1) / 4;
  var G4 = (5 - SQRT5) / 20;
  var fastFloor = (x) => Math.floor(x) | 0;
  var grad2 = /* @__PURE__ */ new Float64Array([
    1,
    1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    1,
    0,
    -1,
    0,
    1,
    0,
    -1,
    0,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    -1
  ]);
  var grad3 = /* @__PURE__ */ new Float64Array([
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    -1,
    0,
    1,
    1,
    0,
    -1,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    -1,
    1,
    0,
    1,
    -1,
    0,
    -1,
    -1
  ]);
  function createNoise2D(random = Math.random) {
    const perm = buildPermutationTable(random);
    const permGrad2x = new Float64Array(perm).map((v) => grad2[v % 12 * 2]);
    const permGrad2y = new Float64Array(perm).map((v) => grad2[v % 12 * 2 + 1]);
    return function noise2D(x, y) {
      let n0 = 0;
      let n1 = 0;
      let n2 = 0;
      const s = (x + y) * F2;
      const i = fastFloor(x + s);
      const j = fastFloor(y + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      let i1, j1;
      if (x0 > y0) {
        i1 = 1;
        j1 = 0;
      } else {
        i1 = 0;
        j1 = 1;
      }
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        const gi0 = ii + perm[jj];
        const g0x = permGrad2x[gi0];
        const g0y = permGrad2y[gi0];
        t0 *= t0;
        n0 = t0 * t0 * (g0x * x0 + g0y * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        const gi1 = ii + i1 + perm[jj + j1];
        const g1x = permGrad2x[gi1];
        const g1y = permGrad2y[gi1];
        t1 *= t1;
        n1 = t1 * t1 * (g1x * x1 + g1y * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        const gi2 = ii + 1 + perm[jj + 1];
        const g2x = permGrad2x[gi2];
        const g2y = permGrad2y[gi2];
        t2 *= t2;
        n2 = t2 * t2 * (g2x * x2 + g2y * y2);
      }
      return 70 * (n0 + n1 + n2);
    };
  }
  function createNoise3D(random = Math.random) {
    const perm = buildPermutationTable(random);
    const permGrad3x = new Float64Array(perm).map((v) => grad3[v % 12 * 3]);
    const permGrad3y = new Float64Array(perm).map((v) => grad3[v % 12 * 3 + 1]);
    const permGrad3z = new Float64Array(perm).map((v) => grad3[v % 12 * 3 + 2]);
    return function noise3D(x, y, z) {
      let n0, n1, n2, n3;
      const s = (x + y + z) * F3;
      const i = fastFloor(x + s);
      const j = fastFloor(y + s);
      const k = fastFloor(z + s);
      const t = (i + j + k) * G3;
      const X0 = i - t;
      const Y0 = j - t;
      const Z0 = k - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      const z0 = z - Z0;
      let i1, j1, k1;
      let i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        } else if (x0 >= z0) {
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        } else {
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        }
      } else {
        if (y0 < z0) {
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        } else if (x0 < z0) {
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        } else {
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        }
      }
      const x1 = x0 - i1 + G3;
      const y1 = y0 - j1 + G3;
      const z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3;
      const y2 = y0 - j2 + 2 * G3;
      const z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3;
      const y3 = y0 - 1 + 3 * G3;
      const z3 = z0 - 1 + 3 * G3;
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 < 0)
        n0 = 0;
      else {
        const gi0 = ii + perm[jj + perm[kk]];
        t0 *= t0;
        n0 = t0 * t0 * (permGrad3x[gi0] * x0 + permGrad3y[gi0] * y0 + permGrad3z[gi0] * z0);
      }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 < 0)
        n1 = 0;
      else {
        const gi1 = ii + i1 + perm[jj + j1 + perm[kk + k1]];
        t1 *= t1;
        n1 = t1 * t1 * (permGrad3x[gi1] * x1 + permGrad3y[gi1] * y1 + permGrad3z[gi1] * z1);
      }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 < 0)
        n2 = 0;
      else {
        const gi2 = ii + i2 + perm[jj + j2 + perm[kk + k2]];
        t2 *= t2;
        n2 = t2 * t2 * (permGrad3x[gi2] * x2 + permGrad3y[gi2] * y2 + permGrad3z[gi2] * z2);
      }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 < 0)
        n3 = 0;
      else {
        const gi3 = ii + 1 + perm[jj + 1 + perm[kk + 1]];
        t3 *= t3;
        n3 = t3 * t3 * (permGrad3x[gi3] * x3 + permGrad3y[gi3] * y3 + permGrad3z[gi3] * z3);
      }
      return 32 * (n0 + n1 + n2 + n3);
    };
  }
  function buildPermutationTable(random) {
    const tableSize = 512;
    const p = new Uint8Array(tableSize);
    for (let i = 0; i < tableSize / 2; i++) {
      p[i] = i;
    }
    for (let i = 0; i < tableSize / 2 - 1; i++) {
      const r = i + ~~(random() * (256 - i));
      const aux = p[i];
      p[i] = p[r];
      p[r] = aux;
    }
    for (let i = 256; i < tableSize; i++) {
      p[i] = p[i - 256];
    }
    return p;
  }

  // src/core/noise.ts
  function makeNoise(rng) {
    const n2 = createNoise2D(() => rng.next());
    const n3 = createNoise3D(() => rng.next());
    const fbm2 = (x, y, octaves, lacunarity = 2, gain = 0.5) => {
      let amp = 0.5;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += amp * n2(x * freq, y * freq);
        norm += amp;
        amp *= gain;
        freq *= lacunarity;
      }
      return norm > 0 ? sum / norm : 0;
    };
    return {
      n2,
      n3,
      fbm2,
      curl(x, y, eps = 1e-3) {
        const a = n2(x, y + eps);
        const b = n2(x, y - eps);
        const c = n2(x + eps, y);
        const d = n2(x - eps, y);
        const dx = (a - b) / (2 * eps);
        const dy = (c - d) / (2 * eps);
        return [dx, -dy];
      },
      warp(x, y, amp, freq) {
        const qx = fbm2(x, y, 4);
        const qy = fbm2(x + 5.2, y + 1.3, 4);
        return fbm2(x * freq + amp * qx, y * freq + amp * qy, 5);
      }
    };
  }

  // growth.ts
  var G = globalThis;
  var canvas = document.getElementById("c");
  var q = new URLSearchParams(location.search);
  var num = (k, d) => Number(q.get(k)) || d;
  var small = Math.min(innerWidth, innerHeight * 3) < 1400;
  var complexity = 1;
  var START = num("start", small ? 500 : 1e3);
  var STOP = num("stop", small ? 2900 : 5800);
  var UNIT = num("unit", 0.9);
  var HOLD = num("hold", 9) * 1e3;
  var BASE_RATE = Number(G.__RATE) || 0.032;
  var HOLD_RATE = BASE_RATE * 0.25;
  G.__MAX_NODES = Math.round(STOP * 1.25);
  G.__NO_PRUNE = 1;
  var WARM_MAX = 4e4;
  var piece = createDifferentialGrowth();
  var stepsPerSec = 60;
  function mount() {
    const w = Math.max(2, innerWidth), h = Math.max(2, innerHeight);
    canvas.width = w;
    canvas.height = h;
    const simW = Math.round(w * 1.08), simH = Math.round(h * 1.15);
    G.__OX = (simW - w) / 2;
    G.__OY = (simH - h) / 2;
    G.__UNIT = w * UNIT;
    const surface = createSurface(canvas, piece.backend);
    surface.width = w;
    surface.height = h;
    const rng = makeRng("frond-" + Math.floor(Math.random() * 1e6));
    piece.init({
      surface,
      width: simW,
      height: simH,
      rng,
      noise: makeNoise(rng),
      palette: makePaletteFromColors({ bg: "#05070d", lo: "#2a3a8f", hi: "#9fe7ff" }),
      params: { lineWidth: w >= 2e3 ? 2 : 1, flow: 0.35, fieldScale: 1.4 },
      meta: { complexity, chaos: 0.2 }
    });
    warm = WARM_MAX;
  }
  var visible = true;
  var fading = false;
  var last = 0;
  var acc = 0;
  var warm = 0;
  var fullAt = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (warm > 0) {
      const until = performance.now() + 6;
      while (warm > 0 && performance.now() < until) {
        piece.update(1 / 60, 0);
        warm = piece.xs.length >= START ? 0 : warm - 1;
      }
      if (warm === 0) {
        piece.render();
        canvas.style.opacity = "1";
        fading = false;
      }
      last = now;
      return;
    }
    if (!visible || fading) {
      last = now;
      return;
    }
    acc += Math.max(0, Math.min(0.05, (now - last) / 1e3)) * stepsPerSec;
    last = now;
    const steps = Math.min(2, Math.floor(acc));
    acc -= Math.floor(acc);
    if (steps < 1) return;
    const w0 = performance.now();
    for (let i = 0; i < steps; i++) piece.update(1 / 60, 0);
    piece.render();
    G.__ms = (G.__ms || 0) * 0.9 + (performance.now() - w0) * 0.1;
    const nodes = piece.xs.length;
    G.__n = nodes;
    if (nodes >= STOP && !fullAt) {
      fullAt = now;
      G.__RATE = HOLD_RATE;
    }
    if (fullAt && (now - fullAt > HOLD || nodes >= G.__MAX_NODES) || G.__ms > 14) restart();
  }
  function restart() {
    fading = true;
    fullAt = 0;
    G.__ms = 0;
    G.__RATE = BASE_RATE;
    canvas.style.opacity = "0";
    setTimeout(() => {
      piece = createDifferentialGrowth();
      mount();
    }, 2600);
  }
  mount();
  new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
  }).observe(canvas);
  var rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(mount, 250);
  });
  last = performance.now();
  requestAnimationFrame(tick);
})();
