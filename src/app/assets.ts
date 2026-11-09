// Data fetched at boot instead of bundled: the real Sector V map and the streamed world's network
// (public/data/*.json, built by tools/build-map.py and tools/build-world.py).

import { clipMap } from '../sim/gen/clip';
import { loadNet } from '../sim/gen/net';
import type { WorldNet } from '../sim/gen/types';
import type { MapData } from '../sim/mapdata';

export const assets: { map: MapData | null; net: WorldNet | null } = { map: null, net: null };

async function json(path: string): Promise<unknown> {
  const r = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

/** Fetches both files once. The map is clipped to the Sector V square: beyond it the streamed world takes over. */
export async function loadAssets(): Promise<{ map: MapData; net: WorldNet }> {
  if (!assets.map || !assets.net) {
    const [map, net] = await Promise.all([json('data/sectorv.json'), json('data/world.json')]);
    assets.map = clipMap(map as MapData);
    assets.net = loadNet(net);
  }
  return { map: assets.map, net: assets.net };
}
