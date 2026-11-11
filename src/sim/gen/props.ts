// Street furniture and life along every street: lamps on main roads, trees, wire poles (old city), hawker stalls
// and handcarts (more near markets and Sealdah), parked vehicles, shrines, bus stops at real stops, puddles at
// sourced waterlogging spots, and timed-mode dead ends. Positions come from global arc lengths, so a prop belongs
// to exactly one chunk (the one containing it) whichever chunk computes it.

import { deadEnds } from '../../content/text';
import { AREA_STYLE, FLOOD_SPOTS, GEN } from '../../content/worldgen';
import { HALF } from './clip';
import { clipSegToBox, hash, Hasher, rectRing } from './geom';
import { frame, type Obstacles, type SegIndex } from './plots';
import { areaOf, type Box, type Ctx, footOf, meets, type Street } from './streets';
import type { GenProp, Pt } from './types';

const inBox = (b: Box, x: number, z: number) => x >= b[0] && x < b[2] && z >= b[1] && z < b[3];
/** Does any segment of p pass through the box (ends outside it)? */
const crosses = (p: Pt[], b: Box) => p.some((q, i) => i > 0 && clipSegToBox(p[i - 1], q, b[0], b[1], b[2], b[3]) !== null);

function freeSpot(ctx: Ctx, x: number, z: number, idx: SegIndex, ob: Obstacles, onRoadOk = false): boolean {
  if (Math.abs(x) < HALF + 4 && Math.abs(z) < HALF + 4) return false;
  if (!onRoadOk && idx.onRoad(x, z, 0.2)) return false;
  for (const c of ob.circles) if (Math.hypot(c.x - x, c.z - z) < c.r) return false;
  return !ctx.water.point(x, z);
}

/** Props along one street, kept if they fall in the chunk box. */
function streetProps(ctx: Ctx, s: Street, cb: Box, idx: SegIndex, ob: Obstacles, out: GenProp[]) {
  const L = s.cum[s.cum.length - 1];
  if (L < 4 || s.bridge) return;
  const foot = footOf(s);
  const main = s.real && (s.cls === 'primary' || s.cls === 'secondary' || s.cls === 'tertiary');
  const sides = s.real && s.w > 8 ? [1] : [1, -1];
  for (const side of sides) {
    const h = new Hasher([ctx.seed, s.key, side, 53]);
    if (s.hawkers === side) { hawkerRow(ctx, s, side, cb, idx, ob, h, out); continue; }
    const slot = 7;
    for (let at = h.range(2, slot), n = 0; at < L - 2 && n < 600; at += slot, n++) {
      const [x, z, tx, tz] = frame(s, at);
      const nx = tz * side, nz = -tx * side;
      const area = areaOf(ctx, x, z);
      const st = AREA_STYLE[area.kind];
      const kerb = s.w / 2 + 0.35, outer = s.w / 2 + foot - 0.4;
      const rot = Math.atan2(tz, tx);
      const put = (kind: GenProp['kind'], d: number, extra: Partial<GenProp> = {}, onRoad = false) => {
        const px = x + nx * d, pz = z + nz * d;
        if (!inBox(cb, px, pz) || !freeSpot(ctx, px, pz, idx, ob, onRoad)) return;
        out.push({ kind, x: px, z: pz, rot, ...extra });
      };
      const r = h.next();
      const nearMarket = ob.circles.some((c) => c.market && Math.hypot(c.x - x, c.z - z) < 90);
      const stallP = st.stall * (nearMarket ? 2.5 : 1);
      if (main && n % Math.round(GEN.lampEvery / slot) === 0) put('lamp', kerb);
      else if (st.wires && n % Math.round(GEN.poleEvery / slot) === 0 && side === -1) put('pole', kerb, { len: GEN.poleEvery });
      else if (r < stallP) put(h.chance(0.15) ? 'cart' : 'stall', outer - 0.6, { len: h.range(2.5, 4.5), v: h.int(0, 5) });
      else if (r < stallP + st.tree * 0.35) put(area.kind === 'saltlake' && h.chance(0.15) ? 'palm' : 'tree', outer, { v: h.int(0, 3) });
      else if (r < stallP + st.tree * 0.35 + st.parked && !main) put(h.chance(0.6) ? 'parked-bike' : 'parked-car', s.w / 2 - 0.9, { v: h.int(0, 5) }, true);
      else if (r < stallP + st.tree * 0.35 + st.parked + st.handcart) put('handcart', outer - 0.5, { v: h.int(0, 3) });
      else if (r < stallP + st.tree * 0.35 + st.parked + st.handcart + st.shrine) put('shrine', outer, { v: h.int(0, 3) });
    }
  }
  if (s.deadEnd) {
    const end = s.p[s.p.length - 1], prev = s.p[s.p.length - 2];
    const dx = end[0] - prev[0], dz = end[1] - prev[1];
    if (inBox(cb, end[0], end[1])) {
      const text = deadEnds[Math.floor(hash(ctx.seed, s.key, 9) * deadEnds.length)];
      out.push({ kind: 'dead-end', x: end[0], z: end[1], rot: Math.atan2(dz, dx), len: s.w + 2 * foot, text, v: Math.floor(hash(s.key, 3) * 4) });
    }
  }
}

