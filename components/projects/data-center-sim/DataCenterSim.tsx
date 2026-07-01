"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DataCenter, SPECS, CODE, AMBIENT, type BuildingType, type Tool, type Hud } from "./engine";
import type { Ctrl, SceneHandle } from "./scene";
import { NoiseAudio } from "./audio";
import s from "./DataCenterSim.module.css";

const noiseToIntensity = (db: number) => Math.max(0, Math.min(1, (db - 40) / (100 - 40)));

const TOOLS: BuildingType[] = ["rack", "cooler", "power", "network"];
const SPEEDS = [1, 2, 4];

const TYPE_COLOR: Record<BuildingType, string> = {
  rack: "#e6b15a",
  cooler: "#5fb6e0",
  power: "#ecd14a",
  network: "#b08ee6",
};

function seed(eng: DataCenter) {
  const put = (x: number, y: number, code: number) => {
    if (eng.inBounds(x, y)) eng.grid[eng.idx(x, y)] = code as number;
  };
  // a tidy starter campus: a row of halls cooled by a row of towers,
  // fed by a substation and served by a network pod
  const cx = 5, cy = 4;
  put(cx - 1, cy, CODE.power);
  put(cx, cy, CODE.rack);
  put(cx + 1, cy, CODE.rack);
  put(cx + 2, cy, CODE.rack);
  put(cx + 3, cy, CODE.network);
  put(cx, cy + 1, CODE.cooler);
  put(cx + 1, cy + 1, CODE.cooler);
  put(cx + 2, cy + 1, CODE.cooler);
}

function fmtMoney(n: number) {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  return (neg ? "-$" : "$") + v.toLocaleString("en-US");
}

