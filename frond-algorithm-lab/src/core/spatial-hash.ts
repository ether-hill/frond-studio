// Uniform-grid spatial hash for fast neighbour queries (Differential Growth,
// Space Colonization). O(1) average insert + radius query instead of O(n²).

export interface HasItem { x: number; y: number; }

export class SpatialHash<T extends HasItem> {
  private inv: number;
  private buckets = new Map<number, T[]>();

  constructor(cellSize: number) {
    this.inv = 1 / cellSize;
  }

  private key(cx: number, cy: number): number {
    // pack two signed-ish cell coords into one number key
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  clear(): void { this.buckets.clear(); }

  insert(item: T): void {
    const cx = Math.floor(item.x * this.inv);
    const cy = Math.floor(item.y * this.inv);
    const k = this.key(cx, cy);
    const b = this.buckets.get(k);
    if (b) b.push(item); else this.buckets.set(k, [item]);
  }

  rebuild(items: readonly T[]): void {
    this.clear();
    for (let i = 0; i < items.length; i++) this.insert(items[i]);
  }

  /** Call `cb` for every item within `radius` of (x,y). Returns nothing. */
  query(x: number, y: number, radius: number, cb: (item: T) => void): void {
    const r = Math.max(1, Math.ceil(radius * this.inv));
    const cx = Math.floor(x * this.inv);
    const cy = Math.floor(y * this.inv);
    for (let gy = cy - r; gy <= cy + r; gy++) {
      for (let gx = cx - r; gx <= cx + r; gx++) {
        const b = this.buckets.get(this.key(gx, gy));
        if (!b) continue;
        for (let i = 0; i < b.length; i++) cb(b[i]);
      }
    }
  }

  /** Collect items within `radius` into an array. */
  within(x: number, y: number, radius: number): T[] {
    const out: T[] = [];
    const r2 = radius * radius;
    this.query(x, y, radius, (it) => {
      const dx = it.x - x, dy = it.y - y;
      if (dx * dx + dy * dy <= r2) out.push(it);
    });
    return out;
  }
}
