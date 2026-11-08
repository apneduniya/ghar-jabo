// Types for the real map data (src/content/maps/sectorv.json, built by tools/build-map.py from OpenStreetMap
// plus the Street View corrections in research/map/overrides.json).

export type Pt = [number, number]; // x (east), z (south), in world units
export interface Road { n: string; k: string; w: number; b: number; o: number; p: Pt[] }

/** Building style: glass tower, concrete office/govt block, college, residential, shop, shed/kiosk. */
export type BuildingStyle = 'office' | 'block' | 'college' | 'resi' | 'shop' | 'low';

export interface Building {
  /** OSM way id, 'r<relation id>', or 'new:<slug>' for a footprint OSM lacks. */
  id?: number | string;
  p: Pt[];
  /** Height in world units: always lv * 3.3 m * scale. */
  h: number;
  /** Storeys. */
  lv?: number;
  t?: BuildingStyle;
  /** Where lv came from: OSM tags, a Street View count, or a guess. */
  hs?: 'osm' | 'sv' | 'guess';
  n?: string;
  /** Facade tint, '#rrggbb'. */
  colour?: string;
  /** Parody signage text (never a real brand). */
  label?: string;
  /** Courtyards (inner rings of a multipolygon). */
  holes?: Pt[][];
}

export interface MapData {
  roads: Road[];
  rails: Pt[][];
  stations: { n: string; p: Pt }[];
  stops: { n: string; p: Pt }[];
  buildings: Building[];
  busPath: Pt[];
  /** Canal, lakes and ponds (closed rings, clipped near the play square; overlapping rings widen the canal). */
  water?: Pt[][];
  green?: Pt[][];
  /** Street lamp positions (OSM highway=street_lamp). */
  lamps?: Pt[];
  /** Plot outlines: where compound walls go. t is the landuse or campus type. */
  compounds?: { t: string; n?: string; p: Pt[] }[];
  /** Gates in compound walls; a = 'private' when access is restricted. */
  gates?: { p: Pt; k: string; a?: string }[];
  pois: Record<string, Pt>;
}
