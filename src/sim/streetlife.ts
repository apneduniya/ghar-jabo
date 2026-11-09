// Turns the surveyed street-life data (content/streetlife.ts) into world positions: frames along a street line,
// the kerb on either side, hawker rows that stay off every carriageway, and the medians of divided roads.
// Pure: no three.js. The renderer (render/world/stalls.ts, furniture.ts, streetkit.ts) only draws the results.

import { FOOTPATH, MEDIANS, STREETS, UNITS_PER_M, type MedianKind, type RowSpec, type Side, type Spot, type StallKind } from '../content/streetlife';
import type { Pt, Road } from './mapdata';

export interface Frame { x: number; z: number; dx: number; dz: number }

const COMPASS: Record<Side, Pt> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [0.707, -0.707], SW: [-0.707, 0.707] };
const MAIN = new Set(['primary', 'trunk', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']);

/** Point and unit tangent `m` metres along a polyline (extrapolated past either end along the end segment). */
export function frameAt(line: Pt[], m: number): Frame {
  let left = m * UNITS_PER_M;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const L = Math.hypot(bx - ax, bz - az) || 1;
    if (left <= L || i === line.length - 1) {
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      return { x: ax + dx * left, z: az + dz * left, dx, dz };
    }
    left -= L;
  }
  return { x: line[0][0], z: line[0][1], dx: 1, dz: 0 };
}

/** Metres along `line` of the nearest point to (x, z), and the signed lateral distance (units, + = left of travel). */
export function project(line: Pt[], x: number, z: number) {
  let best = { m: 0, d: Infinity, lat: 0 }, acc = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(L, ((x - ax) * dx + (z - az) * dz) / L));
    const px = ax + dx / L * t, pz = az + dz / L * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { m: (acc + t) / UNITS_PER_M, d, lat: (x - px) * (dz / L) - (z - pz) * (dx / L) };
    acc += L;
  }
  return best;
}

/** The normal of a frame that points towards a compass side. */
export function sideNormal(f: Frame, side: Side): Pt {
  const [cx, cz] = COMPASS[side];
  const nx = f.dz, nz = -f.dx; // left of travel (x east, z south)
  return nx * cx + nz * cz >= 0 ? [nx, nz] : [-nx, -nz];
}

export function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}

/** Clearance answers are capped here: beyond it, "far from any road" is all anyone needs to know. */
export const CLEAR_CAP = 24;
const CELL = 12;
export interface Seg { ax: number; az: number; bx: number; bz: number; half: number; service: boolean; road: Road }

/** Road segments on a spatial hash, each filed in every cell within CLEAR_CAP of it. */
class RoadIndex {
  cells = new Map<string, Seg[]>();
  constructor(roads: Road[]) {
    for (const r of roads) {
      if (r.b && polyLen(r.p) >= 80) continue; // flyover decks are overhead, not in the way
      for (let i = 1; i < r.p.length; i++) {
        const s: Seg = { ax: r.p[i - 1][0], az: r.p[i - 1][1], bx: r.p[i][0], bz: r.p[i][1], half: r.w / 2, service: r.k === 'service', road: r };
        const pad = CLEAR_CAP + s.half;
        const L = Math.hypot(s.bx - s.ax, s.bz - s.az);
        // Walk the segment and file it in the cells around each step (cheaper than its whole bounding box).
        const done = new Set<string>();
        for (let d = 0; d <= L + CELL; d += CELL / 2) {
          const t = Math.min(1, d / (L || 1)), x = s.ax + (s.bx - s.ax) * t, z = s.az + (s.bz - s.az) * t;
          for (let cx = Math.floor((x - pad) / CELL); cx <= Math.floor((x + pad) / CELL); cx++)
            for (let cz = Math.floor((z - pad) / CELL); cz <= Math.floor((z + pad) / CELL); cz++) {
              const k = `${cx},${cz}`;
              if (done.has(k)) continue;
              done.add(k);
              if (!this.cells.has(k)) this.cells.set(k, []);
              this.cells.get(k)!.push(s);
            }
        }
      }
    }
  }
  near(x: number, z: number): Seg[] { return this.cells.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? []; }
  clear(x: number, z: number, service: boolean) {
    let best = CLEAR_CAP;
    for (const s of this.near(x, z)) {
      if (s.service && !service) continue;
      best = Math.min(best, segDist(x, z, s.ax, s.az, s.bx, s.bz) - s.half);
    }
    return best;
  }
}
const indices = new WeakMap<Road[], RoadIndex>();

/**
 * Distance from (x, z) to the nearest carriageway edge, negative inside one, capped at CLEAR_CAP. Service roads
 * (driveways) count only when asked. Flyover decks never count.
 */
export function clearance(roads: Road[], x: number, z: number, service = false) {
  return index(roads).clear(x, z, service);
}

