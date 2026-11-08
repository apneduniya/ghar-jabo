// Draws the sim's pedestrians (src/sim/crowd.ts) as a few instanced meshes: 110 people, 6 draw calls.
// A pedestrian you barged into tilts while they're off balance.

import * as THREE from 'three';
import { person } from '../models';
import { C } from '../gfx';
import type { Crowd } from '../../sim/crowd';

export const LOOKS = 6;

export class Walkers {
  private meshes: THREE.InstancedMesh[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene, private crowd: Crowd) {
    const per = Math.ceil(crowd.walkers.length / LOOKS);
    for (let k = 0; k < LOOKS; k++) {
      const proto = person(C.shirt[(k * 3) % C.shirt.length], { pants: C.pants[k % C.pants.length], umbrella: k === 3, bag: k === 1 || k === 4 });
      const mesh = proto.children[0] as THREE.Mesh;
      const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, per);
      im.frustumCulled = false;
      this.meshes.push(im);
      scene.add(im);
    }
  }

  update(now: number) {
    this.crowd.walkers.forEach((w, i) => {
      const bob = w.stunned > 0 ? 0 : Math.abs(Math.sin(now / 160 + i)) * 0.06;
      this.e.set(w.stunned > 0 ? 0.5 : 0, -w.heading + Math.PI / 2, 0, 'YXZ');
      this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(w.x, bob, w.z), this.q, this.one);
      this.meshes[i % LOOKS].setMatrixAt(Math.floor(i / LOOKS), this.m);
    });
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  }
}
