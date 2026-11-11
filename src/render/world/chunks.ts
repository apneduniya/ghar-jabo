// The streamed world's renderer. ChunkView listens to a ChunkSource (onLoad/onUnload) and turns each chunk into
// ONE mesh (ground, roads, buildings and props share the atlas material, chunkmat.ts), built a slice at a time:
// at most `budgetMs` of meshing per frame, nearest chunks first, so loading never hitches. Landmark structures
// from structuresForChunk() (landmarks, viaducts, decks, bridges) go in as a second object when a chunk has any. Unloading disposes geometry.

import * as THREE from 'three';
import { CHUNK, type Chunk, type ChunkSource } from '../../sim/gen/types';
import { GeoBuf } from './chunkgeo';
import { buildGroundBase, buildRoad } from './chunkground';
import { buildBuilding } from './chunkbuildings';
import { buildProp, poleWires, type TextFn } from './chunkprops';
import { Tile } from './chunkatlas';
import { structuresForChunk } from './landmarks';

const key = (cx: number, cz: number) => `${cx},${cz}`;

/** Distance from (x, z) to the nearest point of a chunk's square. */
export function chunkDist(c: { x0: number; z0: number }, x: number, z: number) {
  const dx = Math.max(c.x0 - x, 0, x - (c.x0 + CHUNK)), dz = Math.max(c.z0 - z, 0, z - (c.z0 + CHUNK));
  return Math.hypot(dx, dz);
}

/** The work to mesh one chunk, as small steps (ground, a few buildings, a few props, wires). */
export function chunkSteps(c: Chunk, buf: GeoBuf, text: TextFn): (() => void)[] {
  const steps: (() => void)[] = [() => buildGroundBase(buf, c)];
  for (let i = 0; i < c.roads.length; i += 3) steps.push(() => { for (const r of c.roads.slice(i, i + 3)) buildRoad(buf, r, c.roads); });
  for (let i = 0; i < c.buildings.length; i += 6) steps.push(() => { for (const b of c.buildings.slice(i, i + 6)) buildBuilding(buf, b, c.roads); });
  for (let i = 0; i < c.props.length; i += 10) steps.push(() => { c.props.slice(i, i + 10).forEach((p, k) => buildProp(buf, p, i + k + c.cx * 31 + c.cz * 17, text, c.roads)); });
  steps.push(() => poleWires(buf, c.props));
  return steps;
}

interface Job { chunk: Chunk; buf: GeoBuf; steps: (() => void)[]; next: number; texts: number[] }
interface Built { chunk: Chunk; mesh: THREE.Mesh; extra: THREE.Object3D | null; texts: number[] }

export interface ChunkViewOptions {
  material: THREE.Material;
  /** Text slots (chunkmat.ts); without one, signs fall back to plain boards. */
  text?: { acquire: (t: string, bg?: string, fg?: string) => number | null; release: (tile: number) => void };
  budgetMs?: number;
  landmarks?: typeof structuresForChunk;
  now?: () => number;
}

export class ChunkView {
  readonly group = new THREE.Group();
  private jobs = new Map<string, Job>();
  private built = new Map<string, Built>();
  private dead = false;
  /** Counters for tests and the debug overlay. */
  readonly stats = { loads: 0, unloads: 0, builtTotal: 0, lastMs: 0, maxMs: 0, visible: 0 };

  constructor(private src: ChunkSource, private opts: ChunkViewOptions) {
    this.group.name = 'chunks';
    for (const c of src.loaded()) this.load(c);
    src.onLoad((c) => { if (!this.dead) this.load(c); });
    src.onUnload((c) => { if (!this.dead) this.unload(c); });
  }

  get pending() { return this.jobs.size; }
  get count() { return this.built.size; }

  private load(c: Chunk) {
    const k = key(c.cx, c.cz);
    if (this.jobs.has(k) || this.built.has(k)) return;
    this.stats.loads++;
    const buf = new GeoBuf(), texts: number[] = [];
    const text: TextFn = (t, bg, fg) => {
      const tile = this.opts.text?.acquire(t, bg, fg) ?? null;
      if (tile !== null) texts.push(tile);
      return tile;
    };
    this.jobs.set(k, { chunk: c, buf, steps: chunkSteps(c, buf, text), next: 0, texts });
  }

  private unload(c: Chunk) {
    const k = key(c.cx, c.cz);
    this.stats.unloads++;
    const job = this.jobs.get(k);
    if (job) { this.jobs.delete(k); this.release(job.texts); }
    const b = this.built.get(k);
    if (!b) return;
    this.built.delete(k);
    this.group.remove(b.mesh);
    b.mesh.geometry.dispose();
    if (b.extra) {
      this.group.remove(b.extra);
      b.extra.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    }
    this.release(b.texts);
  }

  private release(texts: number[]) {
    for (const t of texts) if (t >= Tile.text0) this.opts.text?.release(t);
  }

  /**
   * Once per frame: mesh for up to `budgetMs`, nearest chunk first, then show only the chunks within `drawDist`
   * of (x, z) (beyond that the fog has them anyway).
   */
  update(x: number, z: number, drawDist: number, budgetMs = this.opts.budgetMs ?? 4) {
    const now = this.opts.now ?? (() => performance.now());
    const t0 = now(), budget = budgetMs;
    // At least one step per frame, so a slow device still makes progress.
    for (let first = true; this.jobs.size && (first || now() - t0 < budget); first = false) {
      let best: Job | null = null, bd = Infinity;
      for (const j of this.jobs.values()) { const d = chunkDist(j.chunk, x, z); if (d < bd) { bd = d; best = j; } }
      if (!best) break;
      // Chunks far past the fog can wait for later frames.
      if (bd > drawDist + CHUNK && this.built.size && budget < Infinity) break;
      // Turning the buffer into a geometry is a step of its own, so it never rides on top of a full slice.
      if (best.next >= best.steps.length) this.finish(best);
      else best.steps[best.next++]();
    }
    const ms = now() - t0;
    this.stats.lastMs = ms;
    this.stats.maxMs = Math.max(this.stats.maxMs, ms);
    let vis = 0;
    for (const b of this.built.values()) {
      const show = chunkDist(b.chunk, x, z) < drawDist;
      b.mesh.visible = show;
      if (b.extra) b.extra.visible = show;
      if (show) vis++;
    }
    this.stats.visible = vis;
  }

  private finish(job: Job) {
    const c = job.chunk, k = key(c.cx, c.cz);
    this.jobs.delete(k);
    const mesh = new THREE.Mesh(job.buf.build(), this.opts.material);
    mesh.name = `chunk ${k}`;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    let extra: THREE.Object3D | null = null;
    // Every chunk: linear structures (the metro viaduct, flyover decks, bridges) cross chunks with no landmark in
    // them. Asking only landmark chunks left most of the Green Line between stations undrawn. Returns null if empty.
    extra = (this.opts.landmarks ?? structuresForChunk)(c, this.src.net, this.src.warp);
    if (extra) this.group.add(extra);
    this.built.set(k, { chunk: c, mesh, extra, texts: job.texts });
    this.stats.builtTotal++;
  }

  /** Every built mesh (tests). */
  meshes() { return [...this.built.values()].map((b) => b.mesh); }

  dispose() {
    this.dead = true;
    for (const b of [...this.built.values()]) this.unload(b.chunk);
    for (const j of this.jobs.values()) this.release(j.texts);
    this.jobs.clear();
    this.group.removeFromParent();
  }
}
