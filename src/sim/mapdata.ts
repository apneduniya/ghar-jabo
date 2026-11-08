// Types for the real map data (src/content/maps/sectorv.json, built by tools/build-map.py from OpenStreetMap).

export type Pt = [number, number]; // x (east), z (south), in world units
export interface Road { n: string; k: string; w: number; b: number; o: number; p: Pt[] }
export interface MapData {
  roads: Road[];
  rails: Pt[][];
  stations: { n: string; p: Pt }[];
  stops: { n: string; p: Pt }[];
  buildings: { p: Pt[]; h: number; n?: string }[];
  busPath: Pt[];
  /** Canal and pond outlines (closed rings). */
  water?: Pt[][];
  pois: Record<string, Pt>;
}
