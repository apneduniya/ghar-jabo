import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHUNK, type Chunk, type ChunkSource } from '../../sim/gen/types';
import { ChunkView, chunkDist, chunkSteps } from './chunks';
import { GeoBuf } from './chunkgeo';
import { groundRects } from './chunkground';
import { buildProp } from './chunkprops';
import { FixtureSource } from './fixture/source';
import { fixtureChunk, finiteChunk } from './fixture/gen';
import { fixtureNet } from './fixture/net';
import { clipPolyline } from './fixture/geom';

const mat = new THREE.MeshBasicMaterial();
/** Chunks of each fixture area: Salt Lake grid, old city near Sealdah, the generic grid east of Sector V. */
const SAMPLES: [string, number, number][] = [['saltlake', -4, -5], ['old', -22, 2], ['old-corridor', -20, 1], ['generic', 5, 3], ['bypass', -6, 6]];

function finiteAttrs(g: THREE.BufferGeometry) {
  for (const name of ['position', 'normal', 'color', 'uv', 'glow', 'tile']) {
    const a = g.getAttribute(name);
    expect(a, name).toBeTruthy();
    for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i])) throw new Error(`${name}[${i}] is ${a.array[i]}`);
  }
  const n = g.getAttribute('position').count, idx = g.index!;
  for (let i = 0; i < idx.count; i++) if (idx.getX(i) >= n) throw new Error(`index ${idx.getX(i)} ≥ ${n}`);
}

/** Drive a source by hand: load and unload chunks on demand. */
class HandSource implements ChunkSource {
  net = fixtureNet;
  warp = { mode: 'free' as const, toGame: (p: [number, number]): [number, number] => p, toReal: (p: [number, number]): [number, number] => p };
  chunks: Chunk[] = [];
  private on: ((c: Chunk) => void)[] = [];
  private off: ((c: Chunk) => void)[] = [];
  loaded() { return this.chunks; }
  onLoad(cb: (c: Chunk) => void) { this.on.push(cb); }
  onUnload(cb: (c: Chunk) => void) { this.off.push(cb); }
  load(c: Chunk) { this.chunks.push(c); this.on.forEach((f) => f(c)); }
  unload(c: Chunk) { this.chunks = this.chunks.filter((x) => x !== c); this.off.forEach((f) => f(c)); }
}

describe('fixture chunks', () => {
  it('are deterministic and finite, with roads, buildings and props in every area', () => {
    for (const [name, cx, cz] of SAMPLES) {
      const a = fixtureChunk(fixtureNet, cx, cz), b = fixtureChunk(fixtureNet, cx, cz);
      expect(JSON.stringify(a), name).toBe(JSON.stringify(b));
      expect(finiteChunk(a), name).toBe(true);
      expect(a.roads.length, name).toBeGreaterThan(0);
      expect(a.buildings.length, name).toBeGreaterThan(0);
      expect(a.props.length, name).toBeGreaterThan(0);
    }
    expect(fixtureChunk(fixtureNet, -4, -5).buildings.some((b) => b.style === 'house')).toBe(true);
    expect(fixtureChunk(fixtureNet, -22, 2).buildings.some((b) => b.style === 'old' && b.shop)).toBe(true);
  });

  it('includes dead ends with parody text somewhere in the old city', () => {
    let found = 0;
    for (let cx = -24; cx <= -18; cx++) for (let cz = 0; cz <= 4; cz++) found += fixtureChunk(fixtureNet, cx, cz).props.filter((p) => p.kind === 'dead-end' && p.text).length;
    expect(found).toBeGreaterThan(0);
  });

  it('clips a road exactly at chunk borders and around the Sector V square', () => {
    const p: [number, number][] = [[-1000, 10], [-100, 10]];
    const left = clipPolyline(p, [-512, 0, -384, 128], 360), right = clipPolyline(p, [-384, 0, -256, 128], 360);
    expect(left[0][1]).toEqual([-384, 10]);
    expect(right[0][0]).toEqual([-384, 10]);
    expect(right[0][1]).toEqual([-360, 10]); // stops at the real map
  });
});

