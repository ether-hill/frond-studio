import type { EditorialProject } from "./editorial-types";

// Embassy of the Free Mind, editorial long-scroll case study. Media are real
// screengrabs of embassyofthefreemind.com (+ sourcelibrary.org), reused from the
// sibling project's folder and re-compressed. Copy is straight, concise, no
// em-dashes. The client quote is taken from the design reference and is flagged
// for confirmation with the EFM team before launch (needsConfirmation).

const M = "/work/embassy-of-the-free-mind"; // shared media folder

const project: EditorialProject = {
  slug: "embassy-of-the-free-mind-case-study",
  title: "Embassy of the Free Mind",
  category: "Museum & library website",
  oneLiner:
    "A new home for one of Europe's oldest collections of hermetic and freethinking texts. Built to welcome visitors, sell tickets, and open up a rare library.",
  liveUrl: "https://embassyofthefreemind.com",
  liveLabel: "embassyofthefreemind.com",

  hero: {
    type: "image",
    src: `${M}/hero.jpg`,
    alt: "The Embassy of the Free Mind homepage.",
    ratio: "16:9",
    label: "embassyofthefreemind.com",
  },

  introLead:
    "The Embassy of the Free Mind holds a world-class collection of hermetic texts. Its old site got in the way: hard to navigate, single language, and cut off from ticketing and the library catalogue.",
  introBody:
    "Frond rebuilt the museum's site as a modern web app. The content structure matches how the museum actually publishes: exhibitions, news, the Codex Hermeticus newsletter, partners and FAQs. The result honours the material and runs the daily work of the place.",
  client: "Embassy of the Free Mind",
  services: [
    "Brand & Art Direction",
    "UX / UI Design",
    "Web Development",
    "Bilingual CMS",
    "Accessibility (WCAG AA)",
  ],

  stats: [
    { value: "50", label: "Pages", note: "Custom pages designed across the project." },
    { value: "20", label: "Integrations", note: "Commerce, search and catalogue systems wired together." },
    { value: "2", label: "Languages", note: "Fully bilingual. Dutch and English, end to end." },
    { value: "16", label: "Video assets", note: "Background and editorial films, lazy-loaded with play and pause handling." },
  ],

  integrations: [
    "Next.js",
    "Vercel",
    "Weglot / i18n",
    "Ticket Tailor",
    "Stripe",
    "CookieYes (GDPR)",
    "Google Analytics",
    "Zapier",
    "BPH Source Library API",
  ],

  frontDoor: {
    eyebrow: "The front door",
    heading: "Entering the world of the Embassy",
    body: "The homepage sets the tone. A calm, editorial way in that introduces the museum, shows what is on, and points visitors toward tickets, exhibitions and the library. It never feels like a database.",
  },

  band: {
    text: "A house full of free minds.",
    media: {
      type: "image",
      src: `${M}/ticketing.jpg`,
      alt: "Visitors gathered inside the Embassy of the Free Mind.",
      ratio: "16:9",
    },
  },

  contentModel: {
    eyebrow: "Content model",
    heading: "A space for knowledge, reading and visiting",
    body: "Exhibitions, news, editorial pieces, partners and FAQs all run on one system, editable in-house in both Dutch and English. Every template was built to make a complex institution easy to browse.",
  },
  devices: {
    phone: { type: "image", src: `${M}/device-mobile.jpg`, alt: "Booking a visit on a phone.", ratio: "4:5", label: "Tickets" },
    tablet: { type: "image", src: `${M}/device-tablet.jpg`, alt: "The Embassy front entrance on a tablet.", ratio: "3:4", label: "Visit" },
    laptop: { type: "image", src: `${M}/interactions.jpg`, alt: "Searching the library catalogue on a laptop.", ratio: "16:9", label: "Collection search" },
  },

  film: {
    eyebrow: "Film & motion",
    heading: "Original films, made for the Embassy",
    body: "Beyond the build, we made a set of short films for the museum. Motion pieces that bring the building and the collection to life across the site and on social.",
    clips: [
      {
        caption: "The faces on the façade",
        note: "The carved heads above the front door, filmed and composited into a looping portrait.",
        media: { type: "image", src: `${M}/device-tablet.jpg`, alt: "Carved heads on the Embassy façade.", ratio: "1:1" },
      },
      {
        caption: "Two thousand years of images",
        note: "Illuminations and engravings from the Bibliotheca Philosophica Hermetica, cut into one flowing reel.",
        media: { type: "image", src: `${M}/source-library.jpg`, alt: "An illuminated manuscript from the collection.", ratio: "1:1" },
      },
    ],
  },

  pillars: {
    eyebrow: "About page · The seven pillars",
    heading: "Honouring the pillars meant making something special",
    body: "The seven pillars sit at the heart of how the Embassy tells its story, and the team felt they deserved more than a list. We answered with a celestial wheel: the pillars set in slow orbit, turning the About page into a small piece of cosmology.",
    // Stand-in: the celestial-wheel graphic from Frond's rebuild is not on the
    // current live (Webflow) site, so this uses an evocative real screengrab from
    // the collection. Swap for the real /about celestial-wheel capture at launch.
    media: {
      type: "image",
      src: `${M}/localisation.jpg`,
      alt: "A mystical chart from the Bibliotheca Philosophica Hermetica.",
      ratio: "16:9",
      label: "embassyofthefreemind.com/about",
    },
    caption: "The celestial wheel of pillars",
    note: "A custom rotating composition built for the About page. Each pillar is a body in the same orbit, so the Embassy's founding ideas read as one connected whole.",
  },

  // Pulled from the design reference. Confirm exact wording and attribution with
  // the EFM team before launch.
  quote: {
    body: "Frond gave a centuries-old collection a home that finally feels as open and alive as the ideas inside it.",
    author: "Chiara, Embassy of the Free Mind",
    needsConfirmation: true,
  },

  credits: "Design and build by Frond Studio. Source Library deployment by Derek. EFM lead, Chiara.",

  next: { slug: "ancient-wisdom-trust", title: "Ancient Wisdom Trust" },
};

export default project;
