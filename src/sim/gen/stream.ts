// The streamed world around the player: keeps chunks within `load` of the player generated and drops them beyond
// `unload`, building at most `perStep` per update (nearest first), and answers collision queries across chunks.
// Implements ChunkSource for the renderer. Pure: the caller drives it from the sim step.

import { STREAM } from '../../content/worldgen';
import { BuildingGrid, WaterMask } from '../collide';
import { chunkJob, chunkKey, insideSquare, onBand } from './chunks';
import { HALF } from './clip';
import { CHUNK, type Chunk, type ChunkSource, type PlayMode, type Pt, type Warp, type WorldNet } from './types';
import { makeWarp } from './warp';

interface Loaded { chunk: Chunk; solid: BuildingGrid; water: WaterMask }

export interface StoreOpts { load: number; unload: number; perStep: number }

export class ChunkStore implements ChunkSource {
  readonly warp: Warp;
  private chunks = new Map<number, Loaded>();
  private loadCbs: ((c: Chunk) => void)[] = [];
  private unloadCbs: ((c: Chunk) => void)[] = [];
  private queue: { cx: number; cz: number; d: number }[] = [];
  /** Chunks generated so far, and total generation work (for debugging and tests). */
  stats = { generated: 0, unloaded: 0 };
  private readonly opts: StoreOpts;

  constructor(readonly net: WorldNet, readonly mode: PlayMode, readonly seed: number, opts: Partial<StoreOpts> = {}, warp?: Warp) {
    this.warp = warp ?? makeWarp(mode);
    this.opts = { ...STREAM, ...opts };
  }

  loaded(): Iterable<Chunk> { return [...this.chunks.values()].map((l) => l.chunk); }
  onLoad(cb: (c: Chunk) => void) { this.loadCbs.push(cb); }
  onUnload(cb: (c: Chunk) => void) { this.unloadCbs.push(cb); }
  get size() { return this.chunks.size; }
  /** Chunks wanted but not generated yet (including one in progress). */
  get pending() { return this.queue.length; }