export default function DataCenterSim() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const engRef = useRef<DataCenter | null>(null);

  const [tool, setTool] = useState<Tool>("rack");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [heat, setHeat] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([]);
  const [ready, setReady] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [sound, setSound] = useState(false);

  const ctrl = useRef<Ctrl>({ tool, paused, speed, heat });
  ctrl.current = { tool, paused, speed, heat };

  // noise sonification (own AudioContext; created on first enable = user gesture)
  const audioRef = useRef<NoiseAudio | null>(null);
  const soundRef = useRef(false);
  const lastNoiseRef = useRef(34);
  soundRef.current = sound;

  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    setSound(next);
    soundRef.current = next;
    if (next) {
      if (!audioRef.current) audioRef.current = new NoiseAudio();
      audioRef.current.setIntensity(noiseToIntensity(lastNoiseRef.current));
      void audioRef.current.start();
    } else {
      void audioRef.current?.stop();
    }
  }, []);

  useEffect(() => () => { audioRef.current?.dispose(); audioRef.current = null; }, []);

  const handleHud = useCallback((h: Hud) => {
    setHud(h);
    lastNoiseRef.current = h.noise;
    if (soundRef.current) audioRef.current?.setIntensity(noiseToIntensity(h.noise));
  }, []);

  if (!engRef.current) {
    const eng = new DataCenter(13, 9);
    seed(eng);
    engRef.current = eng;
  }

  const handleReset = useCallback(() => {
    const eng = new DataCenter(13, 9);
    seed(eng);
    engRef.current = eng;
    setHud(eng.hud());
    setPaused(false);
    setSpeed(1);
    setSceneKey((k) => k + 1); // forces the scene effect to dispose + remount on the new engine
  }, []);

  // show real starting figures immediately (before the render loop's first tick)
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
        onHud: handleHud,
        onToasts: (fresh) => {
          setToasts((prev) => [...prev, ...fresh.map((t) => ({ id: t.id, text: t.text, kind: t.kind }))].slice(-4));
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

  const money = hud?.money ?? 0;
  const goalPct = hud ? Math.min(1, Math.max(0, money / hud.goal)) : 0;

  return (
    <div className={s.wrap} ref={wrapRef}>
      <header className={s.head} data-rv>
        <div>
          <div className={s.kicker}>SIM · BUILD & RUN A DATA CENTER</div>
          <h1 className={s.title}>Data Center Sim</h1>
        </div>
        <p className={s.intro}>
          Build a data center on the edge of a real neighborhood — homes, a school, a
          playground. Compute earns money, but the plant runs hot <em>and loud</em>: heat
          spreads tile to tile, and the cooling towers roar. Turn on <strong>Sound</strong>
          {" "}to hear it grow, and watch the <strong>Community</strong> gauge as the noise
          reaches the people next door.
        </p>
      </header>

      {/* HUD */}
      <div className={s.hudbar}>
        <div className={s.money}>
          <span className={s.moneyVal} style={{ color: money < 0 ? "#e6705a" : undefined }}>
            {fmtMoney(money)}
          </span>
          <span className={s.netVal} style={{ color: (hud?.netPerHour ?? 0) >= 0 ? "#7fd6a4" : "#e6705a" }}>
            {(hud?.netPerHour ?? 0) >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs((hud?.netPerHour ?? 0) * 24))}/day
          </span>
        </div>

        <div className={s.gauges}>
          <Gauge
            label="Power"
            value={`${Math.round(hud?.powerDraw ?? 0)} / ${Math.round(hud?.powerSupply ?? 0)} kW`}
            pct={hud && hud.powerSupply > 0 ? hud.powerDraw / hud.powerSupply : 0}
            warn={!!hud && hud.powerRatio < 0.999}
          />
          <Gauge
            label="Load served"
            value={`${Math.round(hud?.served ?? 0)} / ${Math.round(hud?.demand ?? 0)}`}
            pct={hud && hud.demand > 0 ? hud.served / hud.demand : 0}
          />
          <Gauge
            label="Bandwidth"
            value={`${Math.round(hud?.bandwidth ?? 0)} u`}
            pct={hud && hud.capacity > 0 ? Math.min(1, hud.bandwidth / Math.max(1, hud.capacity)) : 0}
          />
          <Gauge
            label="Peak temp"
            value={`${Math.round(hud?.maxTemp ?? AMBIENT)}°C`}
            pct={hud ? Math.min(1, (hud.maxTemp - AMBIENT) / (90 - AMBIENT)) : 0}
            warn={!!hud && hud.maxTemp > 68}
          />
          <Gauge
            label="Noise"
            value={`${Math.round(hud?.noise ?? 34)} dB`}
            pct={hud ? Math.min(1, (hud.noise - 34) / (105 - 34)) : 0}
            warn={!!hud && hud.noise > 72}
          />
          <Gauge
            label="Community"
            value={`${hud?.sentimentLabel ?? "Content"} · ${Math.round(hud?.sentiment ?? 100)}%`}
            pct={hud ? hud.sentiment / 100 : 1}
            warn={!!hud && hud.sentiment < 40}
            color={
              (hud?.sentiment ?? 100) >= 60 ? "#7fd6a4" : (hud?.sentiment ?? 100) >= 30 ? "#e6b15a" : "#e6705a"
            }
          />
          <div className={s.stat}>
            <span className={s.statLabel}>Day</span>
            <span className={s.statVal}>{hud?.day ?? 1}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>Halls</span>
            <span className={s.statVal}>
              {hud?.racks ?? 0}
              {hud && hud.dead > 0 ? <em className={s.dead}> ({hud.dead}✕)</em> : null}
            </span>
          </div>
        </div>
      </div>

      {/* goal bar */}
      <div className={s.goalbar} title="Progress to goal">
        <div className={s.goalfill} style={{ width: `${goalPct * 100}%` }} />
        {hud?.won && <div className={s.wonTag}>GOAL REACHED ✓</div>}
      </div>

      {/* toolbar */}
      <div className={s.toolbar}>
        <div className={s.tools}>
          {TOOLS.map((t) => {
            const spec = SPECS[t];
            const afford = money >= spec.cost;
            return (
              <button
                key={t}
                className={`${s.tool} ${tool === t ? s.active : ""}`}
                onClick={() => setTool(t)}
                style={{ ["--tc" as string]: TYPE_COLOR[t] }}
                title={spec.blurb}
              >
                <span className={s.toolGlyph}>{spec.glyph}</span>
                <span className={s.toolName}>{spec.name}</span>
                <span className={`${s.toolCost} ${afford ? "" : s.cant}`}>${spec.cost.toLocaleString()}</span>
              </button>
            );
          })}
          <button
            className={`${s.tool} ${s.bulldoze} ${tool === "bulldoze" ? s.active : ""}`}
            onClick={() => setTool("bulldoze")}
            title="Remove a building (55% refund)."
          >
            <span className={s.toolGlyph}>⌫</span>
            <span className={s.toolName}>Bulldoze</span>
            <span className={s.toolCost}>+55%</span>
          </button>
        </div>

        <div className={s.controls}>
          <button className={s.btn} onClick={() => setPaused((p) => !p)}>
            {paused ? "▶ Play" : "❚❚ Pause"}
          </button>
          <div className={s.speeds}>
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                className={`${s.speed} ${speed === sp && !paused ? s.active : ""}`}
                onClick={() => { setSpeed(sp); setPaused(false); }}
              >
                {sp}×
              </button>
            ))}
          </div>
          <button className={`${s.btn} ${heat ? s.on : ""}`} onClick={() => setHeat((h) => !h)}>
            ◈ Heatmap
          </button>
          <button
            className={`${s.btn} ${sound ? s.on : ""}`}
            onClick={toggleSound}
            title="Hear the site — the HVAC drone gets louder and harsher as it grows"
          >
            {sound ? "🔊 Sound" : "🔈 Sound"}
          </button>
          <button className={s.btn} onClick={handleReset}>↺ Reset</button>
        </div>
      </div>

      {/* stage */}
      <div className={s.stage}>
        <div ref={mountRef} className={s.scene} />
        {!ready && <div className={s.loading}>Loading diorama…</div>}
        <div className={s.toasts}>
          {toasts.map((t) => (
            <div key={t.id} className={`${s.toast} ${s[t.kind] ?? ""}`}>{t.text}</div>
          ))}
        </div>
      </div>

      <p className={s.legend}>
        <strong>Left-drag</strong> to place · <strong>right-drag</strong> to orbit ·
        <strong> scroll</strong> to zoom. Cooling towers cool the halls but are the loudest thing on
        site — as you scale up, the noise ripples out across the neighborhood, the audio drone
        intensifies, and community sentiment falls (watch the homes react). A demonstration of the
        noise-pollution trade-off real data centers impose on the communities around them.
      </p>
    </div>
  );
}

function Gauge({
  label,
  value,
  pct,
  warn,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  warn?: boolean;
  color?: string;
}) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className={s.gauge}>
      <div className={s.gaugeTop}>
        <span className={s.statLabel}>{label}</span>
        <span className={`${s.statVal} ${warn ? s.warnText : ""}`}>{value}</span>
      </div>
      <div className={s.bar}>
        <div
          className={s.barfill}
          style={{
            width: `${p * 100}%`,
            background: color ?? (warn ? "#e6705a" : p > 0.85 ? "#e6b15a" : "var(--accent)"),
          }}
        />
      </div>
    </div>
  );
}
