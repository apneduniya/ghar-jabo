// Landmarks and linear structures of the streamed world (task 020). One entry point: everything static that belongs
// to a chunk besides generated buildings, roads and props: landmark models, canal and rail bridges, flyovers, the
// metro viaduct with its stations and portal, the Bypass median. Positions come from the net in real coordinates and
// are warped into game space; model sizes stay true. Each chunk's structures are one vertex-coloured mesh
// (bakedMat: colours plus night glow) and at most one sign-atlas mesh: two draw calls at most.
//
// Ownership: a landmark or crossing belongs to the chunk holding its warped position (floor division); linear
// structures are clipped to the chunk square with point features (piers, lamps) at global arc positions, so
// neighbouring chunks never double or drop a piece. Nothing is drawn inside the Sector V square (the real map).

import * as THREE from 'three';
import { batchSigns } from '../../gfx';
import type { Chunk, Landmark, WorldNet, Warp } from '../../../sim/gen/types';
import { inSectorV, owns } from './clip';
import { Ctx } from './ctx';
import { buildMetro, metroPrep, portal } from './metro';
import { buildDecks, buildMedians, flyoverNear } from './decks';
import { buildBridge } from './bridges';
import { warpHeading } from '../../../sim/gen/layout';
import { crossingSite, landmarkBridge } from '../../../sim/gen/sites';
import { glassEntrance } from './stations';
import { sealdah } from './sealdah';
import { billboards, kolkataSign, policeKiosk, statue, trafficIsland } from './junctions';
import { busTerminus, clockTower, hospital, mall, market, nameBoard, stadiumGate } from './places';
import { cityCentreMall, railStation, redChurch } from './surveyed';
import { fallbackFlyover } from './fallback';

/** Static structures for one chunk, or null if there are none. Positions in game (warped) coords. */
export function structuresForChunk(chunk: Chunk, net: WorldNet, warp: Warp): THREE.Object3D | null {
  const ctx = new Ctx(net, warp, chunk.cx, chunk.cz);
  buildMetro(ctx);
  buildDecks(ctx);
  buildMedians(ctx);
  for (const c of net.crossings) {
    const [x, z] = warp.toGame([c.x, c.z]);
    if (!owns(ctx.cx, ctx.cz, x, z) || inSectorV(x, z)) continue;
    // A road bridge that is part of a flyover deck already has the deck's parapets (decks.ts).
    if (c.over && flyoverNear(ctx, x, z, 8)) continue;
    buildBridge(ctx, crossingSite(net, warp, c, x, z));
  }
  for (const lm of net.landmarks) {
    const [x, z] = warp.toGame([lm.x, lm.z]);
    if (owns(ctx.cx, ctx.cz, x, z) && !inSectorV(x, z)) landmark(ctx, lm, x, z);
  }
  return assemble(ctx, `structures ${chunk.cx},${chunk.cz}`);
}

/**
 * Warm the per-(net, warp) caches (the warped roads, metro and flyover lines) up front, e.g. while world.json loads,
 * so the first chunk near them doesn't pay for it mid-ride. Optional: structuresForChunk fills them lazily otherwise.
 */
export function prepareStructures(net: WorldNet, warp: Warp) {
  const ctx = new Ctx(net, warp, 0, 0);
  ctx.roads();
  metroPrep(ctx);
  flyoverNear(ctx, 0, 0, 0);
}

/** One landmark's model alone (for tests, triangle budgets and the debug view). */
export function landmarkAlone(net: WorldNet, warp: Warp, lm: Landmark): THREE.Object3D | null {
  const [x, z] = warp.toGame([lm.x, lm.z]);
  const ctx = new Ctx(net, warp, Math.floor(x / 128), Math.floor(z / 128));
  landmark(ctx, lm, x, z);
  return assemble(ctx, lm.id);
}

const near = (net: WorldNet, warp: Warp, x: number, z: number, r: number, kinds: Landmark['kind'][]) =>
  net.landmarks.some((o) => kinds.includes(o.kind) && (() => { const [ox, oz] = warp.toGame([o.x, o.z]); return Math.hypot(ox - x, oz - z) < r; })());

function landmark(ctx: Ctx, lm: Landmark, x: number, z: number) {
  const { net, warp } = ctx, f = ctx.frame(x, z, warpHeading(warp, lm.x, lm.z, lm.heading));
  switch (lm.kind) {
    case 'sealdah-station': return sealdah(ctx, f);
    case 'traffic-island': return trafficIsland(ctx, f);
    case 'statue': if (!near(net, warp, x, z, 25, ['kolkata-sign', 'traffic-island'])) statue(ctx, f); return;
    case 'kolkata-sign': return kolkataSign(f);
    case 'police-kiosk': return policeKiosk(f);
    case 'billboards': return billboards(f, lm);
    case 'stadium-gate': return stadiumGate(f);
    case 'bus-terminus': return busTerminus(f);
    case 'clock-tower': return clockTower(f);
    case 'mall': return lm.id.startsWith('city-centre-1') ? cityCentreMall(f) : mall(f);
    case 'rail-station': return railStation(f);
    case 'church': return redChurch(f);
    case 'market': return market(f);
    case 'hospital': return hospital(f);
    // The junction a flyover is named for can sit 100 u off the deck itself (Ultadanga More).
    case 'flyover': if (!flyoverNear(ctx, x, z, 150)) fallbackFlyover(f); return;
    case 'metro-station': {
      const onLine = metroPrep(ctx).some((m) => m.stations.some((s) => Math.hypot(s.x - x, s.z - z) < 40));
      if (!onLine) glassEntrance(f, lm.name);
      return;
    }
    case 'metro-portal': {
      const has = metroPrep(ctx).some((m) => m.portals.some((p) => { const [px, pz] = at(m.l, p.s); return Math.hypot(px - x, pz - z) < 80; }));
      if (!has) portal(ctx, { x, z, dx: f.fx, dz: f.fz }, 1);
      return;
    }
    case 'canal-bridge':
    case 'rail-underbridge': {
      const site = landmarkBridge(net, warp, lm, x, z);
      if (site) buildBridge(ctx, site);
      return;
    }
    case 'generic':
    default: return nameBoard(f, lm);
  }
}

const at = (l: { p: [number, number][]; d: number[] }, s: number): [number, number] => {
  const i = Math.max(1, l.d.findIndex((d) => d >= s));
  return l.p[Math.min(i, l.p.length - 1)];
};

/** The Soup as one mesh plus the signs as one atlas mesh, under a group. Null if empty. */
function assemble(ctx: Ctx, name: string): THREE.Object3D | null {
  const mesh = ctx.parts.mesh();
  if (!mesh && !ctx.signs.length) return null;
  const g = new THREE.Group();
  g.name = name;
  if (mesh) { mesh.name = 'structures'; g.add(mesh); }
  for (const s of ctx.signs) g.add(s);
  if (ctx.signs.length) batchSigns(g);
  g.userData.dispose = () => g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    // bakedMat is shared by every chunk; only the per-chunk sign materials and atlas textures are ours to free.
    const mat = m.material as THREE.MeshBasicMaterial;
    if (mat.map) { mat.map.dispose(); mat.dispose(); }
  });
  return g;
}
