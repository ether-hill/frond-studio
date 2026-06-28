"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DataCenter,
  SPECS,
  CODE,
  AMBIENT,
  type BuildingType,
  type Tool,
  type Hud,
} from "./engine";
import s from "./DataCenterSim.module.css";

const TOOLS: BuildingType[] = ["rack", "cooler", "power", "network"];
const SIM_HOURS_PER_SEC = 2.3;
const SPEEDS = [1, 2, 4];

type Palette = {
  bg: string;
  bgTile: string;
  bgTileAlt: string;
  fg: string;
  fgDim: string;
  line: string;
  accent: string;
};

const FALLBACK: Palette = {
  bg: "#0b0a08",
  bgTile: "#16130f",
  bgTileAlt: "#13110d",
  fg: "#f1ede5",
  fgDim: "#a39d92",
  line: "rgba(241,237,229,0.10)",
  accent: "#d9c9b0",
};

const TYPE_COLOR: Record<BuildingType, string> = {
  rack: "#e6b15a",
  cooler: "#5fb6e0",
  power: "#ecd14a",
  network: "#b08ee6",
};

function readPalette(el: HTMLElement): Palette {
  try {
    const cs = getComputedStyle(el);
    const get = (k: string, fb: string) => cs.getPropertyValue(k).trim() || fb;
    return {
      bg: get("--bg-0", FALLBACK.bg),
      bgTile: get("--bg-2", FALLBACK.bgTile),
      bgTileAlt: get("--bg-1", FALLBACK.bgTileAlt),
      fg: get("--fg", FALLBACK.fg),
      fgDim: get("--fg-dim", FALLBACK.fgDim),
      line: get("--line", FALLBACK.line),
      accent: get("--accent", FALLBACK.accent),
    };
  } catch {
    return FALLBACK;
  }
}

// temperature → rgba string for the heat overlay
function tempColor(t: number, alpha: number): string {
  const x = Math.max(0, Math.min(1, (t - AMBIENT) / (95 - AMBIENT)));
  // blue(cool) → teal → amber → red(hot)
  let r: number, g: number, b: number;
  if (x < 0.5) {
    const k = x / 0.5;
    r = 40 + k * 180;
    g = 120 + k * 90;
    b = 200 - k * 120;
  } else {
    const k = (x - 0.5) / 0.5;
    r = 220 + k * 30;
    g = 210 - k * 170;
    b = 80 - k * 60;
  }
  const a = alpha * (0.12 + 0.55 * x);
  return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
}

function seed(eng: DataCenter) {
  // a small working pod, placed free, so players have a live example to learn from
  const put = (x: number, y: number, code: number) => {
    if (eng.inBounds(x, y)) eng.grid[eng.idx(x, y)] = code as number;
  };
  const cx = 3, cy = 4;
  put(cx, cy, CODE.power);
  put(cx + 1, cy, CODE.rack);
  put(cx + 2, cy, CODE.rack);
  put(cx + 1, cy + 1, CODE.cooler);
  put(cx + 2, cy + 1, CODE.cooler);
  put(cx + 3, cy, CODE.network);
}

function fmtMoney(n: number) {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  return (neg ? "-$" : "$") + v.toLocaleString("en-US");
}

