// Street level of the south and centre of the map, placed from two Street View surveys (Jan 2026 imagery):
// research/streetview/SOUTH.md (TIU → PwC More → Street 13 east → College More) and NORTH.md §1–2
// (Street 13 from PwC More NW to Wipro More). Data only: src/sim/streetlife.ts turns it into positions.
//
// Positions are metres along a street line from its first point (the line runs from PwC More outwards), and a
// compass side. Game units are 0.5 per metre (tools/map/geo.py), origin PwC More (22.57700, 88.42935).
// Street lines are the medians of the paired one-way OSM carriageways (the gap between them), in game units.

import type { Pt } from '../sim/mapdata';

export type StreetId = 'st2' | 'st13e' | 'st13w' | 'st13x' | 'st18n' | 'st18s' | 'av3';
export type Side = 'N' | 'S' | 'E' | 'W' | 'NE' | 'SW';

/** Game units per real metre (tools/map/geo.py SCALE). */
export const UNITS_PER_M = 0.5;
/** Footpath width beside main roads, world units (the paver ribbon in citymap.ts is road width + 2 × this). */
export const FOOTPATH = 2.5;

export const STREETS: Record<StreetId, Pt[]> = {
  // Street 2, PwC More → TIU → south. Median of the two one-way ways from (-3.2, 8.7) and (-80.4, 153.0).
  st2: [[-6.5, 10], [-12.7, 21.4], [-74.5, 147.3]],
  // Street 13 east, PwC More → College More (515 m; survey says about 520 m). Ways from (-3.2, 8.7) and (223, 125).
  st13e: [[-6.5, 10], [14.6, 20.5], [204.9, 113.4], [224, 122.6]],
  // Street 13 west, PwC More → Wipro More (about 370 m, NORTH.md §1). Ways from (-11.1, 11.4) and (-141.4, -113.1).
  st13w: [[-6.5, 10], [-26.1, 0.7], [-58.5, -15.2], [-74, -25.7], [-86.6, -35.4], [-106.7, -56.4], [-118.1, -70.3], [-143.2, -110.4]],
  // Street 13 east of College More (narrower, palm-and-hedge median; SOUTH.md §5).
  st13x: [[229, 124.5], [350, 185]],
  // Street 18 north and south of College More (SOUTH.md §5).
  st18n: [[227, 121], [278, 19], [301, -24]],
  st18s: [[225.5, 126], [197.5, 184.5], [148, 277]],
  // 3rd Avenue: Street 13 continued NW of Wipro More, over the canal bridge (NORTH.md §2).
  av3: [[-141.3, -110.5], [-160, -138], [-174, -158], [-200, -195]],
};

export type StallKind = 'tin' | 'tea' | 'shack' | 'longtarp' | 'lunch' | 'kiosk' | 'chairs' | 'food';
export type CartKind = 'umbrella' | 'fruit' | 'phuchka' | 'redumbrella';

export interface RowSpec {
  street: StreetId; from: number; to: number; side: Side; kind: StallKind;
  /** Metre ranges left open (gateways, gates). */
  gaps?: [number, number][];
  /** A white tubular railing along the stall fronts, with gaps for entry. */
  railing?: boolean;
  /** How far the row reaches into the footpath (units); 0 = it stands behind the footpath. */
  inset?: number;
  /** One long structure instead of separate stalls. */
  single?: boolean;
  carts?: { at: number; kind: CartKind }[];
}

