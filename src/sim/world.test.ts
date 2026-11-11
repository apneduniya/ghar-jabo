import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import type { MapData } from './mapdata';
import { NO_INTENT, type Intent } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { Traffic } from './traffic';
import { BUS_REAR_DOOR } from './vehicles';
import { World } from './world';
import { clearance } from './streetlife';
import worldJson from '../../public/data/world.json';
import { clipMap } from './gen/clip';
import { loadNet } from './gen/net';
import { T } from '../content/tuning';

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

  it('a bus heading for Sealdah carries you to the end of its line, and you arrive', () => {
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
      events.push(...w.events.drain().filter((e) => e.type === 'arrive').map((e) => JSON.stringify(e)));
    }
    expect(events).toContain(JSON.stringify({ type: 'arrive', mode: 'bus' }));
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

describe('street level', () => {
  it('pedestrians start on footpaths, never on a carriageway (not the far side of a divided road)', () => {
    const w = makeWorld();
    for (const p of w.crowd.walkers) expect(clearance(map.roads, p.x, p.z)).toBeGreaterThan(-0.01);
  });

  it('a compound wall stops you walking through it', () => {
    const w = makeWorld();
    const wall = w.street.walls.find((x) => x.style === 'pastel')!;
    const cx = (wall.ax + wall.bx) / 2, cz = (wall.az + wall.bz) / 2;
    // Start on the street side and walk straight at the wall, into the compound.
    w.player.x = cx + wall.nx * 1.5; w.player.z = cz + wall.nz * 1.5;
    steps(w, 120, () => ({ ...NO_INTENT, moveX: -wall.nx, moveZ: -wall.nz }));
    const side = (w.player.x - cx) * wall.nx + (w.player.z - cz) * wall.nz;
    expect(side).toBeGreaterThan(0);
  });

  // College More: Street 18 north's divider runs NNE from the junction (pieces from about (231, 115)).
  // Walk straight across the road from the west carriageway (collision only: traffic is not the point here).
  const across = (w: World, mx: number, mz: number, dx: number, dz: number) => {
    const nx = dz, nz = -dx; // across the road
    const p = w.player;
    p.x = mx + nx * 5; p.z = mz + nz * 5; p.vx = p.vz = 0;
    for (let i = 0; i < 180; i++) p.stepFoot(T.step, { ...NO_INTENT, moveX: -nx, moveZ: -nz }, (x, z) => w.walkBlocked(x, z, T.player.radius));
    return (p.x - mx) * nx + (p.z - mz) * nz; // > 0: still on the side you started
  };
  const near = (w: World, x: number, z: number) => w.street.medians.find((m) => Math.hypot(m.x - x, m.z - z) < 2)!;

  it('the divider at College More stops you walking across the road', () => {
    const w = makeWorld();
    for (const [x, z] of [[240.2, 95.9], [234.9, 106.7], [209.4, 115.6]]) {
      const m = near(w, x, z);
      expect(m, `a median at ${x},${z}`).toBeTruthy();
      expect(across(w, m.x, m.z, m.dx, m.dz), `crossed at ${x},${z}`).toBeGreaterThan(0.5);
    }
  });

  it('the College More junction gap lets you through', () => {
    const w = makeWorld();
    const m = near(w, 230.9, 114.8); // the divider's first piece; the junction is 4 u back towards Street 13
    const gx = m.x - m.dx * 4, gz = m.z - m.dz * 4;
    expect(w.street.medians.some((q) => Math.hypot(q.x - gx, q.z - gz) < 2)).toBe(false);
    expect(across(w, gx, gz, m.dx, m.dz)).toBeLessThan(-3);
  });
});

describe('the streamed world beyond the map', () => {
  const net = loadNet(worldJson);
  const clipped = clipMap(map);

  function streamWorld(mode: 'timed' | 'free', seed = 5) {
    const run = new Run(mode);
    run.clockRunning = true;
    run.seed = seed;
    const start = { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 };
    const w = new World(clipped, run, new Rng(seed), start, net);
    const s = w.freeSpotNear(start.x, start.z);
    w.player.x = s.x; w.player.z = s.z;
    return w;
  }

  it('drives the warped network: Sealdah is reachable from Sector V on the road graph', () => {
    for (const mode of ['timed', 'free'] as const) {
      const w = streamWorld(mode);
      const from = w.graph.nearestNode(map.pois.tiu[0], map.pois.tiu[1]);
      const to = w.graph.nearestNode(w.streamed!.sealdah.x, w.streamed!.sealdah.z);
      const [tx, tz] = w.graph.nodes[to];
      expect(Math.hypot(tx - w.streamed!.sealdah.x, tz - w.streamed!.sealdah.z)).toBeLessThan(60);
      expect(w.graph.route(from, to), mode).not.toBeNull();
    }
  });

  it('the bus line runs from Sector V to Sealdah, about 1,500 u beyond the square when timed', () => {
    const w = streamWorld('timed');
    // Corridor A ends by road at the foot of Vidyapati Setu, a short walk (squeezed) from the forecourt.
    const end = w.traffic.busRoute.pts[w.traffic.busRoute.pts.length - 1];
    expect(Math.hypot(end[0] - w.streamed!.sealdah.x, end[1] - w.streamed!.sealdah.z)).toBeLessThan(80);
    expect(w.traffic.busRoute.length).toBeGreaterThan(1300);
    expect(w.traffic.busRoute.length).toBeLessThan(2600);
    expect(w.traffic.routeStops.length).toBeGreaterThan(6);
  });

  it('timed: hang on a bus from Sector V all the way to Sealdah and arrive', () => {
    const w = streamWorld('timed');
    const bus = w.traffic.spawnBus(1, 200);
    bus.depotAt = undefined;
    bus.base = 1; bus.speed = 1;
    const d = Traffic.busDoor(bus, BUS_REAR_DOOR);
    w.player.x = d.x; w.player.z = d.z;
    w.step({ ...NO_INTENT, action: true });
    expect(w.player.state).toBe('hang');
    bus.base = 60;
    let arrived = '';
    for (let i = 0; i < 60 * 90 && !arrived; i++) {
      w.streamed!.stream(w.player.x, w.player.z);
      w.step({ ...NO_INTENT, lean: w.player.lean * 3 + w.player.leanVel });
      for (const e of w.events.drain()) if (e.type === 'arrive') arrived = e.mode;
      if (w.player.state === 'foot') { const v = w.traffic.vehicles.find((x) => x.id === bus.id)!; const dd = Traffic.busDoor(v, BUS_REAR_DOOR); w.player.x = dd.x; w.player.z = dd.z; w.step({ ...NO_INTENT, action: true }); }
    }
    expect(arrived).toBe('bus');
  });

  it('walking into the Sealdah forecourt arrives on foot', () => {
    const w = streamWorld('free');
    const s = w.streamed!.sealdah;
    w.player.x = s.x + s.r + 3; w.player.z = s.z;
    w.streamed!.store.fill(w.player.x, w.player.z);
    let arrived = '';
    for (let i = 0; i < 60 * 3 && !arrived; i++) {
      w.step({ ...NO_INTENT, moveX: -1, moveZ: 0 });
      for (const e of w.events.drain()) if (e.type === 'arrive') arrived = e.mode;
      if (!arrived) { w.player.x = Math.min(w.player.x, s.x + s.r + 3) - 0.2; }
    }
    expect(arrived).toBe('walk');
  });

  it('streams chunks around the player and collides with them', () => {
    const w = streamWorld('free');
    w.player.x = -2000; w.player.z = 300;
    for (let i = 0; i < 30; i++) w.streamed!.stream(w.player.x, w.player.z);
    expect(w.streamed!.store.size).toBeGreaterThan(5);
    const b = [...w.streamed!.store.loaded()].flatMap((c) => c.buildings)[0].p;
    const cx = b.reduce((a, p) => a + p[0], 0) / 4, cz = b.reduce((a, p) => a + p[1], 0) / 4;
    expect(w.walkBlocked(cx, cz, 0.35)).toBe(true);
  });
});
