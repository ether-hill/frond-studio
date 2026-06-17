// Personal / non-client Projects — the studio's own experiments, tools and
// generative pieces. This is the growth engine: adding a project is a single
// data object here. Each `href` points either at an internal ported page
// (e.g. /projects/algorithms) or an external link (set `external: true`).

export type PersonalProject = {
  slug: string;
  title: string;
  /** Caps micro-label, e.g. "GENERATIVE · LIVE IN BROWSER". */
  kicker: string;
  summary: string;
  year: string;
  tags: string[];
  href: string;
  external?: boolean;
};

export const PERSONAL_PROJECTS: PersonalProject[] = [
  {
    slug: "instruments",
    title: "Instruments",
    kicker: "WEB AUDIO · PLAYABLE IN-BROWSER",
    summary:
      "A small rack of instruments synthesised entirely in Web Audio — a Juno-106 polysynth, the RE-201 Space Echo tape delay, and a gesture Theremin. No plugins, no samples; play them in the page.",
    year: "2026",
    tags: ["Web Audio", "Synthesis", "TypeScript"],
    href: "/projects/instruments",
  },
  {
    slug: "algorithms",
    title: "Algorithms",
    kicker: "GENERATIVE · LIVE IN BROWSER",
    summary:
      "Twelve generative systems — Physarum slime-mould networks, reaction–diffusion, boids, L-systems, Voronoi, DLA and more — each running live in the browser, building complex structure from a handful of simple rules.",
    year: "2026",
    tags: ["Generative", "p5.js", "WebGL"],
    href: "/projects/algorithms",
  },
];
