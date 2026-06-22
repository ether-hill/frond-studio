import type { EditorialProject } from "./editorial-types";

// Embassy of the Free Mind, editorial long-scroll case study. Media are real
// screengrabs of embassyofthefreemind.com (+ sourcelibrary.org), reused from the
// sibling project's folder and re-compressed. Copy is straight, concise, no
// em-dashes. The client quote is taken from the design reference and is flagged
// for confirmation with the EFM team before launch (needsConfirmation).

const M = "/work/embassy-of-the-free-mind"; // shared media folder

const project: EditorialProject = {
  slug: "embassy-of-the-free-mind",
  title: "Embassy of the Free Mind",
  category: "Museum & library website",
  oneLiner:
    "A new home for the largest collection of hermetic and freethinking texts in the world. Built to welcome visitors, sell tickets, open a rare library, and support the mission.",
  liveUrl: "https://embassyofthefreemind.com",
  liveLabel: "embassyofthefreemind.com",

  hero: {
    type: "video",
    src: `${M}/videos/hero-scroll.mp4`,
    poster: `${M}/videos/hero-scroll.jpg`,
    alt: "Scrolling through the Embassy of the Free Mind homepage.",
    ratio: "16:9",
    label: "embassyofthefreemind.com",
  },
  heroBg: `${M}/hero-bg-affiche.avif`,
  card: { video: `${M}/card.mp4`, poster: `${M}/card.jpg` },

  introLead:
    "The Embassy of the Free Mind holds a world-class collection of hermetic texts. Its old site got in the way: hard to navigate, single language, and cut off from ticketing and the library catalogue.",
  introBody:
    "Frond rebuilt the museum's site as a modern web app. The content structure matches how the museum actually publishes: exhibitions, news, the Codex Hermeticus newsletter, partners and FAQs. The result honours the material and runs the daily work of the place.",
  client: "Embassy of the Free Mind",
  services: [
    "Art Direction",
    "UX / UI Design",
    "Web Development",
    "Bilingual CMS",
    "Accessibility (WCAG AA)",
  ],

  statsLabel: "The build, at a glance",
  stats: [
    { value: "50", label: "Pages", note: "Custom pages designed across the project." },
    { value: "20", label: "Integrations", note: "Commerce, search and catalogue systems wired together." },
    { value: "2", label: "Languages", note: "Fully bilingual. Dutch and English, end to end." },
    { value: "16", label: "Video assets", note: "Background and editorial films, lazy-loaded with play and pause handling." },
  ],

  // Card-only points for the /work preview row — kept distinct from the on-page
  // "at a glance" stats so the card reads in outcomes, not build counts.
  cardPoints: [
    "Tickets, library catalogue and membership, finally in one place",
    "Fully bilingual, Dutch and English",
    "Accessible by design (WCAG AA)",
    "A site the museum runs and grows in-house",
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
      type: "video",
      src: `${M}/videos/montage.mp4`,
      poster: `${M}/videos/montage.jpg`,
      alt: "A montage of the building and the collection.",
      ratio: "16:9",
    },
  },

  contentModel: {
    eyebrow: "Content model",
    heading: "A space for knowledge, reading and visiting",
    body: "Exhibitions, news, editorial pieces, partners and FAQs all run on one system, editable in-house in both Dutch and English. Every template was built to make a complex institution easy to browse.",
  },
  devices: {
    phone: { type: "image", src: `${M}/mock-tickets.jpg`, alt: "Booking a museum visit on a phone.", ratio: "4:5", label: "Tickets" },
    tablet: { type: "image", src: `${M}/mock-tours.jpg`, alt: "Guided tours page on a tablet.", ratio: "3:4", label: "Tours" },
    laptop: { type: "image", src: `${M}/mock-catalogue.jpg`, alt: "The library catalogue on a laptop.", ratio: "16:9", label: "Collection search" },
  },

  film: {
    eyebrow: "Film & motion",
    heading: "Original films, made for the Embassy",
    body: "Beyond the build, we made a set of short films for the museum. Motion pieces that bring the building and the collection to life across the site and on social.",
    clips: [
      {
        caption: "The faces on the façade",
        note: "The carved heads above the front door, filmed and composited into a looping portrait.",
        media: { type: "video", src: `${M}/videos/film-heads.mp4`, poster: `${M}/videos/film-heads.jpg`, alt: "A carved head from the Embassy façade.", ratio: "1:1" },
      },
      {
        caption: "Two thousand years of images",
        note: "Artworks and illuminations from the collection, cut into one flowing reel.",
        media: { type: "video", src: `${M}/videos/film-activities.mp4`, poster: `${M}/videos/film-activities.jpg`, alt: "An illustrated artwork from the collection.", ratio: "1:1" },
      },
    ],
  },

  pillars: {
    eyebrow: "About page · The seven pillars",
    heading: "Honouring the pillars meant making something special",
    body: "The seven pillars sit at the heart of how the Embassy tells its story, and the team felt they deserved more than a list. We answered with a celestial wheel: the pillars set in slow orbit, turning the About page into a small piece of cosmology.",
    media: {
      type: "video",
      src: `${M}/videos/pillars.mp4`,
      poster: `${M}/videos/pillars.jpg`,
      alt: "The celestial wheel of pillars on the About page.",
      ratio: "16:9",
      label: "embassyofthefreemind.com/about",
    },
    caption: "The celestial wheel of pillars",
    note: "A custom rotating composition built for the About page. Each pillar is a body in the same orbit, so the Embassy's founding ideas read as one connected whole.",
  },

  // Longer-form testimonial, rendered as a calm editorial block.
  testimonial: {
    body: "When we began, we had no real digital presence to speak of: an outdated brand, no visitor journey, no integration with our operational systems, and no straightforward way to keep things current. Frond Studio addressed all of it. We can now reach our audience, and they can reach us, far more easily. Ticket sales have risen, refund requests have fallen to their lowest point, and newsletter signups continue to grow. What has meant the most, though, is the response. People consistently tell us the site is beautiful, and that the Embassy of the Free Mind is finally represented online the way it deserves to be.",
    author: "Chiara Mancini",
    role: "Program & Digital Strategy",
  },

  // iPhone mockup with a real screen-recording of the events → ticketing flow.
  phoneFilm: {
    eyebrow: "On the phone",
    heading: "From browsing to booked",
    body: "Visitors find an event, open it, and buy a ticket without leaving the site. Here: the agenda, the Forum for Process, and checkout for the first available date, in a handful of taps.",
    src: `${M}/videos/iphone-tickets.mp4`,
    poster: `${M}/videos/iphone-tickets.jpg`,
    alt: "Screen recording of browsing the Embassy events on a phone and buying a ticket for the Forum for Process.",
  },

  // The closing pull-quote (over the flowing-lines video).
  quote: {
    body: "What stood out most was trust. I could rely on Frond Studio not only to deliver, but to exceed what we had imagined. They stayed a step ahead at every stage, and the whole project came into focus once the design, systems, and structure aligned.",
    author: "Chiara Mancini",
    role: "Program & Digital Strategy",
  },
  quoteBg: {
    type: "video",
    src: `${M}/videos/flowing-lines.mp4`,
    poster: `${M}/videos/flowing-lines.jpg`,
    alt: "",
    ratio: "16:9",
  },

  credits: "Design and build by Frond Studio. Source Library deployment by Derek. EFM lead, Chiara.",

  next: { slug: "ancient-wisdom-trust", title: "Ancient Wisdom Trust" },
};

export default project;
