// Data Center Sim — pure simulation engine (no React, no DOM).
//
// A tile grid you fill with four kinds of equipment. Racks produce compute but
// run hot and draw power; coolers pull heat out of the room; power units feed
// the whole floor; network pods turn compute into sellable bandwidth. Heat is a
// real diffusing field over the grid, so *where* you place things matters: a
// rack far from a cooler cooks itself, throttles, and eventually fails.
//
// The component drives this: call step(dt) each frame, read the public fields to
// render and to fill the HUD.

export type BuildingType = "rack" | "cooler" | "power" | "network";
export type Tool = BuildingType | "bulldoze";

export const CODE = { empty: 0, rack: 1, cooler: 2, power: 3, network: 4 } as const;
const TYPE_BY_CODE: Record<number, BuildingType | null> = {
  0: null,
  1: "rack",
  2: "cooler",
  3: "power",
  4: "network",
};
const CODE_BY_TYPE: Record<BuildingType, number> = {
  rack: 1,
  cooler: 2,
  power: 3,
  network: 4,
};

export type Spec = {
  type: BuildingType;
  name: string;
  short: string;
  cost: number;
  /** per-hour upkeep */
  upkeep: number;
  /** kW drawn (rack/cooler/network) */
  power: number;
  /** kW supplied (power unit) */
  supply: number;
  /** heat injected per hour at the tile (rack/power) */
  heat: number;
  /** heat removed per hour at the tile (cooler) */
  cooling: number;
  /** compute units produced at full efficiency (rack) */
  compute: number;
  /** bandwidth units provided (network) */
  bandwidth: number;
  /** relative acoustic power the unit emits (drives the noise model) */
  noise: number;
  /** methane / greenhouse emissions the unit leaks (gas turbines only) */
  methane: number;
  glyph: string;
  blurb: string;
};

export const SPECS: Record<BuildingType, Spec> = {
  rack: {
    type: "rack",
    name: "Server Rack",
    short: "Rack",
    cost: 2000,
    upkeep: 5,
    power: 6,
    supply: 0,
    heat: 20,
    cooling: 0,
    compute: 12,
    bandwidth: 0,
    noise: 3,
    methane: 0,
    glyph: "▤",
    blurb: "Produces compute. Runs hot and draws power — keep coolers close.",
  },
  cooler: {
    type: "cooler",
    name: "CRAC Cooler",
    short: "Cooler",
    cost: 1600,
    upkeep: 4,
    power: 5,
    supply: 0,
    heat: 0,
    cooling: 40,
    compute: 0,
    bandwidth: 0,
    noise: 9,
    methane: 0,
    glyph: "❄",
    blurb: "Pulls heat out of nearby tiles. Costs power — don't over-build.",
  },
  power: {
    type: "power",
    name: "Gas Turbine",
    short: "Gas",
    cost: 3200,
    upkeep: 8,
    power: 0,
    supply: 42,
    heat: 5,
    cooling: 0,
    compute: 0,
    bandwidth: 0,
    noise: 6,
    methane: 12,
    glyph: "⛽",
    blurb: "Burns natural gas for power — cheap and reliable, but loud and it leaks methane that smogs the town.",
  },
  network: {
    type: "network",
    name: "Network Pod",
    short: "Network",
    cost: 1400,
    upkeep: 3,
    power: 2,
    supply: 0,
    heat: 0,
    cooling: 0,
    compute: 0,
    bandwidth: 30,
    noise: 1,
    methane: 0,
    glyph: "⇄",
    blurb: "Turns compute into bandwidth you can actually sell. Needs power.",
  },
};

export const AMBIENT = 21;
const CRITICAL_TEMP = 78; // racks start taking damage above this
const SAFE_TEMP = 58; // racks recover damage below this
const THROTTLE_START = 30; // efficiency starts dropping here
const THROTTLE_END = 64; // efficiency hits zero here
const PRICE = 1.95; // $ per served unit per hour
const START_MONEY = 26000;
const GOAL = 120000; // bank this much to "win"

