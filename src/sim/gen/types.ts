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
  /** A continuous hawker row along one side (1: left of the direction of p, -1: right), e.g. Sealdah's walk-in. */
  hawkers?: 1 | -1;
}

export type LandmarkKind =
  | 'sealdah-station' | 'rail-station' | 'church' | 'metro-station' | 'metro-portal' | 'bus-terminus' | 'clock-tower' | 'stadium-gate'
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
  /** Real (OSM) bus stops on the network, outside the Sector V square. Optional (added by the sim builder). */
  stops?: { name: string; x: number; z: number }[];
  /**
   * Real-map roads that cross the Sector V square edge with no corridor road continuing them: `p` is the exact
   * crossing point (bit-identical to the clipped map's road end), `d` the outward unit direction, `w` the width,
   * `k` the map's road class. The generator continues them (free) or caps them with a dead end (timed). Optional.
   */
  mapEnds?: { p: Pt; d: Pt; w: number; k: string }[];
  /** The drivable line of each corridor from the TIU gate (real coords), for bus routes and the HUD. Optional. */
  corridors?: { id: string; p: Pt[] }[];
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
  /**
   * Water surfaces in this chunk (game coords, clipped to the chunk): canals and lakes from the net, bheri ponds,
   * and in timed mode a true-width canal patch at each canal crossing. Not walkable except over a bridge road.
   * Optional (added by the sim builder; renderers may ignore it).
   */
  water?: Pt[][];
  /** Roundabout islands at Salt Lake avenue crossings (raised, planted, blue-and-white kerbs). Optional. */
  islands?: { x: number; z: number; r: number }[];
}

/**
 * What the renderer sees of the streamed world: the loaded chunks and load/unload notifications.
 * Implemented by ChunkStore (src/sim/gen/stream.ts); renderers subscribe and never mutate.
 */
export interface ChunkSource {
  readonly net: WorldNet;
  readonly warp: Warp;
  loaded(): Iterable<Chunk>;
  onLoad(cb: (c: Chunk) => void): void;
  onUnload(cb: (c: Chunk) => void): void;
}
