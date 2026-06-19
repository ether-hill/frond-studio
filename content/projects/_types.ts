// Typed content model for Frond Studio case studies. One source of truth, mapped
// 1:1 to the canonical CaseStudy section order. A new project = a new content file
// exporting a `Project` (drop media in /public/work/<slug>/). Invalid or missing
// required fields fail the build, not production.

export type Ratio = "4:5" | "3:4" | "16:9";

export type MediaSlot = {
  type: "image" | "video";
  /** Empty string -> renders a labelled placeholder slot so a page can ship early. */
  src: string;
  /** Required for video (the poster frame shown before play / under reduced-motion). */
  poster?: string;
  alt: string;
  ratio: Ratio;
  /** Optional caption / label shown under (and inside the placeholder of) the slot. */
  label?: string;
};

export type Feature = {
  title: string;
  /** One line: what it does + why it matters. */
  note: string;
  clip: MediaSlot;
};

/** value may be a clearly-marked placeholder like "[00]" or "[[ Lighthouse ]]". */
export type Metric = { value: string; label: string; note?: string };

export type Project = {
  slug: string;
  title: string;
  /** Short category label shown on the /work index row (e.g. "Museum & library website"). */
  category?: string;
  oneLiner: string;
  client: string;
  year: string;
  services: string[];
  liveUrl?: string;
  heroVideo: MediaSlot;
  homepageGrab: MediaSlot;
  challenge: string;
  approach: string;
  /** Text-based bullet lists — a punchy fragment per line. */
  before: { points: string[] };
  after: { points: string[] };
  /** 3-6 feature highlights, one clip each. */
  features: Feature[];
  devices: { mobile: MediaSlot; tablet: MediaSlot; desktop: MediaSlot };
  /** Rendered as logo + name chips (logos resolved by name in techLogos). */
  integrations: string[];
  /** "By the numbers" stats — 4-5 cards, each with an optional one-line note. */
  metrics: Metric[];
  quote?: { body: string; author: string; role: string };
  credits?: string;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
};
