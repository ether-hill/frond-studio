import type { EditorialProject } from "./editorial-types";

// Futures Atlas — our own venture, in partnership with leading foresight labs.
// The partners cannot be named yet, so the wording stays generic; never name
// one here. Not client work, and not something to claim as ours alone. The page
// is about the VALUE an organisation gets (a clear view of what emerging
// technology means for it), led by the concept; individual projects are examples
// only, because the lineup keeps changing, and only pieces that are public on
// futures-atlas.com are named or shown. Each block makes its point once. Media
// are real recordings and screengrabs of the live site, in
// /public/work/futures-atlas/. Facts (315 glossary terms, forty claims, eight
// slides, licences) are from the live site as of October 2026; re-check before
// publishing.

const M = "/work/futures-atlas";

// The two circular visuals on this page are the live pieces, played through the
// Atlas's own embed players. A video of a dense particle field has to be either
// very large or visibly soft; the embed stays sharp at any size. Each one has a
// poster still underneath for slow connections and reduced motion. The frames
// are laid out at 2x and scaled down (see .ecs-embed), so line widths and speeds
// here are doubled to read the same as on the Atlas.
const ATLAS = "https://futures-atlas.com";
const generative = (cfg: object) => `${ATLAS}/generatives/embed.html#${btoa(JSON.stringify(cfg)).replace(/=+$/, "")}`;

const FIELD_EMBED = generative({
  pieceId: "field-dynamics",
  seed: "frond02",
  params: { singularities: 3, speed: 2, fade: 0.02, lineWidth: 3 },
  size: { w: 1080, h: 1080 },
  meta: { complexity: 0.36, chaos: 0.5 },
  theme: "quantum-ink",
  colors: { bg: "#05060a", lo: "#e05cff", hi: "#ffb14d" },
});

const project: EditorialProject = {
  slug: "futures-atlas",
  title: "Futures Atlas",
  category: "Studio venture · Foresight",
  oneLiner:
    "Interactive tools, games, stories and visuals about where computing is heading.",
  liveUrl: "https://futures-atlas.com",
  liveLabel: "futures-atlas.com",

  hero: {
    type: "video",
    src: `${M}/hero.mp4`,
    srcMobile: `${M}/hero-720.mp4`,
    poster: `${M}/hero.avif`,
    alt: "Scrolling through the Futures Atlas homepage.",
    ratio: "16:9",
    label: "futures-atlas.com",
  },
  heroBg: `${M}/hero-bg.avif`,
  heroLite: true,
  card: { video: `${M}/card.mp4`, poster: `${M}/card.jpg` },

  introLead:
    "Futures Atlas helps organisations think clearly about quantum computing, AI and the power behind them.",
  introBody:
    "New pieces are added as they are made, and the code and research behind them are published alongside.",
  clientLabel: "Studio venture",
  client: "Our own venture, in partnership with leading foresight labs",
  services: [
    "Concept & foresight research",
    "Interaction design",
    "Creative coding",
    "AI engineering",
    "Web development",
    "Writing & editorial",
  ],

  cardPoints: [
    "A clear view of what quantum and AI mean for an organisation",
    "Hype separated from what has been demonstrated",
    "Something a team can take straight into a meeting",
  ],

  // Used as a "kinds of work" grid rather than numbers: the four formats are
  // the stable part of the Atlas, the projects inside them are not.
  statsLabel: "Four kinds of work",
  stats: [
    { value: "Tools", label: "Use it", note: "Name your organisation or industry and get something back you can take into a meeting." },
    { value: "Games", label: "Play it", note: "Short and sourced. They test what you think you know against what has been documented." },
    { value: "Stories", label: "Read it", note: "Longer pieces that follow one question through, with the evidence linked." },
    { value: "Visuals", label: "Watch it", note: "Live generative fields and simulations, tunable and ready to embed." },
  ],

  integrations: ["Next.js", "React", "TypeScript", "Tailwind CSS", "three.js", "WebGL", "D3.js", "p5.js", "Claude", "Vercel"],

  frontDoor: {
    eyebrow: "The value",
    heading: "A clearer view of what is coming",
    body: "Leaders are asked to decide on quantum computing and AI long before either has settled. The Atlas gives them a way to work it through: what has been demonstrated, what is only projected, and what that means for their own organisation. Each piece is something to use, so a team can test a claim, argue with it and take the result into a meeting.",
  },

  band: {
    text: "Decisions about quantum and AI, with the hype taken out.",
    media: {
      // Differential Growth from the Atlas's Generatives, slowed right down. The
      // Atlas player has no speed control, so this is a small local page built
      // from the same piece (public/work/futures-atlas/growth/).
      type: "embed",
      src: `${M}/growth/index.html`,
      poster: `${M}/band.avif`,
      alt: "Differential Growth, a generative piece from the Futures Atlas, slowly filling the frame.",
      ratio: "16:9",
    },
  },

  showcase: {
    eyebrow: "On the Atlas, October 2026",
    heading: "A changing lineup of working pieces",
    body: "The projects change as new ones are published, so this is a snapshot. Today the Atlas carries Swipe the Future, a game of forty sourced claims that asks whether each one has already happened. Signal Reactor builds an eight-slide briefing on quantum and advanced AI for a named organisation. The glossary defines 315 terms in plain language, and Quantum Interference Visuals is a set of live wave fields.",
    media: {
      type: "video",
      src: `${M}/pieces.mp4`,
      srcMobile: `${M}/pieces-720.mp4`,
      poster: `${M}/pieces.avif`,
      alt: "A walkthrough of four pieces on the Futures Atlas: Swipe the Future, Signal Reactor, the glossary and Quantum Interference Visuals.",
      ratio: "16:9",
    },
  },

  contentModel: {
    eyebrow: "For partners",
    heading: "An idea in front of its audience quickly",
    body: "Every piece is its own small app, served from one site with a shared navigation and design system. A new idea goes from sketch to public page without a new website around it, and because the code and research are published in the open, the work can be checked, reused and cited.",
  },
  devicesBg: `${M}/devices-bg.avif`,
  devices: {
    phone: { type: "image", src: `${M}/device-phone.avif`, alt: "Swipe the Future on a phone.", ratio: "4:5", label: "Swipe the Future" },
    tablet: { type: "image", src: `${M}/device-tablet.avif`, alt: "The glossary on a tablet.", ratio: "3:4", label: "Glossary" },
    laptop: { type: "image", src: `${M}/device-laptop.avif`, alt: "Signal Reactor on a laptop.", ratio: "16:9", label: "Signal Reactor" },
  },

  film: {
    eyebrow: "Visual language",
    heading: "Visuals made in code",
    body: "The Atlas draws its visuals with code. Flow fields, wave interference and agent systems run live in the browser, can be tuned and recoloured, and can be lifted out as an embed for a banner or a talk.",
    clips: [
      {
        caption: "Two droplets",
        note: "From Quantum Interference Visuals, running live. Two ripples cross, and the pattern is worked out for every pixel as you watch.",
        media: { type: "embed", src: `${ATLAS}/interference/embed.html?v=droplets`, poster: `${M}/circle-waves.avif`, alt: "Two sets of ripples crossing.", ratio: "1:1" },
      },
      {
        caption: "Field Dynamics",
        note: "From Generatives, running live. The flow field behind the Atlas homepage, here in a different palette.",
        media: { type: "embed", src: FIELD_EMBED, poster: `${M}/circle-field.avif`, alt: "A generative flow field.", ratio: "1:1" },
      },
    ],
  },

  next: { slug: "folium", title: "Folium" },
};

export default project;
