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
  /** 16:9 cover image (in /public). */
  image?: string;
};

export const PERSONAL_PROJECTS: PersonalProject[] = [
  {
    slug: "render-inspector",
    title: "Render Inspector",
    kicker: "THREE.JS · GLASS + LIVE CONTROLS",
    summary:
      "A glass solid spinning in front of glowing 3D text — transmission material, selective bloom and a soft contact shadow, with every material, geometry and colour knob wired to a live control panel and a renderer inspector. A faithful three.js recreation of Faraz Shaikh's R3F WebGPU-inspector demo.",
    year: "2026",
    tags: ["three.js", "WebGL", "Glass", "Live Controls"],
    href: "/projects/render-inspector",
  },
  {
    slug: "shader-lab",
    title: "Shader Lab",
    kicker: "SHADER · REAL-TIME · LIVE CONTROLS",
    summary:
      "An original real-time flow-field running entirely on the GPU as a three.js fragment shader, wired to a live control panel: every slider — speed, warp, detail, palette — re-tunes the image instantly, nothing recompiles. Drag to push the flow, randomise for a new world, save a still.",
    year: "2026",
    tags: ["Shader", "GLSL", "three.js", "Creative Coding"],
    href: "/projects/shader-lab",
  },
  {
    slug: "data-center-sim-f5",
    title: "Data Center Sim F5",
    kicker: "GAME · FABLE 5 REBUILD",
    summary:
      "A from-scratch rebuild of the data center sim, on a high-desert plateau shared with a small town. Everything runs on the clock — solar by day, a dirty pricier grid at night, batteries in between — and scale has a price: the chillers roar (turn on Sound), grid carbon smogs the town, and community sentiment falls as the neighbors lose patience.",
    year: "2026",
    tags: ["Game", "Simulation", "three.js", "TypeScript"],
    href: "/projects/data-center-sim-f5",
  },
  {
    slug: "data-center-sim",
    title: "Data Center Sim",
    kicker: "GAME · BUILD & RUN IN BROWSER",
    summary:
      "A management sim of a data center: lay out racks, cooling, power and networking on the floor, then keep the heat under control. Heat is a real diffusing field — place coolers near racks or watch your servers throttle, overheat and fail. Earn compute revenue and bank your way to the goal.",
    year: "2026",
    tags: ["Game", "Simulation", "Canvas", "TypeScript"],
    href: "/projects/data-center-sim",
  },
  {
    slug: "algorithms",
    title: "Algorithms V1",
    kicker: "GENERATIVE · LIVE IN BROWSER",
    summary:
      "A growing collection of generative systems: Physarum slime-mould networks, reaction–diffusion, boids, L-systems, Voronoi, DLA and more, each running live in the browser, building complex structure from a handful of simple rules.",
    year: "2026",
    tags: ["Generative", "p5.js", "WebGL"],
    href: "/projects/algorithms",
    image: "/cards/algorithms.jpg",
  },
  {
    slug: "instruments",
    title: "Instruments",
    kicker: "WEB AUDIO · PLAYABLE IN-BROWSER",
    summary:
      "A growing rack of instruments synthesised entirely in Web Audio: a Juno-106 polysynth, the RE-201 Space Echo tape delay, a gesture Theremin and more. No plugins, no samples; play them in the page.",
    year: "2026",
    tags: ["Web Audio", "Synthesis", "TypeScript"],
    href: "/projects/instruments",
    image: "/cards/instruments.jpg",
  },
  {
    slug: "sma-config",
    title: "SMA Config",
    kicker: "GENERATIVE · GPU · LIVE TOOL",
    summary:
      "An advanced real-time studio for the Jones (2010) agent-based Physarum slime-mould model — hundreds of thousands of agents on the GPU, with deep live control over sensing, deposition, diffusion and colour.",
    year: "2026",
    tags: ["WebGL2", "Slime mould", "Generative"],
    href: "/projects/sma-config",
    image: "/cards/sma-config.jpg",
  },
  {
    slug: "algorithm-lab",
    title: "Algorithms V2",
    kicker: "GENERATIVE · LIVE SANDBOX",
    summary:
      "A live sandbox for seven nature-inspired generative systems: space colonization, differential growth, phyllotaxis, strange attractors, dielectric breakdown, stable fluids and reaction-diffusion. Each one is seedable, tunable in real time and exportable to hi-res.",
    year: "2026",
    tags: ["Generative", "WebGL", "TypeScript"],
    href: "/projects/algorithm-lab",
    image: "/cards/algorithm-lab.jpg",
  },
  {
    slug: "symcyto",
    title: "Symcyto",
    kicker: "BIO-ART · LIVING MEDIA",
    summary:
      "New forms of harvest — a collaboration with the slime mould Physarum polycephalum. Timelapse bio-art and documentary content grown in smart-enabled studio ecosystems, where an ancient organic intelligence becomes the medium.",
    year: "2026",
    tags: ["Bio-art", "Slime mould", "Timelapse"],
    href: "/projects/symcyto",
    image: "/cards/symcyto.jpg",
  },
  {
    slug: "timelapse-media-production",
    title: "Timelapse Media",
    kicker: "FILM · TIMELAPSE · PRODUCTION",
    summary:
      "Process design, rigging, content creation and consulting for timelapse photography and film — focussed on the kingdoms of plants, fungi and slime mould, with deep experience in architecture, events and industrial work.",
    year: "2026",
    tags: ["Timelapse", "Film", "Production"],
    href: "/projects/timelapse-media-production",
    image: "/cards/timelapse-media-production.jpg",
  },
  {
    slug: "cymatics",
    title: "Cymatics Simulator",
    kicker: "INTERACTIVE · LIVE IN BROWSER",
    summary:
      "An interactive cymatics simulator and live-display research rig — vibrating water at key frequencies to induce complex geometry. Turn on the sound, scrub the timeline and bounce between frequencies to see how tone and resonance shape matter.",
    year: "2024",
    tags: ["Interactive", "Cymatics", "Web Audio"],
    href: "/projects/cymatics",
    image: "/cards/cymatics-sim.jpg",
  },
  {
    slug: "cymatics-bubbles",
    title: "Cymatics in Bubbles",
    kicker: "R&D · SOUND MADE VISIBLE",
    summary:
      "Spherical cymatics in hard-to-pop, high-performance bubbles — sound vibrations visualised as 3D patterns in thin films, swirling with thin-film interference colour. A multisensory study where scientific research meets artistic expression.",
    year: "2024",
    tags: ["Cymatics", "R&D", "Sound"],
    href: "/projects/cymatics-bubbles",
    image: "/cards/cymatics.jpg",
  },
  {
    slug: "further-cymatics",
    title: "Further Cymatics",
    kicker: "R&D · SOUND & PROGRAMMABLE LIGHT",
    summary:
      "New cymatics rigs that pair sound with programmable light — RGB LED ring arrays driven by Arduino and DMX, temporal-aliasing tests that phase light against sound for smooth linear motion, and new vessel geometries in size, depth and multi-ring form.",
    year: "2025",
    tags: ["Cymatics", "R&D", "RGB LED", "DMX"],
    href: "/projects/further-cymatics",
    image: "/cards/further-cymatics.jpg",
  },
  {
    slug: "fungi-source",
    title: "Fungi Source",
    kicker: "RESEARCH · OPEN FUNGI LIBRARY",
    summary:
      "A far-and-wide search for the literature of fungi — early treatises to modern field guides, public-domain first — gathered, OCR'd, translated and catalogued into one centralised open database. Free and open-sourced, shared via an API to power AI tools and research, and handed off to Source Library.",
    year: "2026",
    tags: ["Research", "Open Data", "Translation", "Mycology"],
    href: "/projects/fungi-source",
    image: "/cards/fungi-source.jpg",
  },
];
