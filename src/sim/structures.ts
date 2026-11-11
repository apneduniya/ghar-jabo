// What of the elevated north stands on the ground in Sector V, shared by the renderer (src/render/world/flyover.ts,
// viaduct.ts, stations.ts) and the walking rules (World.solids): the flyover's columns, its ramps on retaining walls
// and the tin sheeting under the NE-bound deck; the Green and Orange Line columns; the station piers, walls, the
// name tower and the stair towers. The underside of the decks and stations stays open. Pure: no three.js.

import { north as N } from '../content/sectorv';
import { canalAt, canalOf } from './canal';
import { planLanes } from './gen/lanes';
import { LANE_ROOM, T } from '../content/tuning';
import type { WarpedNet } from './gen/net';
import { TRAFFIC_ROADS } from './roadgraph';
import { at, type Box, deckY, type Deck, flyoverDecks, inBox, local, nearest, onCarriageway, orangeLine, type Pier, pierSpots, stations } from './elevated';
import type { MapData, Pt, Road } from './mapdata';
import { box, boxAlong, circle, type Solid } from './solids';

export interface Step { x: number; z: number; rot: number; len: number; dist: number; dx: number; dz: number; i: number }

/** Box rotation for a direction (dx, dz) in the ground plane: the box's length runs along it. */
export const heading = (dx: number, dz: number) => -Math.atan2(dz, dx);

/** Walk a polyline in steps of about `step`, giving each step's centre, heading, length and distance along. */
export function* walk(p: Pt[], step: number): Generator<Step> {
  let dist = 0, i = 0;
  for (let k = 1; k < p.length; k++) {
    const [ax, az] = p[k - 1], [bx, bz] = p[k];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const n = Math.max(1, Math.round(L / step)), len = L / n;
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      yield { x: ax + (bx - ax) * t, z: az + (bz - az) * t, rot: heading(bx - ax, bz - az), len, dist: dist + len * (j + 0.5), dx: (bx - ax) / L, dz: (bz - az) / L, i: i++ };
    }
    dist += L;
  }
}

// --- The Nabadiganta flyover.

export const FLY = {
  step: 2.5,
  /** Below this the deck is just road at grade. */
  grade: 0.15,
  /** Below this deck height the ramp stands on retaining walls (the underside is under ~2.4): solid. */
  retain: 3.4,
  pierStep: 18,
  /** The oval column: `r` along the deck, r * stretch across it. */
  pier: { r: 0.72, stretch: 1.7 },
  /** Tin sheeting under the NE-bound deck, where the deck is higher than this, `inset` in from its edge. */
  tin: { y: 2.6, inset: 0.4, h: 1.9 },
};

export interface FlyStep { s: Step; y: number; pier: boolean }

/** Every drawn piece of a deck (above grade) and whether a column stands under it. */
/**
 * The tin sheeting under the NE-bound deck for one step: its centre, or null where there's none. It closes off the
 * space beside the service road (fly_03), so it never stands on a carriageway: on the halved map the deck edge
 * overhangs the Bypass in places, and the sheeting was drawn across the traffic lanes there.
 */
export function tinAt(deck: Deck, s: Step, y: number, roads: Road[]): { x: number; z: number } | null {
  if (!deck.ne || y <= FLY.tin.y) return null;
  const o = deck.w / 2 - FLY.tin.inset, x = s.x + s.dz * o, z = s.z - s.dx * o;
  for (const k of [-0.5, 0, 0.5]) if (onCarriageway(roads, x + s.dx * s.len * k, z + s.dz * s.len * k, 0.3)) return null;
  return { x, z };
}

export function flyoverSteps(deck: Deck, roads: Road[]): FlyStep[] {
  const out: FlyStep[] = [];
  let nextPier = 0;
  for (const s of walk(deck.p, FLY.step)) {
    const y = deckY(deck, s.dist);
    if (y < FLY.grade) continue;
    const pier = y >= FLY.retain && s.dist >= nextPier && !onCarriageway(roads, s.x, s.z, 0.6);
    if (pier) nextPier = s.dist + FLY.pierStep;
    out.push({ s, y, pier });
  }
  return out;
}

/**
 * Collects the solids. A wide piece (a ramp, the tin, a station wall) that stands on an at-grade carriageway would
 * cut that road off, so it's left out of the collision and reported instead: that's the data (or the drawing)
 * putting a structure on a road, to be fixed at the source. Columns are placed off the carriageways already.
 */
