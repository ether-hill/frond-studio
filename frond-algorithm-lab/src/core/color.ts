// OKLCH-based colour. All interpolation happens in OKLab — never raw RGB lerps.
// Systems drive colour from a simulation *field* (age / depth / density / …)
// through `fieldToColor(value, palette)`. Dependency-free (Ottosson's oklab).

export type Rgb = [number, number, number]; // 0..255

// ── sRGB gamma ────────────────────────────────────────────────────────────────
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface Oklab { L: number; a: number; b: number; }
export interface Oklch { L: number; C: number; h: number; } // h in degrees

// ── linear sRGB ↔ OKLab (Björn Ottosson) ─────────────────────────────────────
export function linearSrgbToOklab(r: number, g: number, b: number): Oklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToLinearSrgb(L: number, a: number, b: number): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [
    Math.round(clamp01(toGamma(clamp01(r))) * 255),
    Math.round(clamp01(toGamma(clamp01(g))) * 255),
    Math.round(clamp01(toGamma(clamp01(bb))) * 255),
  ];
}

// ── OKLCH ↔ Rgb / hex ─────────────────────────────────────────────────────────
const D2R = Math.PI / 180;
export function oklchToRgb(L: number, C: number, h: number): Rgb {
  return oklabToLinearSrgb(L, C * Math.cos(h * D2R), C * Math.sin(h * D2R));
}
export const rgbToCss = ([r, g, b]: Rgb) => `rgb(${r},${g},${b})`;
export const oklchToCss = (L: number, C: number, h: number) => rgbToCss(oklchToRgb(L, C, h));

const hex2 = (n: number) => n.toString(16).padStart(2, "0");
export const rgbToHex = ([r, g, b]: Rgb) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

export function hexToOklch(hex: string): Oklch {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lab = linearSrgbToOklab(toLinear(r), toLinear(g), toLinear(b));
  const C = Math.hypot(lab.a, lab.b);
  let hh = (Math.atan2(lab.b, lab.a) / D2R) % 360;
  if (hh < 0) hh += 360;
  return { L: lab.L, C, h: hh };
}
export function oklchToHex(L: number, C: number, h: number): string {
  return rgbToHex(oklchToRgb(L, C, h));
}

// ── Palettes & field mapping ─────────────────────────────────────────────────
export interface Stop { L: number; C: number; h: number; } // an OKLCH control point
export type Palette = { id: string; label: string; stops: Stop[] };

const S = (L: number, C: number, h: number): Stop => ({ L, C, h });

// Reference palettes sampled from natural sources (botanical / mineral / microscopy).
export const PALETTES: Record<string, Palette> = {
  fern: { id: "fern", label: "Fern (botanical)", stops: [S(0.18, 0.05, 150), S(0.42, 0.13, 150), S(0.68, 0.17, 135), S(0.9, 0.16, 120)] },
  coral: { id: "coral", label: "Coral (reef)", stops: [S(0.2, 0.08, 12), S(0.5, 0.18, 18), S(0.72, 0.16, 40), S(0.93, 0.07, 75)] },
  azurite: { id: "azurite", label: "Azurite (mineral)", stops: [S(0.16, 0.07, 265), S(0.4, 0.14, 250), S(0.62, 0.13, 210), S(0.86, 0.1, 175)] },
  fluoro: { id: "fluoro", label: "Fluorescence (microscopy)", stops: [S(0.1, 0.05, 300), S(0.35, 0.2, 285), S(0.62, 0.18, 200), S(0.85, 0.2, 130), S(0.97, 0.18, 100)] },
  ember: { id: "ember", label: "Ember (mineral heat)", stops: [S(0.08, 0.03, 30), S(0.34, 0.16, 35), S(0.6, 0.2, 55), S(0.82, 0.16, 80), S(0.98, 0.04, 95)] },
  ice: { id: "ice", label: "Glacier (mineral)", stops: [S(0.2, 0.04, 230), S(0.5, 0.09, 220), S(0.78, 0.08, 205), S(0.97, 0.03, 200)] },
};

export const PALETTE_IDS = Object.keys(PALETTES);

function lerpStops(a: Stop, b: Stop, t: number): Rgb {
  // interpolate in OKLab so the ramp is perceptually even; shortest-arc hue.
  const al = { L: a.L, A: a.C * Math.cos(a.h * D2R), B: a.C * Math.sin(a.h * D2R) };
  const bl = { L: b.L, A: b.C * Math.cos(b.h * D2R), B: b.C * Math.sin(b.h * D2R) };
  return oklabToLinearSrgb(al.L + (bl.L - al.L) * t, al.A + (bl.A - al.A) * t, al.B + (bl.B - al.B) * t);
}

/** Map a field value v∈[0,1] through a palette → Rgb. Interpolated in OKLab. */
export function fieldToRgb(v: number, palette: Palette): Rgb {
  const stops = palette.stops;
  const t = clamp01(v) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return lerpStops(stops[i], stops[i + 1], t - i);
}

/** Same as fieldToRgb but returns a css rgb() string. */
export function fieldToColor(v: number, palette: Palette): string {
  return rgbToCss(fieldToRgb(v, palette));
}

export const getPalette = (id: string): Palette => PALETTES[id] ?? PALETTES.fern;
