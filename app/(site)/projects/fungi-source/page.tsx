import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import MoreProjects from "@/components/MoreProjects";
import MyceliumBg from "@/components/MyceliumBg";
import MyceliumTimer from "@/components/projects/fungi-source/MyceliumTimer";
import FungiGallery, { type GalleryItem } from "@/components/projects/fungi-source/FungiGallery";
import { FUNGI_BOOKS, FUNGI_PLATES, SOURCE_LIBRARY_BOOKS, SOURCE_LIBRARY_URL, slCover, slBookUrl, type FungiBook } from "@/content/fungi-source";

export const metadata: Metadata = {
  title: "Fungi Source · Frond Studio",
  description:
    "A far-and-wide search for the literature of fungi — gathered, translated and catalogued into one open, free, API-accessible database for AI-driven research, and handed off to Source Library.",
};

const LANGS = new Set(FUNGI_BOOKS.map((b) => b.language)).size;

const PLATE_ITEMS: GalleryItem[] = FUNGI_PLATES.map((p) => ({
  image: p.src,
  caption: p.caption,
  href: p.link,
  hrefLabel: "View on Wikimedia Commons →",
}));

// Ranked by importance (historical significance blended with popularity), most
// significant first — then split into what Source Library already holds vs. what
// this research recommends adding.
const RANKED = [...FUNGI_BOOKS].sort((a, b) => b.importance - a.importance);
const EXISTING_BOOKS = RANKED.filter((b) => b.inSourceLibrary);
const RECOMMENDED_BOOKS = RANKED.filter((b) => !b.inSourceLibrary);

const bookItem = (b: FungiBook, badge: string, rank: { label: string; value: string }): GalleryItem => ({
  image: b.image,
  title: b.title,
  meta: `${b.author} · ${b.year}`,
  sub: `${b.language} · ${b.pages} pp${b.illustrations > 0 ? ` · ${b.illustrations} illus.` : ""}`,
  badge,
  body: b.note,
  details: [
    rank,
    { label: "Language", value: b.language },
    { label: "Pages", value: `${b.pages}` },
    { label: "Illustrations", value: b.illustrations > 0 ? `${b.illustrations}` : "—" },
    { label: "Rights", value: b.rights },
    { label: "Source", value: b.source },
  ],
  href: b.url,
  hrefLabel: "Read the full book — Internet Archive →",
});

const RECOMMENDED_ITEMS: GalleryItem[] = RECOMMENDED_BOOKS.map((b, i) =>
  bookItem(b, `${i + 1}`, {
    label: "Recommended",
    value: `#${i + 1} of ${RECOMMENDED_BOOKS.length} to add · importance ${b.importance}/100`,
  }),
);

// Source Library's 30 catalogued titles — covers mirrored from sourcelibrary.org.
const SL_ITEMS: GalleryItem[] = SOURCE_LIBRARY_BOOKS.map((b) => ({
  image: slCover(b.cover),
  title: b.title,
  meta: `${b.author} · ${b.year}`,
  sub: `${b.language} · ${b.pages} pp${b.inFungiSource ? " · in our collection" : ""}`,
  badge: b.inFungiSource ? "✓" : undefined,
  body: b.inFungiSource ? "Catalogued in Source Library and independently surfaced by Fungi Source." : "Catalogued in Source Library.",
  details: [
    { label: "Language", value: b.language },
    { label: "Pages", value: `${b.pages}` },
    { label: "In our collection", value: b.inFungiSource ? "Yes" : "—" },
  ],
  href: slBookUrl(b.cover),
  hrefLabel: "View on Source Library →",
}));
const SL_OVERLAP = SOURCE_LIBRARY_BOOKS.filter((b) => b.inFungiSource).length;

const sectionHeading: React.CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontSize: "var(--text-title)",
  fontWeight: 500,
  letterSpacing: "-0.018em",
};

