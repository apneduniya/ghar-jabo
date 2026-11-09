// The bus line home: the real Sector V bus path along Street No. 13, then a corridor of the net (warped) to
// Sealdah, with the real stops along it. Corridor A is the bus spine (ROUTES §1): Salt Lake under the Green Line,
// the Bypass, Phoolbagan, Narkeldanga Main Rd, APC Rd to the foot of Vidyapati Setu, the end of the line by road.
// The Sector V bus path follows the same Street 13 exit, so the two join without a gap.

import type { MapData } from '../mapdata';
import type { BusLine } from '../traffic';
import { densify } from './geom';
import type { WarpedNet } from './net';
import type { Pt } from './types';

export const BUS_CORRIDOR = 'A_saltlake_phoolbagan';

function project(p: Pt[], x: number, z: number) {
  let best = { i: 1, t: 0, d: Infinity };
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], [bx, bz] = p[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best.d) best = { i, t, d };
  }
  return best;
}

/** The bus path (game coords) and the stops near it. Falls back to the map's own path without a corridor. */
export function busRoute(map: MapData, wn: WarpedNet | null, corridor = BUS_CORRIDOR): BusLine {
  const line = wn?.net.corridors?.find((c) => c.id === corridor);
  if (!wn || !line) return { path: map.busPath, stops: map.stops };
  const real = densify(line.p, 10);
  // Join where the corridor passes the end of the map's bus path, then follow the corridor out.
  const end = map.busPath[map.busPath.length - 1];
  const j = project(real, end[0], end[1]);
  const rest = j.d < 12 ? real.slice(j.i) : real;
  const path: Pt[] = [...map.busPath, ...rest.map((q) => wn.warp.toGame(q))];
  const stops = [...map.stops, ...wn.stops.map((s) => ({ n: s.name, p: [s.x, s.z] as Pt, thin: true }))];
  return { path, stops };
}