function index(roads: Road[]) {
  let idx = indices.get(roads);
  if (!idx) { idx = new RoadIndex(roads); indices.set(roads, idx); }
  return idx;
}

/** Every road segment within CLEAR_CAP of (x, z) (and possibly a few more). Flyover decks are left out. */
export function segsNear(roads: Road[], x: number, z: number): Seg[] {
  return index(roads).near(x, z);
}

export function polyLen(p: Pt[]) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}

/** From the street line, outwards along n: how far until the outer kerb (first point clear of every carriageway). */
export function kerbOffset(roads: Road[], f: Frame, n: Pt, max = 20) {
  // The street line is usually on the asphalt (OSM's paired ways overlap); where it sits on a median between
  // narrow carriageways, cross the carriageway first.
  let crossed = false;
  for (let d = 0; d <= max; d += 0.2) {
    const c = clearance(roads, f.x + n[0] * d, f.z + n[1] * d);
    if (c < 0) crossed = true;
    else if (crossed) return d;
  }
  return max;
}

export interface Placed { x: number; z: number; /** rotation about y: local +z faces the road */ rot: number; nx: number; nz: number; dx: number; dz: number; m: number }

function placedAt(f: Frame, n: Pt, off: number, m: number): Placed {
  return { x: f.x + n[0] * off, z: f.z + n[1] * off, rot: Math.atan2(-n[0], -n[1]), nx: n[0], nz: n[1], dx: f.dx, dz: f.dz, m };
}

/** A single piece of street furniture. */
export function placeSpot(roads: Road[], line: Pt[], s: Spot): Placed {
  const f = frameAt(line, s.at), n = sideNormal(f, s.side);
  if (s.where === 'median') return placedAt(f, n, s.off ?? 0, s.at);
  const kerb = kerbOffset(roads, f, n);
  return placedAt(f, n, kerb + (s.where === 'back' ? FOOTPATH : 0) + (s.off ?? 0), s.at);
}

/** Stall footprints along the street (width along the road, depth across), world units. */
export const STALL_SIZE: Record<StallKind, { w: number; d: number }> = {
  tin: { w: 3.6, d: 3 }, tea: { w: 3, d: 2.6 }, shack: { w: 2.8, d: 2.4 }, longtarp: { w: 0, d: 3.2 }, lunch: { w: 0, d: 4 },
  kiosk: { w: 2.2, d: 1.6 }, chairs: { w: 3, d: 1.6 }, food: { w: 3, d: 2.6 },
};

export interface Unit extends Placed { w: number; d: number; kind: StallKind; i: number }

/** Small deterministic hash for variety that never changes between loads. */
export const vary = (i: number, salt = 0) => ((i * 2654435761 + salt * 40503) >>> 0) % 997 / 997;

/**
 * A hawker row: stalls side by side behind the footpath (or `inset` into it), facing the road, on the requested
 * side. Units whose footprint touches any road (driveways included), or that sit at a junction mouth, are left out.
 */
export function placeRow(roads: Road[], line: Pt[], row: RowSpec): Unit[] {
  const size = STALL_SIZE[row.kind];
  const mid = frameAt(line, (row.from + row.to) / 2);
  const typical = kerbOffset(roads, mid, sideNormal(mid, row.side));
  const out: Unit[] = [];
  const total = (row.to - row.from) * UNITS_PER_M;
  let s = 0, i = 0;
  while (s < total - 0.5) {
    const w = row.single ? total : size.w * (0.9 + vary(i, 3) * 0.25);
    const m0 = row.from + s / UNITS_PER_M, m1 = row.from + (s + w) / UNITS_PER_M, m = (m0 + m1) / 2;
    // A surveyed gap (gateway): carry on from its far side.
    const gap = row.gaps?.find(([a, b]) => m1 > a && m0 < b);
    if (gap) { s = (gap[1] - row.from) * UNITS_PER_M; continue; }
    const f = frameAt(line, m), n = sideNormal(f, row.side);
    const kerb = kerbOffset(roads, f, n);
    const p = placedAt(f, n, kerb + FOOTPATH - (row.inset ?? 0) + size.d / 2, m);
    const u: Unit = { ...p, w, d: size.d, kind: row.kind, i };
    // A junction mouth or a side road (the kerb jumps), or a driveway: shuffle along and try again.
    if (Math.abs(kerb - typical) > 1.5 || !footprintClear(roads, u)) {
      if (row.single) break;
      s += 0.8;
      continue;
    }
    out.push(u);
    i++;
    s += w + (row.single ? 0 : 0.1);
  }
  return out;
}

