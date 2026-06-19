import type { Project } from "./_types";

// Source Library — a project Frond Studio consults on (we did not design or build
// it). The page foregrounds the project, not our role. Copy follows the strict
// writing rules (short, plain, no marketing voice, no em-dashes, facts over hype).
// Media are real screengrabs of sourcelibrary.org, cropped to ratio and compressed,
// in /public/work/source-library/. Two slots stay placeholders on purpose: "Open
// to machines" has no clean public page to grab, and the podcast is unconfirmed.
// Live numbers move — re-fetch before publishing.

const project: Project = {
  slug: "source-library",
  title: "Source Library",
  category: "Open-access digital library",
  oneLiner:
    "A new Renaissance of ancient wisdom. The world's largest open-access library of AI-translated ancient sources, for scholars, seekers, and AI alike, with Frond Studio consulting.",
  client: "Embassy of the Free Mind",
  year: "2026",
  services: ["Consulting"],
  liveUrl: "https://sourcelibrary.org",

  heroVideo: {
    type: "image",
    src: "/work/source-library/hero.jpg",
    alt: "The Source Library homepage.",
    ratio: "16:9",
    label: "sourcelibrary.org",
  },
  homepageGrab: {
    type: "image",
    src: "/work/source-library/collections.jpg",
    alt: "Browsing the Source Library collections.",
    ratio: "16:9",
    label: "The collection",
  },

  intro: [
    {
      label: "The big idea",
      body: "The rediscovery of ancient texts helped spark the Renaissance. Cosimo de' Medici funded Marsilio Ficino to translate Plato and the Hermetic writings into Latin. For the first time, a lost body of thought became readable across Europe. Source Library does the same work now, at far greater scale. Ad fontes, back to the source.",
    },
    {
      label: "Why it matters",
      body: "Today's AI was trained on the open internet, not on the books that hold humanity's foundational knowledge. Much of that knowledge is still locked in undigitised, untranslated texts. Source Library digitises, OCRs, and translates them, then opens them to people and machines alike. Fed back into AI, this is a path to models grounded in the full depth of human thought.",
    },
    {
      label: "What it is",
      body: "An open-access digital library, in public beta since April 2026. It is already the largest freely available collection of translated primary sources ever assembled. Built on EFM's UNESCO-listed Bibliotheca Philosophica Hermetica, drawing on the Vatican, Bodleian, Cambridge, and Bavarian State libraries.",
    },
  ],

  features: [
    {
      title: "AI translation, scholar-confirmed",
      note: "Custom AI translates. A community of scholars confirms it.",
      clip: { type: "image", src: "/work/source-library/translation.jpg", alt: "A translated source text.", ratio: "16:9", label: "A translated source" },
    },
    {
      title: "First-ever translations",
      note: "5,669 texts translated into English for the first time.",
      clip: { type: "image", src: "/work/source-library/first-translations.jpg", alt: "On the first-ever translations.", ratio: "16:9", label: "First translations" },
    },
    {
      title: "The Librarian",
      note: "An AI assistant for navigating the collection.",
      clip: { type: "image", src: "/work/source-library/librarian.jpg", alt: "The Librarian AI assistant.", ratio: "16:9", label: "The Librarian" },
    },
    {
      title: "The Gallery",
      note: "Every figure, map, and woodcut, extracted automatically.",
      clip: { type: "image", src: "/work/source-library/gallery.jpg", alt: "The Gallery of extracted illustrations.", ratio: "16:9", label: "The Gallery" },
    },
    {
      title: "Open to machines",
      note: "MCP server, CLI, and API for AI tools and researchers.",
      // No clean public page to grab — left as a labelled placeholder.
      clip: { type: "image", src: "", alt: "MCP server, CLI, and API access.", ratio: "16:9", label: "Open to machines" },
    },
    {
      // Podcast status unconfirmed — do not state it ships until confirmed.
      title: "Podcast",
      note: "[[ in development. Confirm launch before listing as live. ]]",
      clip: { type: "image", src: "", alt: "Podcast.", ratio: "16:9", label: "Podcast" },
    },
  ],

  // Live as of June 2026 — re-check before publish.
  metrics: [
    { value: "16,079", label: "Books" },
    { value: "5,669", label: "First-ever translations" },
    { value: "160+", label: "Languages" },
    { value: "190,769", label: "Illustrations" },
  ],

  quote: {
    body: "Ficino translated Plato, Plotinus, and the Hermetica into Latin, making them readable across Europe for the first time. It helped start the Renaissance. Source Library continues that work.",
    author: "Marsilio Ficino, 1433-1499",
  },

  credits: "Initiative of the Embassy of the Free Mind. In partnership with TU Delft. Frond Studio consulting.",
  frondRole: "[[ one line on what the consulting actually covers ]]",
};

export default project;
