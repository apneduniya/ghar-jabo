// The timed run must be winnable by bus, at peak jam too: a ride from Sector V to Sealdah fits in the 4-minute
// (240 game minute) run. Also guards the junction gridlock (vehicles waiting on crossing traffic forever) and the
// runaway bus spawning that came with it.
import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import type { MapData } from './mapdata';
import { NO_INTENT } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { World } from './world';
import { loadNet } from './gen/net';
import { clipMap } from './gen/clip';

function rideToSealdah(startMinute: number) {
  const run = new Run('timed');
  run.clockRunning = true; run.seed = 5;
  const map = clipMap(mapJson as unknown as MapData);
  const w = new World(map, run, new Rng(5), { x: map.pois.tiu[0] + 12, z: map.pois.tiu[1] - 12 }, loadNet(worldJson));
  run.minute = startMinute;
  const bus = w.traffic.spawnBus(1, 150);
  bus.depotAt = undefined;
  const L = w.traffic.busRoute.length;
  let t = 0, most = 0;
  for (; t < 400 && w.traffic.vehicles.includes(bus) && bus.s < L - 5; t += 1 / 60) {
    run.minute = startMinute; // hold the jam level steady for the measurement
    w.player.x = bus.x; w.player.z = bus.z + 30; // the traffic window follows the "rider"
    w.streamed!.stream(w.player.x, w.player.z);
    w.step(NO_INTENT);
    w.events.drain();
    most = Math.max(most, w.traffic.vehicles.length);
  }
  return { t, most, done: bus.s >= L - 5 };
}

describe('timed bus ride, Sector V to Sealdah', () => {
  it('fits the run in light traffic', () => {
    const r = rideToSealdah(18 * 60 + 35);
    expect(r.done).toBe(true);
    expect(r.t).toBeLessThan(215);
  }, 60_000); // simulates ~4 minutes of world at 60 Hz

  it('fits the run at peak jam, with no gridlock and bounded traffic', () => {
    const r = rideToSealdah(19 * 60 + 45);
    expect(r.done).toBe(true);
    expect(r.t).toBeLessThan(240);
    expect(r.most).toBeLessThan(70);
  }, 60_000);
});
