// /instruments hub — the rack. A monochrome index of the playable Web Audio
// instruments, matching the Catalog design (mono micro-labels, hairline cards, large
// display type). Each card links to its full-screen instrument page. Adding an
// instrument = one entry in RACK below.

import { MONO, reduceMotion } from "./shared";

export function mountHub(root: HTMLElement) {


interface RackEntry {
  slug: string; name: string; kind: string;
  blurb: string; specs: string[]; img: string;
}

const RACK: RackEntry[] = [
  {
    slug: "juno-106", name: "Juno-106", kind: "6-VOICE POLYSYNTH",
    blurb: "Roland's 1984 polysynth, rebuilt in Web Audio — DCO with sub-oscillator and PWM, a 24 dB resonant filter, one envelope, one LFO, and that lush stereo chorus. Play it with your computer keyboard.",
    specs: ["6 voices", "DCO + SUB + NOISE", "24 dB VCF", "JUNO CHORUS"],
    img: "/cards/inst-juno-106.jpg",
  },
  {
    slug: "space-echo", name: "Space Echo", kind: "RE-201 TAPE DELAY",
    blurb: "The RE-201 tape delay and spring reverb. Three playback heads, wow & flutter, and tape saturation that smears each repeat into haze. Push the intensity and it self-oscillates. Play the onboard synth or run your mic through it.",
    specs: ["3 TAPE HEADS", "WOW · FLUTTER", "TAPE SATURATION", "SPRING REVERB"],
    img: "/cards/inst-space-echo.jpg",
  },
  {
    slug: "theremin", name: "Theremin", kind: "GESTURE INSTRUMENT",
    blurb: "No keys, no contact. Sweep the field — pitch on one axis, volume on the other — with vibrato, glide and reverb. Snap to a scale, or play it free, out of thin air.",
    specs: ["X PITCH · Y VOLUME", "VIBRATO", "PORTAMENTO", "SCALE SNAP"],
    img: "/cards/inst-theremin.jpg",
  },
  {
    slug: "biome", name: "Biome", kind: "SOUND HEALING ECOSYSTEM",
    blurb: "A living soundscape mixer for sound healing — solfeggio, binaural & isochronic beats, Schumann and 40 Hz gamma, layered into breathing channels. Load presets, save your own, randomise, or let it grow itself, organically, like an ecosystem.",
    specs: ["SOLFEGGIO · BINAURAL", "ISOCHRONIC · GAMMA", "AUTONOMOUS GROWTH", "SAVE · RANDOMISE"],
    img: "/cards/inst-biome.jpg",
  },
];

// CSS for the rack cards
const css = document.createElement("style");
css.textContent = `
.rack-card{display:flex;flex-direction:column;gap:18px;padding:clamp(24px,3vw,40px);border:1px solid rgba(var(--lw),0.13);border-radius:10px;background:var(--panel);text-decoration:none;color:inherit;transition:border-color .25s,transform .25s,background .25s}
.rack-card:hover{border-color:rgba(var(--lw),0.4);transform:translateY(-3px);background:rgba(var(--lw),0.06)}
.rack-card:focus-visible{outline:2px solid var(--fg);outline-offset:4px}
.rack-shot{position:relative;display:block;width:100%;aspect-ratio:16/9;border-radius:7px;overflow:hidden;background:var(--bg-0);border:1px solid rgba(var(--lw),0.1)}
.rack-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s cubic-bezier(0.22,1,0.36,1)}
.rack-card:hover .rack-shot img{transform:scale(1.03)}
.rack-spec{font-family:${MONO};font-size:10px;letter-spacing:0.12em;color:var(--fg3);border:1px solid rgba(var(--lw),0.16);border-radius:20px;padding:5px 11px}
.rack-go{font-family:${MONO};font-size:11px;letter-spacing:0.16em;color:var(--fg2);display:inline-flex;align-items:center;gap:8px;transition:gap .2s,color .2s}
.rack-card:hover .rack-go{gap:14px;color:var(--fg)}
.inst-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:var(--fg);font-family:${MONO};font-size:11px;letter-spacing:0.14em;padding:11px 16px;border:1px solid rgba(var(--lw),0.26);border-radius:4px;transition:background .2s,color .2s}
.inst-link:hover{background:var(--fg);color:var(--bg)}
@media (prefers-reduced-motion: reduce){.rack-card:hover{transform:none}}
`;
document.head.appendChild(css);

const hero = document.createElement("section");
hero.style.cssText = "padding:clamp(100px,13vw,156px) 0 clamp(36px,5vw,60px);border-bottom:1px solid rgba(var(--lw),0.1)";
hero.innerHTML =
  `<div style="max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter)">` +
    `<div style="font-family:${MONO};font-size:11px;letter-spacing:0.28em;color:var(--fg4);margin-bottom:18px">INSTRUMENTS · PLAYABLE IN-BROWSER</div>` +
    `<h1 style="margin:0;font-weight:700;font-size:clamp(40px,8vw,108px);line-height:0.92;letter-spacing:-0.035em;max-width:14ch">A growing rack, built from code.</h1>` +
    `<p style="margin:24px 0 0;max-width:62ch;font-size:clamp(15px,2vw,20px);line-height:1.6;color:var(--fg2)">Instruments synthesised entirely in Web Audio: no plugins, no downloads, no samples. Classic circuits, a gesture controller and a living soundscape, rebuilt as code and played in the page. Sound starts on a click; bring headphones.</p>` +
  `</div>`;
root.appendChild(hero);

const grid = document.createElement("section");
grid.style.cssText = "max-width:var(--maxw);margin:0 auto;padding:clamp(36px,5vw,64px) var(--gutter) clamp(72px,9vw,120px);display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:clamp(20px,2.4vw,40px)";
grid.innerHTML = RACK.map((r) =>
  `<a class="rack-card" href="/projects/instruments/${r.slug}" aria-label="Open ${r.name}">` +
    `<span class="rack-shot"><img src="${r.img}" alt="${r.name} interface" loading="lazy" decoding="async" width="1600" height="900"></span>` +
    `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px">` +
      `<span style="font-family:${MONO};font-size:11px;letter-spacing:0.16em;color:var(--fg4)">${r.kind}</span>` +
    `</div>` +
    `<h2 style="margin:0;font-weight:700;font-size:clamp(30px,4vw,48px);line-height:0.98;letter-spacing:-0.02em">${r.name}</h2>` +
    `<p style="margin:0;font-size:14.5px;line-height:1.6;color:var(--fg2)">${r.blurb}</p>` +
    `<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:auto">${r.specs.map((s) => `<span class="rack-spec">${s}</span>`).join("")}</div>` +
    `<span class="rack-go">PLAY <span style="font-size:13px">→</span></span>` +
  `</a>`
).join("");
root.appendChild(grid);

// a closing note linking back to the editorial project
const note = document.createElement("section");
note.style.cssText = "background:var(--band);border-top:1px solid rgba(var(--lw),0.1);padding:clamp(48px,7vw,90px) 0";
note.innerHTML =
  `<div style="max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter);display:flex;flex-wrap:wrap;gap:28px;align-items:center;justify-content:space-between">` +
    `<p style="margin:0;max-width:48ch;font-size:clamp(16px,2.2vw,22px);line-height:1.45;color:var(--fg);font-weight:500">The rack grows. These are the first four — the longer thesis on instruments-as-code lives in the project register.</p>` +
    `<a class="inst-link" href="/projects">← ALL PROJECTS</a>` +
  `</div>`;
root.appendChild(note);

if (!reduceMotion()) {
  const cards = grid.querySelectorAll<HTMLElement>(".rack-card");
  cards.forEach((c, i) => { c.style.animation = `fadeUp .6s cubic-bezier(0.22,1,0.36,1) ${0.05 * i}s both`; });
}


}