/** Hawker rows. These replace the old randomly scattered stalls and the tea stall at every third stop. */
export const ROWS: RowSpec[] = [
  // SOUTH §1–2: about 150 m of tin and tarp stalls opposite TIU, 22.5754 → 22.5767, up to the PwC More mouth.
  // The arched gateway (22.5760, opposite the TIU gate at 22.57598, 88.42873) breaks it at about 101 m.
  {
    street: 'st2', from: 24, to: 186, side: 'E', kind: 'tin', railing: true, gaps: [[96, 107]],
    carts: [{ at: 34, kind: 'redumbrella' }, { at: 92, kind: 'umbrella' }, { at: 124, kind: 'fruit' }, { at: 150, kind: 'phuchka' }],
  },
  // SOUTH §4 south side: 15–20 units along CSTARI, 100–260 m; the CSTARI gate breaks it at about 220 m.
  { street: 'st13e', from: 100, to: 262, side: 'S', kind: 'tin', gaps: [[214, 226]], carts: [{ at: 150, kind: 'fruit' }, { at: 200, kind: 'phuchka' }] },
  // NORTH §1, NE side of Street 13 going to Wipro More.
  { street: 'st13w', from: 42, to: 56, side: 'NE', kind: 'shack' }, // ~50 m (22.57706, 88.42888): lean-tos on a sheet fence
  { street: 'st13w', from: 82, to: 98, side: 'NE', kind: 'longtarp', single: true }, // ~90 m (22.57723, 88.42853): 5–6 stalls, one rusty tarp
  { street: 'st13w', from: 170, to: 192, side: 'NE', kind: 'lunch', single: true }, // ~180 m (22.57771, 88.42778): blue-tarp "lunch hotel"
  { street: 'st13w', from: 312, to: 324, side: 'NE', kind: 'kiosk', inset: 1.6 }, // ~320 m (22.57870, 88.42691): paan, tea, snack kiosks
  { street: 'st13w', from: 325, to: 330, side: 'NE', kind: 'chairs', inset: 1.6 }, // plastic-chair tea stall against the railing
  // SOUTH §3: tin-roofed tea stalls on the north footpath west of the police booth (NW corner of PwC More).
  { street: 'st13w', from: 16, to: 32, side: 'NE', kind: 'tea' },
  // SOUTH §4 (430–460 m): 2–3 tea and snack shacks against the fence before the bus shelter.
  { street: 'st13e', from: 432, to: 452, side: 'S', kind: 'shack' },
  // SOUTH §4–5: the food stall cluster and students just east of the College More bus shelter.
  { street: 'st13e', from: 484, to: 500, side: 'S', kind: 'food', carts: [{ at: 492, kind: 'phuchka' }] },
  // SOUTH §5: food stalls under trees at the SE corner (IEM).
  { street: 'st13x', from: 14, to: 40, side: 'S', kind: 'food', carts: [{ at: 26, kind: 'fruit' }] },
  // SOUTH §5: stalls with banners at the NE corner along Street 18.
  { street: 'st18n', from: 18, to: 34, side: 'E', kind: 'tea' },
];

export type MedianKind = 'pipe' | 'island' | 'planted' | 'grass' | 'balustrade' | 'hedge' | 'barrier';

/** Median dressing per stretch (metres along the street). Elsewhere, divided roads get a plain hedge. */
export const MEDIANS: { street: StreetId; from: number; to: number; kind: MedianKind; width: number }[] = [
  { street: 'st2', from: 0, to: 400, kind: 'pipe', width: 1.6 }, // SOUTH §1: green bamboo-like pipe railing, shrubs
  { street: 'st13w', from: 0, to: 30, kind: 'island', width: 2.2 }, // SOUTH §3: kerbed island, blue railing, signal, hoarding
  { street: 'st13w', from: 30, to: 400, kind: 'planted', width: 2.0 }, // NORTH §1: raised planted median, hedge, small trees
  { street: 'st13e', from: 0, to: 380, kind: 'grass', width: 3.0 }, // SOUTH §4: grass, hedge, areca palms, oleander
  { street: 'st13e', from: 380, to: 530, kind: 'balustrade', width: 2.6 }, // SOUTH §4: white concrete balustrade to College More
  { street: 'st13x', from: 0, to: 300, kind: 'grass', width: 2.2 }, // SOUTH §5: palm-and-hedge median east of College More
  { street: 'st18s', from: 0, to: 300, kind: 'barrier', width: 1.4 }, // SOUTH §5: steel median barrier on Street 18 south
];

export type FurnitureKind =
  | 'policeBooth' | 'yellowBooth' | 'medianKiosk' | 'signal' | 'highMast' | 'lotus' | 'busShelter' | 'autoStand'
  | 'autoQueue' | 'barricades' | 'bikes' | 'archGate' | 'steelGate' | 'portal' | 'portico' | 'policeGate' | 'billboard' | 'tiuGate';

export interface Spot {
  kind: FurnitureKind; street: StreetId; at: number; side: Side;
  /** 'median' = from the street line; 'kerb' = just off the kerb on the footpath; 'back' = behind the footpath. */
  where: 'median' | 'kerb' | 'back';
  off?: number;
  /** Extent along the street, metres (queues, rows of bikes). */
  len?: number;
  text?: string;
}