export default function FungiSourcePage() {
  return (
    <RevealRoot>
      {/* Hero — a living mycelium network grows behind the title */}
      <section
        data-theme="dark"
        style={{ position: "relative", overflow: "hidden", minHeight: "clamp(560px,84vh,960px)", display: "flex", background: "var(--bg-0)" }}
      >
        <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.9 }}>
          <MyceliumBg tips={430} maxSize={820} />
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(100deg, var(--bg-0) 0%, color-mix(in srgb, var(--bg-0) 72%, transparent) 38%, color-mix(in srgb, var(--bg-0) 14%, transparent) 70%, transparent 100%), linear-gradient(to top, var(--bg-0) 1%, transparent 36%)",
          }}
        />
        <MyceliumTimer autoMs={15000} />
        <div className="fs-hero-inner">
          <div>
            <PageHeader
              title="Fungi Source"
              intro="A far-and-wide search for the literature of fungi — early mycological treatises, golden-age plate books and modern field guides, public-domain first. Gathered, OCR'd, translated and catalogued into one open database: free to all and shared via an API to power AI tools, research and visualisation — and handed off to Source Library."
            />
          </div>
          <figure className="fs-hero-mock" data-rv style={{ transitionDelay: "0.12s" }}>
            <img src="/fungi-source/sourcelibrary-fungi.png" alt="Mockup of the Source Library — Fungi Collection page that this research is ported into" />
          </figure>
        </div>
      </section>

      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "clamp(48px,8vh,96px) var(--gutter) var(--pad-bottom)" }}>
        {/* The hunt & the open angle */}
        <div
          data-rv
          style={{ marginTop: "clamp(40px,6vh,80px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "clamp(28px,4vw,64px)" }}
        >
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.75, color: "var(--fg-dim)" }}>
            Fungi Source begins as a hunt. We comb the Biodiversity Heritage Library, the Internet Archive and Project Gutenberg —
            and antiquarian catalogues beyond them — for anything written about, or useful to the study of, fungi. Every lead is
            read, sourced, and its rights status established before it earns a place.
          </p>
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.75, color: "var(--fg-dim)" }}>
            Much of the canon is locked in Latin, French, German, Italian and Swedish. Part of the work is OCR and translation —
            turning page scans into searchable, readable text — then structuring it into a single open database. Free and
            open-sourced and shared through an API, the collection becomes raw material to power AI tools, research and
            visualisation. A caveat travels with the old volumes: treat their edibility guidance as history, not a foraging
            manual.
          </p>
        </div>

        {/* The collection — split into already-catalogued vs. recommended additions */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>The collection</h2>
          <p className="fs-sub">
            {FUNGI_BOOKS.length} titles across {LANGS} languages and three centuries — every one public domain, every one
            checked against the {SOURCE_LIBRARY_BOOKS.length} titles Source Library already holds. {EXISTING_BOOKS.length} of
            ours are among them; the other {RECOMMENDED_BOOKS.length} are what this research recommends adding, ranked by
            importance.
          </p>
        </section>

        {/* Already in Source Library — the full collection, mirrored */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>Already in Source Library</h2>
          <p className="fs-sub">
            Source Library&apos;s mycology collection as it stands today — all {SOURCE_LIBRARY_BOOKS.length} catalogued titles
            with their covers (a few works run across multiple volumes). The {SL_OVERLAP} marked{" "}
            <span style={{ color: "var(--accent)" }}>✓ in our collection</span> are titles Fungi Source independently surfaced,
            so the {RECOMMENDED_BOOKS.length} recommendations below extend the collection rather than repeat it. Switch to list
            for a compact view; tap any cover for details and the Source Library page.{" "}
            <a className="linku" href={SOURCE_LIBRARY_URL} target="_blank" rel="noopener noreferrer">
              View the collection →
            </a>
          </p>
          <FungiGallery items={SL_ITEMS} variant="covers" toggle />
        </section>

        {/* Recommended additions — ranked by importance */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>Recommended to add</h2>
          <p className="fs-sub">
            {RECOMMENDED_BOOKS.length} titles not yet in the collection — ranked by importance (historical significance blended
            with popularity), the strongest candidates first. Each carries its page and illustration counts, with the full book a
            click away on the Internet Archive. Tap a cover for the summary, details and the download.
          </p>
          <FungiGallery items={RECOMMENDED_ITEMS} variant="covers" toggle />
        </section>

        {/* Plates — image-driven, lightbox */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>Plates</h2>
          <p className="fs-sub">
            A wall of the finest public-domain illustrations in the collection — hand-coloured engravings and lithographs from
            Schäffer, Sowerby, Hussey, Krombholz, Bulliard, Boudier, Cooke and more. Tap any plate to enlarge.
          </p>
          <FungiGallery items={PLATE_ITEMS} variant="masonry" initialCount={12} step={12} maxCount={48} moreLabel="Load more plates" />
        </section>

        {/* Handoff + open database / API / AI */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>One open database, handed to Source Library</h2>
          <p className="fs-sub">
            Each title is OCR&apos;d, translated where it&apos;s needed, and catalogued — author, year, language, subject,
            provenance, rights and a link to the scan — into one centralised, open dataset. Published free and open-sourced and
            shared through an API, so anyone can build on it: AI tools, research, cross-text insight and visualisation. The
            collection is ported into sourcelibrary.org, where it&apos;s published, browsed and grown — this page is the record of
            the effort behind it.
          </p>
          <Link href="/work/source-library" className="linku link-cta" style={{ marginTop: "clamp(22px,3vh,30px)", display: "inline-block" }}>
            View the Source Library project →
          </Link>
        </section>
      </section>

      <MoreProjects excludeSlug="fungi-source" />
    </RevealRoot>
  );
}
