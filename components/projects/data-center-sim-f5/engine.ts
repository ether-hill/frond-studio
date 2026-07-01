// Data Center Sim F5 — pure simulation engine (no React, no DOM).
//
// A from-scratch rebuild of the data-center management sim. The identity of
// this version is the *energy day*: everything cycles with the clock. Solar
// arrays only produce in daylight, grid power is expensive at the evening peak
// and dirtier at night, batteries shift clean energy into the dark hours, and
// the desert ambient swings from cold nights to hot afternoons so cooling load
// breathes with the sun. Customers pay a premium for clean compute, so the
// strategic question is not just "how big" but "powered by what, and when".
//
// Heat is a diffusing field over the tile grid — placement matters. Halls far
// from chillers cook, throttle and eventually fail.
//
// The view drives this: call step(dt) with dt in sim-hours, then read hud().

export type BuildingType =
  | "hall"
  | "chiller"
  | "substation"
  | "solar"
  | "battery"
  | "uplink";
export type Tool = BuildingType | "bulldoze";

export const CODE = {
  empty: 0,
  hall: 1,
  chiller: 2,
  substation: 3,
  solar: 4,
  battery: 5,
  uplink: 6,
} as const;

const TYPE_BY_CODE: Record<number, BuildingType | null> = {
  0: null,
  1: "hall",
  2: "chiller",
  3: "substation",
  4: "solar",
  5: "battery",
  6: "uplink",
};
const CODE_BY_TYPE: Record<BuildingType, number> = {
  hall: 1,
  chiller: 2,
  substation: 3,
  solar: 4,
  battery: 5,
  uplink: 6,
};

export type Spec = {
  type: BuildingType;
  name: string;
  short: string;
  cost: number;
  /** $ per sim-hour */
  upkeep: number;
  /** kW drawn */
  power: number;
  /** heat injected per hour at the tile */
  heat: number;
  /** heat removed per hour at the tile (chiller) */
  cooling: number;
  /** compute units at full efficiency (hall) */
  compute: number;
  /** bandwidth units (uplink) */
  bandwidth: number;
  /** kW grid import capacity (substation) */
  gridCap: number;
  /** kW at solar noon (solar) */
  solarPeak: number;
  /** kWh stored (battery) */
  battCap: number;
  /** kW max charge/discharge (battery) */
  battRate: number;
  /** relative acoustic power the unit emits (drives the noise model) */
  noise: number;
  key: string;
  blurb: string;
};

export const SPECS: Record<BuildingType, Spec> = {
  hall: {
    type: "hall",
    name: "Server Hall",
    short: "Hall",
    cost: 2400,
    upkeep: 6,
    power: 8,
    heat: 38,
    cooling: 0,
    compute: 14,
    bandwidth: 0,
    gridCap: 0,
    solarPeak: 0,
    battCap: 0,
    battRate: 0,
    noise: 3,
    key: "1",
    blurb: "Produces compute. Runs hot and draws power — keep chillers close.",
  },
  chiller: {
    type: "chiller",
    name: "Chiller Plant",
    short: "Chiller",
    cost: 1800,
    upkeep: 4,
    power: 6,
    heat: 0,
    cooling: 48,
    compute: 0,
    bandwidth: 0,
    gridCap: 0,
    solarPeak: 0,
    battCap: 0,
    battRate: 0,
    noise: 9,
    key: "2",
    blurb: "Pulls heat out of nearby tiles. Draws power — the desert afternoon works it hard.",
  },
  substation: {
    type: "substation",
    name: "Grid Substation",
    short: "Grid",
    cost: 2600,
    upkeep: 5,
    power: 0,
    heat: 3,
    cooling: 0,
    compute: 0,
    bandwidth: 0,
    gridCap: 40,
    solarPeak: 0,
    battCap: 0,
    battRate: 0,
    noise: 4,
    key: "3",
    blurb: "Imports up to 40 kW from the grid. Energy is priciest at the evening peak, dirtiest at night.",
  },
  solar: {
    type: "solar",
    name: "Solar Array",
    short: "Solar",
    cost: 2000,
    upkeep: 1,
    power: 0,
    heat: 0,
    cooling: 0,
    compute: 0,
    bandwidth: 0,
    gridCap: 0,
    solarPeak: 16,
    battCap: 0,
    battRate: 0,
    noise: 0,
    key: "4",
    blurb: "Free clean power — but only while the sun is up. Peaks 16 kW at solar noon.",
  },
  battery: {
    type: "battery",
    name: "Battery Bank",
    short: "Battery",
    cost: 2200,
    upkeep: 2,
    power: 0,
    heat: 1,
    cooling: 0,
    compute: 0,
    bandwidth: 0,
    gridCap: 0,
    solarPeak: 0,
    battCap: 60,
    battRate: 15,
    noise: 1,
    key: "5",
    blurb: "Banks surplus solar by day, discharges it after dark. 60 kWh per bank.",
  },
  uplink: {
    type: "uplink",
    name: "Fiber Uplink",
    short: "Uplink",
    cost: 1500,
    upkeep: 3,
    power: 2,
    heat: 0,
    cooling: 0,
    compute: 0,
    bandwidth: 32,
    gridCap: 0,
    solarPeak: 0,
    battCap: 0,
    battRate: 0,
    noise: 1,
    key: "6",
    blurb: "Turns compute into sellable bandwidth. Needs power.",
  },
};