export interface Conflict { kind: string; x: number; z: number; road: string; /** how far into the carriageway */ depth: number }
class Acc {
  readonly solids: Solid[] = [];
  readonly conflicts: Conflict[] = [];
  /** Wide pieces waiting for the lane plan: solid if traffic can pass them, else reported. */
  readonly cands: { kind: string; s: Solid; road: string; depth: number }[] = [];
  constructor(private roads: Road[]) {}
  add(s: Solid) { this.solids.push(s); }
  wide(kind: string, s: Solid) {
    let depth = 0, road = '';
    for (const a of [-1, 0, 1]) for (const c of [-1, 0, 1]) {
      const x = s.x + s.ux * s.hl * a - s.uz * s.hw * c, z = s.z + s.uz * s.hl * a + s.ux * s.hw * c;
      if (!onCarriageway(this.roads, x, z)) continue;
      for (const q of this.roads) {
        if (q.b) continue;
        const d = q.w / 2 - nearest(q.p, x, z).d;
        if (d > depth) { depth = d; road = q.n || q.k; }
      }
    }
    this.cands.push({ kind, s, road, depth });
  }
}

function flyoverSolids(decks: Deck[], roads: Road[], out: Acc) {
  for (const deck of decks) for (const { s, y, pier } of flyoverSteps(deck, roads)) {
    const nx = s.dz, nz = -s.dx;
    if (y < FLY.retain) out.wide('flyover ramp', box(s.x, s.z, s.dx, s.dz, s.len + 0.02, deck.w)); // the ramp and its walls
    if (pier) {
      const r = FLY.pier.r, half = r * FLY.pier.stretch - r;
      out.add(boxAlong([s.x - nx * half, s.z - nz * half], [s.x + nx * half, s.z + nz * half], 0, r));
    }
    const tin = tinAt(deck, s, y, roads);
    if (tin) out.add(box(tin.x, tin.z, s.dx, s.dz, s.len + 0.02, 0.06));
  }
}

// --- Metro viaducts.

export interface ViaductStyle { y: number; w: number; pierR: number; skip?: (x: number, z: number) => boolean }

/** The two viaducts' looks and the stretches inside a station (no deck or piers of their own there). */
export function viaducts() {
  const { sv, it } = stations();
  return {
    green: { y: N.viaductY, w: 7, pierR: 0.9, skip: (x: number, z: number) => inBox(sv, x, z, -1) } as ViaductStyle,
    orange: { y: N.orangeY, w: 6.4, pierR: 1.05, skip: (x: number, z: number) => inBox(it, x, z, -1) } as ViaductStyle,
  };
}

export const orangePiers = (line: Pt[], roads: Road[]) => pierSpots(line, N.orangePierStep, roads, -1);

/** Column radius at ground: a column set aside (onto a median or footpath) is a little thicker. */
export const columnR = (p: Pier, v: ViaductStyle) => (Math.hypot(p.cx - p.x, p.cz - p.z) > 0.5 ? v.pierR * 1.15 : v.pierR);

function viaductSolids(piers: Pier[], v: ViaductStyle, out: Acc) {
  for (const p of piers) if (!v.skip?.(p.x, p.z)) out.add(circle(p.cx, p.cz, columnR(p, v)));
}

// --- Stations: ground-level footprints in each station's frame (s along, t across, as sim/elevated.ts Box).

export interface LocalRect { s0: number; s1: number; t0: number; t1: number }
const rect = (s0: number, s1: number, t0: number, t1: number): LocalRect => ({ s0, s1, t0, t1 });

/** Gate A's footprint along the service road (forecourt to the end of the mural): its walls carry the station there. */
export const inGateA = (s: number, t: number) => s > N.gateA.forecourt - 0.5 && s < N.gateA.mural[1] + 1.5 && t < N.gateA.block[2];

/** Sector V station's piers: on dry ground or in the canal, never on a carriageway or in Gate A (s, t of each centre). */
export function svPiers(b: Box, roads: Road[]): Pt[] {
  const out: Pt[] = [];
  for (const t of [2, 9.5, 15.5]) for (let s = -b.half + 4; s <= b.half - 3; s += 10) {
    const [x, z] = at(b, s, t);
    if (!onCarriageway(roads, x, z, 0.5) && !inGateA(s, t)) out.push([s, t]);
  }
  return out;
}

