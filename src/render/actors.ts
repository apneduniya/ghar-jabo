// Keeps one 3D model per sim vehicle in sync with the simulation. Models are created when a vehicle appears
// and removed when it leaves. The renderer never changes sim state.

import * as THREE from 'three';
import type { Vehicle } from '../sim/traffic';
import { ambassador, auto, bike, bus, car, toto } from './models';
import { sign } from './gfx';

// A small fixed set of looks per kind, so models can be pooled and reused instead of rebuilt.
const LOOKS: Record<Vehicle['kind'], number> = { taxi: 1, car: 15, auto: 1, toto: 3, bike: 4, bus: 12 };
const lookOf = (v: Vehicle) => v.variant % LOOKS[v.kind];
const keyOf = (v: Vehicle) => `${v.kind}:${lookOf(v)}:${v.kind === 'bus' ? v.routeDir : ''}`;

function modelFor(v: Vehicle): THREE.Group {
  const look = lookOf(v);
  switch (v.kind) {
    case 'taxi': return ambassador();
    case 'car': return car(look);
    case 'auto': return auto();
    case 'toto': return toto(look);
    case 'bike': return bike();
    case 'bus': return bus(look * 9 + 3, v.routeDir === 1);
  }
}

export class Actors {
  private models = new Map<number, THREE.Group>();
  private keys = new Map<number, string>();
  private pool = new Map<string, THREE.Group[]>();
  private captainSign: THREE.Mesh | null = null;
  private captainFor = 0;

  constructor(private scene: THREE.Scene) {}

  sync(vehicles: Vehicle[], captainId: number, captainName: string) {
    const seen = new Set<number>();
    for (const v of vehicles) {
      seen.add(v.id);
      let m = this.models.get(v.id);
      if (!m) {
        const key = keyOf(v);
        m = this.pool.get(key)?.pop() ?? modelFor(v);
        m.visible = true;
        this.models.set(v.id, m);
        this.keys.set(v.id, key);
        if (!m.parent) this.scene.add(m);
      }
      m.position.set(v.x, 0.05, v.z);
      // Models face +x; three.js turns anticlockwise seen from above, and our z points south.
      m.rotation.y = -v.heading;
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
