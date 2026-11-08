// The real Sector V map in play: one fixed-step `step()` moves the player, traffic, buses and Rapi-Nah,
// and reports what happened as events. No rendering, DOM or timers here.

import { T } from '../content/tuning';
import { floods } from '../content/sectorv';
import { cancelReasons, captainNames, ticker } from '../content/text';
import { BuildingGrid } from './collide';
import { Events } from './events';
import type { MapData } from './mapdata';
import { NO_INTENT, Player, type Intent } from './player';
import { RoadGraph } from './roadgraph';
import type { Rng } from './rng';
import type { Run } from './run';
import { Traffic, type Vehicle } from './traffic';
import { Crowd } from './crowd';
import { BUS_REAR_DOOR } from './vehicles';

export type Action = { kind: 'hop'; bus: Vehicle } | { kind: 'bike'; captain: Vehicle } | null;

export class World {
  readonly graph: RoadGraph;
  readonly traffic: Traffic;
  readonly grid: BuildingGrid;
  readonly crowd: Crowd;
  readonly player = new Player();
  readonly events = new Events();
  t = 0;
  booking: { t: number } | null = null;
  captainId = 0;
  metroEntrance: { x: number; z: number };
  private bumpT = 3;
  private ditchAt = Infinity;
  private exitNode: number;

  constructor(readonly map: MapData, readonly run: Run, readonly rng: Rng, start: { x: number; z: number }) {
    this.graph = new RoadGraph(map);
    this.traffic = new Traffic(map, this.graph, rng);
    this.grid = new BuildingGrid(map.buildings.map((b) => b.p));
    this.player.x = start.x;
    this.player.z = start.z;
    this.traffic.populate(start.x, start.z);
    this.crowd = new Crowd(map, this.grid, rng, 110);
    const st = map.stations.find((s) => s.n === 'Salt Lake Sector V') ?? map.stations[0];
    this.metroEntrance = this.freeSpotNear(st.p[0], st.p[1] + 6);
    const end = map.busPath[map.busPath.length - 1];
    this.exitNode = this.graph.nearestNode(end[0], end[1]);
  }

