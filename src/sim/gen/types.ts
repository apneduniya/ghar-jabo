// The contract between the streamed-world simulation (src/sim/gen) and its renderer (src/render/world/chunks.ts,
// src/render/world/landmarks/). Pure data, game units (x east, z south, 0.5 u per real metre at true scale).
// See docs/tasks/020-streamed-world.md. Change this file only together with both sides.

export type Pt = [number, number];
export type PlayMode = 'timed' | 'free';

/** Street character, from research/routes/ROUTES.md §4.1. Drives side streets, building mix and props. */
export type AreaKind =
  | 'sectorv' | 'saltlake' | 'bypass' | 'chingrighata' | 'ultadanga' | 'kankurgachi'
  | 'phoolbagan' | 'beliaghata' | 'narkeldanga' | 'maniktala' | 'sealdah' | 'generic';

export type RoadClass = 'primary' | 'secondary' | 'tertiary' | 'residential' | 'lane';

/** A real road of the network (corridor roads from OSM), in real (unwarped) coordinates. */
export interface NetRoad {
  id: string;
  name?: string;
  cls: RoadClass;
  /** Total lanes (both directions). */
  lanes: number;
  oneway: boolean;
  /** Carriageway width in units. */
  w: number;
  bridge?: 'canal' | 'rail' | 'flyover';
  /** Tram rails in the road (no trams run). */
  tram?: boolean;
  p: Pt[];
  /** Corridor ids this road belongs to (A_saltlake_phoolbagan, ...). */
  corridors: string[];
}

export type LandmarkKind =
  | 'sealdah-station' | 'metro-station' | 'metro-portal' | 'bus-terminus' | 'clock-tower' | 'stadium-gate'
  | 'traffic-island' | 'statue' | 'kolkata-sign' | 'flyover' | 'canal-bridge' | 'rail-underbridge'
  | 'mall' | 'market' | 'hospital' | 'police-kiosk' | 'billboards' | 'generic';

/** A recognisable place along a corridor, in real coordinates. Renderers pick a model by `kind` (+ `id`). */
export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  x: number; z: number;
  /** Facing (radians, 0 = +x), usually toward the road. */
  heading: number;
  /** Footprint radius the generator must keep clear of generated buildings. */
  r: number;
  corridor?: string;
  /** Distance along that corridor, real metres (for ordering and the HUD). */
  d?: number;
}

export interface Crossing {
  kind: 'canal' | 'rail';
  x: number; z: number;
  /** Direction the road runs over/under it (radians). */
  heading: number;
  /** Width of the canal or rail corridor across the road, units (true size, never squeezed). */
  width: number;
  /** Road goes over (bridge) or under (rail on a bridge above). */
  over: boolean;
}

export interface MetroLine {
  name: string;
  p: Pt[];
  /** Where the line is elevated (viaduct) vs underground, as index ranges into p. */
  elevated: [number, number][];
  stations: { name: string; x: number; z: number; elevated: boolean }[];
}

/** The whole real network, loaded once from public/data/world.json. Real coordinates. */
export interface WorldNet {
  roads: NetRoad[];
  landmarks: Landmark[];
  crossings: Crossing[];
  metro: MetroLine[];
  /** Canals and lakes near the corridors (closed rings). */
  water: Pt[][];
  /** Area centres with their character; the nearest one (in real coords) applies. */
  areas: { kind: AreaKind; x: number; z: number; r: number; gridDeg?: number }[];
  /** The finish: Sealdah station forecourt. */
  sealdah: { x: number; z: number; r: number };
}

/** Maps real coordinates to game coordinates for a mode (identity inside the Sector V square). */
export interface Warp {
  mode: PlayMode;
  toGame(p: Pt): Pt;
  toReal(p: Pt): Pt;
}

export const CHUNK = 128;

export interface GenRoad {
  p: Pt[];
  /** Carriageway width (units); footpaths are added by the renderer on both sides unless `noFoot`. */
  w: number;
  cls: RoadClass;
  /** Real corridor road (vs generated side street). */
  real: boolean;
  bridge?: 'canal' | 'rail' | 'flyover';
  tram?: boolean;
  noFoot?: boolean;
}

export type BuildingStyle = 'house' | 'resi' | 'old' | 'office' | 'market' | 'shop';

export interface GenBuilding {
  /** Footprint ring (game coords). */
  p: Pt[];
  storeys: number;
  style: BuildingStyle;
  /** 0xRRGGBB wall tint. */
  colour: number;
  /** Ground-floor shops facing the road. */
  shop: boolean;
}

export type PropKind =
  | 'stall' | 'cart' | 'tree' | 'palm' | 'lamp' | 'pole' | 'parked-bike' | 'parked-car' | 'bus-stop'
  | 'wall' | 'dead-end' | 'puddle' | 'sign' | 'hoarding' | 'bench' | 'handcart' | 'shrine';

export interface GenProp {
  kind: PropKind;
  x: number; z: number;
  rot: number;
  /** Size along its facing (walls, stall rows), units. */
  len?: number;
  /** Variant index for looks. */
  v?: number;
  /** Text for signs and dead-end jokes (parody only; from content/text.ts). */
  text?: string;
}

export interface Chunk {
  cx: number; cz: number;
  /** World-space origin (min corner) = (cx * CHUNK, cz * CHUNK). */
  x0: number; z0: number;
  area: AreaKind;
  roads: GenRoad[];
  buildings: GenBuilding[];
  props: GenProp[];
  /** Ids of net landmarks whose (warped) position lies in this chunk. */
  landmarks: string[];
  /** Extra collision rings beyond building footprints (walls, dead-end barriers, water edges). */
  blockers: Pt[][];
}