/** Corners and centre of a unit's footprint are all off the roads (service driveways too). */
export function footprintClear(roads: Road[], u: { x: number; z: number; dx: number; dz: number; nx: number; nz: number; w: number; d: number }, pad = 0.15) {
  for (const a of [-0.5, 0, 0.5]) for (const b of [-0.5, 0, 0.5]) {
    const x = u.x + u.dx * u.w * a + u.nx * u.d * b, z = u.z + u.dz * u.w * a + u.nz * u.d * b;
    if (clearance(roads, x, z) < pad) return false;
    // Driveways cut a row only where they cross it: OSM's lanes along a kerb or behind a row don't count.
    for (const g of segsNear(roads, x, z)) {
      if (!g.service) continue;
      const L = Math.hypot(g.bx - g.ax, g.bz - g.az) || 1;
      if (Math.abs(((g.bx - g.ax) * u.dx + (g.bz - g.az) * u.dz) / L) < 0.7 && segDist(x, z, g.ax, g.az, g.bx, g.bz) - g.half < pad) return false;
    }
  }
  return true;
}

export interface MedianPiece { x: number; z: number; dx: number; dz: number; len: number; gap: number }

/**
 * Medians of divided roads. OSM maps them as two one-way ways in opposite directions; the median is the
 * strip halfway between them. Pieces are left out where another road crosses (junctions, U-turn gaps)
 * and on flyover decks.
 */
export function medians(roads: Road[], step = 3): MedianPiece[] {
  const isWay = (r: Road) => !!r.o && MAIN.has(r.k) && !r.b;
  const ways = roads.filter(isWay);
  const order = new Map(ways.map((r, i) => [r, i]));
  const out: MedianPiece[] = [];
  ways.forEach((a, ai) => {
    for (let i = 1; i < a.p.length; i++) {
      const [ax, az] = a.p[i - 1], [bx, bz] = a.p[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < step) continue;
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = step / 2; s < L; s += step) {
        const x = ax + dx * s, z = az + dz * s;
        let best: { d: number; px: number; pz: number; b: Road } | null = null;
        for (const g of segsNear(roads, x, z)) {
          if (g.road === a || !isWay(g.road)) continue;
          const ux = g.bx - g.ax, uz = g.bz - g.az, M = Math.hypot(ux, uz) || 1;
          // Parallel (OSM sometimes has both halves of a divided road pointing the same way, as on Street 18).
          if (Math.abs((ux * dx + uz * dz) / M) < 0.85) continue;
          const t = Math.max(0, Math.min(M, ((x - g.ax) * ux + (z - g.az) * uz) / M));
          const px = g.ax + ux / M * t, pz = g.az + uz / M * t, d = Math.hypot(px - x, pz - z);
          if (d >= 3.5 && d <= a.w / 2 + g.half + 3 && (!best || d < best.d)) best = { d, px, pz, b: g.road };
        }
        if (!best) continue;
        const { d, px, pz, b } = best as { d: number; px: number; pz: number; b: Road };
        if ((order.get(b) ?? 0) < ai) continue; // each pair once
        const mx = (x + px) / 2, mz = (z + pz) / 2;
        // A crossing road (not one of the pair) through this piece makes a gap. A way continuing the pair
        // in the same line is not a crossing.
        const crossed = segsNear(roads, mx, mz).some((g) => g.road !== a && g.road !== b && !g.service &&
          segDist(mx, mz, g.ax, g.az, g.bx, g.bz) < g.half + 1.5 &&
          Math.abs(((g.bx - g.ax) * dx + (g.bz - g.az) * dz) / (Math.hypot(g.bx - g.ax, g.bz - g.az) || 1)) < 0.8);
        if (!crossed) out.push({ x: mx, z: mz, dx, dz, len: step, gap: d });
      }
    }
  });
  return out;
}

/** The surveyed median kind and width for a piece (by the street it lies on), or a plain hedge elsewhere. */
export function medianStyle(p: { x: number; z: number }): { kind: MedianKind; width: number } {
  for (const m of MEDIANS) {
    const q = project(STREETS[m.street], p.x, p.z);
    if (q.d < 2.5 && q.m >= m.from && q.m < m.to) return { kind: m.kind, width: m.width };
  }
  return { kind: 'hedge', width: 1.4 };
}

/** Nearest point on a non-service road to (x, z) and that road's direction there. */
export function nearestRoad(roads: Road[], x: number, z: number) {
  let best = { d: Infinity, x, z, dx: 1, dz: 0 };
  for (const g of segsNear(roads, x, z)) {
    if (g.service) continue;
    const ux = g.bx - g.ax, uz = g.bz - g.az, L = Math.hypot(ux, uz) || 1;
    const t = Math.max(0, Math.min(L, ((x - g.ax) * ux + (z - g.az) * uz) / L));
    const px = g.ax + ux / L * t, pz = g.az + uz / L * t, d = Math.hypot(px - x, pz - z);
    if (d < best.d) best = { d, x: px, z: pz, dx: ux / L, dz: uz / L };
  }
  return best;
}