/** The dead-end barrier across a stub's end, as a collision ring. */
export function deadEndRing(p: GenProp): Pt[] {
  const ux = Math.cos(p.rot), uz = Math.sin(p.rot);
  return rectRing({ x: p.x + ux * 0.3, z: p.z + uz * 0.3, ux: -uz, uz: ux, hl: (p.len ?? 4) / 2 + 0.5, hd: 0.4 });
}

export function props(ctx: Ctx, cb: Box, streets: Street[], idx: SegIndex, ob: Obstacles): GenProp[] {
  const out: GenProp[] = [];
  const near: Box = [cb[0] - 14, cb[1] - 14, cb[2] + 14, cb[3] + 14];
  for (const s of streets) if (meets(near, ...s.box) && (s.p.some((q) => q[0] >= near[0] && q[0] <= near[2] && q[1] >= near[1] && q[1] <= near[3]) || crosses(s.p, near))) streetProps(ctx, s, cb, idx, ob, out);
  // Bus stops at real stops: on the footpath of the nearest real road, facing along it.
  for (const st of ctx.wn.stops) {
    if (!inBox(cb, st.x, st.z)) continue;
    const r = ctx.wn.nearestRoad(st.x, st.z, 25);
    if (!r) continue;
    const side = (st.x - r.x) * Math.sin(r.heading) - (st.z - r.z) * Math.cos(r.heading) >= 0 ? 1 : -1;
    const d = r.r.road.w / 2 + 1.2;
    const x = r.x + Math.sin(r.heading) * side * d, z = r.z - Math.cos(r.heading) * side * d;
    if (inBox(cb, x, z)) out.push({ kind: 'bus-stop', x, z, rot: r.heading + (side < 0 ? Math.PI : 0), text: st.name });
  }
  // Puddles only where waterlogging is reported (content/worldgen.ts FLOOD_SPOTS), on the road.
  for (const f of FLOOD_SPOTS) {
    const [gx, gz] = ctx.warp.toGame([f.x, f.z]);
    const r = ctx.wn.nearestRoad(gx, gz, 30);
    if (!r || !inBox(cb, r.x, r.z)) continue;
    out.push({ kind: 'puddle', x: r.x, z: r.z, rot: r.heading, len: f.r * 2 });
  }
  return out;
}

/**
 * A continuous row of tin-roofed stalls shoulder to shoulder along one side, facing the walkway (Sealdah's walk-in
 * beside Vidyapati Setu: a ~3 m stall row against the flyover side, then the ~4 m walk; GAPS.md re-shoot).
 */
function hawkerRow(ctx: Ctx, s: Street, side: number, cb: Box, idx: SegIndex, ob: Obstacles, h: Hasher, out: GenProp[]) {
  const L = s.cum[s.cum.length - 1], d = s.w / 2 + GEN.hawkerGap, step = GEN.hawkerStep;
  // On the real road's own distance, so the row runs on unbroken across the pieces it is cut into.
  const from = s.from ?? 0;
  for (let at = Math.ceil((from + step / 2) / step) * step - step / 2 - from; at < L; at += step) {
    if (at < 0) continue;
    const [x, z, tx, tz] = frame(s, at);
    const px = x + tz * side * d, pz = z - tx * side * d;
    if (!inBox(cb, px, pz) || idx.onRoad(px, pz, 0.2, false, true) || ctx.water.point(px, pz)) continue;
    if (Math.abs(px) < HALF + 4 && Math.abs(pz) < HALF + 4) continue;
    // Landmark clear zones count only on the stalls' own side: across the walk stand the church and the station,
    // behind their fences, and their zones reach over the lane.
    if (ob.circles.some((c) => Math.hypot(c.x - px, c.z - pz) < c.r && ((c.x - x) * tz - (c.z - z) * tx) * side > 0)) continue;
    // Facing the walkway: stalls on the left of travel turn to the right, and the other way round.
    out.push({ kind: h.chance(0.12) ? 'cart' : 'stall', x: px, z: pz, rot: Math.atan2(tz, tx), len: GEN.hawkerStep - 0.2, v: h.int(0, 5) });
  }
}
