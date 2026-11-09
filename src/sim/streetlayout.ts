// Everything the street-life survey places, resolved once per map: hawker rows, furniture, compound walls and
// medians, plus the collision for walls and stalls. The World owns it; the renderer draws exactly this.

import { FURNITURE, ROWS, STREETS, type Spot } from '../content/streetlife';
import type { BuildingGrid, Pt } from './collide';
import type { MapData } from './mapdata';
import { medians, placeRow, placeSpot, type MedianPiece, type Placed, type Unit } from './streetlife';
import { compoundWalls, rectEdges, SegmentGrid, type WallPiece } from './walls';

export interface StreetLayout {
  units: Unit[];
  spots: (Placed & { spot: Spot })[];
  walls: WallPiece[];
  medians: MedianPiece[];
  /** Walls and stalls: true where the player can't stand. */
  blocks: SegmentGrid;
}

/** Furniture that stands in a wall opening (gateways): the wall leaves a gap there. */
const GATEWAYS = new Set(['archGate', 'steelGate', 'portal', 'portico', 'policeGate', 'tiuGate']);

const cache = new WeakMap<MapData, StreetLayout>();

/** Resolved once per map (a new run reuses it): the walls take a few hundred milliseconds to fit. */
export function layoutStreet(map: MapData, grid: BuildingGrid | null): StreetLayout {
  const hit = cache.get(map);
  if (hit) return hit;
  const units = ROWS.flatMap((row) => placeRow(map.roads, STREETS[row.street], row));
  const spots = FURNITURE.map((spot) => ({ ...placeSpot(map.roads, STREETS[spot.street], spot), spot }));
  const openings: Pt[] = spots.filter((s) => GATEWAYS.has(s.spot.kind)).map((s) => [s.x, s.z]);
  const walls = compoundWalls(map, grid, openings, units);
  const blocks = new SegmentGrid([...walls, ...units.flatMap((u) => rectEdges(u))]);
  const layout = { units, spots, walls, medians: medians(map.roads), blocks };
  cache.set(map, layout);
  return layout;
}
