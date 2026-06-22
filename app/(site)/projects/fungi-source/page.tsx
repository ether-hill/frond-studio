import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import MoreProjects from "@/components/MoreProjects";
import MyceliumBg from "@/components/MyceliumBg";
import MyceliumTimer from "@/components/projects/fungi-source/MyceliumTimer";
import FungiGallery, { type GalleryItem } from "@/components/projects/fungi-source/FungiGallery";
import { FUNGI_BOOKS, FUNGI_PLATES } from "@/content/fungi-source";

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

const BOOK_ITEMS: GalleryItem[] = FUNGI_BOOKS.map((b) => ({
  image: b.image,
  title: b.title,
  meta: `${b.author} · ${b.year}`,
  body: b.note,
  details: [
    { label: "Language", value: b.language },
    { label: "Rights", value: b.rights },
    { label: "Source", value: b.source },
  ],
  href: b.url,
  hrefLabel: "Read the full book — Internet Archive →",
}));

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
        style={{ position: "relative", overflow: "hidden", minHeight: "clamp(460px,66vh,820px)", display: "flex", alignItems: "flex-end", background: "var(--bg-0)" }}
      >
        <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.9 }}>
          <MyceliumBg />
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background:
              "linear-gradient(100deg, var(--bg-0) 0%, color-mix(in srgb, var(--bg-0) 66%, transparent) 46%, color-mix(in srgb, var(--bg-0) 18%, transparent) 74%, transparent 100%), linear-gradient(to top, var(--bg-0) 1%, transparent 38%)",
          }}
        />
        <MyceliumTimer autoMs={15000} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter) clamp(48px,8vh,104px)" }}>
          <PageHeader
            title="Fungi Source"
            intro="A far-and-wide search for the literature of fungi — early mycological treatises, golden-age plate books and modern field guides, public-domain first. Gathered, OCR'd, translated and catalogued into one open database: free to all and shared via an API to power AI tools, research and visualisation — and handed off to Source Library."
          />
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

        {/* The collection — cover grid, lightbox */}
        <section className="fs-section" data-rv>
          <h2 style={sectionHeading}>The collection</h2>
          <p className="fs-sub">
            {FUNGI_BOOKS.length} titles across {LANGS} languages and three centuries — every one public domain, with the full
            book a click away on the Internet Archive. A working seed of the database; it grows continuously. Tap a cover for the
            summary, details and the download.
          </p>
          <FungiGallery items={BOOK_ITEMS} variant="covers" />
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