export type Hud = {
  money: number;
  day: number;
  hour: number;
  netPerHour: number;
  powerDraw: number;
  powerSupply: number;
  powerRatio: number;
  cooling: number;
  heatLoad: number;
  avgTemp: number;
  maxTemp: number;
  capacity: number; // effective compute after throttle/power
  bandwidth: number;
  demand: number;
  served: number;
  racks: number;
  dead: number;
  buildings: number;
  /** perceived noise at the fence line, in dB(A) */
  noise: number;
  /** methane / GHG emissions, tonnes CO2e per day */
  methane: number;
  /** community sentiment 0..100 (100 = content) */
  sentiment: number;
  sentimentLabel: string;
  goal: number;
  won: boolean;
};

const AMBIENT_NOISE = 34; // quiet rural night, dB(A)
export function sentimentLabel(s: number): string {
  if (s >= 80) return "Content";
  if (s >= 60) return "Uneasy";
  if (s >= 40) return "Concerned";
  if (s >= 20) return "Frustrated";
  return "Protesting";
}

export type Toast = { id: number; text: string; kind: "warn" | "bad" | "good" };

export class DataCenter {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  grid: Int8Array;
  temp: Float32Array;
  dmg: Float32Array; // 0..100 per rack tile
  dead: Uint8Array; // rack failed
  private scratch: Float32Array;

  money = START_MONEY;
  time = 0; // hours
  netPerHour = 0;
  won = false;

  // noise, emissions & community (public so the renderer can read them each frame)
  noise = AMBIENT_NOISE; // dB(A) at the fence line
  methane = 0; // tonnes CO2e / day from gas turbines
  sentiment = 100; // 0..100, community sentiment
  private lastSentBand = 5;

  // cached economy readouts (filled each step)
  private _powerDraw = 0;
  private _powerSupply = 0;
  private _powerRatio = 1;
  private _cooling = 0;
  private _heatLoad = 0;
  private _capacity = 0;
  private _bandwidth = 0;
  private _demand = 30;
  private _served = 0;
  private _racks = 0;
  private _dead = 0;
  private _buildings = 0;

  toasts: Toast[] = [];
  private toastId = 1;
  private lastBrownout = -100;
  private lastOverheat = -100;
  private warnedDead = new Set<number>();

  constructor(w = 18, h = 11) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    this.grid = new Int8Array(this.n);
    this.temp = new Float32Array(this.n).fill(AMBIENT);
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

  /** Attempt to place a building. Returns true on success. */
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

  /** Remove a building, refunding part of its cost. Returns true if something was removed. */
  remove(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    const t = this.typeAt(i);
    if (!t) return false;
    // Dead racks have no salvage; everything else refunds 55%.
    const refund = this.dead[i] ? 0 : Math.round(SPECS[t].cost * 0.55);
    this.money += refund;
    this.grid[i] = CODE.empty;
    this.dmg[i] = 0;
    this.dead[i] = 0;
    this.warnedDead.delete(i);
    return true;
  }

  private demandAt(time: number) {
    const day = time / 24;
    const base = 28 + day * 13;
    // daily cycle, peak around mid-afternoon
    const cycle = 0.78 + 0.22 * Math.sin(((time % 24) / 24) * Math.PI * 2 - Math.PI / 2);
    // gentle deterministic wobble (no Math.random so sim is reproducible)
    const wobble = 1 + 0.06 * Math.sin(time * 0.7) + 0.04 * Math.sin(time * 0.23);
    return base * cycle * wobble;
  }

  /** Effective compute multiplier for a tile temperature. */
  private tempEfficiency(t: number) {
    if (t <= THROTTLE_START) return 1;
    if (t >= THROTTLE_END) return 0;
    return 1 - (t - THROTTLE_START) / (THROTTLE_END - THROTTLE_START);
  }

