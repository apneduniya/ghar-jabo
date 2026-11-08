// Keeps one 3D model per sim vehicle in sync with the simulation. Models are created when a vehicle appears
// and removed when it leaves. The renderer never changes sim state.

import * as THREE from 'three';
import type { Vehicle } from '../sim/traffic';
import { ambassador, auto, bike, bus, car, toto } from './models';
import { sign } from './gfx';

function modelFor(v: Vehicle): THREE.Group {
  switch (v.kind) {
    case 'taxi': return ambassador();
    case 'car': return car(v.variant);
    case 'auto': return auto();
    case 'toto': return toto(v.variant);
    case 'bike': return bike();
    case 'bus': return bus(v.variant, v.routeDir === 1);
  }
}

export class Actors {
  private models = new Map<number, THREE.Group>();
  private captainSign: THREE.Mesh | null = null;
  private captainFor = 0;

  constructor(private scene: THREE.Scene) {}

  sync(vehicles: Vehicle[], captainId: number, captainName: string) {
    const seen = new Set<number>();
    for (const v of vehicles) {
      seen.add(v.id);
      let m = this.models.get(v.id);
      if (!m) { m = modelFor(v); this.models.set(v.id, m); this.scene.add(m); }
      m.position.set(v.x, 0.05, v.z);
      // Models face +x; three.js turns anticlockwise seen from above, and our z points south.
      m.rotation.y = -v.heading;
    }
    for (const [id, m] of this.models) if (!seen.has(id)) { this.scene.remove(m); this.models.delete(id); }

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
