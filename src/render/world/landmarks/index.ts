// Landmarks and linear structures of the streamed world (stub: task 020, builder "landmarks" replaces this).
// One entry point: everything static that belongs to a chunk besides generated buildings, roads and props:
// landmark models, canal/rail bridges, metro viaduct pieces and portals. Must stay cheap: bake into one mesh.

import * as THREE from 'three';
import type { Chunk, WorldNet, Warp } from '../../../sim/gen/types';

/** Static structures for one chunk, or null if there are none. Positions in game (warped) coords. */
export function structuresForChunk(chunk: Chunk, net: WorldNet, warp: Warp): THREE.Object3D | null {
  void chunk; void net; void warp;
  return null;
}
