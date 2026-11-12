// Tuning for the streamed world beyond Sector V (src/sim/gen): the timed-mode squeeze, street character by
// area (research/routes/ROUTES.md §4.1, LANDMARKS.md "character gradient") and streaming radii. Game units.

import type { AreaKind, BuildingStyle, RoadClass } from '../sim/gen/types';

/**
 * Timed-mode radial squeeze outside the Sector V square: [real units beyond the edge where it starts, slope].
 * Gentle at the edge so roads don't kink, hardest over the Salt Lake avenues and the Bypass, loosest in the old
 * city near Sealdah (ROUTES §5). Tuned so corridor A beyond the square is about 1,500 u (tested in warp.test.ts).
 */
export const SQUEEZE: [number, number][] = [[0, 0.6], [30, 0.28], [80, 0.14], [1000, 0.11], [1650, 0.17], [2250, 0.24], [2550, 0.34]];

/** Footpath width each side of a carriageway, by class (the renderer draws them; buildings stand behind). */
export const FOOT: Record<RoadClass, number> = { primary: 3, secondary: 2.6, tertiary: 2.2, residential: 1.6, lane: 0.8 };

/** Width of generated streets, by class. */
export const STREET_W = { avenue: 6, residential: 4.2, lane: 3 };

export interface AreaStyle {
  /** Share of lattice lanes kept (free roam), and extra diagonal lanes (denser old city). */
  keep: number; diag: number;
  /** Plot frontage and depth range, setback from the footpath. */
  plot: [number, number]; depth: [number, number]; setback: number;
  storeys: [number, number];
  styles: BuildingStyle[];
  colours: number[];
  /** Chance a building has ground-floor shops. */
  shop: number;
  /** Occasional towers (Bypass): chance and storeys. */
  tower?: [number, [number, number]];
  /** Props per plot: street trees, hawker stalls, wire poles, parked vehicles, shrines, handcarts. */
  tree: number; stall: number; wires: boolean; parked: number; shrine: number; handcart: number;
  /** Compound walls in front of set-back houses (Salt Lake). */
  wall: boolean;
  /** Timed mode: side-street stub spacing along main roads, and stub length. */
  stubEvery: [number, number]; stubLen: [number, number];
}

const PASTEL = [0xf1e3c8, 0xe8d6b0, 0xd9e4d0, 0xf2d0c4, 0xe6e0d4, 0xd8dde6, 0xf4ecd8];
const OLD = [0xd9c7a6, 0xc9b28c, 0xe0c9b0, 0xcfa98f, 0xbfc4b0, 0xd6b59a, 0xe8d8b8, 0xc4a4a8];
const PINKCREAM = [0xe9c4c4, 0xf0dcc0, 0xe3b7a8, 0xf2e6cf, 0xd9b9c9, 0xe8d0a8];

const saltlake: AreaStyle = {
  keep: 1, diag: 0, plot: [11, 15], depth: [9, 13], setback: 3.5, storeys: [2, 3], styles: ['house', 'house', 'resi'],
  colours: PASTEL, shop: 0.04, tree: 0.9, stall: 0, wires: false, parked: 0.15, shrine: 0, handcart: 0, wall: true,
  stubEvery: [55, 80], stubLen: [30, 55],
};
const oldCity = (o: Partial<AreaStyle>): AreaStyle => ({
  keep: 0.8, diag: 0.08, plot: [6, 10], depth: [9, 14], setback: 0, storeys: [3, 5], styles: ['old', 'old', 'resi', 'shop'],
  colours: OLD, shop: 0.7, tree: 0.08, stall: 0.12, wires: true, parked: 0.12, shrine: 0.02, handcart: 0.02, wall: false,
  stubEvery: [40, 70], stubLen: [22, 50], ...o,
});

export const AREA_STYLE: Record<AreaKind, AreaStyle> = {
  sectorv: saltlake,
  saltlake,
  bypass: {
    keep: 0.45, diag: 0, plot: [14, 22], depth: [10, 16], setback: 6, storeys: [1, 3], styles: ['resi', 'office', 'house'],
    colours: PASTEL, shop: 0.1, tower: [0.1, [9, 15]], tree: 0.6, stall: 0.02, wires: false, parked: 0.08, shrine: 0.01,
    handcart: 0, wall: true, stubEvery: [60, 90], stubLen: [25, 55],
  },
  chingrighata: oldCity({ keep: 0.7, diag: 0.05, plot: [6, 9], depth: [7, 10], storeys: [1, 3], styles: ['resi', 'house', 'shop'], shop: 0.35, wires: true, tree: 0.2 }),
  ultadanga: oldCity({ storeys: [4, 6], colours: PINKCREAM, shop: 0.8 }),
  kankurgachi: oldCity({ storeys: [4, 7], styles: ['resi', 'resi', 'old'], setback: 1.5, shop: 0.45, tree: 0.25 }),
  phoolbagan: oldCity({ storeys: [3, 6], stall: 0.2, colours: PINKCREAM }),
  beliaghata: oldCity({ storeys: [2, 5], stall: 0.3, colours: PINKCREAM, shrine: 0.03 }),
  narkeldanga: oldCity({ storeys: [2, 5], stall: 0.2, handcart: 0.04 }),
  maniktala: oldCity({ storeys: [3, 5], colours: OLD }),
  sealdah: oldCity({ keep: 0.95, diag: 0.18, plot: [5, 9], storeys: [3, 6], styles: ['old', 'old', 'market', 'shop'], shop: 0.9, stall: 0.45, handcart: 0.1, stubEvery: [35, 55] }),
  generic: oldCity({ keep: 0.75, diag: 0.04, plot: [7, 11], storeys: [3, 5], styles: ['resi', 'old', 'shop'], shop: 0.4, wires: true, tree: 0.15 }),
};

