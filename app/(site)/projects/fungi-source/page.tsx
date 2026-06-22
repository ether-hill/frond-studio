import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";
import MoreProjects from "@/components/MoreProjects";
import { FUNGI_BOOKS, FUNGI_PLATES } from "@/content/fungi-source";

export const metadata: Metadata = {
  title: "Fungi Source · Frond Studio",
  description:
    "An open-ended search for the literature of fungi — gathering ancient, antiquarian and modern books, with a bias toward the public domain, catalogued through a custom interface and handed off to Source Library.",
};

const PD = FUNGI_BOOKS.filter((b) => b.rights === "Public domain").length;

export default function FungiSourcePage() {
  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        <PageHeader
          title="Fungi Source"
          intro="An open-ended search for the literature of fungi — ancient herbals, golden-age plate books and modern field guides — with a bias toward the public domain. Each find is catalogued and handed off to Source Library, where the collection is published and grown."
        />

        {/* Context — the effort & scope */}
        <div
          data-rv
          style={{ marginTop: "clamp(40px,6vh,80px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "clamp(28px,4vw,64px)", maxWidth: "var(--maxw)" }}
        >
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.75, color: "var(--fg-dim)" }}>
            Fungi Source begins as a hunt. We comb the Biodiversity Heritage Library, Internet Archive and Project Gutenberg —
            and antiquarian catalogues beyond them — for anything written about, or useful to the study of, fungi. Every
            promising lead is read, sourced, and assessed for its rights status before it earns a place in the index.
          </p>
          <p style={{ fontSize: "var(--text-body)", lineHeight: 1.75, color: "var(--fg-dim)" }}>
            The net is cast wide: seventeenth-century treatises sit beside Victorian plate books and contemporary monographs. We
            prioritise the public domain — works whose copyright has lapsed and can be freely shared — but don&apos;t stop there.
            A standing caveat travels with the old volumes: treat their edibility and toxicity guidance as history, not a
            foraging manual.
          </p>
        </div>

        {/* Plates — image-driven section */}
        <section className="fs-section" data-rv>
          <h2 className="fs-h2">Plates</h2>
          <p className="fs-sub">
            A wall of the finest public-domain illustrations in the collection — hand-coloured engravings and lithographs from
            Schäffer, Sowerby, Hussey, Krombholz, Bulliard, Barla and Cooke. Each links to its source on Wikimedia Commons.
          </p>
          <div className="fs-plates" data-stag>
            {FUNGI_PLATES.map((pl) => (
              <a key={pl.src} className="fs-plate" href={pl.link} target="_blank" rel="noopener noreferrer" data-rvs>
                <img src={pl.src} alt={pl.caption} loading="lazy" decoding="async" />
                <figcaption>{pl.caption}</figcaption>
              </a>
            ))}
          </div>
        </section>

        {/* The collection — bibliography */}
        <section className="fs-section" data-rv>
          <h2 className="fs-h2">The collection</h2>
          <p className="fs-sub">
            {FUNGI_BOOKS.length} titles so far — {PD} of them public domain and freely readable right now. A working seed of the
            bibliography; it grows continuously. Each entry links straight to a scan or reader.
          </p>
          <ul className="fs-books" data-stag>
            {FUNGI_BOOKS.map((b) => (
              <li key={b.url} className="fs-book" data-rvs>
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  <span className="fs-book-year">{b.year}</span>
                  <span>
                    <span className="fs-book-title">{b.title}</span>
                    <span className="fs-book-by">
                      {b.author} — {b.note}
                    </span>
                  </span>
                  <span className="fs-book-src">
                    {b.rights === "Public domain" ? "PD" : "©"} · {b.source} →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Handoff */}
        <section className="fs-section" data-rv>
          <h2 className="fs-h2">Handoff to Source Library</h2>
          <p className="fs-sub">
            Fungi Source is research in service of Source Library. Once catalogued — title, author, year, language, subject,
            provenance, rights status and a link to the scan — the collection is ported into sourcelibrary.org, where it&apos;s
            published, browsed and grown. This page is the record of the effort behind it.
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
