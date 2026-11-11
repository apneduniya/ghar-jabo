// Layout of the elevated north, shared by the renderer, the camera and the rules: the two Nabadiganta flyover
// decks, the Green Line alignment and its pier spots, the two metro stations, the Orange Line along the
// Biswa Bangla Sarani median, and the street entrance of Sector V station. Pure geometry: no three.js.

import { north as N } from '../content/sectorv';
import type { Pt, Road } from './mapdata';

export const FLYOVER_MIN_LEN = 80; // shorter "bridges" in OSM are canal crossings, not flyovers

export function polyLen(p: Pt[]) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}
export const isFlyover = (r: Road) => !!r.b && polyLen(r.p) >= FLYOVER_MIN_LEN;
export const isCanalBridge = (r: Road) => !!r.b && polyLen(r.p) < FLYOVER_MIN_LEN;

export interface Sample { x: number; z: number; dx: number; dz: number; d: number }

/** Points about every `step` along a polyline (both ends included), with the direction and distance there. */
export function resample(p: Pt[], step: number): Sample[] {
  const out: Sample[] = [];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L, n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push({ x: ax + dx * L * k / n, z: az + dz * L * k / n, dx, dz, d: acc + L * k / n });
    acc += L;
  }
  const last = out[out.length - 1];
  if (last) out.push({ x: p[p.length - 1][0], z: p[p.length - 1][1], dx: last.dx, dz: last.dz, d: acc });
  return out;
}

/** The nearest point on a polyline to (x, z), with that segment's direction and end index `i`. */
export function nearest(p: Pt[], x: number, z: number) {
  const best = { d: Infinity, x: 0, z: 0, dx: 1, dz: 0, i: 1 };
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
    if (L2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
    const qx = ax + ex * t, qz = az + ez * t, d = Math.hypot(qx - x, qz - z);
    if (d < best.d) { const L = Math.sqrt(L2); Object.assign(best, { d, x: qx, z: qz, dx: ex / L, dz: ez / L, i }); }
  }
  return best;
}

/** Road segments at grade on a coarse grid, so "is this on a carriageway" doesn't scan the whole map. */
const CELL = 24;
const indexes = new WeakMap<Road[], Map<string, { s: Pt[]; half: number; road: Road }[]>>();
function roadIndex(roads: Road[]) {
  let idx = indexes.get(roads);
  if (idx) return idx;
  idx = new Map();
  for (const road of roads) {
    if (road.b) continue;
    for (let i = 1; i < road.p.length; i++) {
      const a = road.p[i - 1], b = road.p[i], g = road.w / 2 + 3;
      const e = { s: [a, b], half: road.w / 2, road };
      for (let cx = Math.floor((Math.min(a[0], b[0]) - g) / CELL); cx <= Math.floor((Math.max(a[0], b[0]) + g) / CELL); cx++)
        for (let cz = Math.floor((Math.min(a[1], b[1]) - g) / CELL); cz <= Math.floor((Math.max(a[1], b[1]) + g) / CELL); cz++) {
          const k = `${cx},${cz}`, list = idx.get(k);
          if (list) list.push(e); else idx.set(k, [e]);
        }
    }
  }
  indexes.set(roads, idx);
  return idx;
}

/** True if (x, z) is on a carriageway at grade (bridges and flyovers excluded), grown by `pad` (at most 3). */
export function onCarriageway(roads: Road[], x: number, z: number, pad = 0, except?: Road) {
  for (const e of roadIndex(roads).get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? [])
    if (e.road !== except && nearest(e.s, x, z).d < e.half + pad) return true;
  return false;
}

// --- Stations: oriented boxes.

export interface Box { c: Pt; u: Pt; n: Pt; half: number; n0: number; n1: number }