export default function DataCenterSim() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<DataCenter | null>(null);

  const [tool, setTool] = useState<Tool>("rack");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [heat, setHeat] = useState(true);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: string }[]>([]);

  // live control mirror the rAF loop reads without re-subscribing
  const ctrl = useRef({ tool, paused, speed, heat });
  ctrl.current = { tool, paused, speed, heat };

  const reset = useCallback(() => {
    const eng = new DataCenter();
    seed(eng);
    engRef.current = eng;
    setHud(eng.hud());
  }, []);

  useEffect(() => {
    if (!engRef.current) reset();
  }, [reset]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!engRef.current) reset();
    const eng = engRef.current!;

    let palette = readPalette(wrap);
    let cell = 40;
    let cssW = 0;
    let cssH = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const hover = { x: -1, y: -1, on: false };
    let painting = false;
    let paintErase = false;

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      cell = Math.max(20, Math.floor(rect.width / eng.w));
      cssW = cell * eng.w;
      cssH = cell * eng.h;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      palette = readPalette(wrap);
    };
    sizeCanvas();

    const ro = new ResizeObserver(sizeCanvas);
    ro.observe(canvas);

    const cellFromEvent = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (rect.width / eng.w));
      const y = Math.floor((e.clientY - rect.top) / (rect.height / eng.h));
      return { x, y };
    };

    const apply = (x: number, y: number, erase: boolean) => {
      if (!eng.inBounds(x, y)) return;
      if (erase || ctrl.current.tool === "bulldoze") {
        eng.remove(x, y);
      } else {
        eng.place(x, y, ctrl.current.tool as BuildingType);
      }
      setHud(eng.hud());
    };

    const onDown = (e: PointerEvent) => {
      const { x, y } = cellFromEvent(e);
      hover.x = x; hover.y = y; hover.on = true;
      painting = true;
      paintErase = e.button === 2;
      canvas.setPointerCapture(e.pointerId);
      apply(x, y, paintErase);
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = cellFromEvent(e);
      const moved = x !== hover.x || y !== hover.y;
      hover.x = x; hover.y = y; hover.on = true;
      if (painting && moved) apply(x, y, paintErase);
    };
    const onUp = (e: PointerEvent) => {
      painting = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    };
    const onLeave = () => { hover.on = false; };
    const onCtx = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("contextmenu", onCtx);

    // ---- render ----
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const drawBuilding = (gx: number, gy: number, type: BuildingType, i: number, time: number) => {
      const px = gx * cell;
      const py = gy * cell;
      const pad = Math.max(3, cell * 0.12);
      const x = px + pad, y = py + pad, w = cell - pad * 2, h = cell - pad * 2;
      const color = TYPE_COLOR[type];
      const dead = type === "rack" && !!eng.dead[i];

      ctx.save();
      // body
      roundRect(x, y, w, h, Math.max(3, cell * 0.12));
      ctx.fillStyle = dead ? "#241010" : "#1d1a15";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = dead ? "rgba(230,80,70,0.8)" : "rgba(255,255,255,0.10)";
      ctx.stroke();

      const cx = x + w / 2;
      const cy = y + h / 2;

      if (type === "rack") {
        // stacked server slots with blinking LEDs
        const rows = 4;
        const gap = h / (rows + 1);
        for (let r = 0; r < rows; r++) {
          const ly = y + gap * (r + 1);
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
          ctx.beginPath();
          ctx.moveTo(x + w * 0.16, ly);
          ctx.lineTo(x + w * 0.84, ly);
          ctx.stroke();
          if (!dead) {
            const blink = (Math.sin(time * 3 + i * 1.7 + r) + 1) / 2;
            ctx.fillStyle = `rgba(${color === TYPE_COLOR.rack ? "120,225,160" : "120,225,160"},${0.35 + blink * 0.6})`;
            ctx.beginPath();
            ctx.arc(x + w * 0.22, ly, Math.max(1, cell * 0.035), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // damage bar
        const dmg = eng.dmg[i];
        if (dmg > 0 && !dead) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(x, y + h - 4, w, 4);
          ctx.fillStyle = `rgba(${230},${90 + (1 - dmg / 100) * 120},60,0.95)`;
          ctx.fillRect(x, y + h - 4, w * (dmg / 100), 4);
        }
        if (dead) {
          const blink = (Math.sin(time * 6) + 1) / 2;
          ctx.strokeStyle = `rgba(235,70,60,${0.5 + blink * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + w * 0.3, y + h * 0.3);
          ctx.lineTo(x + w * 0.7, y + h * 0.7);
          ctx.moveTo(x + w * 0.7, y + h * 0.3);
          ctx.lineTo(x + w * 0.3, y + h * 0.7);
          ctx.stroke();
        }
      } else if (type === "cooler") {
        // rotating fan
        ctx.translate(cx, cy);
        ctx.rotate(time * 2 + i);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1.4, cell * 0.05);
        const rad = Math.min(w, h) * 0.32;
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(rad, rad * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.4, cell * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else if (type === "power") {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4 + i);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.45 + pulse * 0.5;
        ctx.font = `${Math.floor(cell * 0.42)}px var(--font-mono, monospace)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚡", cx, cy + cell * 0.02);
        ctx.globalAlpha = 1;
      } else if (type === "network") {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        const pulse = (time * 0.6 + i * 0.3) % 1;
        ctx.lineWidth = Math.max(1.2, cell * 0.04);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, cy);
        ctx.lineTo(x + w * 0.8, cy);
        ctx.stroke();
        const dx = x + w * 0.2 + (w * 0.6) * pulse;
        ctx.beginPath();
        ctx.arc(dx, cy, Math.max(1.5, cell * 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.26, Math.max(1.2, cell * 0.05), 0, Math.PI * 2);
        ctx.arc(x + w * 0.5, y + h * 0.74, Math.max(1.2, cell * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const draw = (time: number) => {
      const cur = ctrl.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // floor tiles
      for (let y = 0; y < eng.h; y++) {
        for (let x = 0; x < eng.w; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? palette.bgTile : palette.bgTileAlt;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      // heat overlay
      if (cur.heat) {
        for (let i = 0; i < eng.n; i++) {
          const gx = i % eng.w;
          const gy = (i / eng.w) | 0;
          ctx.fillStyle = tempColor(eng.temp[i], 1);
          ctx.fillRect(gx * cell, gy * cell, cell, cell);
        }
      }
      // grid lines
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= eng.w; x++) {
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, cssH);
      }
      for (let y = 0; y <= eng.h; y++) {
        ctx.moveTo(0, y * cell + 0.5);
        ctx.lineTo(cssW, y * cell + 0.5);
      }
      ctx.stroke();

      // buildings
      for (let i = 0; i < eng.n; i++) {
        const t = eng.typeAt(i);
        if (!t) continue;
        drawBuilding(i % eng.w, (i / eng.w) | 0, t, i, time);
      }

      // hover ghost
      if (hover.on && eng.inBounds(hover.x, hover.y)) {
        const px = hover.x * cell;
        const py = hover.y * cell;
        const i = eng.idx(hover.x, hover.y);
        const occupied = eng.grid[i] !== CODE.empty;
        const erasing = cur.tool === "bulldoze";
        let ok: boolean;
        let glow: string;
        if (erasing) {
          ok = occupied;
          glow = occupied ? "rgba(235,90,80,0.9)" : "rgba(160,160,160,0.4)";
        } else {
          const spec = SPECS[cur.tool as BuildingType];
          ok = !occupied && eng.money >= spec.cost;
          glow = ok ? "rgba(120,225,170,0.9)" : "rgba(235,90,80,0.85)";
        }
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
        if (!erasing && ok) {
          ctx.fillStyle = "rgba(120,225,170,0.10)";
          ctx.fillRect(px, py, cell, cell);
        }
      }
    };

    // ---- main loop ----
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const loop = (ts: number) => {
      const cur = ctrl.current;
      let dtReal = (ts - last) / 1000;
      last = ts;
      if (dtReal > 0.1) dtReal = 0.1;

      if (!cur.paused) {
        const hours = dtReal * SIM_HOURS_PER_SEC * cur.speed;
        eng.step(hours);
      }

      draw(ts / 1000);

      // throttle HUD + toast updates
      hudAcc += dtReal;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setHud(eng.hud());
        const fresh = eng.drainToasts();
        if (fresh.length) {
          setToasts((prev) => {
            const next = [...prev, ...fresh.map((t) => ({ id: t.id, text: t.text, kind: t.kind }))];
            return next.slice(-4);
          });
          for (const t of fresh) {
            const id = t.id;
            window.setTimeout(() => {
              setToasts((prev) => prev.filter((x) => x.id !== id));
            }, 4200);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("contextmenu", onCtx);
    };
  }, [reset]);

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
          Lay out racks, cooling, power and networking on the floor. Compute earns money,
          but racks run hot — heat spreads tile to tile, so keep coolers close or watch
          your servers throttle and fail. Bank{" "}
          <strong>{hud ? fmtMoney(hud.goal) : "$120,000"}</strong> to win.
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
          <div className={s.stat}>
            <span className={s.statLabel}>Day</span>
            <span className={s.statVal}>{hud?.day ?? 1}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>Racks</span>
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
                <span className={s.toolName}>{spec.short}</span>
                <span className={`${s.toolCost} ${afford ? "" : s.cant}`}>${spec.cost.toLocaleString()}</span>
              </button>
            );
          })}
          <button
            className={`${s.tool} ${s.bulldoze} ${tool === "bulldoze" ? s.active : ""}`}
            onClick={() => setTool("bulldoze")}
            title="Remove a building (55% refund). Right-click also removes."
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
          <button className={s.btn} onClick={reset}>↺ Reset</button>
        </div>
      </div>

      {/* stage */}
      <div className={s.stage}>
        <canvas ref={canvasRef} className={s.canvas} />
        <div className={s.toasts}>
          {toasts.map((t) => (
            <div key={t.id} className={`${s.toast} ${s[t.kind] ?? ""}`}>{t.text}</div>
          ))}
        </div>
      </div>

      <p className={s.legend}>
        Click or drag to place the selected tool · right-click or Bulldoze to remove ·
        the heatmap shows how heat diffuses across the floor. Hot racks throttle compute,
        and racks that stay above ~78°C take damage and eventually fail.
      </p>
    </div>
  );
}

function Gauge({
  label,
  value,
  pct,
  warn,
}: {
  label: string;
  value: string;
  pct: number;
  warn?: boolean;
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
            background: warn ? "#e6705a" : p > 0.85 ? "#e6b15a" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
