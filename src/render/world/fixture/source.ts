// FIXTURE ChunkSource (debug only, `?fixture=1`): keeps the fixture chunks within LOAD units of the player,
// generating at most one new chunk per update (nearest first) and unloading with a little hysteresis, the way
// builder G's ChunkStore (src/sim/gen/stream.ts) is meant to behave.

import { CHUNK, type Chunk, type ChunkSource } from '../../../sim/gen/types';
import { fixtureChunk } from './gen';
import { fixtureNet, identityWarp } from './net';

export const LOAD = 400;
const key = (cx: number, cz: number) => `${cx},${cz}`;
const dist = (cx: number, cz: number, x: number, z: number) => {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  return Math.hypot(Math.max(x0 - x, 0, x - x0 - CHUNK), Math.max(z0 - z, 0, z - z0 - CHUNK));
};

export class FixtureSource implements ChunkSource {
  readonly net = fixtureNet;
  readonly warp = identityWarp;
  private chunks = new Map<string, Chunk>();
  private loadCbs: ((c: Chunk) => void)[] = [];
  private unloadCbs: ((c: Chunk) => void)[] = [];

  loaded() { return this.chunks.values(); }
  onLoad(cb: (c: Chunk) => void) { this.loadCbs.push(cb); }
  onUnload(cb: (c: Chunk) => void) { this.unloadCbs.push(cb); }

  /** Call every frame with the player's position. `perFrame` caps new chunks per call. */
  update(x: number, z: number, perFrame = 1) {
    for (const [k, c] of this.chunks) {
      if (dist(c.cx, c.cz, x, z) > LOAD + CHUNK / 2) { this.chunks.delete(k); for (const cb of this.unloadCbs) cb(c); }
    }
    const want: [number, number, number][] = [];
    const r = Math.ceil(LOAD / CHUNK) + 1, pcx = Math.floor(x / CHUNK), pcz = Math.floor(z / CHUNK);
    for (let cx = pcx - r; cx <= pcx + r; cx++) for (let cz = pcz - r; cz <= pcz + r; cz++) {
      const d = dist(cx, cz, x, z);
      // The real Sector V map covers the middle: chunks fully inside the square have nothing to draw.
      const inner = cx * CHUNK >= -360 && (cx + 1) * CHUNK <= 360 && cz * CHUNK >= -360 && (cz + 1) * CHUNK <= 360;
      if (d <= LOAD && !inner && !this.chunks.has(key(cx, cz))) want.push([d, cx, cz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of want.slice(0, perFrame)) {
      const c = fixtureChunk(this.net, cx, cz);
      this.chunks.set(key(cx, cz), c);
      for (const cb of this.loadCbs) cb(c);
    }
  }
}
