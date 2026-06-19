// Small, dependency-free math helpers shared across systems.

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = lerp;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const map = (v: number, a0: number, a1: number, b0: number, b1: number) =>
  b0 + ((v - a0) / (a1 - a0)) * (b1 - b0);

export interface Vec2 { x: number; y: number; }
export const v2 = (x = 0, y = 0): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2) => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec2, b: Vec2) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
export const normalize = (a: Vec2): Vec2 => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };

/** 2D value noise (cheap, seedable via the integer hash) — for growth-bias fields. */
export function valueNoise2D(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), vv = yf * yf * (3 - 2 * yf);
  const h = (i: number, j: number) => {
    let n = (i * 374761393 + j * 668265263) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const x1 = lerp(h(xi, yi), h(xi + 1, yi), u);
  const x2 = lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u);
  return lerp(x1, x2, vv);
}
