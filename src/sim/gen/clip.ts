// The seam between the real Sector V map and the streamed world: the square |x|, |z| <= HALF.
// The real map is clipped to it at load time; net roads (tools/build-world.py) start on its edge at points
// computed by the same formula, so both sides meet at bit-identical coordinates.

import type { MapData, Pt } from '../mapdata';

/** Half the side of the Sector V square, game units (tools/map/geo.py HALF). */
export const HALF = 360;

export const cheb = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z));
export const inSquare = (p: Pt, pad = 0) => cheb(p[0], p[1]) <= HALF + pad;

/** Where segment a (inside) -> b (outside) crosses the square edge. Mirrors square_cut in tools/build-world.py. */
export function squareCut(a: Pt, b: Pt): Pt {
  let t = 1.0;
  for (let k = 0; k < 2; k++) {
    if (Math.abs(b[k]) > HALF) {
      const e = b[k] > 0 ? HALF : -HALF;
      const tk = (e - a[k]) / (b[k] - a[k]);
      if (tk < t) t = tk;
    }
  }
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** The pieces of a polyline inside the square (keep = 'in') or outside it (keep = 'out'), cut on its edge. */
export function clipLine(p: Pt[], keep: 'in' | 'out'): Pt[][] {
  const want = (q: Pt) => inSquare(q) === (keep === 'in');
  const runs: Pt[][] = [];
  let cur: Pt[] | null = null;
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    if (want(q)) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(keep === 'in' ? squareCut(q, p[i - 1]) : squareCut(p[i - 1], q));
      }
      cur.push(q);
    } else if (cur) {
      cur.push(keep === 'in' ? squareCut(p[i - 1], q) : squareCut(q, p[i - 1]));
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.length >= 2 && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1] || r.length > 2));
}

/** Sutherland-Hodgman clip of a ring to the square (grown by `pad`). */
export function clipRing(ring: Pt[], pad = 0): Pt[] {
  const H = HALF + pad;
  let pts = ring;
  for (const [axis, sign] of [[0, 1], [0, -1], [1, 1], [1, -1]] as const) {
    if (pts.length < 3) return [];
    const ins = (q: Pt) => q[axis] * sign <= H;
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i], prev = pts[(i + pts.length - 1) % pts.length];
      if (ins(cur) !== ins(prev)) {
        const t = (H * sign - prev[axis]) / (cur[axis] - prev[axis]);
        out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]);
      }
      if (ins(cur)) out.push(cur);
    }
    pts = out;
  }
  return pts.length >= 3 ? pts : [];
}

const centre = (p: Pt[]): Pt => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];

/**
 * The real map as played: everything that ran past the square is cut at its edge (roads, rails, water, parks)
 * or dropped (compounds, lamps, stops outside), because beyond the edge the streamed world takes over.
 */
export function clipMap(raw: MapData): MapData {
  return {
    ...raw,
    roads: raw.roads.flatMap((r) => clipLine(r.p, 'in').map((p) => ({ ...r, p }))),
    rails: raw.rails.flatMap((p) => clipLine(p, 'in')),
    water: (raw.water ?? []).map((w) => clipRing(w)).filter((w) => w.length),
    green: (raw.green ?? []).map((w) => clipRing(w)).filter((w) => w.length),
    compounds: raw.compounds?.filter((c) => inSquare(centre(c.p))),
    lamps: raw.lamps?.filter((p) => inSquare(p)),
    stops: raw.stops.filter((s) => inSquare(s.p)),
  };
}