export const FURNITURE: Spot[] = [
  // PwC More (SOUTH §2–3, NORTH §1).
  { kind: 'policeBooth', street: 'st13e', at: 2, side: 'N', where: 'kerb', off: 1.5 }, // north side opposite Street 2
  { kind: 'signal', street: 'st13e', at: 8, side: 'N', where: 'kerb', off: 0.3 },
  { kind: 'highMast', street: 'st2', at: 34, side: 'E', where: 'median' }, // junction end of the Street 2 median
  { kind: 'signal', street: 'st2', at: 30, side: 'W', where: 'median' },
  { kind: 'signal', street: 'st13w', at: 12, side: 'NE', where: 'median' }, // west-arm island
  { kind: 'billboard', street: 'st13w', at: 22, side: 'NE', where: 'median', text: 'island' }, // hoarding on the island
  { kind: 'autoStand', street: 'st13w', at: 26, side: 'SW', where: 'kerb', len: 30 }, // SW corner, under the trees
  { kind: 'lotus', street: 'st13w', at: 90, side: 'NE', where: 'median' }, // NORTH §1 ~90 m: white concrete lotus
  // Street 2 (SOUTH §1).
  { kind: 'archGate', street: 'st2', at: 101, side: 'E', where: 'back' }, // 22.5760, opposite the TIU gate
  { kind: 'tiuGate', street: 'st2', at: 104, side: 'W', where: 'back' }, // TIU gate, 22.57598 (the start)
  { kind: 'bikes', street: 'st2', at: 64, side: 'W', where: 'kerb', len: 70 }, // motorbikes nose-in along the TIU kerb
  { kind: 'bikes', street: 'st2', at: 140, side: 'W', where: 'kerb', len: 40 },
  { kind: 'portico', street: 'st2', at: 168, side: 'W', where: 'back', off: 1.5 }, // TIU main entrance, 22.5753–22.5756
  // Street 13 east (SOUTH §4).
  { kind: 'policeGate', street: 'st13e', at: 40, side: 'N', where: 'back' }, // Electronics Complex PS gate
  { kind: 'billboard', street: 'st13e', at: 110, side: 'S', where: 'kerb', off: 0.4, text: 'st13' }, // on a blue-white pole
  { kind: 'steelGate', street: 'st13e', at: 220, side: 'S', where: 'back' }, // CSTARI gate
  { kind: 'portal', street: 'st13e', at: 400, side: 'S', where: 'back' }, // Bose Institute gate portal
  { kind: 'busShelter', street: 'st13e', at: 470, side: 'S', where: 'kerb', off: 1.2 }, // curved roof, ad panel, banyan
  // College More (SOUTH §5).
  { kind: 'medianKiosk', street: 'st13x', at: 14, side: 'S', where: 'median' },
  { kind: 'signal', street: 'st18n', at: 10, side: 'E', where: 'kerb', off: 0.3 }, // NE corner, countdown timer
  { kind: 'signal', street: 'st13e', at: 500, side: 'S', where: 'kerb', off: 0.3 },
  // Wipro More (NORTH §2).
  { kind: 'yellowBooth', street: 'st13w', at: 362, side: 'SW', where: 'kerb', off: 1.0 },
  { kind: 'barricades', street: 'st13w', at: 340, side: 'NE', where: 'median', len: 16 },
  { kind: 'autoQueue', street: 'av3', at: 114, side: 'NE', where: 'kerb', len: 22 },
];

/** Compound wall styles. The first rule whose test matches a compound wins; the default is the pastel wall. */
export type WallStyle = 'pastel' | 'pwc' | 'tiu' | 'hoarding' | 'cstari';
export const WALL_RULES: { style: WallStyle; poi?: string; name?: string; type?: string }[] = [
  { style: 'pwc', poi: 'pwc' }, // SOUTH §3: 2 m white wall with a hedge on top
  { style: 'tiu', poi: 'tiu' }, // SOUTH §1: blue iron railing on brick-red pillars, standees
  { style: 'cstari', name: 'Central Staff Training' }, // red-brown iron fence on a cream wall
  { style: 'hoarding', type: 'construction' }, // SOUTH §1: blue corrugated hoarding north of TIU
];
export const WALL = {
  /** Gap left at an OSM gate, world units either side. */
  gateHalf: 2.4,
  /** Wall pieces are this long (world units); the collision uses the same pieces. */
  piece: 3,
  thickness: 0.3,
  /** Only compounds within this distance of PwC More get walls. */
  radius: 320,
};

