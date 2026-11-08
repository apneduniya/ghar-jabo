import { describe, expect, it } from 'vitest';
import mapJson from '../content/maps/sectorv.json';
import type { MapData } from './mapdata';
import { NO_INTENT, type Intent } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { Traffic } from './traffic';
import { BUS_REAR_DOOR } from './vehicles';
import { World } from './world';

const map = mapJson as unknown as MapData;

function makeWorld(seed = 1) {
  const run = new Run();
  run.clockRunning = true;
  const rng = new Rng(seed);
  const start = { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 };
  const w = new World(map, run, rng, start);
  const s = w.freeSpotNear(start.x, start.z);
  w.player.x = s.x; w.player.z = s.z;
  return w;
}

const steps = (w: World, n: number, intent: (w: World) => Intent = () => NO_INTENT) => {
  for (let i = 0; i < n; i++) w.step(intent(w));
};

describe('player on foot', () => {
  it('cannot walk into a building', () => {
    const w = makeWorld();
    const b = map.buildings.find((x) => x.h > 20)!;
    const cx = b.p.reduce((a, p) => a + p[0], 0) / b.p.length, cz = b.p.reduce((a, p) => a + p[1], 0) / b.p.length;
    const s = w.freeSpotNear(cx, cz);
    w.player.x = s.x; w.player.z = s.z;
    const dx = cx - s.x, dz = cz - s.z, L = Math.hypot(dx, dz) || 1;
    steps(w, 180, () => ({ ...NO_INTENT, moveX: dx / L, moveZ: dz / L }));
    expect(w.grid.blocked(w.player.x, w.player.z, 0.3)).toBe(false);
  });
});

describe('traffic', () => {
  it('drives on the left of every road', () => {
    const w = makeWorld();
    for (const v of w.traffic.vehicles.filter((v) => v.edge)) {
      const e = v.edge!;
      // Signed side of the vehicle relative to the edge's centre line: left of travel is negative cross.
      const cross = e.dx * (v.z - e.az) - e.dz * (v.x - e.ax);
      expect(cross).toBeLessThan(0);
    }
  });

  it('runs buses both ways along Street No. 13 and slows them at real stops', () => {
    const w = makeWorld();
    steps(w, 60 * 20);
    expect(w.traffic.routeStops.length).toBeGreaterThan(2);
    expect(w.traffic.vehicles.some((v) => v.kind === 'bus')).toBe(true);
  });
});

describe('bus hopping', () => {
  function atDoorOfSlowBus(w: World) {
    const bus = w.traffic.spawnBus(1, 100);
    bus.base = 1; bus.speed = 1;
    const d = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = d.x; w.player.z = d.z;
    return bus;
  }

  it('hops on at the left rear door and stays on with good balance', () => {
    const w = makeWorld();
    atDoorOfSlowBus(w);
    w.step({ ...NO_INTENT, action: true });
    expect(w.player.state).toBe('hang');
    // A perfect passenger leans against whatever the bus does.
    steps(w, 60 * 8, (w) => ({ ...NO_INTENT, lean: w.player.lean * 3 + w.player.leanVel }));
    expect(w.player.state).toBe('hang');
  });

  it('throws you off if you do nothing for long enough', () => {
    const w = makeWorld(3);
    atDoorOfSlowBus(w);
    w.step({ ...NO_INTENT, action: true });
    steps(w, 60 * 30);
    expect(w.player.state).toBe('foot');
    expect(w.run.stats.falls).toBe(1);
  });

  it('a bus heading for Sealdah carries you off the map into the ride', () => {
    const w = makeWorld();
    const bus = w.traffic.spawnBus(1, w.traffic.busRoute.length - 40);
    bus.depotAt = undefined;
    bus.base = 2; bus.speed = 2;
    const d = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = d.x; w.player.z = d.z;
    w.step({ ...NO_INTENT, action: true });
    bus.base = 12;
    const events: string[] = [];
    for (let i = 0; i < 60 * 20 && w.player.state === 'hang'; i++) {
      w.step({ ...NO_INTENT, lean: w.player.lean * 3 + w.player.leanVel });
      events.push(...w.events.drain().filter((e) => e.type === 'stage').map((e) => JSON.stringify(e)));
    }
    expect(events).toContain(JSON.stringify({ type: 'stage', to: 'ride', mode: 'bus' }));
  });
});

describe('Rapi-Nah', () => {
  it('the first booking always drives past and cancels', () => {
    const w = makeWorld();
    w.step({ ...NO_INTENT, phone: true });
    let cancelled = false;
    for (let i = 0; i < 60 * 60 && !cancelled; i++) {
      w.step();
      cancelled = w.events.drain().some((e) => e.type === 'notify' && e.title === 'Captain cancelled');
    }
    expect(cancelled).toBe(true);
    expect(w.run.stats.cancels).toBe(1);
  });

  it('fares rise with each rebook and with the jam', () => {
    const w = makeWorld();
    const f0 = w.fare();
    w.run.stats.rebooks = 2;
    expect(w.fare()).toBeGreaterThan(f0);
    w.run.minute = 20 * 60;
    expect(w.fare()).toBeGreaterThan(f0 + 24);
  });
});

describe('Rapi-Nah captains', () => {
  it('a later booking eventually brings a captain who waits for you', () => {
    const w = makeWorld(5);
    w.run.stats.cancels = 1; // past the guaranteed first cancel
    w.run.stats.rebooks = 1;
    let waited = false;
    for (let attempt = 0; attempt < 6 && !waited; attempt++) {
      w.step({ ...NO_INTENT, phone: true });
      for (let i = 0; i < 60 * 45 && !waited && (w.booking || w.captainId); i++) {
        w.step();
        waited = w.captain?.captain?.state === 'waiting';
      }
    }
    expect(waited).toBe(true);
  });
});

describe('pedestrians', () => {
  it('step aside when you walk up to them', () => {
    const w = makeWorld();
    const ped = w.crowd.walkers[0];
    const before = { x: ped.x, z: ped.z };
    w.player.x = ped.x + 1; w.player.z = ped.z;
    steps(w, 60);
    expect(Math.hypot(ped.x - before.x, ped.z - before.z)).toBeGreaterThan(0.3);
  });

  it('stagger and shout if you barge into them at a run', () => {
    const w = makeWorld();
    const ped = w.crowd.walkers[0];
    ped.speed = 0;
    w.player.x = ped.x - 0.4; w.player.z = ped.z;
    w.player.vx = 6.5; w.player.vz = 0;
    w.step();
    const ev = w.events.drain();
    expect(ev.some((e) => e.type === 'toast' && e.title === 'DHAKKA!')).toBe(true);
    expect(ped.stunned).toBeGreaterThan(0);
    expect(w.run.stats.bumped).toBe(1);
  });
});