function orient(a: Pt, b: Pt, n0: number, n1: number): Box {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  return { c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], u, n: [u[1], -u[0]], half: L / 2, n0, n1 };
}
/** World point at `s` along the box's long axis and `t` across it (+t is north-west). */
export const at = (b: Box, s: number, t: number): Pt => [b.c[0] + b.u[0] * s + b.n[0] * t, b.c[1] + b.u[1] * s + b.n[1] * t];
export function local(b: Box, x: number, z: number): Pt {
  const dx = x - b.c[0], dz = z - b.c[1];
  return [dx * b.u[0] + dz * b.u[1], dx * b.n[0] + dz * b.n[1]];
}
export function inBox(b: Box, x: number, z: number, grow = 0) {
  const [s, t] = local(b, x, z);
  return Math.abs(s) <= b.half + grow && t >= b.n0 - grow && t <= b.n1 + grow;
}
/** A smaller box inside `b`'s frame: s0..s1 along, t0..t1 across. */
function sub(b: Box, s0: number, s1: number, t0: number, t1: number): Box {
  return { c: at(b, (s0 + s1) / 2, (t0 + t1) / 2), u: b.u, n: b.n, half: (s1 - s0) / 2, n0: -(t1 - t0) / 2, n1: (t1 - t0) / 2 };
}
export function stations() {
  const sv = orient(N.sectorV.a, N.sectorV.b, N.sectorV.n0, N.sectorV.n1);
  const [s0, s1, t0] = N.gateBlock;
  return { sv, it: orient(N.itCentre.a, N.itCentre.b, N.itCentre.n0, N.itCentre.n1), gate: sub(sv, s0, s1, t0, sv.n0 + 0.2) };
}

/**
 * Where you stand in Sector V's Gate A doorway: on the station (north-west) side of the service road, in the ground
 * block under the station's SW end (content/sectorv.ts north.gateA). Not OSM's node, which is across the road.
 */
export function gateADoor(): Pt {
  const { sv } = stations();
  return at(sv, N.gateA.door, N.gateA.stand);
}

// --- The Nabadiganta flyover: two decks, one per direction.

export interface Deck { road: Road; p: Pt[]; d: number[]; total: number; w: number; ne: boolean; rampA: number; rampB: number; flatB: number }

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * OSM maps the flyover as two one-way ways only 4 units apart, so the decks would overlap. The NE-bound deck stays
 * on its OSM line (the Canal Side service road runs right beside it); the SW-bound deck moves south-east to
 * deckW + deckGap between centres, easing back to the OSM line over the last 30 units at each end (at grade).
 * The NE-bound deck lands before the station: its last `flatB` units are at grade, beside Gate A.
 */