export const GEN = {
  /** A continuous hawker row (NetRoad.hawkers): stall spacing along the road, and its offset beyond the kerb. */
  hawkerStep: 3.4,
  hawkerGap: 1.5,
  /** Extra open width beside a hawker street: the stall row plus the gap to whatever is behind it. */
  hawkerStrip: 7,
  /** Free-roam organic lane lattice cell (game units; lanes every ~70 m) and how far its nodes wander (fraction). */
  lattice: 36,
  jitter: 0.3,
  /** Salt Lake grid spacing (blocks of ~120 m, ROUTES §4.1) and how often an avenue crossing gets an island. */
  grid: 62,
  islandEvery: 3,
  islandR: 6,
  /** Nothing generated within this of the Sector V square (the real map's buildings poke out a little). */
  squareMargin: 30,
  /** Lamps along main roads, poles along old-city lanes (units apart). */
  lampEvery: 28,
  poleEvery: 18,
  /** Timed mode: walkable ground is the road plus its footpaths plus this. */
  bandPad: 1.5,
  /** Beyond this distance (real units) from every area centre, the generic city applies. */
  areaReach: 2.4,
} as const;

/**
 * Streaming: chunks load within `load` of the player (units) and unload beyond `unload`. Per frame the stage gives
 * generation `frameMs` of time (work is sliced, so a chunk may take a few frames); `perStep` is whole chunks per
 * call when no clock is given (tests, attract mode).
 */
// load must cover the farthest fog (340 inside the Sector V square), or chunks pop in at the edge of view.
export const STREAM = { load: 400, unload: 520, perStep: 1, frameMs: 4 };

/**
 * Sourced waterlogging spots for puddles (ROUTES §2.7 and §6.9: dated reports name Ultadanga/Hudco, Kankurgachi
 * and Sealdah). Real game coords (hubs in corridors.json), radius in units.
 */
export const FLOOD_SPOTS: { name: string; x: number; z: number; r: number }[] = [
  { name: 'Hudco More', x: -1944.8, z: -839.6, r: 14 },
  { name: 'Kankurgachi', x: -1994.1, z: -171.3, r: 10 },
  { name: 'Sealdah, APC Rd', x: -3004.0, z: 379.2, r: 10 },
];

/**
 * Trees (task 028, render/world/trees.ts). `street` is the streamed world's mix of species for a 'tree' prop (its
 * 'palm' props are coconut, areca or royal by variant): rain trees and neem dominate, debdaru line the Salt Lake
 * avenues, gulmohar here and there, the odd banyan or peepal. `sectorv` splits Sector V's surveyed 'rain' and
 * 'round' trees the same way. Wind: sway amplitude and leaf flutter in metres, faded out between `near` and `far`
 * from the camera.
 */
export const TREES = {
  street: { rain: 34, neem: 28, ashoka: 16, gulmohar: 12, banyan: 6, coconut: 4 },
  sectorv: { rain: { rain: 80, gulmohar: 20 }, round: { neem: 55, ashoka: 30, banyan: 15 }, median: { neem: 70, ashoka: 30 } },
  wind: { amp: 0.14, flutter: 0.04, near: 40, far: 70 },
} as const;

/**
 * Street lighting beyond Sector V (task 031, sim/gen/lamps.ts). Lamps stand on both kerbs of every real road,
 * `every` units apart along each kerb in game length (so timed mode's squeeze can't thin them out), the two kerbs
 * staggered by half. One-way primary carriageways (the divided arterials: Bypass, Salt Lake Bypass, APC Rd, CIT Rd,
 * Bidhan Nagar Rd) look up to `pairReach` beyond their right kerb for the other carriageway; where there is a
 * median at least `medianGap` wide, a double-arm median light stands in it every `medianEvery`. High masts stand at
 * the named junctions in `masts` (net landmark ids), `mastRing` units from the junction. `pool`: radius of each
 * light's soft pool on the ground (render/world/lamps.ts), and how far it sits in front of the post.
 */
export const LAMPS = {
  every: 22,
  medianEvery: 30,
  kerb: 0.35,
  /** Kerb lamps keep out of this share of a landmark's clear zone (a post at the kerb in front of a mall is fine). */
  zone: 0.5,
  pairReach: 25,
  medianGap: 0.8,
  masts: ['hudco-more-ultadanga', 'chingrighata-salt-lake-bypas', 'phoolbagan-island', 'rajabazar-narkeldanga-main-r', 'cit-more-beliaghata-main-rd-'],
  mastRing: [8, 30] as [number, number],
  /** Night opacity of the pools: brighter than Sector V's 0.55, as they are wider and softer (footpath included). */
  poolGlow: 0.8,
  pool: { trident: [4.2, 0.8], tube: [3.6, 1.6], median: [5.5, 0], mast: [14, 0] } as Record<'trident' | 'tube' | 'median' | 'mast', [number, number]>,
};
