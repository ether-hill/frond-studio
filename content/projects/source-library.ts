import type { EditorialProject } from "./editorial-types";

// Source Library — a project Frond Studio consults on (we did not design or build
// it). The page foregrounds the project, not our role. Copy follows the strict
// writing rules: short, plain, no marketing voice, no em-dashes, facts over hype.
// Media are real screengrabs + product videos of sourcelibrary.org, in
// /public/work/source-library/. Live numbers move — re-fetch before publishing.

const M = "/work/source-library";

const project: EditorialProject = {
  slug: "source-library",
  title: "Source Library",
  category: "Open-access digital library",
  oneLiner:
    "The world's largest open-access library of AI-translated ancient sources, for scholars, seekers, and AI alike, with Frond Studio consulting.",
  liveUrl: "https://sourcelibrary.org",
  liveLabel: "sourcelibrary.org",

  hero: {
    type: "video",
    src: `${M}/hero.mp4`,
    poster: `${M}/hero.jpg`,
    alt: "A walkthrough of the Source Library.",
    ratio: "16:9",
    label: "sourcelibrary.org",
  },
  heroBg: `${M}/hero-bg.jpg`,
  heroLite: true,
  // TEMP: stacked backdrop variants to choose from (remove once one is picked).
  heroBgVariants: [
    `${M}/bg-var-0.jpg`,
    `${M}/bg-var-1.jpg`,
    `${M}/bg-var-2.jpg`,
    `${M}/bg-var-3.jpg`,
    `${M}/bg-var-4.jpg`,
    `${M}/bg-var-5.jpg`,
  ],
  card: { video: `${M}/card.mp4`, poster: `${M}/card.jpg` },

  introLead:
    "The rediscovery of ancient texts helped spark the Renaissance. Source Library does that work again, at far greater scale.",
  introBody:
    "Much of humanity's foundational knowledge is still locked in undigitised, untranslated books. Source Library digitises them, reads them with OCR, translates them, and opens them to people and machines alike. It is built on the Embassy of the Free Mind's UNESCO-listed Bibliotheca Philosophica Hermetica, and draws on the Vatican, Bodleian, Cambridge and Bavarian State libraries. In public beta since April 2026.",
  client: "Embassy of the Free Mind",
  services: ["Consulting"],

  statsLabel: "The library, in numbers",
  stats: [
    { value: "16,079", label: "Books", note: "Rare and foundational works, digitised and OCR'd." },
    { value: "5,669", label: "First-ever translations", note: "Texts put into English for the first time." },
    { value: "160+", label: "Languages", note: "Source languages across the collection." },
    { value: "190,769", label: "Illustrations", note: "Figures, maps and woodcuts, extracted automatically." },
  ],

  showcase: {
    eyebrow: "Collections, gallery and image intelligence",
    heading: "Every figure inside the books, found and tagged",
    body: "Source Library opens the pictures inside the books, not just the words. Collections and a gallery let you browse them, with a lightbox for close looking. Advanced AI systems read every scanned page to find, extract, tag, categorise and caption the illustrations, figures and diagrams buried in the texts, so an image you could never have searched for becomes findable in seconds.",
    media: {
      type: "video",
      src: `${M}/emblems.mp4`,
      poster: `${M}/emblems.jpg`,
      alt: "Alchemical emblems and figures extracted from the collection.",
      ratio: "16:9",
    },
  },

  pillars: {
    eyebrow: "The Librarian",
    heading: "An AI assistant for the whole collection",
    body: "Ask in plain language and the Librarian finds, summarises and cross-references across thousands of translated sources. It is open to machines too: an MCP server, a CLI and an API let other AI tools read the library directly.",
    media: {
      type: "image",
      src: `${M}/librarian.jpg`,
      alt: "The Librarian, the Source Library AI assistant.",
      ratio: "16:9",
      label: "sourcelibrary.org",
    },
    caption: "The Librarian",
    note: "",
  },

  quote: {
    body: "Ficino translated Plato, Plotinus and the Hermetica into Latin, making them readable across Europe for the first time. It helped start the Renaissance. Source Library continues that work.",
    author: "On Marsilio Ficino, 1433 to 1499",
  },

  next: { slug: "embassy-of-the-free-mind", title: "Embassy of the Free Mind" },
};

export default project;
