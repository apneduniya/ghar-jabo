// Traffic on the corridor: cars, yellow taxis, buses you can hang off, and Rapi-Nah bikes.
// Vehicles only exist in a window around the player. The jam slows everything and makes it stop-and-go.

import * as THREE from 'three';
import { bike, bus, BUS_LEN, BUS_REAR_DOOR, BUS_WIDTH, car, person, pickColor, rand, taxi } from './gfx';
import { LANES_EAST, LANES_WEST, stops } from './route';

export type Kind = 'car' | 'taxi' | 'bus' | 'bike';

export interface Vehicle {
  kind: Kind;
  obj: THREE.Group;
  lane: number; // z
  dir: 1 | -1;
  base: number; // cruising speed
  speed: number;
  len: number;
  width: number;
  /** Bus: ends its run at this x ("Depot! Ar jabe na!"). */
  depotX?: number;
  hangers?: number;
  /** Rapi-Nah captain: a scripted bike with its own behaviour. */
  captain?: Captain;
  stoppedFor?: number;
}

export interface Captain {
  name: string;
  /** 'come': stops near the player. 'pass': drives past without stopping. 'wrong': stops far away. */
  plan: 'come' | 'pass' | 'wrong';
  stopX: number;
  state: 'approach' | 'waiting' | 'leaving' | 'carrying';
  waitT: number;
}

const WINDOW = 160;

export class Traffic {
  list: Vehicle[] = [];
  private spawnT = 0;

  constructor(private scene: THREE.Scene) {}

  spawn(kind: Kind, x: number, lane: number, dir: 1 | -1, extra: Partial<Vehicle> = {}): Vehicle {
    let obj: THREE.Group;
    let len = 2.4, width = 1.2, base = rand(9, 13);
    if (kind === 'bus') {
      obj = bus(); len = BUS_LEN; width = BUS_WIDTH; base = rand(13, 17);
    } else if (kind === 'taxi') {
      obj = taxi(); base = rand(10, 14);
    } else if (kind === 'bike') {
      obj = bike(); len = 1.6; width = 0.6; base = rand(13, 16);
      const rider = person(pickColor([0x3f7cc4, 0xd9534f, 0x2b2b2b]));
      rider.position.set(0.3, 0.55, 0);
      rider.scale.setScalar(0.9);
      obj.add(rider);
    } else {
      obj = car(pickColor([0xeeeeee, 0x9aa5b1, 0x2b2b2b, 0xb03a2e, 0x2c5f8a]));
    }
    obj.position.set(x, 0.05, lane);
    obj.rotation.y = dir > 0 ? 0 : Math.PI;
    this.scene.add(obj);
    const v: Vehicle = { kind, obj, lane, dir, base, speed: base, len, width, ...extra };
    if (kind === 'bus' && dir > 0) {
      v.hangers = Math.floor(rand(0, 4));
      // About half the buses give up at Ultadanga.
      v.depotX = Math.random() < 0.45 ? stops[4].x : undefined;
      for (let i = 0; i < (v.hangers ?? 0); i++) {
        const p = person();
        p.position.set(BUS_REAR_DOOR + i * 0.55 - 0.4, 0.6, -BUS_WIDTH / 2 - 0.3);
        p.rotation.z = -0.15;
        obj.add(p);
      }
    }
    this.list.push(v);
    return v;
  }

  remove(v: Vehicle) {
    this.scene.remove(v.obj);
    this.list.splice(this.list.indexOf(v), 1);
  }

  /** Initial fill around x. */
  populate(px: number, jam: number) {
    const n = 14 + Math.round(jam * 16);
    for (let i = 0; i < n; i++) this.spawnRandom(px + rand(-WINDOW, WINDOW), jam);
  }

