"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DataCenterF5,
  SPECS,
  CODE,
  type BuildingType,
  type Tool,
  type Hud,
} from "./engine";
import type { Ctrl, SceneHandle } from "./scene";
import s from "./DataCenterSimF5.module.css";

const TOOLS: BuildingType[] = ["hall", "chiller", "substation", "solar", "battery", "uplink"];
const SPEEDS = [1, 2, 4];

const TOOL_META: Record<BuildingType, { color: string; stat: string }> = {
  hall: { color: "#e8c46a", stat: "+14 compute" },
  chiller: { color: "#6cc4e8", stat: "−44 heat" },
  substation: { color: "#e89a5a", stat: "grid 40 kW" },
  solar: { color: "#f0d858", stat: "16 kW noon" },
  battery: { color: "#7fd6a4", stat: "60 kWh" },
  uplink: { color: "#b08ee6", stat: "+32 bandwidth" },
};

function seed(eng: DataCenterF5) {
  const put = (x: number, y: number, code: number) => {
    if (eng.inBounds(x, y)) eng.grid[eng.idx(x, y)] = code;
  };
  // starter campus: two halls flanked by chillers, one substation, one uplink,
  // and a solar array hinting at where the game wants you to go
  const cx = 5, cy = 4;
  put(cx, cy, CODE.hall);
  put(cx + 1, cy, CODE.hall);
  put(cx, cy + 1, CODE.chiller);
  put(cx + 1, cy + 1, CODE.chiller);
  put(cx - 1, cy, CODE.substation);
  put(cx + 2, cy, CODE.uplink);
  put(cx - 1, cy - 1, CODE.solar);
}

function fmtMoney(n: number) {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  return (neg ? "-$" : "$") + v.toLocaleString("en-US");
}