/** An auto-rickshaw's footprint (render/models.ts auto(): about 2.1 long, 1.2 wide). */
export const AUTO_HALF: Pt = [1.05, 0.62];

/**
 * Gate A at ground level (content/sectorv.ts north.gateA): the block with the doorway (its back wall and the two
 * jambs), the mosaic mural wall NE of it, the sign pillar, the kerb railing (from the pillar to the end of the mural,
 * so you come in through the forecourt) and the autos queued at the kerb.
 */
export function svGateA() {
  const A = N.gateA, [b0, b1, back] = A.block, f = A.face, d = A.door, hw = A.doorW / 2, [ps, pt] = A.pillar;
  const [a0, step, n, at0] = A.autos;
  return {
    block: [rect(b0, b1, f + A.recess, back), rect(b0, d - hw, f, f + A.recess), rect(d + hw, b1, f, f + A.recess)],
    mural: rect(A.mural[0], A.mural[1], f, f + 0.3),
    pillar: rect(ps - 0.45, ps + 0.45, pt - 0.25, pt + 0.25),
    rail: rect(ps + 0.45, A.mural[1], A.rail - 0.04, A.rail + 0.04),
    autos: Array.from({ length: n }, (_, k) => rect(a0 + k * step - AUTO_HALF[0], a0 + k * step + AUTO_HALF[0], at0 - AUTO_HALF[1], at0 + AUTO_HALF[1])),
  };
}
export const SV_PIER_HALF = 0.6;

/**
 * Sector V station's walls and towers at ground level. With `roads`, the Gate B stair tower slides toward
 * Chavipatty Rd (+t, its real side) until it is off every carriageway: OSM's Gate B point lands on Canal Side Road
 * on the halved map, and the tower stood across the service road there.
 */
export function svGround(b: Box, roads: Road[] = []) {
  const [gs, t0] = local(b, N.gateB[0], N.gateB[1]);
  let gt = t0;
  const onRoad = (t: number) => [[-3, -1.5], [3, -1.5], [-3, 2.2], [3, 2.2], [0, 0.35]].some(([ds, dt]) => {
    const [x, z] = at(b, gs + ds, t + dt);
    return onCarriageway(roads, x, z, LANE_ROOM.overKerb + T.traffic.pierClear); // clear of where a bus's side goes
  });
  for (let k = 0; k < 40 && roads.length && onRoad(gt); k++) gt += 0.5;
  const cars: LocalRect[] = [];
  for (let s = -16; s <= 20; s += 6) cars.push(rect(s - 0.85, s + 0.85, 13.3, 16.6));
  return {
    /** The low wall in front of the parking, and the parked cars behind it. */
    parkWall: rect(-20, 25, 12.6, 12.8), cars,
    /** The yellow name tower at the west end. */
    tower: rect(-b.half - 2, -b.half + 2, 0.5, 4.5),
    /** The stair tower at Gate B on Chavipatty Rd (its entrance is the face with the sign, on +t). */
    gateB: rect(gs - 3, gs + 3, gt - 1.5, gt + 2.2), gateBAt: [gs, gt] as Pt,
  };
}

/** IT Centre's pier rows: the south row on the footpath, the north row in the median, each only off the road. */
export function itPiers(b: Box, roads: Road[]) {
  const out: { s: number; south: boolean; mid: boolean }[] = [];
  for (let s = -b.half + 3; s <= b.half - 2; s += 11) {
    const south = at(b, s, b.n0 + 0.9), mid = at(b, s, b.n1 - 0.8);
    out.push({ s, south: !onCarriageway(roads, south[0], south[1], 0.4), mid: !onCarriageway(roads, mid[0], mid[1], -1.2) });
  }
  return out;
}
export const itPierRects = (b: Box, s: number) => ({ south: rect(s - 0.65, s + 0.65, b.n0 + 0.25, b.n0 + 1.55), mid: rect(s - 0.55, s + 0.55, b.n1 - 1.35, b.n1 - 0.25) });

