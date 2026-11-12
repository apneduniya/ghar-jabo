// Where the streamed world's landmark models stand, and what of them is solid (task 030). The models
// (src/render/world/landmarks/) are true size, but in timed their positions are warped, so the roads around them
// are squeezed closer and a 40 x 56 mall can land on a carriageway (AUDIT.md 11). Here every model's ground footprint
// (in its own frame: u toward the road it faces, v across, as the renderer's Frame) is tested against every net
// carriageway, and a model that overlaps one slides back from the road (turning a little if that helps) until it
// fits. Junction kiosks and statues (12) either get a small raised island that the lanes route round, like a pier,
// or move to the corner footpath. The renderer, the collision (solids.ts landmarkSolids) and the generator's clear
// zones (net.ts) all read the placement from here, so what you see is what stops you. Pure: no three.js.

import { rectSegDist, type Rect } from './geom';
import { laneFree } from './lanes';
import { type Line, inSectorV } from './lines';
import { framePt, groundRoadsNear, memo, metroLayout, roadNear, warpHeading } from './layout';
import type { Landmark, LandmarkKind, NetRoad, Warp, WorldNet } from './types';

/** A box in a model's frame: u0..u1 along its facing, v0..v1 across. */
export type FrameRect = [number, number, number, number];

/** A model's ground footprint (kept off carriageways) and its solid parts (collision). */
export interface ModelSize { foot: FrameRect[]; solid: FrameRect[] }

const box = (h: number): FrameRect => [-h, h, -h, h];

/**
 * Footprints and solids per model, from the boxes the renderer draws (places.ts, surveyed.ts, junctions.ts,
 * stations.ts; index.test.ts checks the drawn models stay inside their footprint). Thin posts, palms, hoarding legs
 * and parked vehicles are left out of the solids.
 */
const SIZES: Partial<Record<LandmarkKind | 'city-centre', ModelSize>> = {
  mall: { foot: [[-40.3, 4.5, -28.3, 28.3]], solid: [[-40, 0, -28, 28]] },
  'city-centre': { foot: [[-36, 5, -32, 32]], solid: [[-34.3, 0.3, -30.3, 30.3]] },
  hospital: { foot: [[-40, 0.1, -24, 24]], solid: [[-40, -6, -24, 24], [-0.5, 0, 5.25, 5.75], [-0.5, 0, -5.75, -5.25]] },
  market: { foot: [[-30, 3.2, -20, 20]], solid: [[1, 1.8, 5.6, 6.4], [1, 1.8, -6.4, -5.6]] },
  'bus-terminus': { foot: [[-34.3, 14, -24, 24]], solid: [[-34.3, -25.6, -22.3, 20.3], [6.4, 7.6, 8.4, 9.6], [6.4, 7.6, -9.6, -8.4]] },
  'clock-tower': { foot: [box(1.7)], solid: [box(1.7)] },
  'stadium-gate': {
    foot: [[-44, 6.5, -60, 60], [-56, -44, -60, 60], [-80, -56, -40, 40]],
    solid: [[5.9, 6.5, 8, 60], [5.9, 6.5, -60, -8], [-1.2, 1.2, 5.8, 8.2], [-1.2, 1.2, -8.2, -5.8], [-30, -8, 36, 58]],
  },
  church: {
    foot: [[-34.2, -0.6, -16, 16]],
    solid: [[-34, -6, -7, 7], [-24, -16, -15, 15], [-9.6, -5.2, 6.4, 10.8], [-9.6, -5.2, -10.8, -6.4], [-5.2, -1.8, -2.2, 2.2], [-0.8, -0.6, -16, -2.6], [-0.8, -0.6, 2.6, 16]],
  },
  'rail-station': {
    foot: [[-46, 40, -17.3, 21.8]],
    solid: [[-40, 28, 3.1, 7], [-40, 28, -6.3, -3.3], [-40, 28, -16, -12.9], [-17.1, -5.9, 7.9, 13.6], [3.9, 11.1, 7.9, 12.1], [-20, 3.5, 16.5, 18.3], [31, 40, -13.45, -12.95], [31, 40, 3.15, 3.65]],
  },
  'kolkata-sign': { foot: [[-2, 2, -11.2, 11.2]], solid: [[-0.6, 0, -5, 5], [0.3, 1.9, 1.7, 4.3], [-2, 2, 6.8, 11.2], [-2, 2, -11.2, -6.8]] },
  billboards: { foot: [[-1.5, 0.4, -6.6, 6.6]], solid: [] },
  'metro-station': { foot: [[-5, 5, -3, 3]], solid: [[-5, 5, -3, 3]] },
  generic: { foot: [[-0.2, 0.2, -2.3, 2.3]], solid: [] },
};

