// Draws people as a few rigged instanced meshes (render/rig.ts): one per look, so 110 pedestrians cost 6 draw
// calls and every one of them still swings their legs and arms. `Figures` is the shared part (the metro station
// uses it too); `Walkers` drives it from the sim's crowd (src/sim/crowd.ts).

import * as THREE from 'three';
import { CROWD_LOOKS } from '../models';
import { figure, gait, restPose, rigged, rigTime, setPose, type Pose } from '../rig';
import type { Crowd } from '../../sim/crowd';

export const LOOKS = CROWD_LOOKS.length;

/** Mild clothing tints, multiplied into each look's clothes so two office shirts are rarely the same. */
const TINTS = [0xffffff, 0xc8d8ff, 0xffd0c8, 0xd2f0c8, 0xfff0b8, 0xe0d0f0, 0xb8b8b8];

/** Per-person state the render keeps: where they are in their stride, and a little variety. */
interface Slot { phase: number; height: number; stride: number; look: number }

export class Figures {
  readonly meshes: THREE.InstancedMesh[] = [];
  private slots: Slot[] = [];
  private pose: Pose = restPose();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  /** `count` people, person i wearing look i % LOOKS. */
  constructor(scene: THREE.Object3D, readonly count: number) {
    const per = Math.ceil(count / LOOKS);
    for (let k = 0; k < LOOKS; k++) {
      const im = rigged(figure(CROWD_LOOKS[k]), per);
      im.count = Math.floor(count / LOOKS) + (k < count % LOOKS ? 1 : 0);
      this.meshes.push(im);
      scene.add(im);
    }
    for (let i = 0; i < count; i++) {
      const k = i % LOOKS, j = Math.floor(i / LOOKS), h = ((i * 0.618034) % 1);
      // Taller people take longer strides; the saree shortens the step.
      const height = CROWD_LOOKS[k].scale * (0.94 + h * 0.12);
      this.slots.push({ phase: i * 1.7, height, stride: CROWD_LOOKS[k].dress === 'saree' ? 0.8 : 1, look: k });
      this.meshes[k].setColorAt(j, this.c.setHex(TINTS[(i * 5 + k) % TINTS.length]));
    }
    for (const im of this.meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  /**
   * Put person i at (x, y, z) facing `heading` (radians in the x/z plane, 0 = +x), moving at `speed`.
   * `tilt` tips them forward (stumbling); `idle` shows what they do when standing.
   */
  place(i: number, dt: number, x: number, y: number, z: number, heading: number, speed: number, opts: { tilt?: number; idle?: 'phone' | 'look'; t?: number } = {}) {
    const sl = this.slots[i], P = this.pose;
    // The figure is `height` tall: the gait works in its own units, so a short stride fits a short person.
    const g = gait(speed / sl.height, sl.stride);
    sl.phase = (sl.phase + g.rate * dt) % (Math.PI * 200);
    P.phase = sl.phase; P.swing = g.swing; P.lean = g.lean;
    const still = speed < 0.2, t = opts.t ?? 0;
    P.armR = still && opts.idle === 'phone' ? 1 : 0;
    P.look = still && opts.idle === 'look' ? Math.sin(t * 0.9 + i) * 0.7 : still ? Math.sin(t * 0.3 + i * 2) * 0.15 : 0;
    P.armL = P.sit = P.squash = 0;
    if (opts.tilt) { P.armL = P.armR = 1.3; P.swing = 0.3; P.lean = 0; }
    const k = sl.look, j = Math.floor(i / LOOKS), im = this.meshes[k];
    setPose(im, j, P);
    // The figure faces +z: turn it to face `heading`.
    this.e.set(opts.tilt ?? 0, Math.PI / 2 - heading, 0, 'YXZ');
    this.q.setFromEuler(this.e);
    this.m.compose(this.v.set(x, y, z), this.q, this.s.setScalar(sl.height));
    im.setMatrixAt(j, this.m);
  }

  /** Hide person i (they got on the train). */
  hide(i: number) {
    const sl = this.slots[i];
    this.meshes[sl.look].setMatrixAt(Math.floor(i / LOOKS), this.m.makeScale(0, 0, 0));
  }

  flush(now: number) {
    rigTime.value = now / 1000;
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  }
}

export class Walkers {
  private figs: Figures;
  private last = 0;

  constructor(scene: THREE.Scene, private crowd: Crowd) {
    this.figs = new Figures(scene, crowd.walkers.length);
  }

  /** `now` in ms (performance.now()). */
  update(now: number) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const t = now / 1000;
    this.crowd.walkers.forEach((w, i) => {
      const stunned = w.stunned > 0;
      this.figs.place(i, dt, w.x, 0, w.z, w.heading, stunned ? 0 : w.v, { tilt: stunned ? 0.5 : 0, idle: w.pause > 0 ? w.idle : undefined, t });
    });
    this.figs.flush(now);
  }
}
