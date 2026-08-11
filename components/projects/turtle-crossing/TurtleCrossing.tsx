"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIONS,
  HOTSPOTS,
  RESOURCES,
  SCENARIOS,
  SEASONS,
  SPECIES,
  STATUS_LABEL,
  THREATS,
  type Species,
} from "./data";
import { ShellPortrait } from "./shells";
import s from "./TurtleCrossing.module.css";

/**
 * Turtle Crossing — an interactive field resource for southwestern Ontario's
 * eight at-risk turtle species. Sections: living marsh hero (canvas), species
 * field-guide plates, the turtle-year season wheel, a road-rescue trainer,
 * a habitat cross-section, the decline arithmetic, protocols and contacts.
 */

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function MarshHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let handle: { dispose: () => void } | null = null;
    let cancelled = false;
    import("./marsh").then((m) => {
      if (cancelled || !ref.current) return;
      handle = m.createMarsh(ref.current);
    });
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, []);

  return (
    <div className={s.hero} data-rv>
      <canvas ref={ref} className={s.heroCanvas} aria-label="Animated dusk marsh scene with basking and swimming turtles" />
      <div className={s.heroCaption}>
        <span className={s.heroCapLabel}>DUSK · CAROLINIAN MARSH</span>
        <span className={s.heroCapHint}>Touch the water</span>
      </div>
      <div className={s.heroBadge}>
        <strong>8 of 8</strong>
        <span>Ontario turtle species are now at risk</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Species field guide
// ---------------------------------------------------------------------------

function statusClass(st: Species["status"]) {
  return st === "endangered" ? s.stEndangered : st === "threatened" ? s.stThreatened : s.stConcern;
}

function SpeciesGuide() {
  const [id, setId] = useState(SPECIES[0].id);
  const sp = useMemo(() => SPECIES.find((x) => x.id === id) ?? SPECIES[0], [id]);
  const idx = SPECIES.indexOf(sp);

  const step = useCallback(
    (d: number) => setId(SPECIES[(SPECIES.indexOf(SPECIES.find((x) => x.id === id)!) + d + SPECIES.length) % SPECIES.length].id),
    [id],
  );

  return (
    <div className={s.guide}>
      <div className={s.guideList} role="tablist" aria-label="Turtle species">
        {SPECIES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === id}
            className={`${s.guideTab} ${x.id === id ? s.guideTabOn : ""}`}
            onClick={() => setId(x.id)}
          >
            <span className={s.guideTabPlate}>{x.plate}</span>
            <span className={s.guideTabName}>{x.common}</span>
            <span className={`${s.statusDot} ${statusClass(x.status)}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <article className={s.plate} aria-live="polite">
        <div className={s.plateArt}>
          <div className={s.plateArtHead}>
            <span>PLATE {sp.plate}</span>
            <span>{sp.latin}</span>
          </div>
          <ShellPortrait id={sp.id} className={s.plateSvg} />
          <div className={s.plateArtFoot}>
            <span>{sp.size}</span>
            <div className={s.plateNav}>
              <button onClick={() => step(-1)} aria-label="Previous species">←</button>
              <span>
                {idx + 1} / {SPECIES.length}
              </span>
              <button onClick={() => step(1)} aria-label="Next species">→</button>
            </div>
          </div>
        </div>

        <div className={s.plateInfo}>
          <div className={s.plateTitleRow}>
            <h3 className={s.plateTitle}>{sp.common}</h3>
            <span className={`${s.statusChip} ${statusClass(sp.status)}`}>{STATUS_LABEL[sp.status]}</span>
          </div>

          <div className={s.plateCols}>
            <div>
              <h4 className={s.fieldLabel}>Field marks</h4>
              <ul className={s.marks}>
                {sp.idMarks.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={s.fieldLabel}>Habitat</h4>
              <p className={s.fieldBody}>{sp.habitat}</p>
              <h4 className={s.fieldLabel}>In the southwest</h4>
              <p className={s.fieldBody}>{sp.southwest}</p>
            </div>
          </div>

          <p className={s.plateNote}>{sp.note}</p>
        </div>
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Season wheel — the turtle year (segments proportional to real months)
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a * DEG), cy + r * Math.sin(a * DEG)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

function SeasonWheel() {
  const [id, setId] = useState("june");
  const sel = SEASONS.find((x) => x.id === id) ?? SEASONS[2];

  // proportional arcs: Apr–Oct are one month (30°) each, winter spans five (150°)
  const segs = useMemo(() => {
    let a = -90;
    return SEASONS.map((season) => {
      const span = season.id === "winter" ? 150 : 30;
      const seg = { season, a0: a + 1.2, a1: a + span - 1.2, mid: a + span / 2 };
      a += span;
      return seg;
    });
  }, []);

  return (
    <div className={s.seasonWrap}>
      <svg viewBox="0 0 340 340" className={s.wheel} aria-hidden="false">
        {segs.map(({ season, a0, a1, mid }) => {
          const on = season.id === id;
          return (
            <g key={season.id}>
              <path
                d={arcPath(170, 170, 92, on ? 158 : 150, a0, a1)}
                className={`${s.wheelSeg} ${season.peak ? s.wheelPeak : ""} ${on ? s.wheelOn : ""}`}
                onClick={() => setId(season.id)}
                role="button"
                aria-label={`${season.months}: ${season.headline}`}
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setId(season.id)}
              />
              <text
                x={170 + 122 * Math.cos(mid * DEG)}
                y={170 + 122 * Math.sin(mid * DEG)}
                className={`${s.wheelLbl} ${on ? s.wheelLblOn : ""}`}
                textAnchor="middle"
                dominantBaseline="middle"
                onClick={() => setId(season.id)}
              >
                {season.label}
              </text>
            </g>
          );
        })}
        <text x={170} y={158} className={s.wheelCenterBig} textAnchor="middle">
          {sel.label}
        </text>
        <text x={170} y={186} className={s.wheelCenterSmall} textAnchor="middle">
          {sel.headline}
        </text>
        {sel.peak && (
          <text x={170} y={208} className={s.wheelCenterPeak} textAnchor="middle">
            ⚠ ROAD PEAK
          </text>
        )}
      </svg>

      <div className={s.seasonInfo} aria-live="polite">
        <div className={s.seasonHead}>
          <span className={s.seasonMonths}>{sel.months}</span>
          <h3 className={s.seasonTitle}>{sel.headline}</h3>
        </div>
        <h4 className={s.fieldLabelLight}>What's happening</h4>
        <p className={s.seasonBody}>{sel.happening}</p>
        <h4 className={s.fieldLabelLight}>What to do</h4>
        <p className={s.seasonBody}>{sel.doThis}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Road rescue trainer
// ---------------------------------------------------------------------------

function RescueTrainer() {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const sc = SCENARIOS[idx];
  const correctIdx = sc.options.findIndex((o) => o.correct);
  const solved = picks.includes(correctIdx);
  const lastPick = picks.length ? picks[picks.length - 1] : null;

  const go = (d: number) => {
    setIdx((i) => Math.min(SCENARIOS.length - 1, Math.max(0, i + d)));
    setPicks([]);
  };

  return (
    <div className={s.trainer}>
      <div className={s.trainerHead}>
        <span className={s.trainerCount}>
          SCENARIO {idx + 1} / {SCENARIOS.length}
        </span>
        <div className={s.trainerDots} aria-hidden="true">
          {SCENARIOS.map((x, i) => (
            <span key={x.id} className={`${s.tDot} ${i === idx ? s.tDotOn : ""}`} />
          ))}
        </div>
      </div>

      <h3 className={s.trainerTitle}>{sc.title}</h3>
      <p className={s.trainerSetting}>{sc.setting}</p>
      <p className={s.trainerPrompt}>{sc.prompt}</p>

      <div className={s.options}>
        {sc.options.map((o, i) => {
          const picked = picks.includes(i);
          const isRight = i === correctIdx;
          const cls = picked ? (isRight ? s.optRight : s.optWrong) : "";
          return (
            <div key={i}>
              <button
                className={`${s.opt} ${cls}`}
                disabled={solved || picked}
                onClick={() => setPicks((p) => [...p, i])}
              >
                <span className={s.optMark}>{picked ? (isRight ? "✓" : "✕") : String.fromCharCode(65 + i)}</span>
                <span>{o.text}</span>
              </button>
              {picked && (lastPick === i || isRight) && <p className={`${s.feedback} ${isRight ? s.feedbackRight : ""}`}>{o.feedback}</p>}
            </div>
          );
        })}
      </div>

      {solved && <p className={s.fieldNote}>{sc.fieldNote}</p>}

      <div className={s.trainerFoot}>
        <button className={s.navBtn} onClick={() => go(-1)} disabled={idx === 0}>
          ← Previous
        </button>
        {!solved && lastPick !== null && <span className={s.tryAgain}>Try another answer</span>}
        <button className={s.navBtn} onClick={() => go(1)} disabled={idx === SCENARIOS.length - 1}>
          Next scenario →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habitat cross-section
// ---------------------------------------------------------------------------

function HabitatMap() {
  const [id, setId] = useState(HOTSPOTS[4].id); // start on the road — the point
  const sel = HOTSPOTS.find((x) => x.id === id) ?? HOTSPOTS[0];

  return (
    <div className={s.habitat}>
      <svg viewBox="0 0 1200 420" className={s.pano} aria-label="Cross-section of a turtle home range from open water to upland">
        {/* sky */}
        <rect x="0" y="0" width="1200" height="420" fill="var(--tc-pano-sky)" />
        <circle cx="210" cy="86" r="34" fill="var(--tc-pano-sun)" opacity="0.85" />

        {/* upland (right) */}
        <path d="M 860 420 L 860 300 Q 960 246 1060 262 Q 1140 274 1200 258 L 1200 420 Z" fill="var(--tc-pano-upland)" />
        {/* trees */}
        <g fill="var(--tc-pano-tree)">
          {[[940, 262], [1000, 250], [1075, 252], [1150, 244]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 3} y={y - 6} width={6} height={26} rx={2} />
              <ellipse cx={x} cy={y - 26} rx={26 + (i % 2) * 8} ry={24} />
            </g>
          ))}
        </g>

        {/* road embankment + road */}
        <path d="M 690 420 L 716 292 L 884 292 L 910 420 Z" fill="var(--tc-pano-embank)" />
        <rect x="706" y="272" width="188" height="24" rx="4" fill="var(--tc-pano-road)" />
        <g stroke="var(--tc-pano-dash)" strokeWidth="3" strokeDasharray="14 12">
          <line x1="716" y1="284" x2="886" y2="284" />
        </g>
        {/* exclusion fencing */}
        <g stroke="var(--tc-pano-fence)" strokeWidth="2.5">
          <line x1="700" y1="300" x2="700" y2="340" />
          <line x1="900" y1="300" x2="900" y2="340" />
          <line x1="688" y1="340" x2="712" y2="340" />
          <line x1="888" y1="340" x2="912" y2="340" />
        </g>
        {/* culvert ecopassage */}
        <path d="M 776 420 L 776 388 Q 800 366 824 388 L 824 420 Z" fill="var(--tc-pano-culvert)" />
        <path d="M 776 420 L 776 388 Q 800 366 824 388 L 824 420" fill="none" stroke="var(--tc-pano-fence)" strokeWidth="3" />

        {/* nesting bank */}
        <path d="M 470 420 Q 540 288 640 302 Q 700 310 740 420 Z" fill="var(--tc-pano-sand)" />
        <g fill="var(--tc-pano-sand2)">
          <ellipse cx="575" cy="330" rx="5" ry="3" />
          <ellipse cx="600" cy="352" rx="4" ry="2.5" />
          <ellipse cx="556" cy="360" rx="4.5" ry="3" />
          <ellipse cx="622" cy="332" rx="3.5" ry="2" />
        </g>
        {/* nest marker */}
        <circle cx="588" cy="342" r="10" fill="none" stroke="var(--tc-pano-fence)" strokeWidth="2" strokeDasharray="4 4" />

        {/* water */}
        <rect x="0" y="252" width="500" height="168" fill="var(--tc-pano-water)" />
        <path d="M 430 420 Q 470 340 500 252 L 500 420 Z" fill="var(--tc-pano-sand)" opacity="0.55" />
        <g stroke="var(--tc-pano-ripple)" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <line x1="40" y1="292" x2="120" y2="292" />
          <line x1="170" y1="330" x2="240" y2="330" />
          <line x1="70" y1="372" x2="150" y2="372" />
          <line x1="300" y1="300" x2="360" y2="300" />
        </g>

        {/* emergent marsh reeds */}
        <g stroke="var(--tc-pano-reed)" strokeWidth="4" strokeLinecap="round" fill="var(--tc-pano-reed)">
          {[[228, 20], [252, 34], [276, 26], [300, 40], [324, 22], [348, 34]].map(([x, hh], i) => (
            <g key={i}>
              <line x1={x} y1={268} x2={x + 6} y2={268 - hh - 26} />
              <ellipse cx={x + 6.5} cy={268 - hh - 30} rx={4} ry={11} />
            </g>
          ))}
        </g>

        {/* basking log + turtle */}
        <g fill="var(--tc-pano-log)">
          <ellipse cx="430" cy="322" rx="52" ry="9" />
          <path d="M 470 318 Q 486 296 482 288 Q 488 298 476 320 Z" />
        </g>
        <g fill="var(--tc-pano-turtle)">
          <path d="M 404 314 Q 418 298 436 300 Q 448 302 450 313 Z" />
          <path d="M 448 308 Q 456 302 459 297 Q 462 294 464 296 Q 465 299 461 303 Q 456 309 451 312 Z" />
        </g>

        {/* the safe path — marsh → bank → culvert → upland */}
        <path
          d="M 380 340 Q 500 360 588 342 Q 690 322 800 394 Q 900 348 1000 300"
          fill="none"
          stroke="var(--tc-pano-path)"
          strokeWidth="2.5"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />

        {/* hotspots */}
        {HOTSPOTS.map((hpt) => {
          const on = hpt.id === id;
          return (
            <g key={hpt.id} className={s.hotspot} onClick={() => setId(hpt.id)} role="button" tabIndex={0} aria-label={hpt.title}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setId(hpt.id)}>
              <circle cx={hpt.x} cy={hpt.y} r={on ? 17 : 13} className={`${s.hotDot} ${on ? s.hotDotOn : ""}`} />
              <text x={hpt.x} y={hpt.y + 1} textAnchor="middle" dominantBaseline="middle" className={s.hotPlus}>
                {on ? "●" : "+"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={s.habitatInfo} aria-live="polite">
        <h4 className={s.habitatTitle}>{sel.title}</h4>
        <p className={s.habitatBody}>{sel.body}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function SectionHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className={s.secHead} data-rv>
      <span className={s.eyebrow}>{eyebrow}</span>
      <h2 className={s.secTitle}>{title}</h2>
      {lede && <p className={s.secLede}>{lede}</p>}
    </div>
  );
}

export default function TurtleCrossing() {
  return (
    <div className={s.wrap}>
      <header className={s.pageHead} data-rv>
        <div>
          <div className={s.kicker}>CONSERVATION · INTERACTIVE FIELD RESOURCE · SOUTHWESTERN ONTARIO</div>
          <h1 className={s.pageTitle}>Turtle Crossing</h1>
        </div>
        <p className={s.pageIntro}>
          Every one of Ontario's <strong>eight native turtle species</strong> is now at risk, and nowhere is the squeeze
          tighter than the southwest — the Carolinian country of Long Point, Rondeau, Pelee and the Thames. This is a
          field resource for the people who live here: learn the eight, read the turtle year, and practise the thirty
          seconds on a road shoulder that can save a thirty-year-old animal.
        </p>
      </header>

      <MarshHero />

      <section className={s.section}>
        <SectionHead
          eyebrow="FIELD GUIDE · PLATES I–VIII"
          title="The eight"
          lede="Ontario's full turtle fauna, from the hubcap-sized snapper to the polka-dotted spotted turtle. Learn them well enough to know what you're braking for."
        />
        <div data-rv>
          <SpeciesGuide />
        </div>
      </section>

      <section className={s.section}>
        <SectionHead
          eyebrow="THE TURTLE YEAR"
          title="A year in the marsh"
          lede="The wheel is drawn to scale: brumation really is five-twelfths of a turtle's year. The hot segments are the road-mortality peaks — the weeks your attention matters most."
        />
        <div data-rv>
          <SeasonWheel />
        </div>
      </section>

      <section className={s.section}>
        <SectionHead
          eyebrow="ROAD PROTOCOL"
          title="You're the crossing guard"
          lede="Five situations you may actually meet on a southwestern Ontario road. Choose what you'd do — wrong answers teach as much as right ones."
        />
        <div data-rv>
          <RescueTrainer />
        </div>
      </section>

      <section className={s.section}>
        <SectionHead
          eyebrow="HOME RANGE"
          title="Anatomy of a turtle's world"
          lede="One 'pond turtle' actually needs a whole connected landscape. Explore the cross-section — the dotted line is the route a female travels every June."
        />
        <div data-rv>
          <HabitatMap />
        </div>
      </section>

      <section className={s.section}>
        <SectionHead eyebrow="THE ARITHMETIC OF DECLINE" title="Why they're vanishing" />
        <div className={s.threats} data-stag>
          {THREATS.map((th) => (
            <div key={th.title} className={s.threat}>
              <span className={s.threatStat}>{th.stat}</span>
              <h3 className={s.threatTitle}>{th.title}</h3>
              <p className={s.threatBody}>{th.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <SectionHead
          eyebrow="PROTOCOLS"
          title="What you can do"
          lede="None of this requires a biology degree. Most of it requires a car mat, a phone, and the willingness to pull over."
        />
        <div className={s.actions} data-stag>
          {ACTIONS.map((a, i) => (
            <div key={a.title} className={s.action}>
              <span className={s.actionNo}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className={s.actionTitle}>{a.title}</h3>
                <p className={s.actionBody}>{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <SectionHead eyebrow="CONTACTS" title="Who to call" />
        <div className={s.hotline} data-rv>
          <div>
            <span className={s.hotlineLabel}>INJURED TURTLE? ONTARIO TURTLE CONSERVATION CENTRE</span>
            <a className={s.hotlineNumber} href="tel:1-705-741-5000">
              705-741-5000
            </a>
          </div>
          <p className={s.hotlineNote}>
            Dry ventilated box, no food or water, note the exact location. Volunteer Turtle Taxis relay patients from
            anywhere in the province — even badly injured turtles are routinely repaired and released.
          </p>
        </div>
        <div className={s.resources} data-stag>
          {RESOURCES.map((r) => (
            <a key={r.name} className={s.resource} href={r.href} target="_blank" rel="noopener noreferrer">
              <div className={s.resourceHead}>
                <h3 className={s.resourceName}>{r.name}</h3>
                <span className={s.resourceArrow}>↗</span>
              </div>
              <p className={s.resourceRole}>{r.role}</p>
              {r.phone && <span className={s.resourcePhone}>{r.phone}</span>}
            </a>
          ))}
        </div>
        <p className={s.credits} data-rv>
          Compiled from public guidance by the Ontario Turtle Conservation Centre, Ontario Nature, the Toronto Zoo's
          Adopt-A-Pond programme and the Long Point Causeway Improvement Project. Statuses reflect federal and
          provincial species-at-risk listings; always defer to current official guidance in the field.
        </p>
      </section>
    </div>
  );
}
