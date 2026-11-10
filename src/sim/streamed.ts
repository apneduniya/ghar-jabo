// The streamed world as the World sees it: the chunk store (collision beyond the map), the warped net roads for
// the traffic graph, the bus line home, the Sealdah forecourt (arrival) and the Green Line stations along the way.

import { STREAM } from '../content/worldgen';
import { busRoute } from './gen/busroute';
import { warped, type WarpedNet } from './gen/net';
import { ChunkStore } from './gen/stream';
import type { PlayMode, Pt, WorldNet } from './gen/types';
import { allSolids } from './gen/solids';
import type { Solid } from './solids';
import { T } from '../content/tuning';
import type { MapData } from './mapdata';

export class Streamed {
  readonly store: ChunkStore;
  readonly wn: WarpedNet;
  /** Finish circle, game coords. */
  readonly sealdah: { x: number; z: number; r: number };
  /** Green Line stations beyond Sector V (game coords): street entrances to the metro. */
  readonly stations: { name: string; x: number; z: number }[];

  constructor(readonly net: WorldNet, mode: PlayMode, seed: number) {
    this.store = new ChunkStore(net, mode, seed);
    this.wn = warped(net, this.store.warp);
    this.sealdah = this.wn.sealdah;
    this.stations = (net.metro[0]?.stations ?? []).filter((s) => s.name !== 'Sealdah').map((s) => {
      const [x, z] = this.store.warp.toGame([s.x, s.z]);
      return { name: s.name, x, z };
    });
  }

  /** Net roads for the traffic graph (game coords). */
  /**
   * Corridor roads for the traffic graph. Where a round pier (metro viaduct, flyover column) stands near a road's
   * centre line, that segment's lanes move out just far enough for a bus to pass it on either side, like the real
   * median under the Green Line. Piers near the kerb can't be fixed this way (see structureConflicts).
   */
  graphRoads() {
    const piers = new Map<string, Solid[]>(), C = 16;
    for (const s of allSolids(this.net, this.store.warp)) {
      if (s.hl || s.hw || s.r <= 0) continue; // round piers only; walls and boxes aren't in the middle of a road
      const k = `${Math.floor(s.x / C)},${Math.floor(s.z / C)}`;
      (piers.get(k) ?? piers.set(k, []).get(k)!).push(s);
    }
    const clear = T.traffic.pierClear;
    const minLane = (a: Pt, b: Pt) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      let need = 0;
      const x0 = Math.floor((Math.min(a[0], b[0]) - 4) / C), x1 = Math.floor((Math.max(a[0], b[0]) + 4) / C);
      const z0 = Math.floor((Math.min(a[1], b[1]) - 4) / C), z1 = Math.floor((Math.max(a[1], b[1]) + 4) / C);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) for (const s of piers.get(`${cx},${cz}`) ?? []) {
        // Along the segment, plus a pier's reach past either end (a bus beside it straddles the joint).
        const along = ((s.x - a[0]) * dx + (s.z - a[1]) * dz) / L;
        if (along < -(s.r + clear) || along > L + s.r + clear) continue;
        const side = Math.abs((s.x - a[0]) * dz - (s.z - a[1]) * dx) / L;
        if (side < T.traffic.medianPier) need = Math.max(need, side + s.r + clear);
      }
      return need;
    };
    return this.wn.roads.map((r) => ({ p: r.p, w: r.road.w, oneway: r.road.oneway, minLane }));
  }

  route(map: MapData) { return busRoute(map, this.wn); }

  /** Streams chunks around the player: call once per rendered frame with a time check (see ChunkStore.update). */
  stream(x: number, z: number, budget: number | (() => boolean) = STREAM.perStep) { return this.store.update(x, z, budget); }

  blocked(x: number, z: number, pad: number) { return this.store.blocked(x, z, pad); }

  atSealdah(x: number, z: number) { return Math.hypot(this.sealdah.x - x, this.sealdah.z - z) < this.sealdah.r; }

  /** A Green Line station whose street entrance is within reach of (x, z). */
  stationAt(x: number, z: number, reach = 7): { name: string; x: number; z: number } | undefined {
    return this.stations.find((s) => Math.hypot(s.x - x, s.z - z) < reach);
  }
}

