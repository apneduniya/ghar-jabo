// One texture atlas and one material for every streamed chunk: asphalt, pavers, kerb stripes, the facade bays
// (house, resi, old, office, clad, block, shop, market), the shop signboards and the parody hoardings, plus a
// second atlas of text slots for dead-end jokes and signs. Each vertex carries `tile` (which region) and a uv in
// tile repeats; the shader wraps the uv inside the region, so walls and roads repeat their texture as before.
// The tile table and the uv maths are pure (tested); canvases are only drawn when the material is first made.

export const ATLAS_W = 2048, ATLAS_H = 1024;
export const TEXT_W = 1024, TEXT_H = 512, TEXT_COLS = 4, TEXT_ROWS = 16;
const INSET = 2; // px kept clear around each region so mipmaps don't bleed

export const Tile = {
  asphalt: 0, pavers: 1, kerb: 2, white: 3, pool: 4,
  resi: 5, old: 6, office: 7, clad: 8, block: 9, shop: 10, house: 11, market: 12,
  sign0: 13, ad0: 29, text0: 40,
} as const;
export const SIGN_COUNT = 16, AD_COUNT = 5, TEXT_SLOTS = TEXT_COLS * TEXT_ROWS, RECT_COUNT = Tile.text0;

/** Pixel rectangles [x, y, w, h] on the atlas canvas (y down), per tile below text0. */
export function tileRects(): [number, number, number, number][] {
  const r: [number, number, number, number][] = [];
  r[Tile.asphalt] = [0, 0, 512, 512];
  r[Tile.pavers] = [512, 0, 256, 256];
  r[Tile.kerb] = [768, 0, 256, 64];
  r[Tile.white] = [768, 64, 64, 64];
  r[Tile.pool] = [768, 64, 64, 64];
  const facades = [Tile.resi, Tile.old, Tile.office, Tile.clad, Tile.block, Tile.shop, Tile.house, Tile.market];
  facades.forEach((t, i) => { r[t] = [i * 128, 512, 128, 128]; });
  for (let i = 0; i < SIGN_COUNT; i++) r[Tile.sign0 + i] = [1024 + (i % 4) * 256, Math.floor(i / 4) * 128, 256, 128];
  for (let i = 0; i < AD_COUNT; i++) r[Tile.ad0 + i] = [i * 256, 640, 256, 128];
  for (let i = 0; i < RECT_COUNT; i++) r[i] ??= [768, 64, 64, 64]; // unused ids read plain white
  return r;
}

/** A tile's region in texture uv (v up, as three.js flips canvases): [u0, v0, du, dv], inset against bleeding. */
export function tileUvRect(tile: number): [number, number, number, number] {
  if (tile >= Tile.text0) {
    const s = tile - Tile.text0, col = s % TEXT_COLS, row = Math.floor(s / TEXT_COLS);
    const w = TEXT_W / TEXT_COLS, h = TEXT_H / TEXT_ROWS;
    return [(col * w + 1) / TEXT_W, 1 - ((row + 1) * h - 1) / TEXT_H, (w - 2) / TEXT_W, (h - 2) / TEXT_H];
  }
  const [x, y, w, h] = tileRects()[tile] ?? tileRects()[Tile.white];
  return [(x + INSET) / ATLAS_W, 1 - (y + h - INSET) / ATLAS_H, (w - 2 * INSET) / ATLAS_W, (h - 2 * INSET) / ATLAS_H];
}

/** Where a vertex uv (in tile repeats) lands on the atlas: the shader does exactly this per pixel. */
export function atlasUv(tile: number, u: number, v: number): [number, number] {
  const [u0, v0, du, dv] = tileUvRect(tile);
  const fu = u - Math.floor(u), fv = v - Math.floor(v);
  return [u0 + fu * du, v0 + fv * dv];
}

/** The rect table as a flat array for the shader's uniform (vec4 per tile). */
export function rectUniform(): number[] {
  const out: number[] = [];
  for (let i = 0; i < RECT_COUNT; i++) out.push(...tileUvRect(i));
  return out;
}

/**
 * Text slots for dead-end jokes and signs, shared by every chunk. The same text reuses its slot (counted), so
 * repeated jokes cost nothing; a slot is redrawn only when it's free. Drawing goes through `paint`, so this
 * class stays testable without a canvas.
 */
export class TextSlots {
  private byText = new Map<string, { slot: number; refs: number }>();
  private free: number[] = [];
  dirty = false;

  constructor(private paint: ((slot: number, text: string, bg: string, fg: string) => void) | null, slots = TEXT_SLOTS) {
    for (let i = slots - 1; i >= 0; i--) this.free.push(i);
  }

  /** A tile id for this text, or null when every slot is taken. */
  acquire(text: string, bg = '#f6efe0', fg = '#7a1f1f'): number | null {
    const key = `${text}|${bg}|${fg}`;
    const have = this.byText.get(key);
    if (have) { have.refs++; return Tile.text0 + have.slot; }
    const slot = this.free.pop();
    if (slot === undefined) return null;
    this.byText.set(key, { slot, refs: 1 });
    this.paint?.(slot, text, bg, fg);
    this.dirty = true;
    return Tile.text0 + slot;
  }

  release(tile: number) {
    for (const [k, v] of this.byText) {
      if (Tile.text0 + v.slot !== tile) continue;
      if (--v.refs <= 0) { this.byText.delete(k); this.free.push(v.slot); }
      return;
    }
  }

  get used() { return this.byText.size; }
}
