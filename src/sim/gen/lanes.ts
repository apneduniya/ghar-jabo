// Where streamed-world traffic drives beside the structures standing on its roads. Real Kolkata roads carry the
// Green Line's piers in the median, flyover ramps and the metro cut down their middle, and ground traffic runs
// either side. So for every ground road segment (as the traffic graph has it), the lane moves just far enough for
// a bus to pass every structure solid near it: out toward the kerb, or in toward the middle of a one-way
// carriageway. Where no lane position on the carriageway clears them, the solids in the way are "blocked": a real
// conflict (structureConflicts). The traffic graph (roadgraph.ts Edge.lane) and the conflict list both come from
// here, so they agree.

import { LANE_ROOM, T } from '../../content/tuning';
import type { Solid } from '../solids';
import type { WarpedNet } from './net';

/** Half extents of a solid along and across a unit direction (dx, dz). */
function extents(s: Solid, dx: number, dz: number) {
  const ua = Math.abs(s.ux * dx + s.uz * dz), va = Math.abs(s.uz * dx - s.ux * dz);
  return { along: ua * s.hl + va * s.hw + s.r, across: va * s.hl + ua * s.hw + s.r };
}

const C = 16;
const ckey = (cx: number, cz: number) => (cx + 50000) * 100000 + (cz + 50000);

class Hash {
  private cells = new Map<number, number[]>();
  constructor(readonly solids: Solid[]) {
    solids.forEach((s, i) => {
      const e = Math.max(Math.abs(s.ux) * s.hl + Math.abs(s.uz) * s.hw, Math.abs(s.uz) * s.hl + Math.abs(s.ux) * s.hw) + s.r;
      for (let cx = Math.floor((s.x - e) / C); cx <= Math.floor((s.x + e) / C); cx++)
        for (let cz = Math.floor((s.z - e) / C); cz <= Math.floor((s.z + e) / C); cz++) {
          const k = ckey(cx, cz), l = this.cells.get(k);
          if (l) l.push(i); else this.cells.set(k, [i]);
        }
    });
  }
  near(x0: number, z0: number, x1: number, z1: number): number[] {
    const out = new Set<number>();
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++)
      for (let cz = Math.floor(z0 / C); cz <= Math.floor(z1 / C); cz++) for (const i of this.cells.get(ckey(cx, cz)) ?? []) out.add(i);
    return [...out];
  }
}

export interface LanePlan {
  /** Per warped road (WarpedNet.roads index), per segment k (p[k-1] to p[k]): the lane's offset, or null: default. */
  lane: (number | null)[][];
  /** Indices (into the solids given) that no lane of some road can pass: they stand on a road too narrow for it. */
  blocked: Set<number>;
  /** For each blocked solid, the road it blocks. */
  blockedRoad: Map<number, string>;
}

/**
 * Where a road's lane (offset left of the centre line, for each direction) may run: a one-way road's across its
 * whole carriageway, a two-way road's on its own side of the centre line; a bus may hang LANE_ROOM.overKerb over.
 */
function laneRange(w: number, oneway: boolean): [number, number] {
  const hi = w / 2 + LANE_ROOM.overKerb - LANE_ROOM.busHalf, L0 = w * T.traffic.laneOffset;
  return [Math.min(L0, oneway ? -hi : LANE_ROOM.busHalf + 0.1), Math.max(L0, hi)]; // the default lane always counts
}

/** An obstacle `across` either side of a line `sd` out (on the lane's side) rules out lane offsets in this range. */
const forbidden = (sd: number, across: number): [number, number] => [sd - across - T.traffic.pierClear, sd + across + T.traffic.pierClear];

/** The allowed lane offset nearest the default, or null if the obstacles leave none. */
function bestLane(w: number, oneway: boolean, bans: [number, number][]): number | null {
  const [lo, hi] = laneRange(w, oneway), L0 = w * T.traffic.laneOffset;
  const ok = (L: number) => L >= lo - 1e-9 && L <= hi + 1e-9 && bans.every(([a, b]) => L <= a || L >= b);
  if (ok(L0)) return L0;
  let best: number | null = null;
  for (const L of [lo, hi, ...bans.flat()]) if (ok(L) && (best === null || Math.abs(L - L0) < Math.abs(best - L0))) best = L;
  return best;
}

/** One obstacle's bans for a road's lane(s): for a two-way road the lane mirrors to the other side. */
const bansOf = (oneway: boolean, side: number, across: number) => (oneway ? [1] : [1, -1]).map((sg) => forbidden(sg * side, across));

/**
 * True if a road's lane can get past something `across` either side of a line `side` left of the centre line (on
 * its own): the same rule planLanes uses, for layouts deciding where a pier may stand.
 */
export function lanesPass(w: number, oneway: boolean, side: number, across: number) {
  return bestLane(w, oneway, bansOf(oneway, side, across)) !== null;
}

/** True if a road's default lane already passes something `across` either side of a line `side` left of centre. */
export function laneFree(w: number, oneway: boolean, side: number, across: number) {
  const L0 = w * T.traffic.laneOffset;
  return bansOf(oneway, side, across).every(([a, b]) => L0 <= a || L0 >= b);
}

/**
 * The lane plan for the network's ground roads around these solids. `skip(i)`: solid i doesn't push lanes aside (a
 * flyover ramp's foot, where the traffic drives onto it).
 */
export function planLanes(wn: WarpedNet, solids: Solid[], skip: (i: number) => boolean = () => false): LanePlan {
  const hash = new Hash(solids), clear = T.traffic.pierClear;
  const blocked = new Set<number>(), blockedRoad = new Map<number, string>();
  const lane = wn.roads.map((r) => {
    const out: (number | null)[] = [null];
    if (r.road.bridge === 'flyover') return r.p.map(() => null); // decks run above the ground structures
    const w = r.road.w, oneway = r.road.oneway, L0 = w * T.traffic.laneOffset;
    for (let k = 1; k < r.p.length; k++) {
      const [ax, az] = r.p[k - 1], [bx, bz] = r.p[k], L = Math.hypot(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L;
      const pad = w / 2 + 8;
      let obs = hash.near(Math.min(ax, bx) - pad, Math.min(az, bz) - pad, Math.max(ax, bx) + pad, Math.max(az, bz) + pad).filter((i) => !skip(i)).map((i) => {
        const s = solids[i], e = extents(s, dx, dz);
        const along = (s.x - ax) * dx + (s.z - az) * dz, side = (s.x - ax) * dz - (s.z - az) * dx;
        return { i, along, bans: bansOf(oneway, side, e.across), e };
      }).filter((o) => o.along > -(o.e.along + clear) && o.along < L + o.e.along + clear);
      // Leave out what no lane position could pass on its own, then (rarely) the widest of what's left, until a
      // lane position passes the rest.
      let best = bestLane(w, oneway, obs.flatMap((o) => o.bans));
      while (best === null && obs.length) {
        const alone = obs.filter((o) => bestLane(w, oneway, o.bans) === null);
        const drop = alone.length ? alone : [obs.reduce((m, o) => (o.e.across > m.e.across ? o : m))];
        for (const o of drop) { blocked.add(o.i); if (!blockedRoad.has(o.i)) blockedRoad.set(o.i, r.road.name ?? r.road.id); }
        obs = obs.filter((o) => !drop.includes(o));
        best = bestLane(w, oneway, obs.flatMap((o) => o.bans));
      }
      out.push(best === null || Math.abs(best - L0) < 1e-6 ? null : best);
    }
    return out;
  });
  return { lane, blocked, blockedRoad };
}
