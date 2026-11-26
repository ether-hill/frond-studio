"use client";

import { useEffect, useState } from "react";
import s from "./proposal.module.css";

type Item = { b?: string; t: string };
type Link = { name: string; url: string; note?: string };
type Option = { name: string; price: string; when: string; items: string[] };
type Block =
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

function BlockView({ block }: { block: Block }) {
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
