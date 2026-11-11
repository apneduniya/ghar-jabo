// Keeps one 3D model per sim vehicle in sync with the simulation. Models are created when a vehicle appears
// and removed when it leaves. The renderer never changes sim state.
// Each model has its own vehicle material (one shared shader program): the renderer rolls its wheels by the
// distance it has moved, lights its brake lights when the sim says it's braking, and leans bikes into turns.

import * as THREE from 'three';
import type { Vehicle } from '../sim/traffic';
import { ambassador, auto, bike, bus, car, toto } from './models';
import { sign, vehicleMaterial } from './gfx';

// A small fixed set of looks per kind, so models can be pooled and reused instead of rebuilt.
const LOOKS: Record<Vehicle['kind'], number> = { taxi: 3, car: 15, auto: 1, toto: 3, bike: 8, bus: 8 };
const lookOf = (v: Vehicle) => v.variant % LOOKS[v.kind];
const hangersOf = (v: Vehicle) => (v.kind === 'bus' ? Math.min(3, v.hangers ?? 0) : 0);
const keyOf = (v: Vehicle) => `${v.kind}:${lookOf(v)}:${v.kind === 'bus' ? `${v.routeDir}:${hangersOf(v)}` : ''}`;

/** How far a bike leans per (rad/s of turn × unit/s of speed), and at most. */
const LEAN = { k: 0.035, max: 0.42, ease: 8 };

function modelFor(v: Vehicle): THREE.Group {
  const look = lookOf(v);
  switch (v.kind) {
    case 'taxi': return ambassador(look);
    case 'car': return car(look);
    case 'auto': return auto();
    case 'toto': return toto(look);
    case 'bike': return bike(look);
    case 'bus': return bus(look * 9 + 3, v.routeDir === 1, hangersOf(v));
  }
}

interface Live { spin: { value: number }; brake: { value: number }; x: number; z: number; heading: number; roll: number; rolled: number }

export class Actors {
  private models = new Map<number, THREE.Group>();
  private keys = new Map<number, string>();
  private pool = new Map<string, THREE.Group[]>();
  private captainSign: THREE.Mesh | null = null;
  private captainFor = 0;
  private lastT = 0;

  constructor(private scene: THREE.Scene) {}

  /** The baked body of a model gets its own vehicle material, once. */
  private live(m: THREE.Group): Live {
    if (m.userData.live) return m.userData.live as Live;
    const body = m.children.find((c) => c.userData.vehicle) as THREE.Mesh | undefined;
    const vm = vehicleMaterial();
    if (body) body.material = vm;
    m.rotation.order = 'YXZ'; // yaw, then roll about the vehicle's own length (bike lean)
    const l: Live = { spin: vm.userData.spin, brake: vm.userData.brake, x: NaN, z: NaN, heading: 0, roll: 0, rolled: 0 };
    m.userData.live = l;
    return l;
  }

  sync(vehicles: Vehicle[], captainId: number, captainName: string) {
    const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(1e-3, now - (this.lastT || now - 1 / 60)));
    this.lastT = now;
    const seen = new Set<number>();
    for (const v of vehicles) {
      seen.add(v.id);
      let m = this.models.get(v.id);
      const fresh = !m;
      if (!m) {
        const key = keyOf(v);
        m = this.pool.get(key)?.pop() ?? modelFor(v);
        m.visible = true;
        this.models.set(v.id, m);
        this.keys.set(v.id, key);
        if (!m.parent) this.scene.add(m);
      }
      const l = this.live(m);
      if (fresh) { l.x = v.x; l.z = v.z; l.heading = v.heading; l.roll = 0; }
      // Wheels roll by the distance moved along the heading (backwards too, if it ever reverses).
      const moved = (v.x - l.x) * Math.cos(v.heading) + (v.z - l.z) * Math.sin(v.heading);
      if (Math.abs(moved) < 5) l.rolled += moved;
      l.spin.value = l.rolled;
      l.brake.value = v.braking || v.speed < 0.4 ? 1 : 0;
      if (v.kind === 'bike') {
        const turn = Math.atan2(Math.sin(v.heading - l.heading), Math.cos(v.heading - l.heading)) / dt;
        const want = Math.max(-LEAN.max, Math.min(LEAN.max, turn * v.speed * LEAN.k));
        l.roll += (want - l.roll) * Math.min(1, dt * LEAN.ease);
      }
      l.x = v.x; l.z = v.z; l.heading = v.heading;
      m.position.set(v.x, 0.05, v.z);
      // Models face +x; three.js turns anticlockwise seen from above, and our z points south.
      m.rotation.y = -v.heading;
      m.rotation.x = l.roll;
    }
    for (const [id, m] of this.models) {
      if (seen.has(id)) continue;
      // Hide and keep for reuse; no geometry is rebuilt or garbage-collected mid-run.
      m.visible = false;
      const key = this.keys.get(id)!;
      if (!this.pool.has(key)) this.pool.set(key, []);
      this.pool.get(key)!.push(m);
      this.models.delete(id);
      this.keys.delete(id);
    }

    // A floating name board over the Rapi-Nah captain.
    if (captainId !== this.captainFor) {
      if (this.captainSign) { this.captainSign.parent?.remove(this.captainSign); this.captainSign = null; }
      this.captainFor = captainId;
      const m = this.models.get(captainId);
      if (m) {
        this.captainSign = sign(`CAPTAIN ${captainName.toUpperCase()} ⬇`, 4, 0.7, '#ffd400', '#111');
        this.captainSign.position.set(0, 3, 0);
        m.add(this.captainSign);
      }
    }
  }

  /** Turn floating boards to face the camera. */
  billboard(camera: THREE.Camera) {
    const s = this.captainSign;
    if (!s?.parent) return;
    const parentQ = s.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    s.quaternion.copy(parentQ.multiply(camera.quaternion));
  }

  model(id: number) { return this.models.get(id); }
}
