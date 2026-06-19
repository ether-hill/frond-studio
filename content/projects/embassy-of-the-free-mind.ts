import type { Project } from "./_types";

// Embassy of the Free Mind — first instance of the reusable case-study template.
// Unverifiable content (live URL, Lighthouse, counts, ticketing activations, the
// client quote) is left as a clearly-marked [[ placeholder ]]. Media slots use an
// empty `src` so each renders a labelled placeholder box until real assets land in
// /public/work/embassy-of-the-free-mind/. The "Before" claims are inferred — review
// before launch.

const project: Project = {
  slug: "embassy-of-the-free-mind",
  title: "Embassy of the Free Mind",
  category: "Museum & library website",
  oneLiner:
    "A new accessible, multilingual home for one of Europe's oldest collections of hermetic and freethinking texts — built to welcome visitors, sell tickets, and surface a rare library.",
  client: "Embassy of the Free Mind (Bibliotheca Philosophica Hermetica)",
  year: "2026",
  services: ["Design", "Development", "Content architecture", "Accessibility", "Integrations"],
  // Real live URL not verified in this brief — left as a marked placeholder.
  liveUrl: undefined,

  heroVideo: {
    type: "video",
    src: "",
    poster: "",
    alt: "Screen recording scrolling through the Embassy of the Free Mind homepage.",
    ratio: "16:9",
    label: "Homepage scroll capture",
  },
  homepageGrab: {
    type: "image",
    src: "",
    alt: "Embassy of the Free Mind homepage hero.",
    ratio: "16:9",
    label: "Homepage hero",
  },

  challenge:
    "EFM holds a world-class collection but its previous site under-served it: hard to navigate, not accessible to all visitors, single-language, and disconnected from ticketing and the library catalogue. The brief was a site that honours the material while doing real operational work — selling tickets, growing membership, and opening the Source Library to the public.",
  approach:
    "Rebuilt as a modern web app with a content architecture suited to the museum's editorial rhythm: exhibitions, press, the Codex Hermeticus newsletter, partners and FAQs all editable in-house. Accessibility and Dutch/English parity were foundations, not add-ons. Commerce and the library catalogue were integrated directly so the site runs the institution rather than just describing it.",

  before: {
    image: {
      type: "image",
      src: "",
      alt: "The previous Embassy of the Free Mind website.",
      ratio: "4:5",
      label: "Before — previous site",
    },
    // Inferred — flag for review before launch.
    points: [
      "Dated design",
      "Not accessible to all",
      "Single language",
      "Ticketing & library elsewhere",
    ],
  },
  after: {
    image: {
      type: "image",
      src: "",
      alt: "The rebuilt Embassy of the Free Mind website.",
      ratio: "4:5",
      label: "After — rebuilt site",
    },
    points: [
      "Editorial design",
      "WCAG AA built in",
      "Full NL / EN parity",
      "Ticketing & library on-site",
    ],
  },

  features: [
    {
      title: "Editorial content model",
      note: "Exhibitions, news/press, the Codex Hermeticus newsletter, FAQs and partners — all editable in-house.",
      clip: { type: "video", src: "", poster: "", alt: "Editing content in the CMS.", ratio: "16:9", label: "Content model" },
    },
    {
      title: "Accessibility, WCAG AA",
      note: "Keyboard navigation, aria labelling and a full conformance audit — accessibility as a foundation, not an add-on.",
      clip: { type: "video", src: "", poster: "", alt: "Keyboard navigation across the site.", ratio: "16:9", label: "Accessibility" },
    },
    {
      title: "Dutch / English",
      note: "Complete localisation with no loss of layout or meaning across both languages.",
      clip: { type: "video", src: "", poster: "", alt: "Switching between Dutch and English.", ratio: "16:9", label: "Localisation" },
    },
    {
      title: "Ticketing & membership",
      note: "Ticket Tailor visits and Stripe-backed membership, live on-site — the institution runs from the page.",
      clip: { type: "video", src: "", poster: "", alt: "Buying a ticket and joining as a member.", ratio: "16:9", label: "Commerce" },
    },
    {
      title: "The Source Library",
      note: "The BPH catalogue surfaced via API, opening a rare library to the public. (Source Library deployment led by Derek.)",
      clip: { type: "video", src: "", poster: "", alt: "Browsing the Source Library catalogue.", ratio: "16:9", label: "Source Library" },
    },
    {
      title: "Custom interactions",
      note: "Navbar dropdowns, scroll lock, lazy load and video play/pause for smooth, considered browsing.",
      clip: { type: "video", src: "", poster: "", alt: "Custom navigation and scroll interactions.", ratio: "16:9", label: "Interactions" },
    },
  ],

  devices: {
    mobile: { type: "image", src: "", alt: "The site on a phone.", ratio: "4:5", label: "Mobile" },
    tablet: { type: "image", src: "", alt: "The site on a tablet.", ratio: "3:4", label: "Tablet" },
    desktop: { type: "image", src: "", alt: "The site on a desktop.", ratio: "16:9", label: "Desktop" },
  },

  integrations: [
    "Next.js",
    "Vercel",
    "Weglot / i18n routing",
    "Ticket Tailor",
    "Stripe",
    "CookieYes (GDPR)",
    "Google Analytics",
    "Zapier",
    "BPH Source Library API",
  ],

  metrics: [
    { value: "[[ Lighthouse ]]", label: "Lighthouse performance" },
    { value: "2", label: "Languages — NL / EN" },
    { value: "AA", label: "WCAG 2.2 conformance" },
    { value: "[[ items ]]", label: "Content items migrated" },
  ],

  quote: {
    body: "[[ one or two lines from Chiara / EFM team ]]",
    author: "[[ name ]]",
    role: "[[ role, EFM ]]",
  },

  credits: "Design & build — Frond Studio. Source Library deployment — Derek. EFM lead — Chiara.",

  next: { slug: "ancient-wisdom-trust", title: "Ancient Wisdom Trust" },
};

export default project;
