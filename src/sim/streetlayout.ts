// Everything the street-life survey places, resolved once per map: hawker rows, furniture, compound walls and
// medians, plus the collision for walls and stalls. The World owns it; the renderer draws exactly this.

import { FURNITURE, ROWS, STREETS, type Spot } from '../content/streetlife';
import type { BuildingGrid, Pt } from './collide';
import type { MapData } from './mapdata';
import { CONTROLS } from '../content/tuning';
import { medians, medianStyle, placeRow, placeSpot, type MedianPiece, type Placed, type Unit } from './streetlife';
import { compoundWalls, rectEdges, SegmentGrid, type WallPiece } from './walls';

export interface StreetLayout {
  units: Unit[];
  spots: (Placed & { spot: Spot })[];
  walls: WallPiece[];
  medians: MedianPiece[];
  /** Walls, stalls and the medians of divided roads: true where the player can't stand. */
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
  const blocks = new SegmentGrid([...walls, ...units.flatMap((u) => rectEdges(u)), ...medianEdges(map)]);
  const layout = { units, spots, walls, medians: medians(map.roads), blocks };
  cache.set(map, layout);
  return layout;
}

/**
 * Dividers are solid: the outline of every median piece, at its surveyed width. Pieces are sampled finer than
 * the drawn ones so bends leave no holes; junctions and U-turn gaps have no pieces, so you walk through those.
 */
function medianEdges(map: MapData) {
  const step = CONTROLS.medianStep;
  return medians(map.roads, step).flatMap((m) => {
    const { width } = medianStyle(m);
    return rectEdges({ x: m.x, z: m.z, dx: m.dx, dz: m.dz, nx: m.dz, nz: -m.dx, w: step + 0.1, d: Math.max(0.6, width - 0.3) });
  });
}
