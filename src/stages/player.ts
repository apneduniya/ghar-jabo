// The student on foot: run, jump, get knocked down. Scenes decide what else (hanging off buses, riding pillion).

import * as THREE from 'three';
import { playerPerson } from '../render/models';
import { input } from '../input/input';

export const RUN_SPEED = 6.5;

export class Body {
  obj = playerPerson();
  vel = new THREE.Vector3();
  onGround = true;
  downT = 0;
  slow = 1;

  get pos() { return this.obj.position; }
  get down() { return this.downT > 0; }

  knockDown(dir: THREE.Vector3, power = 6) {
    this.downT = 1.3;
    this.vel.set(dir.x * power, 4, dir.z * power);
    this.onGround = false;
  }

  /**
   * Move on foot. The stick is relative to the camera: `yaw` is the camera's heading in the x/z plane
   * (0 = looking along +x). zMin/zMax clamp across a corridor; pass ±Infinity for open maps.
   */
  update(dt: number, zMin: number, zMax: number, yaw = 0) {
    const p = this.obj.position;
    if (this.downT > 0) {
      this.downT -= dt;
      this.obj.rotation.z = THREE.MathUtils.lerp(this.obj.rotation.z, Math.PI / 2, dt * 10);
      this.vel.x *= 1 - dt * 2;
      this.vel.z *= 1 - dt * 2;
    } else {
      this.obj.rotation.z = THREE.MathUtils.lerp(this.obj.rotation.z, 0, dt * 12);
      const sp = RUN_SPEED * this.slow;
      const fx = Math.cos(yaw), fz = Math.sin(yaw);
      const tx = (fx * input.mx - fz * input.mz) * sp;
      const tz = (fz * input.mx + fx * input.mz) * sp;
      const k = this.onGround ? 12 : 3;
      this.vel.x += (tx - this.vel.x) * Math.min(1, dt * k);
      this.vel.z += (tz - this.vel.z) * Math.min(1, dt * k);
      if (input.jump && this.onGround) { this.vel.y = 7; this.onGround = false; }
      const moving = Math.hypot(this.vel.x, this.vel.z);
      if (moving > 0.5) {
        // Turn smoothly, the short way round (the rig shuffles the feet while turning on the spot).
        const want = Math.atan2(this.vel.x, this.vel.z), r = this.obj.rotation;
        r.y += Math.atan2(Math.sin(want - r.y), Math.cos(want - r.y)) * Math.min(1, dt * 14);
      }
    }
    if (!this.onGround) {
      this.vel.y -= 20 * dt;
      p.y += this.vel.y * dt;
      if (p.y <= 0) { p.y = 0; this.vel.y = 0; this.onGround = true; }
    }
    p.x += this.vel.x * dt;
    p.z = THREE.MathUtils.clamp(p.z + this.vel.z * dt, zMin, zMax);
    // Legs and arms: stride matched to the real speed, tuck in the air, squash on landing (render/rig.ts).
    this.obj.animate(dt, { speed: this.downT > 0 ? 0 : Math.hypot(this.vel.x, this.vel.z), airborne: !this.onGround, vy: this.vel.y, down: this.downT > 0, hang: false, sit: false });
  }
}