/** Junction pieces: a round footprint of this radius (the island kerb ring, the kiosk, the statue's pedestal). */
const JUNCTION: Partial<Record<LandmarkKind, number>> = { 'police-kiosk': 2.5, statue: 1.6, 'traffic-island': 5.8 };

/** Kinds that are placed elsewhere (bridges, decks, the metro, Sealdah's forecourt) or never move. */
const FIXED = new Set<LandmarkKind>(['sealdah-station', 'metro-portal', 'flyover', 'canal-bridge', 'rail-underbridge']);

/** Room kept between a model and a carriageway (about a kerb and the start of the footpath). */
export const LANDMARK_KERB = 0.6;

/** The model a landmark draws (as in render/world/landmarks/index.ts), or null for none here. */
export function modelSize(lm: Pick<Landmark, 'kind' | 'id'>): ModelSize | null {
  if (lm.kind === 'mall' && lm.id.startsWith('city-centre-1')) return SIZES['city-centre']!;
  return SIZES[lm.kind] ?? null;
}

export interface Placement {
  x: number; z: number; h: number;
  /** A junction piece left standing in the road on its own raised island (the lanes route round it). */
  island: boolean;
  /** Radius of a junction piece (0 for others). */
  r: number;
  /** How far it moved from its warped position. */
  moved: number;
}

const rectOf = (x: number, z: number, h: number, [u0, u1, v0, v1]: FrameRect): Rect => {
  const [cx, cz] = framePt(x, z, h, (u0 + u1) / 2, (v0 + v1) / 2);
  return { x: cx, z: cz, ux: Math.cos(h), uz: Math.sin(h), hl: (u1 - u0) / 2, hd: (v1 - v0) / 2 };
};

type Roads = { r: NetRoad; l: Line }[];

/** True if any of these frame rects at (x, z, h) comes within `pad` of a carriageway of these roads. */
export function rectsOnRoad(roads: Roads, x: number, z: number, h: number, rects: FrameRect[], pad: number) {
  for (const fr of rects) {
    const R = rectOf(x, z, h, fr), e = R.hl + R.hd;
    for (const { r, l } of roads) {
      const reach = r.w / 2 + pad + e;
      for (let i = 1; i < l.p.length; i++) {
        const a = l.p[i - 1], b = l.p[i];
        if (Math.max(a[0], b[0]) < R.x - reach || Math.min(a[0], b[0]) > R.x + reach || Math.max(a[1], b[1]) < R.z - reach || Math.min(a[1], b[1]) > R.z + reach) continue;
        if (rectSegDist(R, a, b) < r.w / 2 + pad) return true;
      }
    }
  }
  return false;
}

/** True if a circle of radius `rad` at (x, z) comes within `pad` of a carriageway. */
function circleOnRoad(roads: Roads, x: number, z: number, rad: number, pad: number) {
  return roads.some(({ r, l }) => roadNear(l, x, z).d < r.w / 2 + rad + pad);
}

const reachOf = (rects: FrameRect[]) => Math.max(...rects.map(([u0, u1, v0, v1]) => Math.hypot(Math.max(-u0, u1), Math.max(-v0, v1))));

/** Directions to slide a model, relative to straight back from the road it faces (-u), nearest first. */
const DIRS = [0, 0.5, -0.5, 1, -1, Math.PI / 2, -Math.PI / 2, 2.2, -2.2, Math.PI];
const TURNS = [0, 0.2, -0.2, 0.4, -0.4];

/** A set-back model: where it stands clear of every carriageway (its warped spot if it already is). */
function placeModel(net: WorldNet, warp: Warp, x: number, z: number, h: number, rects: FrameRect[]): Placement {
  const reach = reachOf(rects);
  const fits = (px: number, pz: number, ph: number) => !inSectorV(px, pz) && !rectsOnRoad(groundRoadsNear(net, warp, px, pz, reach + 4), px, pz, ph, rects, LANDMARK_KERB);
  if (fits(x, z, h)) return { x, z, h, island: false, r: 0, moved: 0 };
  for (let d = 1.5; d <= 150; d += 1.5) for (const t of TURNS) for (const a of DIRS) {
    const back = h + Math.PI + a, px = x + Math.cos(back) * d, pz = z + Math.sin(back) * d;
    if (fits(px, pz, h + t)) return { x: px, z: pz, h: h + t, island: false, r: 0, moved: d };
  }
  return { x, z, h, island: false, r: 0, moved: 0 };
}