  chunkAt(x: number, z: number): Chunk | undefined {
    return this.chunks.get(chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK)))?.chunk;
  }

  /**
   * Re-plans around the player and generates chunks nearest first. `budget` is either a number of whole chunks, or
   * a callback the caller uses to keep time (`() => elapsed < 4 ms`): then work proceeds in small slices, a chunk
   * may span several calls, and at least one slice runs per call. Returns how many chunks it finished.
   */
  update(px: number, pz: number, budget: number | (() => boolean) = this.opts.perStep): number {
    const { load, unload } = this.opts;
    for (const [k, l] of this.chunks) {
      const c = l.chunk;
      if (centreDist(c.cx, c.cz, px, pz) > unload) {
        this.chunks.delete(k);
        this.stats.unloaded++;
        for (const cb of this.unloadCbs) cb(c);
      }
    }
    this.queue = [];
    const r = Math.ceil(load / CHUNK) + 1;
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    for (let cx = pcx - r; cx <= pcx + r; cx++) for (let cz = pcz - r; cz <= pcz + r; cz++) {
      const d = centreDist(cx, cz, px, pz);
      if (d > load || this.chunks.has(chunkKey(cx, cz)) || insideSquare(cx, cz)) continue;
      if (this.job && this.job.cx === cx && this.job.cz === cz) { this.queue.push({ cx, cz, d: -1 }); continue; }
      this.queue.push({ cx, cz, d });
    }
    this.queue.sort((a, b) => a.d - b.d || a.cx - b.cx || a.cz - b.cz);
    // A chunk in progress that's no longer wanted is dropped; one that is keeps its place at the front.
    if (this.job && !this.queue.some((q) => q.cx === this.job!.cx && q.cz === this.job!.cz)) this.job = null;
    let built = 0;
    if (typeof budget === 'number') {
      while (built < budget && (this.job || this.queue.length)) {
        const j = this.job ?? this.start();
        this.job = null;
        for (;;) { const r = j.it.next(); if (r.done) { this.add(r.value); break; } }
        built++;
      }
      return built;
    }
    let first = true;
    while ((first || budget()) && (this.job || this.queue.length)) {
      first = false;
      this.job ??= this.start();
      const r = this.job.it.next();
      if (r.done) { this.add(r.value); this.job = null; built++; }
    }
    return built;
  }

  /** Builds everything within `load` now (for teleports and tests). */
  fill(px: number, pz: number) {
    while (this.update(px, pz, 64) > 0);
  }

  private job: { cx: number; cz: number; it: Generator<void, Chunk> } | null = null;

  private start() {
    const q = this.queue.find((c) => !this.chunks.has(chunkKey(c.cx, c.cz)))!;
    this.queue = this.queue.filter((c) => c !== q);
    return { cx: q.cx, cz: q.cz, it: chunkJob(this.net, this.warp, this.mode, q.cx, q.cz, this.seed) };
  }

  private add(chunk: Chunk) {
    this.queue = this.queue.filter((c) => c.cx !== chunk.cx || c.cz !== chunk.cz);
    const rings = [...chunk.buildings.map((b) => b.p), ...chunk.blockers];
    const bridges = chunk.roads.filter((r) => r.bridge === 'canal' || r.bridge === 'flyover').map((r) => ({ b: 1, w: r.w, p: r.p }));
    this.chunks.set(chunkKey(chunk.cx, chunk.cz), { chunk, solid: new BuildingGrid(rings), water: new WaterMask(chunk.water ?? [], bridges) });
    this.stats.generated++;
    for (const cb of this.loadCbs) cb(chunk);
  }

  /** The loaded chunks around (x, z): its own, plus neighbours when it's within `m` of a border. */
  private around(x: number, z: number, m: number): Loaded[] {
    const out: Loaded[] = [];
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const fx = x - cx * CHUNK, fz = z - cz * CHUNK;
    const dx0 = fx < m ? -1 : 0, dx1 = fx > CHUNK - m ? 1 : 0, dz0 = fz < m ? -1 : 0, dz1 = fz > CHUNK - m ? 1 : 0;
    for (let i = dx0; i <= dx1; i++) for (let j = dz0; j <= dz1; j++) {
      const l = this.chunks.get(chunkKey(cx + i, cz + j));
      if (l) out.push(l);
    }
    return out;
  }

  /**
   * True if a body of radius `pad` can't stand at (x, z) in the streamed world: a building, wall, dead end or water
   * (bridges excepted), and in timed mode anywhere off the road band. Inside the Sector V square this is always
   * false (the real map answers there). Unloaded ground is open.
   */
  blocked(x: number, z: number, pad: number): boolean {
    if (Math.abs(x) <= HALF && Math.abs(z) <= HALF) return false;
    const near = this.around(x, z, 24);
    if (!near.length) return false;
    for (const l of near) if (l.solid.blocked(x, z, pad) || l.water.blocked(x, z, pad)) return true;
    if (this.mode === 'timed') {
      if (Math.abs(x) <= HALF + 12 && Math.abs(z) <= HALF + 12) return false; // the seam: real map buildings decide
      const s = this.net.sealdah, [sx, sz] = this.warp.toGame([s.x, s.z]);
      if (Math.hypot(sx - x, sz - z) < s.r) return false;
      if (!near.some((l) => onBand(l.chunk, x, z))) return true;
    }
    return false;
  }

  /** Debug summary for tests (window.gj.debug). */
  summary() {
    let buildings = 0, roads = 0, props = 0;
    for (const l of this.chunks.values()) { buildings += l.chunk.buildings.length; roads += l.chunk.roads.length; props += l.chunk.props.length; }
    return { chunks: this.chunks.size, pending: this.queue.length, generated: this.stats.generated, buildings, roads, props };
  }
}

function centreDist(cx: number, cz: number, px: number, pz: number) {
  return Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz);
}

export type { Pt };
