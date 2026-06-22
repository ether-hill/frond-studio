// Typed content model for the long-scroll, editorial case-study layout
// (EditorialCaseStudy.tsx). Separate from the canonical Project type so the two
// layouts can evolve independently. A new editorial project = a new content file
// exporting an EditorialProject, registered in editorial.ts. Media live under
// /public/work/<slug>/ (or are shared with a sibling project's folder).

export type EditorialRatio = "16:9" | "4:5" | "3:4" | "1:1";

export type EditorialMedia = {
  type: "image" | "video";
  /** Empty string renders a labelled placeholder well so a page can ship early. */
  src: string;
  /** Poster frame for video (also the reduced-motion still). */
  poster?: string;
  alt: string;
  ratio: EditorialRatio;
  /** Small caption shown with the slot. */
  label?: string;
};

export type EditorialStat = { value: string; label: string; note: string };

export type EditorialSection = { eyebrow?: string; heading: string; body?: string };

export type EditorialFilmClip = { caption: string; note: string; media: EditorialMedia };

export type EditorialProject = {
  slug: string;
  /** Title shown in the breadcrumb and /work index. */
  title: string;
  /** Short category label for the /work row and "See more work" cards. */
  category?: string;
  /** One-line summary under the title. */
  oneLiner: string;
  liveUrl?: string;
  /** Display label for the live link (e.g. the bare domain). */
  liveLabel?: string;

  /** Hero media, shown inside a browser frame. */
  hero: EditorialMedia;
  /** Full-bleed image shown behind the hero browser frame. */
  heroBg?: string;
  /** Lighter scrim over the hero backdrop (less dark tint). */
  heroLite?: boolean;
  /** Thumbnail for the /work index row + "See more work" cards. */
  card?: { video?: string; poster?: string };

  /** Positioning. Lead is the large serif statement, body the supporting line. */
  introLead: string;
  introBody: string;
  client: string;
  services: string[];

  /** "At a glance" numeric stats. Omit to skip. */
  stats?: EditorialStat[];
  /** Eyebrow above the stats grid (default "By the numbers"). */
  statsLabel?: string;
  /** Optional "as of <date>" note shown next to the stats eyebrow. */
  statsAsOf?: string;
  /** Tech + integrations, rendered as a logo grid. Omit to skip. */
  integrations?: string[];

  /** Intent block (text only). Omit to skip. */
  frontDoor?: EditorialSection;
  /** Full-bleed montage band: a line of serif over media. Omit to skip. */
  band?: { text: string; media: EditorialMedia };

  /** Text block followed by a full-width media well (e.g. a feature video).
      A lighter alternative to band/pillars; omit to skip. */
  showcase?: EditorialSection & { media: EditorialMedia };

  /** Content model block + the overlapping device cluster. Omit to skip. */
  contentModel?: EditorialSection;
  devices?: { phone: EditorialMedia; tablet: EditorialMedia; laptop: EditorialMedia };

  /** Film & motion block + two circular looping clips. Omit to skip. */
  film?: EditorialSection & { clips: EditorialFilmClip[] };

  /** Feature: a single media in a browser frame + caption. Omit to skip. */
  pillars?: EditorialSection & { media: EditorialMedia; caption: string; note: string };

  /** Before / after fragment lists (rendered neutral, no colour coding). */
  before?: string[];
  after?: string[];

  /** Client testimonial. May be a clearly-marked placeholder. */
  quote?: { body: string; author: string; role?: string; needsConfirmation?: boolean };
  /** Longer-form client testimonial, rendered as a calm editorial block. */
  testimonial?: { body: string; author: string; role?: string };
  /** Looping video shown behind the quote (distinct dark/light treatment in CSS). */
  quoteBg?: EditorialMedia;
  /** Still image shown behind the quote, with a tint overlay for legibility. */
  quoteBgImage?: string;
  /** Light-mode treatment for the quote backdrop. "dark" mirrors the dark rendering. */
  quoteBgImageLight?: "dark" | "soft";
  credits?: string;

  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
};
