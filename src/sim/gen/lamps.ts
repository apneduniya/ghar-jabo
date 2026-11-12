// Street lighting for the streamed world (task 031): lamps on both kerbs of every real road, median lights in the
// median of the divided arterials, and high masts at the named junctions. Positions come from the real road's own
// arc length (`from`), so the spacing runs on unbroken across the pieces a road is cut into and a lamp belongs to
// exactly one chunk. `lampPool` says where each lamp's light lands on the ground.

import { AREA_STYLE, LAMPS } from '../../content/worldgen';
import { frame } from './plots';
import { areaOf, type Box, type Ctx, type Street } from './streets';
import type { WarpedNet, WRoad } from './net';
import type { GenProp } from './types';

/** `v` of a 'lamp' prop: which post it is. */
export const LampKind = { trident: 0, tube: 1, median: 2, mast: 3 } as const;

/** Is this spot free for a post (off every carriageway, out of water and landmark zones)? */
export type SpotOk = (x: number, z: number) => boolean;

const inBox = (b: Box, x: number, z: number) => x >= b[0] && x < b[2] && z >= b[1] && z < b[3];

/** Does this street get lamps? Every real road except bridges (flyover decks carry their own, decks.ts). */
export const lit = (s: Street) => s.real && !s.bridge;

const byKey = new WeakMap<WarpedNet, Map<number, WRoad>>();
/** The net road a real street was cut from (streets.ts keys its pieces `road key * 16 + piece`). */
function netRoad(ctx: Ctx, s: Street) {
  let m = byKey.get(ctx.wn);
  if (!m) { m = new Map(ctx.wn.roads.map((r) => [r.key, r])); byKey.set(ctx.wn, m); }
  return m.get(Math.floor(s.key / 16));
}

/**
 * The other carriageway of a divided road at (x, z), looking right of travel (-tz, tx): the nearest one-way road
 * running the other way within LAMPS.pairReach of the kerb. Its centre line's distance and the road, or null.
 */
export function partnerAt(ctx: Ctx, own: WRoad, x: number, z: number, tx: number, tz: number) {
  const rx = -tz, rz = tx, reach = own.road.w / 2 + LAMPS.pairReach;
  let best: { off: number; r: WRoad } | null = null;
  for (const r of ctx.wn.roadsIn(x - reach, z - reach, x + reach, z + reach)) {
    if (r === own || !r.road.oneway || r.road.bridge) continue;
    for (let k = 1; k < r.p.length; k++) {
      const [ax, az] = r.p[k - 1], [bx, bz] = r.p[k], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (L < 1e-6 || (dx * tx + dz * tz) / L > -0.8) continue; // anti-parallel only
      // The ray (x, z) + u (rx, rz) against the segment a + v (b - a).
      const den = rx * dz - rz * dx;
      if (Math.abs(den) < 1e-9) continue;
      const u = ((ax - x) * dz - (az - z) * dx) / den, v = ((ax - x) * rz - (az - z) * rx) / den;
      if (v < 0 || v > 1 || u <= 0 || u > reach) continue;
      if (!best || u < best.off) best = { off: u, r };
    }
  }
  return best;
}

/** Candidate posts per street, before the chunk's own checks (every chunk near a street asks for them). */
const candCache = new WeakMap<Ctx, Map<number, GenProp[]>>();

