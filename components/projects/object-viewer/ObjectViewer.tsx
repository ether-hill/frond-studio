"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COLLECTIONS,
  OBJECTS,
  objectById,
  objectsInCollection,
  fmtDims,
  type CollectionId,
  type ObjectItem,
} from "./objects";
import type { ViewerHandle } from "./scene";
import { Glyph, FactIcon, ToolIcon } from "./icons";
import s from "./ObjectViewer.module.css";

const SPOTLIGHT: Record<CollectionId, string> = {
  arms: "ARMS",
  instruments: "OPTICS",
  relics: "RELIC",
  curios: "CURIO",
};

export default function ObjectViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerHandle | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const angleLabelRef = useRef<HTMLSpanElement>(null);

  const [activeId, setActiveId] = useState<string>(OBJECTS[0].id);
  const [openCol, setOpenCol] = useState<CollectionId>(OBJECTS[0].collection);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fs, setFs] = useState(false);

  const item = useMemo(() => objectById(activeId), [activeId]);
  const catNo = useMemo(() => OBJECTS.findIndex((o) => o.id === activeId) + 1, [activeId]);

  // mount viewer once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let handle: ViewerHandle | null = null;
    let cancelled = false;
    (async () => {
      const { createViewer } = await import("./scene");
      if (cancelled || !mountRef.current) return;
      handle = createViewer(mountRef.current, OBJECTS[0]);
      handle.onYaw((deg) => {
        if (sliderRef.current) sliderRef.current.value = String(Math.round(deg));
        if (angleLabelRef.current) angleLabelRef.current.textContent = `${Math.round(deg)}°`;
      });
      handle.onLoading(setLoading);
      viewerRef.current = handle;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      handle?.dispose();
      viewerRef.current = null;
    };
  }, []);

  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    viewerRef.current?.setObject(item);
  }, [item]);

  const selectObject = useCallback((o: ObjectItem) => {
    setOpenCol(o.collection);
    setActiveId(o.id);
  }, []);

  const onSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    viewerRef.current?.setYaw(v);
    if (angleLabelRef.current) angleLabelRef.current.textContent = `${v}°`;
  }, []);

  const resetView = useCallback(() => {
    viewerRef.current?.setYaw(0);
    viewerRef.current?.resetView();
    if (sliderRef.current) sliderRef.current.value = "0";
    if (angleLabelRef.current) angleLabelRef.current.textContent = "0°";
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => {
      setFs(!!document.fullscreenElement);
      viewerRef.current?.resize();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const navItems = ["Home", "Browse", "Saved", "Detail", "About", "More"] as const;
  const navGlyph: Record<string, string> = {
    Home: "nav-home", Browse: "nav-explore", Saved: "nav-notes",
    Detail: "nav-garden", About: "nav-learn", More: "nav-more",
  };

  return (
    <div className={s.wrap}>
      <header className={s.pageHead} data-rv>
        <div>
          <div className={s.kicker}>3D VIEWER · CC0 MODELS · LIVE IN BROWSER</div>
          <h1 className={s.pageTitle}>Object Viewer</h1>
        </div>
        <p className={s.pageIntro}>
          A studio-lit cabinet of curiosities — real, photoreal{" "}
          <strong>3D models</strong> you can pick up and turn over: blades, brass
          instruments, a bronze ray, a treasure chest, a rubber duck. Every piece is a
          public-domain <strong>Poly Haven</strong> asset. Choose one,{" "}
          <strong>drag to spin</strong> it, scrub the 360° dial and read its notes.
        </p>
      </header>

      <div ref={stageRef} className={`${s.app} ${fs ? s.appFs : ""}`} data-rv>
        {/* far-left nav rail */}
        <nav className={s.rail} aria-label="Sections">
          <div className={s.railLogo}><Glyph name="cube" /></div>
          {navItems.map((n, i) => (
            <button key={n} className={`${s.railBtn} ${i === 1 ? s.railActive : ""}`} title={n}>
              <Glyph name={navGlyph[n]} />
              <span>{n}</span>
            </button>
          ))}
        </nav>

        {/* sidebar */}
        <aside className={s.sidebar}>
          <div className={s.brand}>
            <span className={s.brandMark}><Glyph name="cube" /></span>
            <span className={s.brandText}>
              Object <em>Viewer</em>
              <small>Spin. Inspect. Admire.</small>
            </span>
          </div>

          <div className={s.listHead}>
            <span>OBJECTS</span>
            <span className={s.listCount}>{OBJECTS.length} pieces</span>
          </div>

          <div className={s.catList}>
            {COLLECTIONS.map((col) => {
              const members = objectsInCollection(col.id);
              const open = openCol === col.id;
              return (
                <div key={col.id} className={`${s.cat} ${open ? s.catOpen : ""}`}>
                  <button
                    className={s.catHead}
                    onClick={() => {
                      setOpenCol(col.id);
                      if (item.collection !== col.id) selectObject(members[0]);
                    }}
                  >
                    <span className={s.thumb} style={{ ["--c1" as string]: col.accent }}>
                      <Glyph name={`col-${col.id}`} />
                    </span>
                    <span className={s.catText}>
                      <strong>{col.label}</strong>
                      <small>{col.note} · {members.length}</small>
                    </span>
                    <span className={`${s.chev} ${open ? s.chevOpen : ""}`}><Glyph name="chevron" /></span>
                  </button>
                  {open && (
                    <ul className={s.speciesList}>
                      {members.map((o) => (
                        <li key={o.id}>
                          <button
                            className={`${s.speciesRow} ${o.id === activeId ? s.speciesActive : ""}`}
                            onClick={() => selectObject(o)}
                          >
                            <span className={s.dot} style={{ background: col.accent }} />
                            <span>{o.name}</span>
                            <em>{o.poly > 999 ? `${Math.round(o.poly / 1000)}k` : o.poly}</em>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className={s.discovery}>
            <div className={s.discHead}><Glyph name="info" /> Did you know</div>
            <p>{item.note}</p>
          </div>
        </aside>

        {/* center stage */}
        <main className={s.stage}>
          <div className={s.topbar}>
            <button className={s.back}><Glyph name="arrow-left" /> Back to Cabinet</button>
            <div className={s.washi}>
              <span className={s.washiName}>{item.name.toUpperCase()}</span>
              <span className={s.washiLatin}>{item.subtitle}</span>
              <span className={s.pin} />
            </div>
            <div className={s.spotlight}>
              <div className={s.stamp}>
                <span>{SPOTLIGHT[item.collection]}</span>
                <span>SPOTLIGHT</span>
              </div>
            </div>
            <div className={s.topActions}>
              <button className={s.topAction} title="Details"><Glyph name="act-notebook" /><span>Details</span></button>
              <a className={s.topAction} href={item.url} target="_blank" rel="noopener noreferrer" title="Source">
                <Glyph name="act-share" /><span>Source</span>
              </a>
              <button className={s.topAction} title="More"><Glyph name="more" /><span>More</span></button>
            </div>
          </div>

          <div className={s.viewport}>
            <div ref={mountRef} className={s.canvas} />
            {!ready && <div className={s.loading}>Preparing viewer…</div>}
            {ready && loading && <div className={s.loading}>Loading model…</div>}

            <div className={s.toolRail}>
              {[
                { k: "3D", active: true },
                { k: "Size", active: false },
                { k: "Scope", active: false },
                { k: "AR View", active: false },
              ].map((t) => (
                <button key={t.k} className={`${s.tool} ${t.active ? s.toolActive : ""}`} title={t.k}>
                  <ToolIcon name={t.k} />
                  <span>{t.k}</span>
                </button>
              ))}
            </div>

            <div className={s.credit}>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                &ldquo;{item.name}&rdquo; by {item.author}
              </a>{" "}
              · CC0 · Poly&nbsp;Haven
            </div>

            <div className={s.controls}>
              <button className={s.ctrlBtn} onClick={resetView} title="Reset view"><Glyph name="reset" /></button>
              <span className={s.anglePill} ref={angleLabelRef}>0°</span>
              <input
                ref={sliderRef}
                className={s.slider}
                type="range"
                min={0}
                max={360}
                defaultValue={0}
                onChange={onSlider}
                aria-label="Rotate 360 degrees"
              />
              <button className={s.ctrlBtn} onClick={toggleFullscreen} title="Fullscreen"><Glyph name="expand" /></button>
            </div>
          </div>

          <div className={s.footerQuote}>
            <Glyph name="sprig-l" />
            <em>&ldquo;Every object is a story you can hold in your hands.&rdquo;</em>
            <Glyph name="sprig-r" />
          </div>
        </main>

        {/* right info panel */}
        <aside className={s.panel}>
          <div className={s.guideNote}>
            <span>Catalogue</span>
            <strong>No. {String(catNo).padStart(2, "0")}</strong>
            <Glyph name={`col-${item.collection}`} />
          </div>

          <div className={s.family}>{item.collection.toUpperCase()} · POLY HAVEN</div>
          <h2 className={s.commonName}>{item.name}</h2>
          <div className={s.latinName}>{item.subtitle}</div>

          <div className={s.tags}>
            {item.materials.map((m) => (
              <span key={m} className={s.tag}>{m}</span>
            ))}
          </div>

          <div className={s.facts}>
            <div className={s.fact}>
              <span className={s.factIcon} style={{ color: "#5b8fb0" }}><FactIcon name="book" /></span>
              <div className={s.factBody}>
                <div className={s.factTitle}>About</div>
                <p>{item.about}</p>
              </div>
            </div>
            <div className={s.fact}>
              <span className={s.factIcon} style={{ color: "#4f9e7a" }}><FactIcon name="ruler" /></span>
              <div className={s.factBody}>
                <div className={s.factTitle}>Dimensions</div>
                <p>{fmtDims(item.dims)} <span className={s.muted}>(actual size)</span></p>
              </div>
            </div>
            <div className={s.fact}>
              <span className={s.factIcon} style={{ color: "#d17aa8" }}><FactIcon name="mesh" /></span>
              <div className={s.factBody}>
                <div className={s.factTitle}>Mesh</div>
                <p>{item.poly.toLocaleString("en-US")} triangles · glTF / PBR textures</p>
              </div>
            </div>
          </div>

          <div className={s.flowerFit}>
            <div className={s.flowerFitHead}>
              SOURCE <Glyph name="info" />
            </div>
            <div className={s.sourceBody}>
              <span className={s.cc0Badge}>CC0</span>
              <div className={s.sourceText}>
                <strong>Public domain</strong>
                <span>by {item.author}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer">View on Poly&nbsp;Haven ↗</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
