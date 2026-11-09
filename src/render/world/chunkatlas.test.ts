import { describe, expect, it } from 'vitest';
import { ATLAS_H, ATLAS_W, RECT_COUNT, TEXT_SLOTS, TextSlots, Tile, atlasUv, rectUniform, tileRects, tileUvRect } from './chunkatlas';

describe('chunk atlas', () => {
  it('keeps every region inside the atlas, inset from its pixel rectangle', () => {
    const rects = tileRects();
    for (let t = 0; t < RECT_COUNT; t++) {
      const [x, y, w, h] = rects[t];
      expect(x >= 0 && y >= 0 && x + w <= ATLAS_W && y + h <= ATLAS_H).toBe(true);
      const [u0, v0, du, dv] = tileUvRect(t);
      expect(u0).toBeGreaterThan(x / ATLAS_W);
      expect(u0 + du).toBeLessThan((x + w) / ATLAS_W);
      // v is flipped (three.js uploads canvases with flipY): the top pixel row is v = 1.
      expect(v0).toBeGreaterThan(1 - (y + h) / ATLAS_H);
      expect(v0 + dv).toBeLessThan(1 - y / ATLAS_H);
    }
  });

  it('gives each named texture its own region', () => {
    const rects = tileRects();
    const named: number[] = [Tile.asphalt, Tile.pavers, Tile.kerb, Tile.white, Tile.resi, Tile.old, Tile.office, Tile.clad, Tile.block, Tile.shop, Tile.house, Tile.market];
    for (let i = 0; i < 16; i++) named.push(Tile.sign0 + i);
    for (let i = 0; i < 5; i++) named.push(Tile.ad0 + i);
    for (const a of named) for (const b of named) {
      if (a >= b) continue;
      const [ax, ay, aw, ah] = rects[a], [bx, by, bw, bh] = rects[b];
      const overlap = ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
      expect(overlap, `tiles ${a} and ${b}`).toBe(false);
    }
  });

  it('wraps repeat uvs inside the tile, like the shader', () => {
    const [u0, v0, du, dv] = tileUvRect(Tile.resi);
    expect(atlasUv(Tile.resi, 0, 0)).toEqual([u0, v0]);
    const a = atlasUv(Tile.resi, 0.25, 0.5), b = atlasUv(Tile.resi, 3.25, 7.5), c = atlasUv(Tile.resi, -0.75, -1.5);
    for (const p of [b, c]) { expect(p[0]).toBeCloseTo(a[0], 9); expect(p[1]).toBeCloseTo(a[1], 9); }
    expect(a[0]).toBeCloseTo(u0 + du * 0.25, 9);
    expect(a[1]).toBeCloseTo(v0 + dv * 0.5, 9);
  });

  it('maps text slots into the text atlas without overlap', () => {
    const seen: number[][] = [];
    for (let s = 0; s < TEXT_SLOTS; s++) {
      const [u0, v0, du, dv] = tileUvRect(Tile.text0 + s);
      expect(u0 >= 0 && v0 >= 0 && u0 + du <= 1 && v0 + dv <= 1).toBe(true);
      for (const [a, b, c, d] of seen) expect(u0 < a + c && a < u0 + du && v0 < b + d && b < v0 + dv).toBe(false);
      seen.push([u0, v0, du, dv]);
    }
  });

  it('flattens the rect table for the shader uniform', () => {
    const flat = rectUniform();
    expect(flat.length).toBe(RECT_COUNT * 4);
    expect(flat.every(Number.isFinite)).toBe(true);
  });
});

describe('text slots', () => {
  it('shares a slot between equal texts and frees it after the last release', () => {
    const painted: string[] = [];
    const slots = new TextSlots((_s, t) => painted.push(t), 2);
    const a = slots.acquire('GALI BANDH')!, b = slots.acquire('GALI BANDH')!;
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(Tile.text0);
    expect(painted).toEqual(['GALI BANDH']);
    const c = slots.acquire('WATER-LOGGED')!;
    expect(c).not.toBe(a);
    expect(slots.acquire('ONE TOO MANY')).toBeNull();
    slots.release(a);
    expect(slots.acquire('ONE TOO MANY')).toBeNull(); // still referenced once
    slots.release(a);
    expect(slots.acquire('ONE TOO MANY')).toBe(a);
    expect(slots.used).toBe(2);
  });
});
