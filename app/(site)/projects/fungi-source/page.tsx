import type { Metadata } from "next";
import Link from "next/link";
import RevealRoot from "@/components/RevealRoot";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Fungi Source · Frond Studio",
  description:
    "An open-ended search for the literature of fungi — gathering ancient, antiquarian and modern books, with a bias toward the public domain, catalogued through a custom interface and handed off to Source Library.",
};

// Parchment placeholder frame — swap the inner content for real book scans,
// botanical plates and catalogue screenshots as they're gathered.
function Frame({ cap, orn = "❦" }: { cap: string; orn?: string }) {
  return (
    <div className="fs-frame" data-rvs>
      <div className="fs-fcap">
        <span className="fs-orn">{orn}</span>
        {cap}
      </div>
    </div>
  );
}

const PLATES = ["Plate I", "Plate II", "Plate III", "Plate IV", "Plate V", "Plate VI", "Plate VII", "Plate VIII"];

export default function FungiSourcePage() {
  return (
    <RevealRoot>
      <div className="fs-root" data-theme="dark">
        {/* Hero — typographic, antiquarian */}
        <section className="fs-hero">
          <div className="fs-hero-inner" data-stag>
            <div className="fs-kicker">Research · In progress</div>
            <h1 className="fs-title">
              <span className="mask-line">
                <span>Fungi Source</span>
              </span>
            </h1>
            <p className="fs-lead" data-rvs>
              An open-ended search for the literature of fungi. We&apos;re gathering ancient, antiquarian and modern books —
              mycological treatises, field guides, herbals and folklore — wherever they can be found, with a bias toward the
              public domain. The collection is catalogued through a custom interface and handed off to Source Library, where it
              lives on.
            </p>
          </div>
        </section>

        <article className="fs-article">
          {/* 01 — The effort */}
          <section className="fs-feature" data-rv>
            <div className="fs-media">
              <Frame cap="The collection · placeholder" orn="❧" />
            </div>
            <div>
              <div className="fs-ey">01 · The effort</div>
              <h2 className="fs-h2">A hunt for the literature of fungi</h2>
              <p className="fs-body">
                Fungi Source begins as a search. We comb digital archives, scanned-book repositories, museum and university
                collections, antiquarian catalogues and out-of-copyright libraries for anything written about — or useful to the
                study of — fungi. Every promising lead is recorded, sourced, and assessed for its rights status.
              </p>
            </div>
          </section>

          {/* 02 — Scope */}
          <section className="fs-feature rev" data-rv>
            <div className="fs-media">
              <Frame cap="Antiquarian frontispiece · placeholder" />
            </div>
            <div>
              <div className="fs-ey">02 · Scope</div>
              <h2 className="fs-h2">Ancient, old &amp; modern</h2>
              <p className="fs-body">
                The net is cast wide. Antiquarian herbals and early mycological treatises sit beside twentieth-century field
                guides and contemporary monographs. We prioritise the public domain — works whose copyright has lapsed and can be
                freely shared — but don&apos;t stop there: rights-cleared, openly-licensed and reference-only material all earn a
                place, each clearly tagged by status.
              </p>
              <div className="fs-tags">
                <span className="fs-tag">Public domain</span>
                <span className="fs-tag">Open licence</span>
                <span className="fs-tag">Rights-cleared</span>
                <span className="fs-tag">Reference</span>
              </div>
            </div>
          </section>

          {/* A wall of finds */}
          <div className="fs-gallery">
            {PLATES.map((p) => (
              <Frame key={p} cap={p} orn="❦" />
            ))}
          </div>

          {/* 03 — The catalogue */}
          <section className="fs-feature" data-rv>
            <div className="fs-media">
              <Frame cap="Cataloguing interface · preview" orn="❧" />
            </div>
            <div>
              <div className="fs-ey">03 · The catalogue</div>
              <h2 className="fs-h2">An interface for a sprawling index</h2>
              <p className="fs-body">
                Each find is entered into a custom cataloguing interface: title, author, year, language, subject, provenance,
                rights status and a link to the source scan. It&apos;s built to make an uneven, ever-growing collection legible —
                searchable, filterable and citable — so the bibliography reads as a single navigable whole rather than a pile of
                links.
              </p>
            </div>
          </section>

          {/* 04 — Handoff */}
          <section className="fs-feature rev" data-rv>
            <div className="fs-media">
              <Frame cap="Source Library · sourcelibrary.org" />
            </div>
            <div>
              <div className="fs-ey">04 · Handoff</div>
              <h2 className="fs-h2">Ported into Source Library</h2>
              <p className="fs-body">
                Fungi Source is research in service of Source Library. Once catalogued, the collection is ported into
                sourcelibrary.org — where it&apos;s published, browsed and grown. This page is the record of the effort behind it:
                the search, the sourcing, the cataloguing, and the handoff.
              </p>
              <Link href="/work/source-library" className="fs-cta">
                View the Source Library project →
              </Link>
            </div>
          </section>

          {/* Process */}
          <section data-rv>
            <div className="fs-ey">Process</div>
            <h2 className="fs-h2">From a lead to a library</h2>
            <div className="fs-steps" data-stag>
              <div className="fs-step" data-rvs>
                <div className="n">01</div>
                <h4>Search</h4>
                <p>Comb archives, repositories and antiquarian catalogues for fungal literature.</p>
              </div>
              <div className="fs-step" data-rvs>
                <div className="n">02</div>
                <h4>Source</h4>
                <p>Locate a readable scan and establish each work&apos;s rights status.</p>
              </div>
              <div className="fs-step" data-rvs>
                <div className="n">03</div>
                <h4>Catalogue</h4>
                <p>Record metadata in the interface and tag by subject and status.</p>
              </div>
              <div className="fs-step" data-rvs>
                <div className="n">04</div>
                <h4>Hand off</h4>
                <p>Port the catalogued collection into sourcelibrary.org to publish and grow.</p>
              </div>
            </div>
          </section>
        </article>
      </div>
      <MoreProjects excludeSlug="fungi-source" />
    </RevealRoot>
  );
}