// ---- tuning ----
const START_MONEY = 30000;
const GOAL = 150000;
const PRICE = 2.2; // $ per served unit per hour, before bonuses
const CLEAN_BONUS = 0.4; // up to +40% price when fully clean-powered
const CRITICAL_TEMP = 76; // halls take damage above this
const SAFE_TEMP = 56; // halls repair below this
const THROTTLE_START = 32;
const THROTTLE_END = 66;
const BATT_EFF = 0.92; // round-trip-ish charge efficiency
const REFUND = 0.55;

/** Desert ambient °C by sim hour — cold nights, hot afternoons (peak ~15:00). */
export function ambientAt(time: number): number {
  const h = time % 24;
  return 17 + 9 * Math.sin(((h - 9) / 24) * Math.PI * 2);
}

/** Solar output factor 0..1 — daylight bell, sunrise 6:00, sunset 18:00. */
export function solarFactorAt(time: number): number {
  const h = time % 24;
  if (h <= 6 || h >= 18) return 0;
  const x = Math.sin(((h - 6) / 12) * Math.PI);
  return x * x; // squared → soft shoulders, strong noon
}

/** Grid energy price $/kWh — cheap overnight, spiking through the evening peak. */
export function gridPriceAt(time: number): number {
  const h = time % 24;
  const peak = Math.exp(-((h - 19) * (h - 19)) / 7); // gaussian around 19:00
  const night = h < 6 || h > 23 ? 0.7 : 1;
  return 0.1 * night * (1 + 1.6 * peak);
}

/** Grid carbon intensity kgCO2/kWh — solar-rich by day, gas-heavy at night. */
export function gridCarbonAt(time: number): number {
  return 0.55 - 0.3 * solarFactorAt(time);
}

const AMBIENT_NOISE = 32; // quiet desert night, dB(A)

export function sentimentLabel(s: number): string {
  if (s >= 80) return "Content";
  if (s >= 60) return "Uneasy";
  if (s >= 40) return "Concerned";
  if (s >= 20) return "Frustrated";
  return "Protesting";
}

export function repLabel(r: number): string {
  if (r >= 85) return "Trusted";
  if (r >= 65) return "Solid";
  if (r >= 45) return "Shaky";
  if (r >= 25) return "At risk";
  return "Churning";
}

export type Hud = {
  money: number;
  day: number;
  /** fractional sim hour 0..24, for the clock dial */
  hour: number;
  netPerHour: number;
  // power
  draw: number;
  solarKW: number;
  battKW: number; // + discharging, - charging
  gridKW: number;
  gridCapKW: number;
  powerRatio: number;
  battCharge: number;
  battCap: number;
  cleanFrac: number; // 0..1 of consumed power that was clean
  carbonPerDay: number; // kg CO2 / day at current draw
  gridPrice: number;
  // thermals
  ambient: number;
  avgTemp: number;
  maxTemp: number;
  cooling: number;
  heatLoad: number;
  // economy
  capacity: number;
  bandwidth: number;
  demand: number;
  served: number;
  reputation: number;
  repLabel: string;
  /** perceived noise at the fence line, dB(A) */
  noise: number;
  /** community sentiment 0..100 (100 = content) */
  sentiment: number;
  sentimentLabel: string;
  halls: number;
  dead: number;
  buildings: number;
  goal: number;
  won: boolean;
};

