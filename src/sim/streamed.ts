// The streamed world as the World sees it: the chunk store (collision beyond the map), the warped net roads for
// the traffic graph, the bus line home, the Sealdah forecourt (arrival) and the Green Line stations along the way.

import { STREAM } from '../content/worldgen';
import { busRoute } from './gen/busroute';
import { warped, type WarpedNet } from './gen/net';
import { ChunkStore } from './gen/stream';
import type { PlayMode, Pt, WorldNet } from './gen/types';
import { chunkSolids, lanePlan } from './gen/solids';
import { roofsAt } from './gen/roofs';
import { chunkKey } from './gen/chunks';
import { HALF } from './gen/clip';
import { CHUNK } from './gen/types';
import { BuildingGrid } from './collide';
import { SolidGrid } from './solids';
import type { MapData } from './mapdata';

export class Streamed {
  readonly store: ChunkStore;
  readonly wn: WarpedNet;
  /** Finish circle, game coords. */
  readonly sealdah: { x: number; z: number; r: number };
  /** Green Line stations beyond Sector V (game coords): street entrances to the metro. */
  readonly stations: { name: string; x: number; z: number }[];
  /** What the camera can't see through, per loaded chunk: its buildings and its structures (landmarks included). */
  private sight = new Map<number, { b: BuildingGrid; s: SolidGrid }>();

  constructor(readonly net: WorldNet, mode: PlayMode, seed: number) {
    this.store = new ChunkStore(net, mode, seed);
    this.wn = warped(net, this.store.warp);
    this.sealdah = this.wn.sealdah;
    this.stations = (net.metro[0]?.stations ?? []).filter((s) => s.name !== 'Sealdah').map((s) => {
      const [x, z] = this.store.warp.toGame([s.x, s.z]);
      return { name: s.name, x, z };
    });
    const warp = this.store.warp;
    this.store.onLoad((c) => this.sight.set(chunkKey(c.cx, c.cz), { b: new BuildingGrid(c.buildings.map((b) => b.p)), s: new SolidGrid(chunkSolids(net, warp, c.cx, c.cz)) }));
    this.store.onUnload((c) => this.sight.delete(chunkKey(c.cx, c.cz)));
  }

  /**
   * Corridor roads for the traffic graph (game coords). Where a structure stands in a road (the Green Line's piers
   * in the median, a flyover ramp or the metro cut down the middle), that segment's lane moves just far enough
   * for a bus to pass it (out toward the kerb, or in on a one-way road), like the real traffic either side of them
   * (sim/gen/lanes.ts). Flyover decks are `deck`.
   */
  graphRoads() {
    const plan = lanePlan(this.net, this.store.warp);
    return this.wn.roads.map((r, i) => ({
      p: r.p, w: r.road.w, oneway: r.road.oneway, deck: r.road.bridge === 'flyover', lane: (_a: Pt, _b: Pt, k: number) => plan.lane[i][k] ?? null,
    }));
  }

  route(map: MapData) { return busRoute(map, this.wn); }

  /** Streams chunks around the player: call once per rendered frame with a time check (see ChunkStore.update). */
  stream(x: number, z: number, budget: number | (() => boolean) = STREAM.perStep) { return this.store.update(x, z, budget); }

  blocked(x: number, z: number, pad: number) { return this.store.blocked(x, z, pad); }

  /**
   * True if the camera can't be at (x, z) (radius `pad`): a generated building, a landmark model or a structure
   * (pier, ramp, station tower, abutment) of a loaded chunk. Unlike `blocked`, no water and no timed off-band rule:
   * the camera may hang over a canal or behind the band's edge. Inside the Sector V square the real map answers.
   */
  camBlocked(x: number, z: number, pad: number): boolean {
    if (Math.abs(x) <= HALF && Math.abs(z) <= HALF) return false;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), fx = x - cx * CHUNK, fz = z - cz * CHUNK, m = 24;
    for (let i = fx < m ? -1 : 0; i <= (fx > CHUNK - m ? 1 : 0); i++) for (let j = fz < m ? -1 : 0; j <= (fz > CHUNK - m ? 1 : 0); j++) {
      const g = this.sight.get(chunkKey(cx + i, cz + j));
      if (g && (g.b.blocked(x, z, pad) || g.s.blocked(x, z, pad))) return true;
    }
    return false;
  }

  /** The lowest underside overhead at (x, z) (a flyover deck, the viaduct, a station, a rail bridge), if any. */
  roofAt(x: number, z: number): number | undefined { return roofsAt(this.net, this.store.warp, x, z); }

  atSealdah(x: number, z: number) { return Math.hypot(this.sealdah.x - x, this.sealdah.z - z) < this.sealdah.r; }

  /** A Green Line station whose street entrance is within reach of (x, z). */
  stationAt(x: number, z: number, reach = 7): { name: string; x: number; z: number } | undefined {
    return this.stations.find((s) => Math.hypot(s.x - x, s.z - z) < reach);
  }
}