/** IT Centre's street stair on the north side: the first dry spot off the carriageways north of the NE end. */
export function itStair(b: Box, roads: Road[], free: (x: number, z: number) => boolean): { s: number; t: number } | null {
  const s = b.half - 6;
  for (let t = b.n1 + 1; t < b.n1 + 16; t += 0.5) {
    const [x, z] = at(b, s, t + 1.5);
    if (onCarriageway(roads, x, z, 1.8) || !free(x, z)) continue;
    return { s, t };
  }
  return null;
}
export const itStairRect = (st: { s: number; t: number }) => rect(st.s - 2.5, st.s + 2.5, st.t, st.t + 3);

/** Dry ground for the stair: off the canal channel (and its bank). */
export function dryOf(map: MapData) {
  const line = canalOf(map).line;
  return (x: number, z: number) => !line || (() => { const c = canalAt(line, x, z); return c.d > c.hw + 1; })();
}

function toSolid(b: Box, r: LocalRect): Solid {
  const [x, z] = at(b, (r.s0 + r.s1) / 2, (r.t0 + r.t1) / 2);
  return box(x, z, b.u[0], b.u[1], r.s1 - r.s0, r.t1 - r.t0);
}

function stationSolids(map: MapData, out: Acc) {
  const { sv, it } = stations();
  for (const [s, t] of svPiers(sv, map.roads)) out.add(toSolid(sv, rect(s - SV_PIER_HALF, s + SV_PIER_HALF, t - SV_PIER_HALF, t + SV_PIER_HALF)));
  const g = svGround(sv, map.roads);
  for (const r of [g.parkWall, ...g.cars, g.tower, g.gateB]) out.wide('station wall', toSolid(sv, r));
  const ga = svGateA();
  for (const r of [...ga.block, ga.mural, ga.pillar, ga.rail]) out.wide('Gate A', toSolid(sv, r));
  // The autos waiting at the kerb stand in the kerb lane: traffic moves out round them (the lane plan below).
  for (const r of ga.autos) out.wide('Gate A autos', toSolid(sv, r));
  for (const p of itPiers(it, map.roads)) {
    const r = itPierRects(it, p.s);
    if (p.south) out.add(toSolid(it, r.south));
    if (p.mid) out.add(toSolid(it, r.mid));
  }
  const st = itStair(it, map.roads, dryOf(map));
  if (st) out.wide('station stair', toSolid(it, itStairRect(st)));
}

/** Everything of the elevated north that stands on the ground, as solids, and what the data put on a road. */
const cache = new WeakMap<MapData, { solids: Solid[]; conflicts: Conflict[]; lanes: ((number | null)[] | undefined)[] }>();
export function elevatedLayout(map: MapData) {
  let c = cache.get(map);
  if (c) return c;
  const out = new Acc(map.roads);
  const { it } = stations();
  const v = viaducts();
  flyoverSolids(flyoverDecks(map.roads), map.roads, out);
  viaductSolids(canalOf(map).piers, v.green, out);
  const orange = orangeLine(map.roads, it);
  viaductSolids(orangePiers(orange, map.roads), v.orange, out);
  stationSolids(map, out);
  // The same lane plan as the streamed world (gen/lanes.ts): ground traffic moves beside a ramp or wall standing on
  // its road where the carriageway has room, and the piece is solid. Only what no lane can pass is reported, and
  // left open so it never cuts a road off.
  const idx = map.roads.map((r, i) => (TRAFFIC_ROADS.has(r.k) && !r.b ? i : -1)).filter((i) => i >= 0);
  const wn = { roads: idx.map((i) => ({ p: map.roads[i].p, road: { w: map.roads[i].w, oneway: !!map.roads[i].o, name: map.roads[i].n || map.roads[i].k, id: `m${i}` } })) } as unknown as WarpedNet;
  const base = out.solids.length;
  const plan = planLanes(wn, [...out.solids, ...out.cands.map((x) => x.s)]);
  out.cands.forEach((x, j) => {
    if (plan.blocked.has(base + j)) out.conflicts.push({ kind: x.kind, x: x.s.x, z: x.s.z, road: plan.blockedRoad.get(base + j) ?? x.road, depth: x.depth });
    else out.solids.push(x.s);
  });
  const lanes: ((number | null)[] | undefined)[] = [];
  idx.forEach((i, k) => { lanes[i] = plan.lane[k]; });
  c = { solids: out.solids, conflicts: out.conflicts, lanes };
  cache.set(map, c);
  return c;
}
export const elevatedSolids = (map: MapData) => elevatedLayout(map).solids;