/**
 * A junction kiosk, statue or flag island: where it doesn't touch a carriageway it stays. In the road, it stays on a
 * small raised island if every road's default lane already passes it (as for a pier in a median, lanes.ts); else
 * it moves to the nearest spot on the corner footpath.
 */
function placeJunction(net: WorldNet, warp: Warp, x: number, z: number, h: number, rad: number): Placement {
  const near = (px: number, pz: number) => groundRoadsNear(net, warp, px, pz, rad + 4);
  const roads = near(x, z);
  if (!circleOnRoad(roads, x, z, rad, LANDMARK_KERB)) return { x, z, h, island: false, r: rad, moved: 0 };
  const inRoad = roads.filter(({ r, l }) => roadNear(l, x, z).d < r.w / 2 + rad + LANDMARK_KERB);
  if (inRoad.every(({ r, l }) => { const n = roadNear(l, x, z); return n.d < r.w / 2 && laneFree(r.w, r.oneway, n.side, rad); })) {
    return { x, z, h, island: true, r: rad, moved: 0 };
  }
  for (let d = 1; d <= 60; d += 1) for (let k = 0; k < 16; k++) {
    const a = h + Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (inSectorV(px, pz) || circleOnRoad(near(px, pz), px, pz, rad, LANDMARK_KERB)) continue;
    // Facing the nearest road.
    const n = near(px, pz).map(({ l }) => ({ l, n: roadNear(l, px, pz) })).sort((p, q) => p.n.d - q.n.d)[0];
    let ph = h;
    if (n) { const s = Math.sign(n.n.side) || 1; ph = Math.atan2(n.n.dx * s, -n.n.dz * s); }
    return { x: px, z: pz, h: ph, island: false, r: rad, moved: d };
  }
  return { x, z, h, island: false, r: rad, moved: 0 };
}

const STATUE_NEAR: LandmarkKind[] = ['kolkata-sign', 'traffic-island'];

/**
 * The model a net landmark draws in the streamed world, or null: a statue inside a junction model that already has
 * one, a metro station the line draws itself, and the kinds drawn elsewhere (bridges, decks, Sealdah) have none.
 */
export function landmarkModel(net: WorldNet, warp: Warp, lm: Landmark): ModelSize | null {
  const [x, z] = warp.toGame([lm.x, lm.z]);
  if (lm.kind === 'statue' && statueSuppressed(net, warp, x, z)) return null;
  if (lm.kind === 'metro-station' && onMetroLine(net, warp, x, z)) return null;
  const rad = JUNCTION[lm.kind];
  if (rad) return { foot: [box(rad)], solid: [] };
  return modelSize(lm);
}

/** A statue within 25 of a kolkata-sign or flag island (which carry their own statues) isn't drawn. */
export function statueSuppressed(net: WorldNet, warp: Warp, x: number, z: number) {
  return net.landmarks.some((o) => STATUE_NEAR.includes(o.kind) && (() => { const [ox, oz] = warp.toGame([o.x, o.z]); return Math.hypot(ox - x, oz - z) < 25; })());
}

/** A metro-station landmark that the Green Line draws itself (a station on the line within 40). */
export const onMetroLine = (net: WorldNet, warp: Warp, x: number, z: number) =>
  metroLayout(net, warp).some((m) => m.stations.some((s) => Math.hypot(s.x - x, s.z - z) < 40));

/** Where a net landmark's model stands in game coordinates (warped, then clear of the roads). */
export function landmarkPlace(net: WorldNet, warp: Warp, lm: Landmark): Placement {
  return memo(net, warp, `landmark ${lm.id} ${lm.x},${lm.z}`, () => {
    const [x, z] = warp.toGame([lm.x, lm.z]), h = warpHeading(warp, lm.x, lm.z, lm.heading);
    if (FIXED.has(lm.kind) || inSectorV(x, z)) return { x, z, h, island: false, r: 0, moved: 0 };
    const rad = JUNCTION[lm.kind];
    if (rad) return placeJunction(net, warp, x, z, h, rad);
    if (lm.kind === 'metro-station' && onMetroLine(net, warp, x, z)) return { x, z, h, island: false, r: 0, moved: 0 }; // the line draws it
    const size = modelSize(lm);
    return size ? placeModel(net, warp, x, z, h, size.foot) : { x, z, h, island: false, r: 0, moved: 0 };
  });
}
