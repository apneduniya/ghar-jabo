import netJson from '../../../../public/dev/landmarks-fixture.json';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CHUNK, type Landmark, type LandmarkKind, type WorldNet } from '../../../sim/gen/types';

// gfx.ts builds the WebGL renderer at import; tests only need its material, signs and the atlas merge.
vi.mock('../../gfx', async () => {
  const T = await import('three');
  const sign = (text: string, w: number, h: number) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial());
    m.userData.sign = text;
    return m;
  };
  const batchSigns = (root: THREE.Object3D) => {
    const found: THREE.Object3D[] = [];
    root.traverse((o) => { if (o.userData.sign !== undefined) found.push(o); });
    if (found.length < 2) return null;
    for (const m of found) m.parent?.remove(m);
    const atlas = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial());
    atlas.userData.atlas = found.length;
    root.add(atlas);
    return atlas;
  };
  return { bakedMat: new T.MeshLambertMaterial({ vertexColors: true }), sign, batchSigns };
});

const { structuresForChunk, landmarkAlone } = await import('./index');
const { fixtureChunk, fixtureWarp } = await import('./fixture');

const net = netJson as unknown as WorldNet;

const meshes = (o: THREE.Object3D | null) => { const out: THREE.Mesh[] = []; o?.traverse((m) => { if ((m as THREE.Mesh).isMesh) out.push(m as THREE.Mesh); }); return out; };
const tris = (o: THREE.Object3D | null) => meshes(o).filter((m) => !(m.material as THREE.MeshBasicMaterial).map && m.name === 'structures')
  .reduce((a, m) => a + m.geometry.attributes.position.count / 3, 0);

const KINDS: LandmarkKind[] = ['sealdah-station', 'metro-station', 'metro-portal', 'bus-terminus', 'clock-tower', 'stadium-gate',
  'traffic-island', 'statue', 'kolkata-sign', 'flyover', 'canal-bridge', 'rail-underbridge', 'mall', 'market', 'hospital',
  'police-kiosk', 'billboards', 'generic'];

describe('landmark models', () => {
  for (const mode of ['free', 'timed'] as const) it(`every kind builds or returns null without throwing (${mode})`, () => {
    const warp = fixtureWarp(mode);
    for (const kind of KINDS) for (const [x, z] of [[-2000, 500], [-900, -900], [5000, 5000]]) {
      const lm: Landmark = { id: `test-${kind}`, name: `Test ${kind}`, kind, x, z, heading: 1, r: 20 };
      const o = landmarkAlone({ ...net, landmarks: [lm] }, warp, lm);
      expect(o === null || o instanceof THREE.Object3D).toBe(true);
      expect(meshes(o).length).toBeLessThanOrEqual(2);
    }
  });

  it('stays within the triangle budget: Sealdah up to ~15k, the rest a few thousand', () => {
    const warp = fixtureWarp('free'), report: string[] = [];
    for (const lm of net.landmarks) {
      const n = tris(landmarkAlone(net, warp, lm));
      report.push(`${lm.id}: ${n}`);
      expect(n, lm.id).toBeLessThanOrEqual(lm.kind === 'sealdah-station' ? 16000 : 6000);
    }
    console.log(`triangles per landmark:\n  ${report.join('\n  ')}`);
  });

  it('suppresses a statue inside a junction model that already has one, and a flyover landmark the network draws', () => {
    const warp = fixtureWarp('free');
    const island = net.landmarks.find((l) => l.kind === 'traffic-island')!;
    const statue: Landmark = { ...island, id: 'dup-statue', kind: 'statue', x: island.x + 3 };
    expect(landmarkAlone({ ...net, landmarks: [island, statue] }, warp, statue)).toBeNull();
    const fly = net.landmarks.find((l) => l.kind === 'flyover')!;
    expect(landmarkAlone(net, warp, fly)).toBeNull();
    expect(landmarkAlone({ ...net, roads: net.roads.filter((r) => r.bridge !== 'flyover') }, warp, fly)).not.toBeNull();
  });
});

describe('structures per chunk over the whole fixture', () => {
  for (const mode of ['free', 'timed'] as const) it(`never more than two draw calls per chunk, and everything gets drawn (${mode})`, () => {
    const warp = fixtureWarp(mode);
    const pts = net.roads.flatMap((r) => r.p).map((p) => warp.toGame(p));
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    let built = 0, total = 0, signs = 0, max = { n: 0, at: '' };
    for (let cx = Math.floor(Math.min(...xs) / CHUNK); cx <= Math.floor(Math.max(...xs) / CHUNK); cx++)
      for (let cz = Math.floor(Math.min(...zs) / CHUNK); cz <= Math.floor(Math.max(...zs) / CHUNK); cz++) {
        const o = structuresForChunk(fixtureChunk(net, warp, cx, cz), net, warp);
        const ms = meshes(o);
        expect(ms.length, `chunk ${cx},${cz}`).toBeLessThanOrEqual(2);
        if (o) { built++; total += tris(o); if (tris(o) > max.n) max = { n: tris(o), at: `${cx},${cz}` }; signs += ms.filter((m) => m.userData.atlas || m.userData.sign !== undefined).length; }
        // Inside the Sector V square there is nothing to draw: the real map covers it.
        if (cx >= -2 && cx <= 1 && cz >= -2 && cz <= 1) expect(o, `chunk ${cx},${cz}`).toBeNull();
      }
    expect(built).toBeGreaterThan(20);
    expect(signs).toBeGreaterThan(10);
    console.log(`${mode}: ${built} chunks with structures, ${total} triangles in all, at most ${max.n} in chunk ${max.at}`);
    expect(max.n).toBeLessThanOrEqual(30000);
  });
});
