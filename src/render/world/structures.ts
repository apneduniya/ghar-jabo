// The elevated north (research/streetview/NORTH.md): the two-deck Nabadiganta flyover (flyover.ts), the Green and
// Orange Line viaducts (viaduct.ts), Sector V and IT Centre stations with the skywalk (stations.ts), and the sunken
// Keshtopur canal with its railings and tree belt (canal.ts). Layout comes from sim/elevated.ts and sim/canal.ts
// (pure, shared with the camera and the walking rules). Everything static merges into three draw calls: one
// vertex-coloured mesh (night glow per vertex) and the posters; the water and the signs go to the caller.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canalOf } from '../../sim/canal';
import { flyoverDecks, greenLine, inBox, orangeLine, stations } from '../../sim/elevated';
import { dryOf, orangePiers, viaducts } from '../../sim/structures';
import type { MapData, Pt } from '../../sim/mapdata';
import { posters } from './textures';
import { Parts } from './northkit';
import { buildFlyover } from './flyover';
import { buildViaduct } from './viaduct';
import { buildStations } from './stations';
import { buildCanal, channel } from './canal';

export interface BuiltStructures {
  group: THREE.Group;
  /** Static signboards (gantry, station names) for the scene's sign atlas. */
  signs: THREE.Object3D[];
  /** The sunken canal channel's outline: the ground has a hole here. */
  hole: Pt[] | null;
  /** The canal's water surface, for the caller to merge with the other water (one draw call). */
  water: THREE.BufferGeometry | null;
}

export function buildStructures(map: MapData): BuiltStructures {
  const parts = new Parts();
  const posterParts: THREE.BufferGeometry[] = [];
  const { sv, it } = stations();
  const canal = canalOf(map);

  const signs = buildFlyover(parts, posterParts, flyoverDecks(map.roads), map.roads);
  const v = viaducts();
  buildViaduct(parts, greenLine(map.rails), canal.piers, v.green);
  const orange = orangeLine(map.roads, it);
  buildViaduct(parts, orange, orangePiers(orange, map.roads), v.orange);
  const line = canal.line;
  signs.push(...buildStations(parts, map.roads, dryOf(map)));
  const water = line ? buildCanal(parts, posterParts, map, line, canal.railings, (x, z) => inBox(sv, x, z, 0.5) || inBox(it, x, z, 0.5)) : null;

  const group = new THREE.Group();
  const mesh = parts.mesh();
  if (mesh) group.add(mesh);
  if (posterParts.length) group.add(new THREE.Mesh(mergeGeometries(posterParts.map((g) => g.toNonIndexed())), new THREE.MeshLambertMaterial({ map: posters() })));
  return { group, signs, hole: line ? channel(line).hole : null, water };
}