export type Toast = { id: number; text: string; kind: "warn" | "bad" | "good" };

export class DataCenterF5 {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  grid: Int8Array;
  temp: Float32Array;
  dmg: Float32Array; // 0..100 per hall tile
  dead: Uint8Array;
  private scratch: Float32Array;

  money = START_MONEY;
  time = 6.5; // start just after dawn
  netPerHour = 0;
  won = false;
  reputation = 78;
  battCharge = 0;

  // noise & community (public so the renderer can read them each frame)
  noise = AMBIENT_NOISE; // dB(A) at the fence line
  sentiment = 100; // 0..100
  private lastSentBand = 5;

  toasts: Toast[] = [];
  private toastId = 1;
  private lastBrownout = -100;
  private lastOverheat = -100;
  private lastPeakNote = -100;
  private warnedDead = new Set<number>();

  // cached readouts (filled each step)
  private _draw = 0;
  private _solarKW = 0;
  private _battKW = 0;
  private _gridKW = 0;
  private _gridCapKW = 0;
  private _powerRatio = 1;
  private _battCap = 0;
  private _cleanFrac = 1;
  private _carbonPerDay = 0;
  private _cooling = 0;
  private _heatLoad = 0;
  private _capacity = 0;
  private _bandwidth = 0;
  private _demand = 24;
  private _served = 0;
  private _halls = 0;
  private _dead = 0;
  private _buildings = 0;
  private _avgTemp = ambientAt(6.5);
  private _maxTemp = ambientAt(6.5);

