// Encrypts a client proposal so it can live in this (public) repo.
//
//   node scripts/encrypt-proposal.mjs <slug> <password> [source.json]
//
// Reads ~/Projects/frond-proposals/<slug>.json by default (plaintext never goes
// in the repo) and writes content/proposals/<slug>.enc.json. The page decrypts
// it in the browser with the password: PBKDF2-SHA256 -> AES-256-GCM.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { webcrypto as crypto } from "node:crypto";

const [slug, password, srcArg] = process.argv.slice(2);
if (!slug || !password) {
  console.error("usage: node scripts/encrypt-proposal.mjs <slug> <password> [source.json]");
  process.exit(1);
}
const src = srcArg ?? join(homedir(), "Projects", "frond-proposals", `${slug}.json`);
const plain = JSON.stringify(JSON.parse(readFileSync(src, "utf8")));

const ITERATIONS = 600_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
  base,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));

const b64 = (u) => Buffer.from(u).toString("base64");
mkdirSync("content/proposals", { recursive: true });
const out = `content/proposals/${slug}.enc.json`;
writeFileSync(out, JSON.stringify({ v: 1, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) }) + "\n");
console.log(`wrote ${out}`);