function candidates(ctx: Ctx, s: Street): GenProp[] {
  let m = candCache.get(ctx);
  if (!m) { m = new Map(); candCache.set(ctx, m); }
  const hit = m.get(s.key);
  if (hit) return hit;
  const out: GenProp[] = [];
  const own = netRoad(ctx, s);
  const L = s.cum[s.cum.length - 1], from = s.from ?? 0;
  const oneway = !!own?.road.oneway && s.cls === 'primary';
  for (const side of [1, -1]) {
    // One-way primary roads look for a median on their right (traffic keeps left, so that's the inner side).
    const inner = side === -1 && oneway;
    const step = inner ? LAMPS.medianEvery : LAMPS.every;
    // Global phase along the real road, the far kerb staggered by half a step.
    const phase = side === 1 ? 0 : step / 2;
    const first = Math.ceil((from - phase) / step) * step + phase - from;
    for (let at = first; at < L; at += step) {
      if (at < 0) continue;
      const [x, z, tx, tz] = frame(s, at);
      const nx = tz * side, nz = -tx * side;
      const pair = inner && own ? partnerAt(ctx, own, x, z, tx, tz) : null;
      if (pair && own) {
        // A divided road: a median light midway between the inner edges, placed by the lower-numbered carriageway
        // only, so the pair doesn't light its median twice. Where the carriageways touch there's no median: no post.
        const gap = pair.off - s.w / 2 - pair.r.road.w / 2;
        if (gap < LAMPS.medianGap || own.i > pair.r.i) continue;
        const d = s.w / 2 + gap / 2;
        out.push({ kind: 'lamp', x: x + nx * d, z: z + nz * d, rot: Math.atan2(-nx, -nz), v: LampKind.median });
        continue;
      }
      const d = s.w / 2 + LAMPS.kerb, px = x + nx * d, pz = z + nz * d;
      const v = AREA_STYLE[areaOf(ctx, px, pz).kind].wires ? LampKind.tube : LampKind.trident;
      out.push({ kind: 'lamp', x: px, z: pz, rot: Math.atan2(-nx, -nz), v });
    }
  }
  if (m.size > 20000) m.clear();
  m.set(s.key, out);
  return out;
}

/**
 * Lamps along one street, kept if they fall in the chunk box and their spot is free. Side 1 is the left of the
 * street's direction (the outer kerb when it's one-way), side -1 the right. Each post faces the road (`rot` turns
 * local +z toward the carriageway).
 */
export function streetLamps(ctx: Ctx, s: Street, cb: Box, ok: SpotOk, out: GenProp[]) {
  if (!lit(s)) return;
  for (const p of candidates(ctx, s)) if (inBox(cb, p.x, p.z) && ok(p.x, p.z)) out.push({ ...p });
}

/**
 * A high mast near each named junction in LAMPS.masts close to the chunk box: the first free spot on rings
 * around the junction, facing it, kept by the chunk holding it; `len` is the distance to the junction (its pool
 * is centred toward it).
 */
export function junctionMasts(ctx: Ctx, cb: Box, ok: SpotOk, out: GenProp[]) {
  const [r0, r1] = LAMPS.mastRing;
  for (const l of ctx.wn.landmarks) {
    if (!(LAMPS.masts as readonly string[]).includes(l.id)) continue;
    if (l.gx < cb[0] - r1 || l.gx > cb[2] + r1 || l.gz < cb[1] - r1 || l.gz > cb[3] + r1) continue;
    spot: for (let r = Math.max(r0, l.r + 2); r <= r1; r += 2) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x = l.gx + Math.cos(a) * r, z = l.gz + Math.sin(a) * r;
        if (!ok(x, z)) continue;
        if (inBox(cb, x, z)) out.push({ kind: 'lamp', x, z, rot: Math.atan2(l.gx - x, l.gz - z), v: LampKind.mast, len: r });
        break spot;
      }
    }
  }
}

/** Where a lamp's light lands: [x, z, radius] of its pool on the ground. */
export function lampPool(p: GenProp): [number, number, number] {
  const v = p.v ?? 0;
  const [r, ahead] = v === LampKind.mast ? LAMPS.pool.mast : v === LampKind.median ? LAMPS.pool.median : v === LampKind.tube ? LAMPS.pool.tube : LAMPS.pool.trident;
  const fwd = v === LampKind.mast ? (p.len ?? 0) * 0.6 : ahead;
  return [p.x + Math.sin(p.rot) * fwd, p.z + Math.cos(p.rot) * fwd, r];
}