  constructor(w = 14, h = 9) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    this.grid = new Int8Array(this.n);
    this.temp = new Float32Array(this.n).fill(ambientAt(this.time));
    this.dmg = new Float32Array(this.n);
    this.dead = new Uint8Array(this.n);
    this.scratch = new Float32Array(this.n);
  }

  idx(x: number, y: number) {
    return y * this.w + x;
  }
  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  typeAt(i: number): BuildingType | null {
    return TYPE_BY_CODE[this.grid[i]];
  }

  private toast(text: string, kind: Toast["kind"]) {
    this.toasts.push({ id: this.toastId++, text, kind });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  place(x: number, y: number, type: BuildingType): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    if (this.grid[i] !== CODE.empty) return false;
    const spec = SPECS[type];
    if (this.money < spec.cost) {
      this.toast(`Not enough money for ${spec.name}`, "warn");
      return false;
    }
    this.money -= spec.cost;
    this.grid[i] = CODE_BY_TYPE[type];
    this.dmg[i] = 0;
    this.dead[i] = 0;
    return true;
  }

  remove(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    const t = this.typeAt(i);
    if (!t) return false;
    const refund = this.dead[i] ? 0 : Math.round(SPECS[t].cost * REFUND);
    // batteries walk away with their charge
    if (t === "battery") {
      this.battCharge = Math.max(0, this.battCharge - SPECS.battery.battCap);
    }
    this.money += refund;
    this.grid[i] = CODE.empty;
    this.dmg[i] = 0;
    this.dead[i] = 0;
    this.warnedDead.delete(i);
    return true;
  }

  /** Evening-peaked internet demand, growing day over day. Deterministic. */
  private demandAt(time: number) {
    const day = time / 24;
    const base = 24 + day * 12;
    const h = time % 24;
    // peak ~20:00, trough ~05:00
    const cycle = 0.72 + 0.28 * Math.sin(((h - 14) / 24) * Math.PI * 2);
    const wobble = 1 + 0.05 * Math.sin(time * 0.61) + 0.04 * Math.sin(time * 0.19);
    const rep = 0.75 + 0.25 * (this.reputation / 100); // a shaky operator books less
    return base * cycle * wobble * rep;
  }

  private tempEfficiency(t: number) {
    if (t <= THROTTLE_START) return 1;
    if (t >= THROTTLE_END) return 0;
    return 1 - (t - THROTTLE_START) / (THROTTLE_END - THROTTLE_START);
  }

  /** Advance the heat field in fixed substeps; ambient tracks the desert day.
   * All rates are per sim-hour and scaled by the substep, so the equilibrium
   * temperature is independent of frame rate and game speed. */
  private stepHeat(dt: number) {
    const { w, h, n, grid, temp, scratch } = this;
    const ambient = ambientAt(this.time);
    const MAX_SUB = 0.1; // hours — keeps DIFF*sub well under stability limit
    const subs = Math.min(12, Math.max(1, Math.ceil(dt / MAX_SUB)));
    const sub = dt / subs;
    const DIFF = 2.8; // per hour toward the 4-neighbour average
    const RELAX = 0.25; // per hour toward ambient

    let cooling = 0;
    let heatLoad = 0;
    for (let i = 0; i < n; i++) {
      const t = grid[i];
      if (t === CODE.hall && !this.dead[i]) heatLoad += SPECS.hall.heat;
      else if (t === CODE.substation) heatLoad += SPECS.substation.heat;
      else if (t === CODE.battery) heatLoad += SPECS.battery.heat;
      else if (t === CODE.chiller) cooling += SPECS.chiller.cooling;
    }
    this._cooling = cooling;
    this._heatLoad = heatLoad;

    for (let s = 0; s < subs; s++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          let sum = 0;
          let cnt = 0;
          if (x > 0) { sum += temp[i - 1]; cnt++; }
          if (x < w - 1) { sum += temp[i + 1]; cnt++; }
          if (y > 0) { sum += temp[i - w]; cnt++; }
          if (y < h - 1) { sum += temp[i + w]; cnt++; }
          const avg = sum / cnt;
          scratch[i] = temp[i] + (DIFF * (avg - temp[i]) + RELAX * (ambient - temp[i])) * sub;
        }
      }
      for (let i = 0; i < n; i++) {
        const t = grid[i];
        if (t === CODE.hall) {
          if (!this.dead[i]) scratch[i] += SPECS.hall.heat * sub;
        } else if (t === CODE.substation) {
          scratch[i] += SPECS.substation.heat * sub;
        } else if (t === CODE.battery) {
          scratch[i] += SPECS.battery.heat * sub;
        } else if (t === CODE.chiller) {
          const pull = SPECS.chiller.cooling * sub;
          scratch[i] -= pull * 0.48;
          const x = i % w, y = (i / w) | 0;
          if (x > 0) scratch[i - 1] -= pull * 0.13;
          if (x < w - 1) scratch[i + 1] -= pull * 0.13;
          if (y > 0) scratch[i - w] -= pull * 0.13;
          if (y < h - 1) scratch[i + w] -= pull * 0.13;
        }
      }
      for (let i = 0; i < n; i++) {
        let v = scratch[i];
        if (v < ambient - 8) v = ambient - 8;
        if (v > 140) v = 140;
        temp[i] = v;
      }
    }
  }

  step(dt: number) {
    if (dt <= 0) return;
    this.time += dt;

    this.stepHeat(dt);

    // ---- census ----
    let draw = 0;
    let gridCap = 0;
    let solarPeak = 0;
    let battCap = 0;
    let battRate = 0;
    let bandwidth = 0;
    let halls = 0;
    let dead = 0;
    let buildings = 0;
    let noisePow = 0;
    const { n, grid } = this;
    for (let i = 0; i < n; i++) {
      const t = grid[i];
      if (t === CODE.empty) continue;
      buildings++;
      if (t === CODE.hall) {
        halls++;
        if (this.dead[i]) { dead++; continue; } // dead halls are silent
        draw += SPECS.hall.power;
        noisePow += SPECS.hall.noise;
      } else if (t === CODE.chiller) {
        draw += SPECS.chiller.power;
        noisePow += SPECS.chiller.noise;
      } else if (t === CODE.substation) {
        gridCap += SPECS.substation.gridCap;
        noisePow += SPECS.substation.noise;
      } else if (t === CODE.solar) {
        solarPeak += SPECS.solar.solarPeak;
      } else if (t === CODE.battery) {
        battCap += SPECS.battery.battCap;
        battRate += SPECS.battery.battRate;
        noisePow += SPECS.battery.noise;
      } else if (t === CODE.uplink) {
        draw += SPECS.uplink.power;
        bandwidth += SPECS.uplink.bandwidth;
        noisePow += SPECS.uplink.noise;
      }
    }
    this.battCharge = Math.min(this.battCharge, battCap);

    // ---- dispatch: solar → battery → grid ----
    const solarAvail = solarPeak * solarFactorAt(this.time);
    const solarUsed = Math.min(draw, solarAvail);
    let remaining = draw - solarUsed;

    const battAvail = Math.min(battRate, this.battCharge / Math.max(dt, 1e-6));
    const battUsed = Math.min(remaining, battAvail);
    this.battCharge = Math.max(0, this.battCharge - battUsed * dt);
    remaining -= battUsed;

    const gridUsed = Math.min(remaining, gridCap);
    remaining -= gridUsed;

    // surplus solar charges batteries
    const surplus = solarAvail - solarUsed;
    let battIn = 0;
    if (surplus > 0 && battCap > 0 && this.battCharge < battCap) {
      battIn = Math.min(surplus, battRate, (battCap - this.battCharge) / Math.max(dt, 1e-6));
      this.battCharge = Math.min(battCap, this.battCharge + battIn * dt * BATT_EFF);
    }

    const supplied = solarUsed + battUsed + gridUsed;
    const powerRatio = draw > 0 ? Math.min(1, supplied / draw) : 1;
    const cleanFrac = supplied > 0 ? (solarUsed + battUsed) / supplied : 1;

    const gridPrice = gridPriceAt(this.time);
    const energyCost = gridUsed * gridPrice; // $/hour
    const carbonPerDay = gridUsed * gridCarbonAt(this.time) * 24; // kg/day at current mix

    // ---- compute capacity after throttle + power ----
    let capacity = 0;
    let tempSum = 0;
    let maxTemp = -100;
    for (let i = 0; i < n; i++) {
      const tv = this.temp[i];
      tempSum += tv;
      if (tv > maxTemp) maxTemp = tv;
      if (grid[i] === CODE.hall && !this.dead[i]) {
        capacity += SPECS.hall.compute * this.tempEfficiency(tv) * powerRatio;
      }
    }
    bandwidth *= powerRatio;

    // ---- hall damage from sustained heat ----
    for (let i = 0; i < n; i++) {
      if (grid[i] !== CODE.hall || this.dead[i]) continue;
      const tv = this.temp[i];
      if (tv > CRITICAL_TEMP) {
        this.dmg[i] += (tv - CRITICAL_TEMP) * 0.9 * dt;
        if (this.dmg[i] >= 100) {
          this.dmg[i] = 100;
          this.dead[i] = 1;
          if (!this.warnedDead.has(i)) {
            this.warnedDead.add(i);
            this.toast("A hall overheated and failed — bulldoze it", "bad");
          }
        }
      } else if (tv < SAFE_TEMP) {
        this.dmg[i] = Math.max(0, this.dmg[i] - 6 * dt);
      }
    }

    // ---- demand, revenue, reputation ----
    const demand = this.demandAt(this.time);
    const served = Math.min(capacity, bandwidth, demand);
    let upkeep = 0;
    for (let i = 0; i < n; i++) {
      const ty = this.typeAt(i);
      if (ty && !(ty === "hall" && this.dead[i])) upkeep += SPECS[ty].upkeep;
    }
    const priceNow = PRICE * (1 + CLEAN_BONUS * cleanFrac);
    const revPerHour = served * priceNow;
    this.netPerHour = revPerHour - upkeep - energyCost;
    this.money += this.netPerHour * dt;

    // reputation chases service quality over ~a day
    const quality = demand > 0 ? served / demand : 1;
    const repTarget = Math.max(0, Math.min(100, 100 * Math.pow(quality, 1.6) - dead * 6));
    this.reputation += (repTarget - this.reputation) * Math.min(1, dt * 0.35);

    // ---- noise & community sentiment ----
    // Acoustic power adds up across equipment (chillers dominate); perceived
    // level climbs steeply as the site grows. Desert-night baseline ~32 dB(A).
    this.noise = noisePow <= 0 ? AMBIENT_NOISE : Math.min(108, AMBIENT_NOISE + 1.7 * Math.pow(noisePow, 0.72));

    // Residents are content up to ~44 dB(A), outraged by ~86; the grid-smog
    // haze and failed halls upset them too.
    const deadPenalty = Math.min(25, dead * 8);
    const smogPenalty = Math.min(45, carbonPerDay * 0.06);
    let sentTarget = 100 * Math.max(0, Math.min(1, (86 - this.noise) / (86 - 44))) - deadPenalty - smogPenalty;
    sentTarget = Math.max(0, Math.min(100, sentTarget));
    // sentiment drifts toward the target over a couple of days, not instantly
    this.sentiment += (sentTarget - this.sentiment) * Math.min(1, dt * 0.5);

    const band = this.sentiment >= 80 ? 5 : this.sentiment >= 60 ? 4 : this.sentiment >= 40 ? 3 : this.sentiment >= 20 ? 2 : 1;
    if (band < this.lastSentBand) {
      const msg =
        band === 4 ? "Neighbours are starting to notice the noise." :
        band === 3 ? "Residents are complaining about the noise and haze." :
        band === 2 ? "The community is protesting the data center." :
        "Outrage — the town wants the data center gone.";
      this.toast(msg, band <= 2 ? "bad" : "warn");
    }
    this.lastSentBand = band;

    // ---- toasts ----
    if (powerRatio < 0.999 && draw > 0 && this.time - this.lastBrownout > 6) {
      this.lastBrownout = this.time;
      this.toast(
        solarPeak > 0 && solarFactorAt(this.time) === 0
          ? "Brownout after dark — add grid, or batteries to bank the sun."
          : "Brownout — not enough power on site.",
        "bad"
      );
    }
    if (maxTemp > 68 && this.time - this.lastOverheat > 8) {
      this.lastOverheat = this.time;
      this.toast("A hotspot is cooking — add chillers nearby.", "warn");
    }
    const h24 = this.time % 24;
    if (h24 > 17.5 && h24 < 18.5 && gridUsed > 0.5 && this.time - this.lastPeakNote > 20) {
      this.lastPeakNote = this.time;
      this.toast("Evening peak — grid power is at its priciest.", "warn");
    }
    if (!this.won && this.money >= GOAL) {
      this.won = true;
      this.toast(`Goal reached — $${(GOAL / 1000) | 0}k banked!`, "good");
    }

    // cache readouts
    this._draw = draw;
    this._solarKW = solarUsed;
    this._battKW = battUsed - battIn;
    this._gridKW = gridUsed;
    this._gridCapKW = gridCap;
    this._powerRatio = powerRatio;
    this._battCap = battCap;
    this._cleanFrac = cleanFrac;
    this._carbonPerDay = carbonPerDay;
    this._capacity = capacity;
    this._bandwidth = bandwidth;
    this._demand = demand;
    this._served = served;
    this._halls = halls;
    this._dead = dead;
    this._buildings = buildings;
    this._avgTemp = tempSum / n;
    this._maxTemp = maxTemp;
  }

  hud(): Hud {
    return {
      money: this.money,
      day: Math.floor(this.time / 24) + 1,
      hour: this.time % 24,
      netPerHour: this.netPerHour,
      draw: this._draw,
      solarKW: this._solarKW,
      battKW: this._battKW,
      gridKW: this._gridKW,
      gridCapKW: this._gridCapKW,
      powerRatio: this._powerRatio,
      battCharge: this.battCharge,
      battCap: this._battCap,
      cleanFrac: this._cleanFrac,
      carbonPerDay: this._carbonPerDay,
      gridPrice: gridPriceAt(this.time),
      ambient: ambientAt(this.time),
      avgTemp: this._avgTemp,
      maxTemp: this._maxTemp,
      cooling: this._cooling,
      heatLoad: this._heatLoad,
      capacity: this._capacity,
      bandwidth: this._bandwidth,
      demand: this._demand,
      served: this._served,
      reputation: this.reputation,
      repLabel: repLabel(this.reputation),
      noise: this.noise,
      sentiment: this.sentiment,
      sentimentLabel: sentimentLabel(this.sentiment),
      halls: this._halls,
      dead: this._dead,
      buildings: this._buildings,
      goal: GOAL,
      won: this.won,
    };
  }

  drainToasts(): Toast[] {
    if (this.toasts.length === 0) return [];
    const out = this.toasts;
    this.toasts = [];
    return out;
  }
}

export const GOAL_MONEY = GOAL;
export const START = START_MONEY;
