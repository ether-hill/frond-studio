// Verifies the architectural constraint: algorithm cores (src/core, src/systems)
// must NOT import Vite, Tweakpane, or a DOM framework — so they lift into the
// Next.js site with no rewrite. `three` is allowed ONLY in rd-surface.ts.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FORBIDDEN = /from\s+['"](tweakpane|vite|react|react-dom|svelte|vue)['"]/;
const THREE = /from\s+['"]three['"]/;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

let bad = 0;
for (const f of [...walk(join(ROOT, "src/core")), ...walk(join(ROOT, "src/systems"))]) {
  const src = readFileSync(f, "utf8");
  if (FORBIDDEN.test(src)) { console.error(`✗ forbidden framework import in ${f}`); bad++; }
  if (THREE.test(src) && !f.endsWith("rd-surface.ts")) { console.error(`✗ unexpected three import in ${f}`); bad++; }
}

if (bad) { console.error(`\n${bad} portability violation(s).`); process.exit(1); }
console.log("✓ cores are portable — no Vite/Tweakpane/framework imports.");