  /** Advance the heat field. Runs in fixed substeps for stability regardless of dt. */
  private stepHeat(dt: number) {
    const { w, h, n, grid, temp, scratch } = this;
    const subs = Math.min(5, Math.max(1, Math.round(dt * 2)));
    const sub = dt / subs;
    const DIFF = 0.14;
    const RELAX = 0.007;

    let cooling = 0;
    let heatLoad = 0;
    for (let i = 0; i < n; i++) {
      const t = grid[i];
      if (t === CODE.rack && !this.dead[i]) heatLoad += SPECS.rack.heat;
      else if (t === CODE.power) heatLoad += SPECS.power.heat;
      else if (t === CODE.cooler) cooling += SPECS.cooler.cooling;
    }
    this._cooling = cooling;
    this._heatLoad = heatLoad;

    for (let s = 0; s < subs; s++) {
      // diffusion + relaxation into scratch
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
          let v = temp[i] + DIFF * (avg - temp[i]) + RELAX * (AMBIENT - temp[i]);
          scratch[i] = v;
        }
      }
      // inject sources/sinks
      for (let i = 0; i < n; i++) {
        const t = grid[i];
        if (t === CODE.rack) {
          if (!this.dead[i]) scratch[i] += SPECS.rack.heat * sub;
        } else if (t === CODE.power) {
          scratch[i] += SPECS.power.heat * sub;
        } else if (t === CODE.cooler) {
          // cooler also spills cold into the four neighbours
          const pull = SPECS.cooler.cooling * sub;
          scratch[i] -= pull * 0.48;
          const x = i % w, y = (i / w) | 0;
          if (x > 0) scratch[i - 1] -= pull * 0.13;
          if (x < w - 1) scratch[i + 1] -= pull * 0.13;
          if (y > 0) scratch[i - w] -= pull * 0.13;
          if (y < h - 1) scratch[i + w] -= pull * 0.13;
        }
      }
      // clamp & commit
      for (let i = 0; i < n; i++) {
        let v = scratch[i];
        if (v < AMBIENT - 6) v = AMBIENT - 6;
        if (v > 140) v = 140;
        temp[i] = v;
      }
    }
  }

  step(dt: number) {
    if (dt <= 0) return;
    this.time += dt;

    this.stepHeat(dt);

    // ---- power ----
    let powerDraw = 0;
    let powerSupply = 0;
    let racks = 0;
    let dead = 0;
    let buildings = 0;
    let bandwidth = 0;
    let noisePow = 0;
    let methanePow = 0;
    const { n, grid } = this;
    for (let i = 0; i < n; i++) {
      const t = grid[i];
      if (t === CODE.empty) continue;
      buildings++;
      if (t === CODE.power) {
        powerSupply += SPECS.power.supply;
        noisePow += SPECS.power.noise;
        methanePow += SPECS.power.methane;
      } else if (t === CODE.rack) {
        racks++;
        if (this.dead[i]) { dead++; continue; } // dead racks are silent
        powerDraw += SPECS.rack.power;
        noisePow += SPECS.rack.noise;
      } else if (t === CODE.cooler) {
        powerDraw += SPECS.cooler.power;
        noisePow += SPECS.cooler.noise;
      } else if (t === CODE.network) {
        powerDraw += SPECS.network.power;
        bandwidth += SPECS.network.bandwidth;
        noisePow += SPECS.network.noise;
      }
    }
    const powerRatio = powerDraw > 0 ? Math.min(1, powerSupply / powerDraw) : 1;

    // ---- compute capacity (after throttle + power) ----
    let capacity = 0;
    let tempSum = 0;
    let maxTemp = 0;
    for (let i = 0; i < n; i++) {
      const tv = this.temp[i];
      tempSum += tv;
      if (tv > maxTemp) maxTemp = tv;
      if (grid[i] === CODE.rack && !this.dead[i]) {
        capacity += SPECS.rack.compute * this.tempEfficiency(tv) * powerRatio;
      }
    }
    bandwidth *= powerRatio;

    // ---- rack damage from sustained heat ----
    for (let i = 0; i < n; i++) {
      if (grid[i] !== CODE.rack || this.dead[i]) continue;
      const tv = this.temp[i];
      if (tv > CRITICAL_TEMP) {
        this.dmg[i] += (tv - CRITICAL_TEMP) * 0.9 * dt;
        if (this.dmg[i] >= 100) {
          this.dmg[i] = 100;
          this.dead[i] = 1;
          if (!this.warnedDead.has(i)) {
            this.warnedDead.add(i);
            this.toast("A rack overheated and failed — bulldoze it", "bad");
          }
        }
      } else if (tv < SAFE_TEMP) {
        this.dmg[i] = Math.max(0, this.dmg[i] - 6 * dt);
      }
    }

    // ---- demand & revenue ----
    const demand = this.demandAt(this.time);
    const served = Math.min(capacity, bandwidth, demand);
    let upkeep = 0;
    for (let i = 0; i < n; i++) {
      const ty = this.typeAt(i);
      if (ty && !(ty === "rack" && this.dead[i])) upkeep += SPECS[ty].upkeep;
    }
    const revPerHour = served * PRICE;
    this.netPerHour = revPerHour - upkeep;
    this.money += this.netPerHour * dt;

    // ---- noise & community sentiment ----
    // Acoustic power adds up across equipment; the perceived level climbs steeply
    // as the site grows (cooling towers dominate). Rural baseline ~34 dB(A).
    const noiseDb = noisePow <= 0 ? AMBIENT_NOISE : Math.min(108, AMBIENT_NOISE + 1.7 * Math.pow(noisePow, 0.72));
    this.noise = noiseDb;

    // methane / GHG output — each gas turbine leaks; reported as tonnes CO2e/day
    const methane = methanePow * 3.5;
    this.methane = methane;

    // Residents are content up to ~44 dB(A) and outraged by ~86; smog and
    // failures upset them too.
    const deadPenalty = Math.min(25, dead * 8);
    const smogPenalty = Math.min(45, methane * 0.7);
    let sentTarget = 100 * Math.max(0, Math.min(1, (86 - noiseDb) / (86 - 44))) - deadPenalty - smogPenalty;
    sentTarget = Math.max(0, Math.min(100, sentTarget));
    // sentiment drifts toward the target over a couple of days, not instantly
    this.sentiment += (sentTarget - this.sentiment) * Math.min(1, dt * 0.5);

    const band = this.sentiment >= 80 ? 5 : this.sentiment >= 60 ? 4 : this.sentiment >= 40 ? 3 : this.sentiment >= 20 ? 2 : 1;
    if (band < this.lastSentBand) {
      const msg =
        band === 4 ? "Neighbours are starting to notice the noise." :
        band === 3 ? "Residents are complaining about the noise." :
        band === 2 ? "The community is protesting the noise pollution." :
        "Outrage — the community wants the data center gone.";
      this.toast(msg, band <= 2 ? "bad" : "warn");
    }
    this.lastSentBand = band;

    // ---- toasts for notable states ----
    if (powerRatio < 0.999 && powerDraw > 0 && this.time - this.lastBrownout > 6) {
      this.lastBrownout = this.time;
      this.toast("Brownout — not enough power. Add a Power Unit.", "bad");
    }
    if (maxTemp > 70 && this.time - this.lastOverheat > 8) {
      this.lastOverheat = this.time;
      this.toast("A hotspot is overheating — add coolers nearby.", "warn");
    }
    if (!this.won && this.money >= GOAL) {
      this.won = true;
      this.toast(`Goal reached — $${(GOAL / 1000) | 0}k banked!`, "good");
    }

    // cache readouts
    this._powerDraw = powerDraw;
    this._powerSupply = powerSupply;
    this._powerRatio = powerRatio;
    this._capacity = capacity;
    this._bandwidth = bandwidth;
    this._demand = demand;
    this._served = served;
    this._racks = racks;
    this._dead = dead;
    this._buildings = buildings;
    this._avgTemp = tempSum / n;
    this._maxTemp = maxTemp;
  }

  private _avgTemp = AMBIENT;
  private _maxTemp = AMBIENT;

  hud(): Hud {
    return {
      money: this.money,
      day: Math.floor(this.time / 24) + 1,
      hour: Math.floor(this.time % 24),
      netPerHour: this.netPerHour,
      powerDraw: this._powerDraw,
      powerSupply: this._powerSupply,
      powerRatio: this._powerRatio,
      cooling: this._cooling,
      heatLoad: this._heatLoad,
      avgTemp: this._avgTemp,
      maxTemp: this._maxTemp,
      capacity: this._capacity,
      bandwidth: this._bandwidth,
      demand: this._demand,
      served: this._served,
      racks: this._racks,
      dead: this._dead,
      buildings: this._buildings,
      noise: this.noise,
      methane: this.methane,
      sentiment: this.sentiment,
      sentimentLabel: sentimentLabel(this.sentiment),
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
