// Metro viaducts: the Green Line (one double-track girder on round piers with hammerhead caps, in the landscaped
// strip between the Canal Side service road and the canal, curving NW over 3rd Ave at Wipro More), and the
// Orange Line along the Biswa Bangla Sarani median beyond IT Centre.

import type { Pier } from '../../sim/elevated';
import type { Pt } from '../../sim/mapdata';
import { type Parts, walk } from './kit';

const CONCRETE = 0xc9c2b8, PIER = 0xbfb8ad, RAIL = 0x7a7f84;

export interface ViaductStyle { y: number; w: number; pierR: number; skip?: (x: number, z: number) => boolean }

export function buildViaduct(parts: Parts, line: Pt[], piers: Pier[], v: ViaductStyle) {
  const half = v.w / 2;
  for (const s of walk(line, 3)) {
    if (v.skip?.(s.x, s.z)) continue;
    const nx = s.dz, nz = -s.dx;
    parts.box(s.len + 0.05, 1.4, v.w * 0.7, s.x, v.y - 1.75, s.z, s.rot, CONCRETE); // box girder
    parts.box(s.len + 0.05, 0.35, v.w, s.x, v.y - 0.35, s.z, s.rot, CONCRETE); // deck slab
    for (const side of [1, -1]) {
      const o = (half - 0.12) * side;
      parts.box(s.len + 0.05, 0.9, 0.24, s.x + nx * o, v.y, s.z + nz * o, s.rot, CONCRETE); // parapet
      parts.box(s.len + 0.05, 0.06, 0.06, s.x + nx * o, v.y + 1.3, s.z + nz * o, s.rot, RAIL); // railing on top
      if (s.i % 2 === 0) parts.box(0.06, 0.4, 0.06, s.x + nx * o, v.y + 0.9, s.z + nz * o, s.rot, RAIL);
    }
  }
  for (const p of piers) {
    if (v.skip?.(p.x, p.z)) continue;
    const top = v.y - 1.75;
    const off = Math.hypot(p.cx - p.x, p.cz - p.z);
    // Hammerhead: a wide cap under the girder, flared down to the column.
    parts.box(1.8, 0.9, v.w * 0.92, p.x, top - 0.9, p.z, -Math.atan2(p.dz, p.dx), PIER);
    if (off > 0.5) {
      // The column stands on a median or footpath to one side: a cantilevered cap reaches back to the deck.
      parts.span([p.cx, p.cz], [p.x, p.z], 1.1, 1.6, top - 1.1, PIER);
      parts.cyl(v.pierR * 1.15, top - 0.9, p.cx, 0, p.cz, PIER, 1, 0, 12);
    } else {
      parts.box(1.5, 0.6, v.w * 0.5, p.x, top - 1.5, p.z, -Math.atan2(p.dz, p.dx), PIER);
      parts.cyl(v.pierR, top - 1.5, p.cx, 0, p.cz, PIER, 1, 0, 12);
    }
  }
}