/** Overhead wires stay only where the surveys saw them: Wipro More's east side, College More, Street 18. */
export const WIRE_ZONES: { x: number; z: number; r: number }[] = [
  { x: -118, z: -92, r: 34 }, // NORTH §1: wires and junction boxes on the east side near Wipro More
  { x: 226, z: 122, r: 42 }, // SOUTH §5: cables across College More
  { x: 262, z: 52, r: 60 }, { x: 296, z: -18, r: 40 }, // Street 18 north
  { x: 205, z: 168, r: 48 }, { x: 172, z: 232, r: 40 }, // Street 18 south
];

/** Parody signage at real shop and landmark positions (AGENTS.md: parody brands only). */
export const SIGNS: { text: string; street: StreetId; at: number; side: Side; y: number; w: number; h: number; bg: string; fg: string; back?: number }[] = [
  { text: 'pwh', street: 'st13e', at: 12, side: 'N', y: 1.5, w: 1.6, h: 0.6, bg: '#ffffff', fg: '#e8601c', back: 0.15 }, // on the PwC wall
  { text: 'BURGER RAJA', street: 'st13e', at: 162, side: 'N', y: 3.4, w: 5.5, h: 1.1, bg: '#d6401f', fg: '#ffd27a', back: 3.6 }, // Millennium City podium, OSM node (71.6, 33.5)
  { text: 'NIZAM-ISH EXPRESS', street: 'st13e', at: 176, side: 'N', y: 3.4, w: 4.6, h: 0.8, bg: '#f2c230', fg: '#7a1f1f', back: 3.6 },
  { text: 'RONG DE BASANTI DHABA', street: 'st13e', at: 372, side: 'N', y: 3.3, w: 7, h: 0.9, bg: '#0f7d86', fg: '#fff6c9', back: 2.2 }, // 360–400 m
  { text: 'CHA-BUCKS COFFEE', street: 'st13e', at: 452, side: 'N', y: 3.4, w: 5, h: 1, bg: '#1d6b45', fg: '#ffffff', back: 2.2 }, // tower foot, ~50 m before College More
  { text: 'SKETCHY SHOES', street: 'st13e', at: 462, side: 'N', y: 3.4, w: 4, h: 0.8, bg: '#1d3f8a', fg: '#ffffff', back: 2.2 },
];

/** Where frontage shop signs are wrong: campus walls and offices the surveys walked past (capsules, units). */
export const NO_SHOPS: { a: Pt; b: Pt; r: number }[] = [
  { a: [-6.5, 10], b: [224, 122.6], r: 24 }, // Street 13 east: PwC, police, Millennium City, ERTL, CSTARI, Bose
  { a: [-6.5, 10], b: [-74.5, 147.3], r: 24 }, // Street 2: TIU and the CSTARI wall
  { a: [-6.5, 10], b: [-86.6, -35.4], r: 18 }, // Street 13 west to the IIHM campus
];

/** Hand-painted boards over the hawker stalls (generic, no real shop names). */
export const STALL_SIGNS = [
  'MAA TARA TEA STALL', 'JOY GURU FAST FOOD', 'EGG ROLL · CHOWMIN', 'GHUGNI · PAUROTI', 'DIDI-R HOTEL', 'COLD DRINKS',
  'LEBU CHA ₹10', 'MOMO · THUKPA', 'BHAI BHAI CENTRE', 'FRUIT JUICE', 'PHUCHKA · CHURMUR', 'RICE · DAL · MACH',
];

/** University standees along the TIU railing, metres along Street 2 (west side; text in content/text.ts). */
export const STANDEE_AT = [72, 88, 124, 146];

/** OSM way id of the PwC office (a low 3-storey block): its parapet carries the small "pwh" sign. */
export const PWC_BUILDING = 134101085;

/** Stops with a shelter (OSM shelter=yes, OSM-AUDIT §4). College More's is in FURNITURE; PwC More has none. */
export const SHELTER_STOPS = ['RS Software', 'Japani Gate Salt Lake Mini Bus Terminus', '201 Nimta PO - Nicco Park Bus Terminus', 'Swasthya Bhawan', 'Matri Sadan Bus Stop'];
