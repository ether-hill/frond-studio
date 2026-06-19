import type { RNG } from "./types";

// String → 4×32-bit state (xmur3), then sfc32 PRNG. Deterministic & fast.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Create a seedable RNG from a string seed. Same seed ⇒ identical stream. */
export function makeRng(seed: string): RNG {
  const s = xmur3(seed);
  const next = sfc32(s(), s(), s(), s());
  // warm up
  for (let i = 0; i < 12; i++) next();
  let spare: number | null = null;
  return {
    seed,
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    gaussian: (mean = 0, sd = 1) => {
      if (spare !== null) { const v = spare; spare = null; return mean + v * sd; }
      let u = 0, v = 0, r = 0;
      do { u = next() * 2 - 1; v = next() * 2 - 1; r = u * u + v * v; } while (r === 0 || r >= 1);
      const f = Math.sqrt((-2 * Math.log(r)) / r);
      spare = v * f;
      return mean + u * f * sd;
    },
  };
}

/** Random-ish but short string seed for the "randomize seed" button. */
export function randomSeedString(): string {
  const adj = ["coral", "fern", "lichen", "spore", "vein", "delta", "frost", "ember", "moss", "tide", "drift", "bloom"];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${a}-${n}`;
}
