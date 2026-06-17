/**
 * Extracts the first frame of each project's thumbnail video into
 * public/posters/<slug>.jpg — used as a fast-loading <video poster>.
 * Run: node scripts/posters.mjs
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const media = JSON.parse(readFileSync("/tmp/media_map.json", "utf8"));
const outDir = "public/posters";
mkdirSync(outDir, { recursive: true });

const entries = Object.entries(media).filter(([, m]) => m.mp4);

let ok = 0;
for (const [slug, m] of entries) {
  const out = `${outDir}/${slug}.jpg`;
  try {
    // First frame, scaled to 960px wide, moderate JPEG quality → small + sharp.
    await run(
      ffmpegPath,
      ["-y", "-i", m.mp4, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", out],
      { timeout: 60000 }
    );
    ok++;
    console.log(`✓ ${slug}.jpg`);
  } catch (e) {
    console.error(`✗ ${slug}: ${String(e.message || e).split("\n")[0]}`);
  }
}
console.log(`\nDone: ${ok}/${entries.length} posters written to ${outDir}`);