  /** Nearest walkable spot to (x, z), searching outwards in rings. */
  freeSpotNear(x: number, z: number) {
    for (let r = 0; r < 30; r += 1.5)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (!this.grid.blocked(px, pz, 0.8)) return { x: px, z: pz };
      }
    return { x, z };
  }

  get riding(): Vehicle | undefined {
    return this.player.rideId ? this.traffic.vehicles.find((v) => v.id === this.player.rideId) : undefined;
  }

  get captain(): Vehicle | undefined {
    return this.captainId ? this.traffic.vehicles.find((v) => v.id === this.captainId) : undefined;
  }

  fare() {
    const R = T.rapinah;
    return Math.round((R.baseFare + this.run.stats.rebooks * R.rebookAdd) * (1 + this.run.jam * R.surgeAtPeak));
  }

  /** What the context button would do right now. */
  action(): Action {
    const p = this.player;
    if (p.state !== 'foot' || p.down) return null;
    const c = this.captain;
    if (c?.captain?.state === 'waiting' && Math.hypot(c.x - p.x, c.z - p.z) < 3.5) return { kind: 'bike', captain: c };
    let best: Vehicle | null = null, bd = 2.6;
    for (const v of this.traffic.vehicles) {
      if (v.kind !== 'bus') continue;
      const d = Traffic.busDoor(v, BUS_REAR_DOOR);
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (dist < bd) { bd = dist; best = v; }
    }
    return best ? { kind: 'hop', bus: best } : null;
  }

  step(intent: Intent = NO_INTENT) {
    const dt = T.step;
    this.t += dt;
    const p = this.player;
    const pinned = new Set(p.rideId ? [p.rideId] : []);
    if (this.captainId) pinned.add(this.captainId);
    this.traffic.update(dt, p.x, p.z, this.run.jam, pinned);
    const bump = this.crowd.update(dt, p.x, p.z, p.state === 'foot' ? Math.hypot(p.vx, p.vz) : 0, this.rng);
    if (bump) {
      // Barged into someone at a run: you both stagger, and they let you know.
      p.vx *= 0.3; p.vz *= 0.3;
      this.run.hurtDignity(1);
      this.run.stats.bumped++;
      this.events.sfx('bump');
      this.events.push({ type: 'shake', amp: 0.15, secs: 0.15 });
      this.events.toast('DHAKKA!', bump.line);
    }

    if (p.state === 'foot') this.stepFoot(dt, intent);
    else if (p.state === 'hang') this.stepHang(dt, intent);
    else if (p.state === 'pillion') this.stepPillion();
    this.stepRapinah(dt, intent);
  }

  private stepFoot(dt: number, intent: Intent) {
    const p = this.player;
    p.slow = floods.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < f.r) ? T.player.floodSlow : 1;
    p.stepFoot(dt, intent, (x, z) => this.grid.blocked(x, z, T.player.radius));
    if (!p.down && p.y < 1.2) this.collideTraffic();
    const a = this.action();
    if (a && intent.action) {
      if (a.kind === 'hop') this.hopOn(a.bus);
      else this.sitOnBike(a.captain);
    }
    if (Math.hypot(this.metroEntrance.x - p.x, this.metroEntrance.z - p.z) < 2.5 && !p.down) {
      if (this.run.money < T.metro.fare) {
        this.events.toast('₹20 LAGBE', `You have ₹${this.run.money}. The token counter is unmoved.`);
        p.x += 3;
      } else {
        p.state = 'gone';
        this.run.tried('metro');
        this.events.sfx('chime');
        this.events.push({ type: 'stage', to: 'station' });
      }
    }
  }

  private collideTraffic() {
    const p = this.player;
    for (const v of this.traffic.vehicles) {
      const c = Math.cos(v.heading), s = Math.sin(v.heading);
      const dx = p.x - v.x, dz = p.z - v.z;
      const along = dx * c + dz * s, across = -dx * s + dz * c;
      if (Math.abs(along) > v.len / 2 + 0.3 || Math.abs(across) > v.width / 2 + 0.35) continue;
      if (v.speed > T.traffic.hitSpeed && v.id !== this.captainId) {
        this.run.stats.taxiHits++;
        this.run.hurtDignity(6);
        this.run.addMinutes(2);
        const name = v.kind === 'taxi' ? 'TAXI TAKKAR!' : v.kind === 'bus' ? 'BUS-E DHAKKA!' : v.kind === 'auto' ? 'AUTO-R DHAKKA!' : 'DHAKKA!';
        this.events.sfx('crash');
        this.events.push({ type: 'shake', amp: 0.6, secs: 0.35 });
        this.events.push({ type: 'hitstop', secs: 0.12 });
        this.events.push({ type: 'photo', drama: 3, burst: name });
        this.events.toast(name, v.kind === 'taxi' ? 'Yellow taxi did not see you. Or did not care.' : 'Zebra crossing? Sheta abar ki?');
        const side = Math.sign(across) || 1;
        p.knockDown(c * 0.6 - s * side, s * 0.6 + c * side, 6);
      } else {
        // Slow or stopped: you just get nudged aside.
        const side = Math.sign(across) || 1;
        p.x += -s * side * 0.08;
        p.z += c * side * 0.08;
      }
      return;
    }
  }

  private hopOn(v: Vehicle) {
    const p = this.player, B = T.bus;
    if (v.speed > B.maxHopSpeed) {
      this.events.toast('TOO FAST!', 'The bus did not slow down for you. It never does.');
      this.events.sfx('bad');
      p.knockDown(-Math.cos(v.heading) * 0.3, -Math.sin(v.heading) * 0.3, 5);
      return;
    }
    if ((v.hangers ?? 0) >= 3 && this.rng.chance(B.crowdedBounce)) {
      this.events.toast('JAYGA NEI!', 'Conductor: "Pichhone egiye jaan!" There is no pichhone.');
      this.events.sfx('bad');
      p.knockDown(Math.sin(v.heading), -Math.cos(v.heading), 3);
      return;
    }
    p.state = 'hang';
    p.rideId = v.id;
    p.lean = 0;
    p.leanVel = 0.3;
    this.run.stats.busHops++;
    this.run.tried('bus');
    this.events.sfx('horn');
    if (this.run.stats.busHops === 1) this.events.notify(this.rng.pick(ticker.bus), '', 'news');
    if (v.routeDir === -1) this.events.notify('Conductor: "College More! College More!"', 'Wrong way. This bus is going back into Sector V.', 'bad');
    else if (v.depotAt) this.events.notify('Conductor: "Karunamoyee obdhi!"', 'This bus might not go all the way.', 'app');
  }

  private hopOff(fell: boolean) {
    const p = this.player, v = this.riding;
    p.state = 'foot';
    p.rideId = 0;
    if (!v) return;
    const d = Traffic.busDoor(v, BUS_REAR_DOOR);
    const out = this.freeSpotNear(d.x, d.z);
    p.x = out.x; p.z = out.z;
    if (fell) {
      this.run.stats.falls++;
      this.run.hurtDignity(12);
      this.events.push({ type: 'slowmo', scale: 0.35, secs: 0.7 });
      this.events.push({ type: 'hitstop', secs: 0.1 });
      this.events.push({ type: 'shake', amp: 0.9, secs: 0.6 });
      this.events.sfx('crash');
      this.events.push({ type: 'photo', drama: 4, burst: 'DHOPAS!' });
      this.events.toast('DHOPAS!', 'You have exited the bus. Not at a stop.');
      this.events.notify(this.rng.pick(ticker.fall), '', 'news');
      p.knockDown(Math.cos(v.heading) * 0.5 + Math.sin(v.heading), Math.sin(v.heading) * 0.5 - Math.cos(v.heading), v.speed * 0.7 + 3);
    } else {
      p.vx = Math.cos(v.heading) * v.speed * 0.8;
      p.vz = Math.sin(v.heading) * v.speed * 0.8;
      p.vy = 3;
      p.onGround = false;
      this.events.sfx('whoosh');
    }
  }

  private stepHang(dt: number, intent: Intent) {
    const p = this.player, v = this.riding;
    if (!v) { p.state = 'foot'; p.rideId = 0; return; }
    const d = Traffic.busDoor(v, BUS_REAR_DOOR);
    p.x = d.x; p.z = d.z; p.heading = v.heading;
    this.bumpT -= dt;
    if (this.bumpT <= 0) {
      this.bumpT = this.rng.range(...T.bus.bumpEvery);
      p.leanVel += (this.rng.chance(0.5) ? -1 : 1) * T.bus.bumpKick;
      this.events.sfx('bump');
      this.events.push({ type: 'shake', amp: 0.35, secs: 0.25 });
      this.events.push({ type: 'hitstop', secs: 0.05 });
      if (this.rng.chance(0.3)) this.events.toast('DHADAK!', this.rng.pick(['Pothole. KMC sends regards.', 'That pothole has a pin code.', 'Your spine filed a complaint.']));
    }
    if (this.traffic.routeStops.some((s) => Math.abs(s.s - v.s) < 1)) this.run.stats.footboardStops++;
    if (p.stepBalance(dt, intent, this.t, v.speed < 2)) { this.hopOff(true); return; }
    if (intent.jump || intent.action) { this.hopOff(false); return; }
    if (v.depotAt && v.routeDir === 1 && v.s >= v.depotAt) {
      this.events.toast('DEPOT!', 'Conductor: "Ar jabe na! Sobai namun!"');
      this.events.sfx('bad');
      v.routeDir = -1; // it turns round for the depot
      this.hopOff(false);
      return;
    }
    // Riding off the edge of the map towards Sealdah continues the trip; the other way, you're dropped.
    if (v.gone || v.s >= this.traffic.busRoute.length - 2 || v.s <= 2) {
      if (v.routeDir === 1) { p.state = 'gone'; this.events.push({ type: 'stage', to: 'ride', mode: 'bus' }); }
      else { this.events.toast('COLLEGE MORE', 'Conductor: "Last stop! Namun!" Wrong bus, dada.'); this.hopOff(false); }
    }
  }

  // --- Rapi-Nah ------------------------------------------------------------

  private stepRapinah(dt: number, intent: Intent) {
    const p = this.player;
    if (intent.phone && !this.booking && !this.captainId && p.state === 'foot') this.book();
    if (this.booking) {
      this.booking.t -= dt;
      if (this.booking.t <= 0) this.dispatch();
    }
    const c = this.captain;
    if (!c?.captain) { if (this.captainId && !c) this.captainId = 0; return; }
    const cap = c.captain;
    // A 'pass' captain rides right by the pickup point and keeps going; once he's well past, he cancels.
    const toPickup = Math.hypot(c.x - cap.tx, c.z - cap.tz);
    if (cap.plan === 'pass' && cap.state === 'approach' && toPickup < 10) this.passing = true;
    if (this.passing && toPickup > 20) { this.passing = false; this.cancel(this.rng.pick(cancelReasons)); return; }
    if (cap.state === 'waiting') {
      if (cap.waitT === 0) {
        this.events.sfx('ting');
        this.events.notify(`Captain ${cap.name} has arrived`, cap.plan === 'wrong' ? '…somewhere else. Run!' : 'Right there. Hop on before he changes his mind.', 'app');
      }
      cap.waitT += dt;
      if (cap.waitT > T.rapinah.waitSecs) this.cancel('Customer did not come');
    }
  }
  private passing = false;

  private book() {
    const f = this.fare();
    if (this.run.money < f) { this.events.toast(`₹${f} LAGBE`, `You have ₹${this.run.money}. Surge doesn't care.`); return; }
    this.booking = { t: this.rng.range(...T.rapinah.findSecs) };
    this.run.tried('rapinah');
    this.events.sfx('ting');
    const surge = 1 + this.run.jam * T.rapinah.surgeAtPeak;
    this.events.notify('Finding captain…', `Bike · ₹${f}${this.run.jam > 0.35 ? ` · 🔥 ${surge.toFixed(1)}x surge` : ''}`, 'app');
  }

  private dispatch() {
    this.booking = null;
    const p = this.player, R = T.rapinah;
    const first = this.run.stats.cancels === 0 && this.run.stats.rebooks === 0;
    const r = this.rng.next();
    const plan: 'come' | 'pass' | 'wrong' = first ? 'pass' : r < R.plans.come ? 'come' : r < R.plans.come + R.plans.pass ? 'pass' : 'wrong';
    // Spawn somewhere out of sight and route to a road point near the player (or, for 'wrong', somewhere else).
    const far = plan === 'wrong' ? this.graph.near(p.x, p.z, 35, 55)[0] : undefined;
    const target = far ? far.from : this.graph.nearestNode(p.x, p.z);
    // Try a few start points out of sight and take the one with the shortest drive in.
    const starts = this.graph.near(p.x, p.z, 70, 120);
    let bestStart: { e: (typeof starts)[number]; route: NonNullable<ReturnType<RoadGraph['route']>>; len: number } | null = null;
    for (let tries = 0; tries < 10 && starts.length; tries++) {
      const e = this.rng.pick(starts);
      const route = this.graph.route(e.to, target);
      if (!route) continue;
      const len = route.reduce((a, r) => a + r.len, 0);
      if (!bestStart || len < bestStart.len) bestStart = { e, route, len };
    }
    if (bestStart) {
      const { e, route } = bestStart;
      const [tx, tz] = this.graph.nodes[target];
      const v = this.traffic.spawnOnEdge('bike', e);
      v.plan = route;
      v.captain = { name: this.rng.pick(captainNames), plan, state: 'approach', tx, tz, waitT: 0 };
      this.captainId = v.id;
      this.events.notify(`Captain ${v.captain.name} is 2 min away`, 'Coming on the wrong side of the road, obviously.', 'app');
      return;
    }
    this.cancel('No captains nearby. Or anywhere.');
  }

  private cancel(reason: string) {
    const c = this.captain;
    this.run.stats.cancels++;
    this.run.stats.rebooks++;
    this.events.sfx('cancel');
    this.events.push({ type: 'shake', amp: 0.2, secs: 0.2 });
    this.events.push({ type: 'photo', drama: 2 + this.run.stats.cancels * 0.1, burst: 'CANCEL!' });
    this.events.notify('Captain cancelled', `Reason: "${reason}"`, 'bad');
    if (this.run.stats.cancels === 2 || this.run.stats.cancels === 4) this.events.notify(this.rng.pick(ticker.cancel).replace('{n}', String(this.run.stats.cancels * 3)), '', 'news');
    if (c?.captain) { c.captain.state = 'leaving'; c.captain = undefined; c.plan = undefined; }
    this.captainId = 0;
  }

  private sitOnBike(c: Vehicle) {
    const f = this.fare();
    if (!this.run.spend(f)) { this.cancel('Cash only, dada'); return; }
    const p = this.player;
    p.state = 'pillion';
    p.rideId = c.id;
    c.captain!.state = 'carrying';
    c.base = 16;
    c.plan = this.graph.route(c.edge!.to, this.exitNode) ?? undefined;
    this.ditchAt = this.rng.chance(T.rapinah.ditchChance) ? this.rng.range(25, 60) : Infinity;
    this.events.sfx('win');
    this.events.notify('Captain has ARRIVED', 'Screenshot this. Nobody will believe you.', 'good');
  }

  private stepPillion() {
    const p = this.player, v = this.riding;
    if (!v) { p.state = 'foot'; p.rideId = 0; return; }
    p.x = v.x; p.z = v.z; p.heading = v.heading;
    this.ditchAt -= T.step;
    if (this.ditchAt <= 0) {
      this.run.stats.ditched++;
      this.events.toast('RIDE ENDED', this.rng.pick(['Captain: "Petrol khatam, dada."', 'Captain: "Ekhane namun, ami ar jabo na."', 'Captain: "Barir pashe eshe gechhi. Bye."']));
      this.events.sfx('cancel');
      this.events.push({ type: 'photo', drama: 2.6, burst: 'NAMUN!' });
      p.state = 'foot';
      p.rideId = 0;
      const out = this.freeSpotNear(v.x, v.z);
      p.x = out.x; p.z = out.z;
      v.captain = undefined;
      v.plan = undefined;
      this.captainId = 0;
      return;
    }
    const exit = this.graph.nodes[this.exitNode];
    if (!v.plan?.length && Math.hypot(exit[0] - v.x, exit[1] - v.z) < 12) {
      p.state = 'gone';
      this.events.push({ type: 'stage', to: 'ride', mode: 'rapinah' });
    }
  }
}