describe('chunk meshing', () => {
  it('builds one finite mesh per chunk from every area', () => {
    for (const [name, cx, cz] of SAMPLES) {
      const buf = new GeoBuf();
      for (const step of chunkSteps(fixtureChunk(fixtureNet, cx, cz), buf, () => null)) step();
      const g = buf.build();
      expect(g.getAttribute('position').count, name).toBeGreaterThan(500);
      finiteAttrs(g);
      // Inside its chunk, give or take trees and walls hanging over the edge.
      const bb = g.boundingBox!;
      expect(bb.min.x).toBeGreaterThan(cx * CHUNK - 30);
      expect(bb.max.x).toBeLessThan((cx + 1) * CHUNK + 30);
      g.dispose();
    }
  });

  it('paints props west and north of the origin in their own colours, not white', () => {
    // Bug: a negative variant index read past the start of the colour tables and painted trees white.
    for (const kind of ['tree', 'palm', 'stall', 'parked-car', 'cart'] as const) {
      const buf = new GeoBuf();
      buildProp(buf, { kind, x: -900, z: -600, rot: 0, v: -7 }, -137, () => null);
      const c = buf.build().getAttribute('color');
      let white = 0;
      for (let i = 0; i < c.count; i++) if (c.getX(i) === 1 && c.getY(i) === 1 && c.getZ(i) === 1) white++;
      if (kind === 'tree' || kind === 'palm') expect(white, kind).toBe(0);
      else expect(white / c.count, kind).toBeLessThan(0.3);
    }
  });

  it('time-slices: never runs past the budget by more than one step', () => {
    const src = new HandSource();
    let t = 0;
    const view = new ChunkView(src, { material: mat, budgetMs: 4, now: () => t });
    for (const [, cx, cz] of SAMPLES) src.load(fixtureChunk(fixtureNet, cx, cz));
    // Every step "takes" 1.5 ms on this clock: a frame may run three steps, never a whole chunk.
    const real = view as unknown as { jobs: Map<string, { steps: (() => void)[] }> };
    for (const j of real.jobs.values()) j.steps = j.steps.map((s) => () => { s(); t += 1.5; });
    let frames = 0;
    while (view.pending && frames < 1000) { view.update(-500, -600, 10000); frames++; expect(view.stats.lastMs).toBeLessThanOrEqual(4 + 1.5); }
    expect(view.pending).toBe(0);
    expect(view.count).toBe(SAMPLES.length);
    expect(frames).toBeGreaterThan(SAMPLES.length * 3);
    // One draw call per chunk: a single mesh each, all with the shared material.
    expect(view.group.children.length).toBe(SAMPLES.length);
    for (const m of view.meshes()) { expect(m.material).toBe(mat); finiteAttrs(m.geometry); }
  });

  it('builds the nearest chunk first', () => {
    const src = new HandSource();
    let t = 0;
    const view = new ChunkView(src, { material: mat, budgetMs: 0.5, now: () => (t += 1) });
    src.load(fixtureChunk(fixtureNet, 5, 3));
    src.load(fixtureChunk(fixtureNet, -4, -5));
    while (view.count === 0) view.update(-4 * CHUNK + 10, -5 * CHUNK + 10, 1000);
    expect(view.meshes()[0].name).toBe('chunk -4,-5');
  });

  it('disposes geometry and frees text slots on unload, and never builds an unloaded chunk', () => {
    const src = new HandSource();
    const freed: number[] = [];
    let next = 40;
    const view = new ChunkView(src, { material: mat, text: { acquire: () => next++, release: (t) => freed.push(t) } });
    const old = fixtureChunk(fixtureNet, -22, 2);
    old.props.push({ kind: 'dead-end', x: old.x0 + 60, z: old.z0 + 60, rot: 0, len: 5, v: 0, text: 'GALI BANDH' });
    src.load(old);
    while (view.pending) view.update(old.x0, old.z0, 1000);
    const geo = view.meshes()[0].geometry;
    let disposed = false;
    geo.addEventListener('dispose', () => { disposed = true; });
    src.unload(old);
    expect(disposed).toBe(true);
    expect(view.group.children.length).toBe(0);
    expect(freed.length).toBeGreaterThan(0);
    expect(view.stats.unloads).toBe(1);
    const other = fixtureChunk(fixtureNet, -4, -5);
    src.load(other);
    src.unload(other);
    view.update(0, 0, 1000);
    expect(view.count).toBe(0);
  });

  it('hides chunks past the draw distance', () => {
    const src = new HandSource();
    const view = new ChunkView(src, { material: mat });
    src.load(fixtureChunk(fixtureNet, 5, 3));
    while (view.pending) view.update(0, 0, 1e6);
    view.update(5 * CHUNK + 64, 3 * CHUNK + 64, 200);
    expect(view.stats.visible).toBe(1);
    view.update(5 * CHUNK + 64 + 400, 3 * CHUNK + 64, 200);
    expect(view.stats.visible).toBe(0);
  });
});

describe('streaming', () => {
  it('the fixture source loads around the player and unloads what is left behind', () => {
    const src = new FixtureSource();
    const view = new ChunkView(src, { material: mat });
    for (let i = 0; i < 80; i++) src.update(-1500, -400, 2);
    const n = [...src.loaded()].length;
    expect(n).toBeGreaterThan(20);
    for (let i = 0; i < 120; i++) src.update(-2600, 200, 2);
    expect(view.stats.unloads).toBeGreaterThan(0);
    for (const c of src.loaded()) expect(chunkDist(c, -2600, 200)).toBeLessThanOrEqual(400 + CHUNK / 2);
  });

  it('never draws chunk ground over the Sector V square', () => {
    expect(groundRects(256, 0)).toEqual([[360, 0, 384, 128]]);
    expect(groundRects(-1000, 0)).toEqual([[-1000, 0, -872, 128]]);
    const corner = groundRects(256, 256);
    const area = corner.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b), 0);
    expect(area).toBe(128 * 128 - 104 * 104);
  });
});