function fmtClock(hour: number) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m - (m % 10)).padStart(2, "0")}`;
}

export default function DataCenterSimF5() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engRef = useRef<DataCenterF5 | null>(null);

  const [tool, setTool] = useState<Tool>("hall");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [heat, setHeat] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([]);
  const [ready, setReady] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const ctrl = useRef<Ctrl>({ tool, paused, speed, heat });
  ctrl.current = { tool, paused, speed, heat };

  if (!engRef.current) {
    const eng = new DataCenterF5(14, 9);
    seed(eng);
    engRef.current = eng;
  }

  const handleReset = useCallback(() => {
    const eng = new DataCenterF5(14, 9);
    seed(eng);
    engRef.current = eng;
    setHud(eng.hud());
    setPaused(false);
    setSpeed(1);
    setSceneKey((k) => k + 1);
  }, []);

  // real starting figures before the loop's first HUD tick (rAF can be
  // throttled in unfocused tabs — never show zeros)
  useEffect(() => {
    setHud(engRef.current!.hud());
  }, [sceneKey]);

  // mount the three.js diorama (re-runs on reset via sceneKey)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let handle: SceneHandle | null = null;
    let cancelled = false;
    setReady(false);

    (async () => {
      const { createScene } = await import("./scene");
      if (cancelled || !mountRef.current) return;
      handle = createScene({
        container: mountRef.current,
        engine: engRef.current!,
        getCtrl: () => ctrl.current,
        onHud: setHud,
        onToasts: (fresh) => {
          setToasts((prev) =>
            [...prev, ...fresh.map((t) => ({ id: t.id, text: t.text, kind: t.kind }))].slice(-4)
          );
          for (const t of fresh) {
            const id = t.id;
            window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
          }
        },
      });
      setReady(true);
    })();

    return () => {
      cancelled = true;
      handle?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);

  // keyboard: 1–6 tools, X bulldoze, space pause, H heatmap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const ti = TOOLS.findIndex((t) => SPECS[t].key === k);
      if (ti >= 0) setTool(TOOLS[ti]);
      else if (k === "x" || k === "b") setTool("bulldoze");
      else if (k === "h") setHeat((v) => !v);
      else if (k === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const money = hud?.money ?? 0;
  const goalPct = hud ? Math.min(1, Math.max(0, money / hud.goal)) : 0;
  const hour = hud?.hour ?? 6.5;
  const isDay = hour >= 6 && hour < 18;

  // sun/moon marker on the clock arc
  const arcAngle = isDay
    ? ((hour - 6) / 12) * Math.PI
    : (((hour + 6) % 24) / 12) * Math.PI;
  const dotX = 33 - 26 * Math.cos(arcAngle);
  const dotY = 31 - 24 * Math.sin(arcAngle);

  const draw = hud?.draw ?? 0;
  const solarPct = draw > 0 ? Math.min(1, (hud?.solarKW ?? 0) / draw) : 0;
  const battPct = draw > 0 ? Math.min(1 - solarPct, Math.max(0, hud?.battKW ?? 0) / draw) : 0;
  const gridPct = draw > 0 ? Math.min(1 - solarPct - battPct, (hud?.gridKW ?? 0) / draw) : 0;
  const shortPct = Math.max(0, 1 - solarPct - battPct - gridPct);
  const priceHot = (hud?.gridPrice ?? 0.1) > 0.16;

  return (
    <div className={s.wrap}>
      <header className={s.head} data-rv>
        <div>
          <div className={s.kicker}>SIM · FABLE 5 REBUILD · BUILD & RUN A DATA CENTER</div>
          <h1 className={s.title}>Data Center Sim F5</h1>
        </div>
        <p className={s.intro}>
          A from-scratch rebuild of the data center sim, moved to a high-desert plateau
          where <strong>everything runs on the clock</strong>. Solar only works while the
          sun is up, grid power is priciest at the evening peak and dirtiest at night, and
          batteries carry the daylight into the dark. Customers pay a premium for{" "}
          <strong>clean compute</strong> — so the question isn&apos;t just how big you build,
          but <em>what you build it on</em>. Watch the sun cross the sky; the desert cools
          hard at night and cooks by mid-afternoon.
        </p>
      </header>

      {/* stage with in-game HUD */}
      <div className={s.stage}>
        <div ref={mountRef} className={s.scene} />
        {!ready && <div className={s.loading}>Loading diorama…</div>}

        {/* top-left: money + goal */}
        <div className={`${s.panel} ${s.moneyPanel}`}>
          <div className={s.moneyVal} style={{ color: money < 0 ? "#ff8a75" : undefined }}>
            {fmtMoney(money)}
          </div>
          <div className={s.netVal} style={{ color: (hud?.netPerHour ?? 0) >= 0 ? "#8fe6b4" : "#ff8a75" }}>
            {(hud?.netPerHour ?? 0) >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs((hud?.netPerHour ?? 0) * 24))}/day
          </div>
          <div className={s.goalRow}>
            <div className={s.goalTrack}>
              <div className={s.goalFill} style={{ width: `${goalPct * 100}%` }} />
            </div>
            <span className={s.goalLabel}>
              {hud?.won ? "GOAL ✓" : `GOAL ${fmtMoney(hud?.goal ?? 150000)}`}
            </span>
          </div>
        </div>

        {/* top-right: clock + controls */}
        <div className={s.clockStack}>
          <div className={`${s.panel} ${s.clockPanel}`}>
            <svg viewBox="0 0 66 36" className={s.clockArc} aria-hidden>
              <path d="M 7 31 A 26 24 0 0 1 59 31" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="2.5 3" />
              <line x1="4" y1="31" x2="62" y2="31" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx={dotX} cy={dotY} r="4" fill={isDay ? "#ffd76a" : "#cfdcf5"} />
            </svg>
            <div className={s.clockText}>
              <span className={s.clockDay}>DAY {hud?.day ?? 1}</span>
              <span className={s.clockTime}>{fmtClock(hour)}</span>
            </div>
            <span className={`${s.priceChip} ${priceHot ? s.priceHot : ""}`}>
              grid ${(hud?.gridPrice ?? 0.1).toFixed(2)}/kWh
            </span>
          </div>
          <div className={`${s.panel} ${s.controls}`}>
            <button className={s.ctl} onClick={() => setPaused((p) => !p)} title="Space">
              {paused ? "▶" : "❚❚"}
            </button>
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                className={`${s.ctl} ${speed === sp && !paused ? s.ctlOn : ""}`}
                onClick={() => { setSpeed(sp); setPaused(false); }}
              >
                {sp}×
              </button>
            ))}
            <button className={`${s.ctl} ${heat ? s.ctlOn : ""}`} onClick={() => setHeat((h) => !h)} title="H — thermal view">
              ◈
            </button>
            <button className={s.ctl} onClick={handleReset} title="Reset">
              ↺
            </button>
          </div>
        </div>

        {/* right: gauges */}
        <div className={`${s.panel} ${s.gauges}`}>
          <div className={s.mixRow}>
            <div className={s.gLabel}>
              POWER&nbsp;
              <span className={s.gVal}>
                {Math.round((hud?.solarKW ?? 0) + Math.max(0, hud?.battKW ?? 0) + (hud?.gridKW ?? 0))}
                &thinsp;/&thinsp;{Math.round(draw)} kW
              </span>
            </div>
            <div className={s.mixBar}>
              <span style={{ width: `${solarPct * 100}%`, background: "#f0d858" }} title="solar" />
              <span style={{ width: `${battPct * 100}%`, background: "#7fd6a4" }} title="battery" />
              <span style={{ width: `${gridPct * 100}%`, background: "#e89a5a" }} title="grid" />
              <span style={{ width: `${shortPct * 100}%`, background: "#ff5f45" }} title="unmet" />
            </div>
            <div className={s.mixKey}>
              <i style={{ background: "#f0d858" }} />solar
              <i style={{ background: "#7fd6a4" }} />battery
              <i style={{ background: "#e89a5a" }} />grid
            </div>
          </div>
          <MiniGauge label="CLEAN" value={`${Math.round((hud?.cleanFrac ?? 1) * 100)}%`} pct={hud?.cleanFrac ?? 1} color="#7fd6a4" />
          <MiniGauge label="CARBON" value={`${Math.round(hud?.carbonPerDay ?? 0)} kg/d`} pct={Math.min(1, (hud?.carbonPerDay ?? 0) / 420)} color="#e89a5a" warn={(hud?.carbonPerDay ?? 0) > 250} />
          <MiniGauge
            label="BATTERY"
            value={`${Math.round(hud?.battCharge ?? 0)}/${Math.round(hud?.battCap ?? 0)} kWh`}
            pct={hud && hud.battCap > 0 ? hud.battCharge / hud.battCap : 0}
            color="#7fd6a4"
          />
          <MiniGauge
            label="PEAK TEMP"
            value={`${Math.round(hud?.maxTemp ?? 20)}°C`}
            pct={Math.min(1, ((hud?.maxTemp ?? 20) - 10) / 80)}
            color="#6cc4e8"
            warn={(hud?.maxTemp ?? 0) > 66}
          />
          <MiniGauge
            label="SERVED"
            value={`${Math.round(hud?.served ?? 0)}/${Math.round(hud?.demand ?? 0)}`}
            pct={hud && hud.demand > 0 ? hud.served / hud.demand : 0}
            color="#e8c46a"
            warn={!!hud && hud.demand > 0 && hud.served / hud.demand < 0.7}
          />
          <MiniGauge
            label="REPUTATION"
            value={`${hud?.repLabel ?? "Solid"} ${Math.round(hud?.reputation ?? 78)}`}
            pct={(hud?.reputation ?? 78) / 100}
            color={(hud?.reputation ?? 78) >= 60 ? "#8fe6b4" : (hud?.reputation ?? 78) >= 35 ? "#e8c46a" : "#ff8a75"}
          />
          <div className={s.hallRow}>
            <span className={s.gLabel}>HALLS</span>
            <span className={s.gVal}>
              {hud?.halls ?? 2}
              {hud && hud.dead > 0 ? <em className={s.deadTag}> · {hud.dead} dead</em> : null}
            </span>
          </div>
        </div>

        {/* toasts */}
        <div className={s.toasts}>
          {toasts.map((t) => (
            <div key={t.id} className={`${s.toast} ${s[t.kind] ?? ""}`}>{t.text}</div>
          ))}
        </div>

        {/* bottom: build dock */}
        <div className={s.dock}>
          {TOOLS.map((t) => {
            const spec = SPECS[t];
            const meta = TOOL_META[t];
            const afford = money >= spec.cost;
            return (
              <button
                key={t}
                className={`${s.card} ${tool === t ? s.cardOn : ""}`}
                onClick={() => setTool(t)}
                style={{ ["--tc" as string]: meta.color }}
                title={`${spec.blurb} (key ${spec.key})`}
              >
                <span className={s.cardKey}>{spec.key}</span>
                <span className={s.cardName}>{spec.short}</span>
                <span className={s.cardStat}>{meta.stat}</span>
                <span className={`${s.cardCost} ${afford ? "" : s.cant}`}>
                  ${spec.cost.toLocaleString()}
                </span>
              </button>
            );
          })}
          <button
            className={`${s.card} ${s.razeCard} ${tool === "bulldoze" ? s.cardOn : ""}`}
            onClick={() => setTool("bulldoze")}
            style={{ ["--tc" as string]: "#e6705a" }}
            title="Remove a building — 55% refund (key X)"
          >
            <span className={s.cardKey}>X</span>
            <span className={s.cardName}>Raze</span>
            <span className={s.cardStat}>&nbsp;</span>
            <span className={s.cardCost}>+55%</span>
          </button>
        </div>

        {hud?.won && <div className={s.wonBanner}>GOAL REACHED — ${(hud.goal / 1000) | 0}K BANKED ✓</div>}
      </div>

      <p className={s.legend}>
        <strong>Left-drag</strong> places · <strong>right-drag</strong> orbits ·{" "}
        <strong>scroll</strong> zooms · keys <strong>1–6</strong> pick a building,{" "}
        <strong>X</strong> razes, <strong>H</strong> toggles the thermal view,{" "}
        <strong>space</strong> pauses. Solar earns nothing after sunset — bank it in
        batteries or lean on the grid and eat the evening price spike (and the carbon).
        Halls throttle as their tile heats and fail past 76°C, and the desert afternoon
        pushes everything toward the red. Clean power sells at a premium; brownouts and
        unmet demand bleed reputation, and a shaky reputation books less demand.
      </p>
    </div>
  );
}

function MiniGauge({
  label,
  value,
  pct,
  color,
  warn,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  warn?: boolean;
}) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className={s.mini}>
      <div className={s.miniTop}>
        <span className={s.gLabel}>{label}</span>
        <span className={`${s.gVal} ${warn ? s.warnText : ""}`}>{value}</span>
      </div>
      <div className={s.miniBar}>
        <div style={{ width: `${p * 100}%`, background: warn ? "#ff5f45" : color }} />
      </div>
    </div>
  );
}
