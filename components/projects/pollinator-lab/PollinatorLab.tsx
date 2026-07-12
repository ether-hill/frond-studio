"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  SPECIES,
  FACT_META,
  TAG_TINT,
  speciesById,
  speciesInCategory,
  type Category,
  type Species,
  type FlowerSpec,
} from "./species";
import type { ViewerHandle } from "./scene";
import { Glyph, FactIcon, ToolIcon } from "./icons";
import s from "./PollinatorLab.module.css";

// ---- procedural flower for the "Flower Fit" card -------------------------
function Flower({ spec }: { spec: FlowerSpec }) {
  const n = spec.petals;
  const petals = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const long = spec.form === "trumpet" || spec.form === "orchid";
    const rx = long ? 9 : 12;
    const ry = long ? 22 : 16;
    const cx = 50 + Math.cos(a - Math.PI / 2) * (spec.form === "spike" ? 0 : 14);
    const cy = 52 + Math.sin(a - Math.PI / 2) * (spec.form === "spike" ? 0 : 14);
    return (
      <ellipse
        key={i}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={spec.petal}
        transform={`rotate(${(a * 180) / Math.PI + 90} ${cx} ${cy})`}
        opacity={0.92}
      />
    );
  });
  return (
    <svg viewBox="0 0 100 108" className={s.flowerSvg} aria-hidden>
      <path d="M50 66 C 49 82, 48 96, 44 106" stroke="#6f8a4a" strokeWidth="2.4" fill="none" />
      <path d="M49 84 C 40 80, 32 82, 28 88 C 38 90, 45 90, 49 86 Z" fill="#7fa04f" />
      <g>{petals}</g>
      <circle cx="50" cy="52" r="9" fill={spec.center} />
      <circle cx="50" cy="52" r="4" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export default function PollinatorLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerHandle | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const angleLabelRef = useRef<HTMLSpanElement>(null);

  const [activeId, setActiveId] = useState<string>("orchid-bee");
  const [openCat, setOpenCat] = useState<Category>("bees");
  const [ready, setReady] = useState(false);
  const [fs, setFs] = useState(false);

  const species = useMemo(() => speciesById(activeId), [activeId]);

  // mount viewer once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let handle: ViewerHandle | null = null;
    let cancelled = false;
    (async () => {
      const { createViewer } = await import("./scene");
      if (cancelled || !mountRef.current) return;
      handle = createViewer(mountRef.current, speciesById("orchid-bee").model);
      handle.onYaw((deg) => {
        if (sliderRef.current) sliderRef.current.value = String(Math.round(deg));
        if (angleLabelRef.current) angleLabelRef.current.textContent = `${Math.round(deg)}°`;
      });
      viewerRef.current = handle;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      handle?.dispose();
      viewerRef.current = null;
    };
  }, []);

  // swap creature when the active species changes
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    viewerRef.current?.setSpecies(species.model);
  }, [species]);

  const selectSpecies = useCallback((sp: Species) => {
    setOpenCat(sp.category);
    setActiveId(sp.id);
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

  const navItems = ["Home", "Explore", "Notes", "Garden", "Learn", "More"] as const;
  const SPOTLIGHT: Record<Category, string> = {
    bees: "BEE",
    moths: "MOTH",
    beetles: "BEETLE",
    hummingbirds: "BIRD",
    bats: "BAT",
  };

  return (
    <div className={s.wrap}>
      <header className={s.pageHead} data-rv>
        <div>
          <div className={s.kicker}>3D VIEWER · FIELD GUIDE · LIVE IN BROWSER</div>
          <h1 className={s.pageTitle}>Pollinator Lab</h1>
        </div>
        <p className={s.pageIntro}>
          An interactive field guide to the animals that move pollen: bees, moths, beetles,
          hummingbirds and bats. Every specimen is a{" "}
          <strong>procedurally built 3D model</strong> — no meshes loaded — lit in a soft
          studio and set on a turntable. Pick a pollinator, <strong>drag to spin</strong> it,
          scrub the 360° dial, and read its field notes.
        </p>
      </header>

      <div ref={stageRef} className={`${s.app} ${fs ? s.appFs : ""}`} data-rv>
        {/* far-left nav rail */}
        <nav className={s.rail} aria-label="Sections">
          <div className={s.railLogo}><Glyph name="flower" /></div>
          {navItems.map((n, i) => (
            <button key={n} className={`${s.railBtn} ${i === 1 ? s.railActive : ""}`} title={n}>
              <Glyph name={`nav-${n.toLowerCase()}`} />
              <span>{n}</span>
            </button>
          ))}
        </nav>

        {/* sidebar */}
        <aside className={s.sidebar}>
          <div className={s.brand}>
            <span className={s.brandMark}><Glyph name="flower" /></span>
            <span className={s.brandText}>
              Pollinator <em>Lab</em>
              <small>Explore. Learn. Protect.</small>
            </span>
          </div>

          <div className={s.listHead}>
            <span>POLLINATORS</span>
            <span className={s.listCount}>{SPECIES.length} species</span>
          </div>

          <div className={s.catList}>
            {CATEGORIES.map((cat) => {
              const members = speciesInCategory(cat.id);
              const rep = speciesById(cat.thumb);
              const open = openCat === cat.id;
              return (
                <div key={cat.id} className={`${s.cat} ${open ? s.catOpen : ""}`}>
                  <button
                    className={s.catHead}
                    onClick={() => {
                      setOpenCat(cat.id);
                      if (species.category !== cat.id) selectSpecies(members[0]);
                    }}
                  >
                    <span className={s.thumb} style={{ ["--c1" as string]: `#${rep.model.body.toString(16)}` }}>
                      <Glyph name={`cat-${cat.id}`} />
                    </span>
                    <span className={s.catText}>
                      <strong>{cat.label}</strong>
                      <small>{members.length} species</small>
                    </span>
                    <span className={`${s.chev} ${open ? s.chevOpen : ""}`}><Glyph name="chevron" /></span>
                  </button>
                  {open && (
                    <ul className={s.speciesList}>
                      {members.map((sp) => (
                        <li key={sp.id}>
                          <button
                            className={`${s.speciesRow} ${sp.id === activeId ? s.speciesActive : ""}`}
                            onClick={() => selectSpecies(sp)}
                          >
                            <span className={s.dot} style={{ background: `#${sp.model.body.toString(16)}` }} />
                            <span>{sp.name}</span>
                            <em>No. {String(sp.guideNo).padStart(2, "0")}</em>
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
            <div className={s.discHead}><Glyph name="flower" /> Today&apos;s Discovery</div>
            <p>{species.curio}</p>
          </div>
        </aside>

        {/* center stage */}
        <main className={s.stage}>
          <div className={s.topbar}>
            <button className={s.back}><Glyph name="arrow-left" /> Back to Collection</button>
            <div className={s.washi}>
              <span className={s.washiName}>{species.name.toUpperCase()}</span>
              <span className={s.washiLatin}>{species.latin}</span>
              <span className={s.pin} />
            </div>
            <div className={s.spotlight}>
              <div className={s.stamp}>
                <span>{SPOTLIGHT[species.category]}</span>
                <span>SPOTLIGHT</span>
              </div>
            </div>
            <div className={s.topActions}>
              {["Notebook", "Compare", "Share"].map((a) => (
                <button key={a} className={s.topAction} title={a}>
                  <Glyph name={`act-${a.toLowerCase()}`} />
                  <span>{a}</span>
                </button>
              ))}
              <button className={s.topAction} title="More"><Glyph name="more" /><span>More</span></button>
            </div>
          </div>

          <div className={s.viewport}>
            <div ref={mountRef} className={s.canvas} />
            {!ready && <div className={s.loading}>Preparing specimen…</div>}

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
            <em>&ldquo;In every flower, a story. In every pollinator, a connection.&rdquo;</em>
            <Glyph name="sprig-r" />
          </div>
        </main>

        {/* right info panel */}
        <aside className={s.panel}>
          <div className={s.guideNote}>
            <span>Field Guide</span>
            <strong>No. {String(species.guideNo).padStart(2, "0")}</strong>
            <Glyph name={`cat-${species.category}`} />
          </div>

          <div className={s.family}>{species.family.toUpperCase()} FAMILY</div>
          <h2 className={s.commonName}>{species.name}</h2>
          <div className={s.latinName}>{species.latin}</div>

          <div className={s.tags}>
            {species.tags.map((t) => (
              <span
                key={t.label}
                className={s.tag}
                style={{ background: TAG_TINT[t.kind].bg, color: TAG_TINT[t.kind].fg }}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div className={s.facts}>
            {species.facts.map((f) => {
              const meta = FACT_META[f.key];
              return (
                <div key={f.key} className={s.fact}>
                  <span className={s.factIcon} style={{ color: meta.tint }}>
                    <FactIcon name={meta.icon} />
                  </span>
                  <div className={s.factBody}>
                    <div className={s.factTitle}>{meta.label}</div>
                    <p>{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={s.flowerFit}>
            <div className={s.flowerFitHead}>
              FLOWER FIT <Glyph name="info" />
            </div>
            <div className={s.flowerFitBody}>
              <Flower spec={species.flower} />
              <div className={s.flowerName}>{species.flower.name}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
