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
  /** Full-bleed blurred image shown behind the hero browser frame. */
  heroBg?: string;

  /** Positioning. Lead is the large serif statement, body the supporting line. */
  introLead: string;
  introBody: string;
  client: string;
  services: string[];

  /** "At a glance" numeric stats (4). */
  stats: EditorialStat[];
  /** Tech + integrations, rendered as a logo grid. */
  integrations: string[];

  /** Homepage intent block (text only). */
  frontDoor: EditorialSection;
  /** Full-bleed montage band: a line of serif over media. */
  band: { text: string; media: EditorialMedia };

  /** Content model block + the overlapping device cluster. */
  contentModel: EditorialSection;
  devices: { phone: EditorialMedia; tablet: EditorialMedia; laptop: EditorialMedia };

  /** Film & motion block + two circular looping clips. */
  film: EditorialSection & { clips: EditorialFilmClip[] };

  /** About-page feature: a single media in a browser frame + caption. */
  pillars: EditorialSection & { media: EditorialMedia; caption: string; note: string };

  /** Before / after fragment lists (rendered neutral, no colour coding). */
  before?: string[];
  after?: string[];

  /** Client testimonial. May be a clearly-marked placeholder. */
  quote?: { body: string; author: string; needsConfirmation?: boolean };
  /** Looping video shown behind the quote (distinct dark/light treatment in CSS). */
  quoteBg?: EditorialMedia;
  credits?: string;

  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
};
