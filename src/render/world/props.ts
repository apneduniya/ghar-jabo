// Street life on the real map. The surveyed street level (stall rows, junction furniture, walls, medians,
// lamps, trees) comes from the sim's StreetLayout and is drawn by stalls.ts, furniture.ts, streetkit.ts,
// lamps.ts and greenery.ts. Here: bus shelters at the stops OSM says have one, the metro stairs, the puddles
// at Webel More and the parody billboards. All static, batched into a few draw calls.

import * as THREE from 'three';
import { bake, box } from '../gfx';
import { person } from '../models';
import type { MapData } from '../../sim/mapdata';
import type { BuildingGrid } from '../../sim/collide';
import type { StreetLayout } from '../../sim/streetlayout';
import { nearestRoad } from '../../sim/streetlife';
import { floods } from '../../content/sectorv';
import { SHELTER_STOPS } from '../../content/streetlife';
import { adBoard, buildFurniture } from './furniture';
import { Forest } from './greenery';
import { Rails } from './kit';
import { buildLamps } from './lamps';
import { buildStalls } from './stalls';
import { buildStreetKit } from './streetkit';

const ADS = [
  ['RAPI-NAH', 'Captain 2 min away. Always.', '#ffd400', '#111'],
  ['TEN MINUTE', 'We deliver faster than your bus', '#6b2bd9', '#fff'],
  ['SECTOR V HEIGHTS', '2BHK with canal view (monsoon only)', '#1f5f9a', '#fff'],
  ['TAKA PAY', 'Pay the conductor. In coins. Exact change.', '#0e8a5b', '#fff'],
  ['MISHTI MOBILE', 'Unlimited data, limited signal in Sector V', '#e2402c', '#fff'],
];

export interface PropsWorld { grid: BuildingGrid; metroEntrance: { x: number; z: number }; street: StreetLayout }

export function buildProps(scene: THREE.Object3D, map: MapData, world: PropsWorld) {
  const statics = new THREE.Group();
  const rails = new Rails();
  const forest = new Forest();

  // Bus shelters only where OSM tags one (and College More's, in furniture.ts); elsewhere a pole and a board.
  const seen = new Set<string>();
  for (const s of map.stops) {
    const key = `${s.n}:${Math.round(s.p[0] / 20)}:${Math.round(s.p[1] / 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = nearestRoad(map.roads, s.p[0], s.p[1]);
    const g = new THREE.Group();
    if (SHELTER_STOPS.includes(s.n)) {
      g.add(box(4.6, 0.18, 1.8, 0x2f6db5, 0, 2.5, 0), box(0.12, 2.5, 0.12, 0x555555, -2.1, 0, -0.7), box(0.12, 2.5, 0.12, 0x555555, 2.1, 0, -0.7));
      g.add(box(4.2, 0.12, 0.5, 0x8a8a8a, 0, 0.5, -0.5));
      for (let i = 0; i < 3; i++) {
        const p = person();
        p.position.set(-1.5 + i * 1.4, 0, 0.2);
        p.rotation.y = -Math.PI / 2;
        g.add(p);
      }
    } else {
      g.add(box(0.1, 2.6, 0.1, 0x555555, 0, 0, 0));
    }
    g.position.set(s.p[0], 0, s.p[1]);
    g.rotation.y = Math.atan2(r.x - s.p[0], r.z - s.p[1]); // front (+z) towards the road
    statics.add(g);
  }

  // (The metro entrance is Gate A, built with the station: render/world/stations.ts.)

  // Puddles that never dry (Webel More): a cluster of shallow, sky-tinted pools rather than one slab.
  for (const f of floods) {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, d = (i % 3) * f.r * 0.3;
      statics.add(box(f.r * (0.35 + (i % 4) * 0.08), 0.03, f.r * (0.25 + (i % 3) * 0.07), 0x7d9bb3, f.x + Math.cos(a) * d, 0.07, f.z + Math.sin(a) * d));
    }
  }

  // The surveyed street level.
  buildStreetKit(statics, map, world.grid, world.street, rails, forest);
  buildStalls(statics, map, world.street.units, rails);
  // The surveys' rows stand under big rain trees and coconut palms just behind them.
  for (const u of world.street.units) {
    const x = u.x + u.nx * (u.d / 2 + 2.2), z = u.z + u.nz * (u.d / 2 + 2.2);
    if (u.i % 2 || world.grid.blocked(x, z, 1.5) || forest.near(x, z, 6)) continue;
    if (u.i % 6 === 2) forest.palm(x, z, 'coconut');
    else forest.rain(x, z, 1.1);
  }
  buildFurniture(statics, map, world.street, rails, forest);
  const lit = buildLamps(statics, map, world.street);

  bake(statics);
  scene.add(statics);
  scene.add(rails.mesh());
  forest.build(scene);

  // Billboards with parody ads on tall frames near the junction and the flyover.
  const spotsAd = [[-30, -40], [40, -25], [-120, -150], [150, 90], [-60, 120]];
  spotsAd.forEach(([x, z], i) => {
    if (world.grid.blocked(x, z, 1) || world.street.blocks.blocked(x, z, 1)) return;
    const [title, line, bg, fg] = ADS[i % ADS.length];
    const frame = new THREE.Group();
    frame.add(box(0.3, 9, 0.3, 0x555555, -3, 0, 0), box(0.3, 9, 0.3, 0x555555, 3, 0, 0));
    bake(frame);
    const face = adBoard(title, line, bg, fg);
    face.position.set(0, 10.2, 0.2);
    frame.add(face);
    frame.position.set(x, 0, z);
    frame.rotation.y = Math.atan2(-x, -z); // face the PWH junction
    scene.add(frame);
  });
  return { trees: forest.trees.length, lamps: lit.lamps };
}