  private spawnRandom(x: number, jam: number) {
    const east = Math.random() < 0.55;
    const lanes = east ? LANES_EAST : LANES_WEST;
    const lane = lanes[Math.floor(Math.random() * 2)];
    const r = Math.random();
    // Buses run in the kerb-side eastbound lane, so the player can reach them.
    if (east && r < 0.22 + jam * 0.05) { this.spawn('bus', x, LANES_EAST[1], 1); return; }
    const kind: Kind = r < 0.5 ? 'taxi' : r < 0.62 ? 'bike' : 'car';
    // The kerb-side eastbound lane is for buses and bikes, so cars don't trap the buses.
    const l = east && kind !== 'bike' ? LANES_EAST[0] : lane;
    if (this.clear(x, l, 5)) this.spawn(kind, x, l, east ? 1 : -1);
  }

  clear(x: number, lane: number, gap: number) {
    return !this.list.some((v) => Math.abs(v.lane - lane) < 1 && Math.abs(v.obj.position.x - x) < gap + v.len / 2);
  }

  update(dt: number, px: number, jam: number, now: number) {
    // Keep a steady population around the player; denser in the jam.
    this.spawnT -= dt;
    const want = 14 + Math.round(jam * 18);
    if (this.spawnT <= 0 && this.list.length < want) {
      this.spawnT = rand(0.2, 0.6);
      const ahead = Math.random() < 0.5;
      this.spawnRandom(px + (ahead ? WINDOW : -WINDOW) * rand(0.8, 1), jam);
    }
    for (const v of [...this.list]) {
      if (!v.captain && Math.abs(v.obj.position.x - px) > WINDOW + 30) { this.remove(v); continue; }
      let target = v.base * (1 - jam * (v.kind === 'bus' ? 0.35 : 0.85));
      // Stop-and-go waves in the jam (buses just push through).
      if (jam > 0.5 && v.kind !== 'bus') target *= 0.25 + 0.75 * Math.max(0, Math.sin(now / 1100 + v.obj.position.x / 40));
      if (v.kind === 'bike') target = Math.max(target, v.base * 0.55); // bikes weave through
      // Buses slow (never stop) near stops.
      if (v.kind === 'bus' && v.dir > 0 && stops.some((s) => Math.abs(s.x - v.obj.position.x) < 10)) target = Math.min(target, 2.5);
      if (v.stoppedFor && v.stoppedFor > 0) { v.stoppedFor -= dt; target = 0; }
      // Don't drive into the vehicle ahead. Bikes don't wait: they squeeze into the gap between lanes.
      let blocked = false;
      for (const o of this.list) {
        if (o === v || Math.abs(o.lane - v.lane) > 1 || o.dir !== v.dir) continue;
        const gap = (o.obj.position.x - v.obj.position.x) * v.dir;
        if (gap > 0 && gap < (o.len + v.len) / 2 + (v.kind === 'bike' ? 4 : 1.5)) {
          blocked = true;
          if (v.kind !== 'bike') target = Math.min(target, o.speed * 0.8);
        }
      }
      if (v.captain) target = captainTarget(v, target);
      v.speed += (target - v.speed) * Math.min(1, dt * 2.5);
      v.obj.position.x += v.dir * v.speed * dt;
      // Bikes weave: into the gap between lanes when blocked, with a little wobble.
      if (v.kind === 'bike') {
        const tz = (blocked ? v.lane - 1.5 * Math.sign(v.lane) : v.lane) + Math.sin(now / 400 + v.base) * 0.25;
        v.obj.position.z += (tz - v.obj.position.z) * Math.min(1, dt * 4);
      }
    }
  }
}

function captainTarget(v: Vehicle, cruise: number): number {
  const c = v.captain!;
  const x = v.obj.position.x;
  if (c.state === 'approach') {
    // Rides towards the player against the traffic, from ahead.
    if (c.plan === 'pass') return Math.max(cruise, 12);
    if (x <= c.stopX + 0.5) { c.state = 'waiting'; return 0; }
    return Math.max(2, Math.min(14, (x - c.stopX) * 1.2));
  }
  if (c.state === 'waiting') return 0;
  if (c.state === 'leaving') return 14;
  return cruise;
}
