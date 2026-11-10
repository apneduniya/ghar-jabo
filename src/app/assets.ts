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
    warmFonts();
    const [map, net] = await Promise.all([json('data/sectorv.json'), json('data/world.json')]);
    assets.map = clipMap(map as MapData);
    assets.net = loadNet(net);
  }
  return { map: assets.map, net: assets.net };
}

/**
 * Draw a line in every script and face the signs use, once, behind the loading screen. The first Bengali or
 * Devanagari text drawn otherwise makes the browser load a fallback font mid-ride (a ~100 ms stall at Sealdah).
 */
function warmFonts() {
  const g = document.createElement('canvas').getContext('2d');
  if (!g) return;
  const sample = 'Sealdah শিয়ালদহ সেক্টর সল্টলেক सियालदह आईटी ₹ ♥ 0123';
  for (const face of ['bold 32px system-ui, sans-serif', '32px system-ui, sans-serif', 'bold 32px system-ui, "Noto Sans Bengali", sans-serif',
    'bold 32px Georgia, serif', 'italic 32px Georgia, serif']) {
    g.font = face;
    g.fillText(sample, 0, 32);
  }
}
