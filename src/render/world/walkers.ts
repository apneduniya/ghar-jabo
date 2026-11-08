// People walking the footpaths of the main roads. Pure scenery (the sim doesn't know about them):
// a few instanced meshes, so forty pedestrians cost four draw calls.

import * as THREE from 'three';
import { person } from '../models';
import { C } from '../gfx';
import type { MapData } from '../../sim/mapdata';
import type { BuildingGrid } from '../../sim/collide';

interface Walker { ax: number; az: number; bx: number; bz: number; t: number; speed: number; mesh: number; slot: number }

const LOOKS = 6;

export class Walkers {
  private meshes: THREE.InstancedMesh[] = [];
  private walkers: Walker[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene, map: MapData, grid: BuildingGrid, count = 110) {
    const segs: [number, number, number, number][] = [];
    for (const r of map.roads) {
      if (!['primary', 'secondary', 'tertiary'].includes(r.k) || r.b) continue;
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 12) continue;
        // The footpath on each side: the road edge plus a bit.
        for (const side of [1, -1]) {
          const off = r.w / 2 + 1.6, nx = (bz - az) / L * off * side, nz = -(bx - ax) / L * off * side;
          const s = [ax + nx, az + nz, bx + nx, bz + nz] as [number, number, number, number];
          if (!grid.blocked((s[0] + s[2]) / 2, (s[1] + s[3]) / 2, 0.6)) segs.push(s);
        }
      }
    }
    const perLook = Math.ceil(count / LOOKS);
    for (let k = 0; k < LOOKS; k++) {
      const proto = person(C.shirt[(k * 3) % C.shirt.length], { pants: C.pants[k % C.pants.length], umbrella: k === 3, bag: k === 1 || k === 4 });
      const mesh = proto.children[0] as THREE.Mesh;
      const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, perLook);
      im.frustumCulled = false;
      this.meshes.push(im);
      scene.add(im);
    }
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const weight = (s: [number, number, number, number]) => (map.stops.some((st) => Math.hypot(st.p[0] - (s[0] + s[2]) / 2, st.p[1] - (s[1] + s[3]) / 2) < 45) ? 4 : 1);
    const pool = segs.flatMap((s) => Array(weight(s)).fill(s) as [number, number, number, number][]);
    for (let i = 0; i < count && pool.length; i++) {
      const s = pool[Math.floor(rnd() * pool.length)];
      const L = Math.hypot(s[2] - s[0], s[3] - s[1]);
      // Walking pace of 1.2–1.8 units/s, expressed as a fraction of this footpath segment per second.
      this.walkers.push({ ax: s[0], az: s[1], bx: s[2], bz: s[3], t: rnd(), speed: (1.2 + rnd() * 0.6) / L, mesh: i % LOOKS, slot: Math.floor(i / LOOKS) });
    }
  }

  update(dt: number, now: number) {
    for (const w of this.walkers) {
      w.t += w.speed * dt;
      if (w.t > 1 || w.t < 0) { w.speed = -w.speed; w.t = Math.max(0, Math.min(1, w.t)); }
      const x = w.ax + (w.bx - w.ax) * w.t, z = w.az + (w.bz - w.az) * w.t;
      const dir = Math.sign(w.speed);
      this.q.setFromAxisAngle(this.up, -Math.atan2((w.bz - w.az) * dir, (w.bx - w.ax) * dir) + Math.PI / 2);
      const bob = Math.abs(Math.sin(now / 160 + w.slot)) * 0.06;
      this.m.compose(new THREE.Vector3(x, bob, z), this.q, new THREE.Vector3(1, 1, 1));
      this.meshes[w.mesh].setMatrixAt(w.slot, this.m);
    }
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  }
}
