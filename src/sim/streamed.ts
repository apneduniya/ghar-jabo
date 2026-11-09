// The streamed world as the World sees it: the chunk store (collision beyond the map), the warped net roads for
// the traffic graph, the bus line home, the Sealdah forecourt (arrival) and the Green Line stations along the way.

import { STREAM } from '../content/worldgen';
import { busRoute } from './gen/busroute';
import { warped, type WarpedNet } from './gen/net';
import { ChunkStore } from './gen/stream';
import type { PlayMode, WorldNet } from './gen/types';
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
  graphRoads() {
    return this.wn.roads.map((r) => ({ p: r.p, w: r.road.w, oneway: r.road.oneway }));
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

