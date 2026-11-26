"use client";

import { useEffect, useState } from "react";
import s from "./proposal.module.css";

type Item = { b?: string; t: string };
type Link = { name: string; url: string; note?: string };
type Option = { name: string; price: string; when: string; items: string[] };
type Shot = { name: string; by?: string; url: string; img: string; note?: string };
type NavSpec = { items: { name: string; note?: string; children?: string[] }[]; extras?: string[]; button?: string };
type Bar = { label: string; text?: string; start: number; end: number };
type Block =
  | { nav: NavSpec }
  | { sitemap: { group: string; pages: { name: string; note?: string; key?: boolean }[] }[] }
  | { flow: Item[] }
  | { gantt: { cols: string[]; rows: Bar[] } }
  | { gallery: Shot[] }
  | { p: string }
  | { h3: string }
  | { ul: Item[] }
  | { ol: Item[] }
  | { table: { head: string[]; rows: string[][] } }
  | { links: Link[] }
  | { options: Option[] };

export type ProposalDoc = {
  title: string;
  for: string;
  date: string;
  lead: string;
  sections: { id: string; title: string; blocks: Block[] }[];
};

const ItemText = ({ it }: { it: Item }) => (
  <>
    {it.b && <strong>{it.b} </strong>}
    {it.t}
  </>
);

function Flow({ steps }: { steps: Item[] }) {
  return (
    <ol className={s.flow}>
      {steps.map((it, i) => (
        <li key={i} className={`${s.flowStep} ${i === 2 ? s.flowYou : ""}`}>
          <span className={s.flowNum}>{i + 1}</span>
          <p className={s.flowTitle}>{it.b?.replace(/\.$/, "")}</p>
          <p className={s.flowText}>{it.t}</p>
        </li>
      ))}
    </ol>
  );
}

function Gantt({ g }: { g: { cols: string[]; rows: Bar[] } }) {
  const n = g.cols.length;
  return (
    <div className={s.gantt} style={{ ["--cols" as string]: n }}>
      <div className={s.ganttHead}>
        <span />
        {g.cols.map((c) => <span key={c}>{c}</span>)}
      </div>
      {g.rows.map((r) => (
        <div key={r.label} className={s.ganttRow}>
          <span className={s.ganttLabel}>{r.label}</span>
          <div className={s.ganttTrack}>
            {g.cols.map((c, i) => <i key={c} style={{ gridColumn: i + 1 }} />)}
            <div className={s.ganttBar} style={{ gridColumn: `${r.start + 1} / ${r.end + 1}` }}>
              <span className={s.ganttWhen}>
                {r.end - r.start > 1 ? `${g.cols[r.start]} to ${g.cols[r.end - 1]}` : g.cols[r.start]}
              </span>
              {r.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NavPlan({ nav }: { nav: NavSpec }) {
  return (
    <div className={s.navPlan}>
      <div className={s.navBar}>
        <div className={s.navItems}>
          {nav.items.map((it) => (
            <span key={it.name}>
              {it.name}
              {it.children?.length ? <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden className={s.navCaret}><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg> : null}
            </span>
          ))}
        </div>
        <div className={s.navExtras}>
          {nav.extras?.map((x) => <span key={x}>{x}</span>)}
          {nav.button && <span className={s.navButton}>{nav.button}</span>}
        </div>
      </div>
      <div className={s.navMenus}>
        {nav.items.filter((it) => it.children?.length).map((it) => (
          <div key={it.name} className={s.navMenu}>
            <p className={s.navMenuName}>{it.name}</p>
            <ul>
              {it.children!.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sitemap({ groups }: { groups: { group: string; pages: { name: string; note?: string; key?: boolean }[] }[] }) {
  return (
    <div className={s.sitemap}>
      {groups.map((g) => (
        <div key={g.group} className={s.smGroup}>
          <p className={s.smGroupName}>{g.group}</p>
          <ul>
            {g.pages.map((pg) => (
              <li key={pg.name} className={pg.key ? s.smKey : undefined}>
                <span className={s.smName}>{pg.name}</span>
                {pg.note && <span className={s.smNote}>{pg.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Gallery({ shots }: { shots: Shot[] }) {
  return (
    <div className={s.gallery}>
      {shots.map((x) => (
        <a key={x.url} className={s.shot} href={x.url} target="_blank" rel="noopener noreferrer">
          <div className={s.shotImg}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={x.img} alt={`${x.name}, screenshot`} loading="lazy" width={1200} height={750} />
          </div>
          <p className={s.shotName}>{x.name}</p>
          {x.by && <p className={s.shotBy}>{x.by}</p>}
          {x.note && <p className={s.shotNote}>{x.note}</p>}
        </a>
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if ("nav" in block) return <NavPlan nav={block.nav} />;
  if ("sitemap" in block) return <Sitemap groups={block.sitemap} />;
  if ("flow" in block) return <Flow steps={block.flow} />;
  if ("gantt" in block) return <Gantt g={block.gantt} />;
  if ("gallery" in block) return <Gallery shots={block.gallery} />;
  if ("p" in block) return <p className={s.p}>{block.p}</p>;
  if ("h3" in block) return <h3 className={s.h3}>{block.h3}</h3>;
  if ("ul" in block)
    return (
      <ul className={s.list}>
        {block.ul.map((it, i) => (
          <li key={i}><ItemText it={it} /></li>
        ))}
      </ul>
    );
  if ("ol" in block)
    return (
      <ol className={`${s.list} ${s.ol}`}>
        {block.ol.map((it, i) => (
          <li key={i}><ItemText it={it} /></li>
        ))}
      </ol>
    );
  if ("table" in block)
    return (
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>{block.table.head.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {block.table.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if ("options" in block)
    return (
      <div className={s.options}>
        {block.options.map((o) => (
          <div key={o.name} className={s.option}>
            <h3 className={s.optionName}>{o.name}</h3>
            <p className={s.optionPrice}>{o.price}</p>
            <p className={s.optionWhen}>{o.when}</p>
            <ul className={s.optionItems}>
              {o.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  return (
    <ul className={s.links}>
      {block.links.map((l) => (
        <li key={l.url} className={s.link}>
          <a href={l.url} target="_blank" rel="noopener noreferrer">{l.name}</a>
          {l.note && <span className={s.linkNote}>{l.note}</span>}
          <span className={s.linkHost}>{new URL(l.url).hostname.replace(/^www\./, "")}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ProposalView({ doc }: { doc: ProposalDoc }) {
  const [active, setActive] = useState(doc.sections[0]?.id);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    // The current section is the last one whose top has passed a line a third
    // of the way down the screen.
    const els = doc.sections.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight / 3;
      let current = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = els[els.length - 1]?.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [doc]);

  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className={s.meta}>{doc.for} · {doc.date}</p>
        <h1 className={s.title}>{doc.title}</h1>
        <p className={s.lead}>{doc.lead}</p>
      </header>

      <div className={s.body}>
        <nav className={s.toc} aria-label="Contents">
          <p className={s.tocTitle}>Contents</p>
          <ol>
            {doc.sections.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} aria-current={active === x.id ? "true" : undefined}>{x.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={s.content}>
          {doc.sections.map((x) => (
            <section key={x.id} id={x.id} className={s.section}>
              <h2 className={s.h2}>{x.title}</h2>
              {x.blocks.map((b, i) => <BlockView key={i} block={b} />)}
            </section>
          ))}
          <p className={s.top}><a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top</a></p>
        </div>
      </div>
    </main>
  );
}