export function flyoverDecks(roads: Road[]): Deck[] {
  const fly = roads.filter(isFlyover);
  const SEP = N.deckW + N.deckGap;
  return fly.map((road) => {
    const others = fly.filter((o) => o !== road);
    const s = resample(road.p, 3);
    const total0 = s[s.length - 1].d;
    const ne = road.p[road.p.length - 1][0] > road.p[0][0];
    const p: Pt[] = s.map((q) => {
      if (ne) return [q.x, q.z];
      let m: ReturnType<typeof nearest> | null = null;
      for (const o of others) { const k = nearest(o.p, q.x, q.z); if (!m || k.d < m.d) m = k; }
      if (!m || m.d >= SEP) return [q.x, q.z];
      let ox = q.x - m.x, oz = q.z - m.z;
      const L = Math.hypot(ox, oz);
      if (L > 0.3) { ox /= L; oz /= L; } else { ox = q.dz; oz = -q.dx; } // left of travel
      const push = (SEP - m.d) * smooth(Math.min(1, Math.min(q.d, total0 - q.d) / 30));
      return [q.x + ox * push, q.z + oz * push];
    });
    const d = [0];
    for (let i = 1; i < p.length; i++) d.push(d[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    return { road, p, d, total: d[d.length - 1], w: N.deckW, ne, rampA: N.ramp, rampB: ne ? N.rampLong : N.ramp, flatB: ne ? N.landing : 0 };
  });
}

/** Deck top height at distance `dist` along a deck. */
export function deckY(deck: Deck, dist: number) {
  const t = Math.max(0, Math.min(1, dist / deck.rampA, (deck.total - deck.flatB - dist) / deck.rampB));
  return N.flyoverH * smooth(t);
}

/**
 * What is overhead at (x, z): the underside height of a flyover deck or a station, if any.
 * The camera stays below it so it never ends up inside the concrete.
 */
export function roofs(roads: Road[]) {
  const pts: { x: number; z: number; y: number; r: number }[] = [];
  for (const deck of flyoverDecks(roads)) for (let i = 0; i < deck.p.length; i++) {
    const y = deckY(deck, deck.d[i]);
    if (y > 3.5) pts.push({ x: deck.p[i][0], z: deck.p[i][1], y: y - 0.9, r: deck.w / 2 + 1.2 });
  }
  const { sv, it, gate } = stations();
  return (x: number, z: number): number | undefined => {
    if (inBox(sv, x, z, 1) || inBox(it, x, z, 1) || inBox(gate, x, z, 1)) return N.stationUnderside;
    let y: number | undefined;
    for (const q of pts) if (Math.abs(q.x - x) < q.r && Math.abs(q.z - z) < q.r && Math.hypot(q.x - x, q.z - z) < q.r) y = Math.min(y ?? Infinity, q.y);
    return y;
  };
}

// --- Metro viaducts.

/** The Green Line as one double-track viaduct: the midline of OSM's two Line-2 ways, within `lim` of the centre. */
export function greenLine(rails: Pt[][], lim = 440): Pt[] {
  if (!rails.length) return [];
  const out: Pt[] = [];
  for (const q of resample(rails[0], 4)) {
    if (Math.abs(q.x) > lim || Math.abs(q.z) > lim) { if (out.length) break; continue; }
    const m = rails[1] ? nearest(rails[1], q.x, q.z) : null;
    out.push(m && m.d < 8 ? [(q.x + m.x) / 2, (q.z + m.z) / 2] : [q.x, q.z]);
  }
  return out;
}

export interface Pier extends Sample { cx: number; cz: number }

/**
 * Pier positions every `step` along a line. A pier that would land on a carriageway first slides sideways up to
 * 8 units (onto a median or footpath, with a longer hammerhead back to the deck), then forward up to 6 units, or
 * is dropped. `skip` marks stretches (inside a station) that need none. (x, z) is on the line, (cx, cz) the column.
 */
export function pierSpots(line: Pt[], step: number, roads: Road[], pad = 0.9, skip?: (x: number, z: number) => boolean): Pier[] {
  const out: Pier[] = [];
  let next = step / 2;
  for (const q of resample(line, 1)) {
    if (q.d < next) continue;
    if (skip?.(q.x, q.z)) { next = q.d + 1; continue; }
    let col: Pt | null = null;
    for (const o of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8]) {
      const cx = q.x + q.dz * o, cz = q.z - q.dx * o;
      if (!onCarriageway(roads, cx, cz, pad)) { col = [cx, cz]; break; }
    }
    if (!col) { if (q.d - next > 6) next += step; continue; }
    out.push({ ...q, cx: col[0], cz: col[1] });
    next = q.d + step;
  }
  return out;
}

/**
 * The Orange Line beyond IT Centre: it starts on the station's axis and eases onto the Biswa Bangla Sarani median,
 * halfway between the two one-way carriageways, for `len` units.
 */
export function orangeLine(roads: Road[], it: Box, len = 150): Pt[] {
  const prim = roads.filter((r) => !r.b && r.o && r.k === 'primary');
  let p = at(it, it.half - 4, 0), dir: Pt = [it.u[0], it.u[1]];
  const out: Pt[] = [p];
  for (let i = 0; i < len / 4; i++) {
    let q: Pt = [p[0] + dir[0] * 4, p[1] + dir[1] * 4];
    let a: ReturnType<typeof nearest> | null = null, b: ReturnType<typeof nearest> | null = null;
    for (const r of prim) {
      const m = nearest(r.p, q[0], q[1]);
      if (m.d > 14) continue;
      const same = m.dx * dir[0] + m.dz * dir[1];
      if (same > 0.5 && (!a || m.d < a.d)) a = m;
      if (same < -0.5 && (!b || m.d < b.d)) b = m;
    }
    if (a && b) q = [q[0] + ((a.x + b.x) / 2 - q[0]) * 0.5, q[1] + ((a.z + b.z) / 2 - q[1]) * 0.5];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
    p = q;
    out.push(q);
  }
  return out;
}
