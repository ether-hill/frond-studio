import type { EditorialProject } from "./editorial-types";

// Folium — our own venture, in partnership with Playpower Labs. Not client work,
// and not something to claim as ours alone. The whole page is about the VALUE an
// institution gets (reach, expertise that scales, ownership, a low-risk start),
// never a list of features. Each block makes one of those points once; nothing
// is said twice. Claims stay within what folium-studio.com itself says. No
// stats, no before/after, no "ways to put it online", no picture-search section,
// by the owner's choice. Media are real recordings of folium-studio.com and of
// the reader on sourcelibrary.org, in /public/work/folium/. No client quote yet.

const M = "/work/folium";

const project: EditorialProject = {
  slug: "folium",
  title: "Folium",
  category: "Studio venture · Digital libraries",
  oneLiner:
    "A venture that helps libraries, museums and archives get their collections read.",
  liveUrl: "https://folium-studio.com",
  liveLabel: "folium-studio.com",

  hero: {
    type: "video",
    src: `${M}/hero.mp4`,
    srcMobile: `${M}/hero-720.mp4`,
    poster: `${M}/hero.avif`,
    alt: "Scrolling through the Folium homepage.",
    ratio: "16:9",
    label: "folium-studio.com",
  },
  heroBg: `${M}/hero-bg.avif`,
  heroLite: true,
  card: { video: `${M}/card.mp4`, poster: `${M}/card.jpg` },

  introLead:
    "Folium helps libraries, museums and archives turn a digitised collection into one that people read, search and cite.",
  introBody:
    "Most digitised collections stop at the scan, which only serves a reader who already knows the language and the script. Folium grew out of the work on Source Library and the Embassy of the Free Mind.",
  clientLabel: "Studio venture",
  client: "Our own venture, in partnership with Playpower Labs",
  clientLink: { text: "Playpower Labs", href: "https://www.playpowerlabs.com/" },
  services: [
    "Product strategy",
    "Brand & identity",
    "UX / UI design",
    "Web development",
    "Collection publishing",
  ],

  cardPoints: [
    "Readers far beyond the reading room",
    "Staff expertise that reaches every volume",
    "The institution's own name on it, and records free to leave",
  ],

  frontDoor: {
    eyebrow: "What an institution gains",
    heading: "Expertise that reaches the whole collection",
    body: "The people who know a collection can only describe so much of it by hand. With Folium, machines draft the first pass for every volume, and the institution's own scholars and curators check and correct it, so their knowledge reaches all of it. Teaching, public programmes and independent research then have far more to draw on.",
  },

  band: {
    text: "Your collection, open to far more people than could ever visit it.",
    media: {
      type: "image",
      src: `${M}/opening.avif`,
      alt: "A rare book lying open at a fold-out engraving, from the Bibliotheca Philosophica Hermetica.",
      ratio: "16:9",
    },
  },

  showcase: {
    eyebrow: "A small start",
    heading: "See it working on your own books first",
    body: "Every project begins with a small sample of the institution's own collection, awkward items included, published properly. The decision about the rest is made with their own books on screen. The film follows one of them.",
    media: {
      type: "video",
      src: `${M}/books.mp4`,
      srcMobile: `${M}/books-720.mp4`,
      poster: `${M}/books.avif`,
      alt: "One book followed from scan to transcription, translation, enrichment, illustrations and catalogue record.",
      ratio: "16:9",
    },
  },

  devices: {
    phone: { type: "image", src: `${M}/reader-phone.avif`, alt: "The reader on a phone, showing the English translation of the Pimander.", ratio: "4:5", label: "Translation" },
    tablet: { type: "image", src: `${M}/reader-tablet.avif`, alt: "The reader on a tablet, showing the scanned page.", ratio: "3:4", label: "Scan" },
    laptop: { type: "image", src: `${M}/reader-laptop.avif`, alt: "The reader on a laptop: scan, Latin transcription and English translation side by side.", ratio: "16:9", label: "Scan, transcription and translation" },
  },

  next: { slug: "futures-atlas", title: "Futures Atlas" },
};

export default project;
