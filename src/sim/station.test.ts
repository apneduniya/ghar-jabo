import { describe, expect, it } from 'vitest';
import { StationSim } from './station';
import { startLeg } from './stationride';
import { Rng } from './rng';
import { Run } from './run';
import { NO_INTENT, type Intent } from './player';
import type { GameEvent } from './events';
import { STATION, T } from '../content/tuning';
import { greenLine } from '../content/text';

const S = STATION;

function make(seed = 3) {
  const run = new Run();
  const sim = new StationSim(run, new Rng(seed));
  const log: GameEvent[] = [];
  return { run, sim, log };
}

/** One step, collecting events. */
function tick(sim: StationSim, log: GameEvent[], intent: Intent = NO_INTENT) {
  sim.step(intent);
  log.push(...sim.events.drain());
}

/** Walk towards (x, z) until there, or give up after `secs`. */
function walkTo(sim: StationSim, log: GameEvent[], x: number, z: number, secs = 20) {
  for (let i = 0; i < secs / T.step; i++) {
    const p = sim.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.3 || sim.phase === 'ride') return true;
    tick(sim, log, { ...NO_INTENT, moveX: dx / d, moveZ: dz / d });
  }
  return false;
}

/** Through a green gate, up the left of the escalator, onto the platform. */
function toPlatform(sim: StationSim, log: GameEvent[]) {
  const lane = sim.gateOpen.indexOf(true), z = sim.laneZ(lane);
  walkTo(sim, log, S.gateX - 1, z);
  walkTo(sim, log, S.gateX + 2, z);
  walkTo(sim, log, S.esc[0] - 1, -0.6);
  walkTo(sim, log, S.plat[0] + 1, -0.6);
}

/** Clear the platform crowd away from a door, so a test about doors isn't about shoving. */
function clearDoor(sim: StationSim, door: number) {
  for (const n of sim.crowd.people) if (Math.abs(n.x - door) < 3) { n.x = n.hx = door + 5; }
}

const has = (log: GameEvent[], type: string, pred: (e: GameEvent) => boolean = () => true) => log.some((e) => e.type === type && pred(e));

describe('station: the ticket gate', () => {
  it('a red gate stops you; a green one lets you through and charges ₹20 once', () => {
    const { run, sim, log } = make();
    const red = sim.gateOpen.indexOf(false), green = sim.gateOpen.indexOf(true);
    expect(green).toBeGreaterThanOrEqual(0);
    if (red >= 0) {
      walkTo(sim, log, S.gateX - 1, sim.laneZ(red));
      expect(walkTo(sim, log, S.gateX + 2, sim.laneZ(red), 3)).toBe(false);
      expect(sim.player.x).toBeLessThan(S.gateX);
      expect(has(log, 'toast', (e) => e.type === 'toast' && e.title === 'GATE BONDHO')).toBe(true);
      expect(run.money).toBe(150);
    }
    walkTo(sim, log, S.gateX - 1, sim.laneZ(green));
    expect(walkTo(sim, log, S.gateX + 2, sim.laneZ(green))).toBe(true);
    expect(sim.paid).toBe(true);
    expect(run.money).toBe(150 - T.metro.fare);
    walkTo(sim, log, S.gateX - 1, sim.laneZ(green));
    walkTo(sim, log, S.gateX + 2, sim.laneZ(green));
    expect(run.money).toBe(150 - T.metro.fare);
  });

  it('a housing between lanes is solid', () => {
    const { sim } = make();
    expect(sim.blocked(S.gateX, sim.laneZ(0) - S.gateGap / 2)).toBe(true);
  });

  it('at least one gate works whatever the seed', () => {
    for (let s = 1; s < 60; s++) expect(make(s).sim.gateOpen).toContain(true);
  });
});

describe('station: the escalator', () => {
  it('carries you up the left; the people standing right block the right', () => {
    const { sim, log } = make();
    sim.player.x = S.esc[0] + 0.5; sim.player.z = -0.6;
    for (let i = 0; i < 60; i++) tick(sim, log);
    expect(sim.player.x).toBeCloseTo(S.esc[0] + 0.5 + S.escSpeed, 0);
    // Walking up the right side: you stay stuck behind someone standing.
    const b = make();
    b.sim.player.x = S.esc[0] - 1; b.sim.player.z = 1.6;
    expect(walkTo(b.sim, b.log, S.esc[1] - 1, 1.6, 4)).toBe(false);
    expect(b.sim.player.x).toBeLessThan(S.esc[0]);
    expect(has(b.log, 'toast', (e) => e.type === 'toast' && e.title === 'BAAM DIK!')).toBe(true);
  });
});

describe('station: the train', () => {
  it('arrives once you reach the platform, opens its doors, warns, shuts and leaves', () => {
    const { run, sim, log } = make();
    toPlatform(sim, log);
    expect(sim.phase).toBe('platform');
    expect(sim.train.state).toBe('away');
    let t = 0;
    while (sim.train.state !== 'open' && t < 30) { tick(sim, log); t += T.step; }
    expect(sim.train.state).toBe('open');
    expect(sim.train.x).toBe(S.stopX);
    expect(t).toBeGreaterThan(S.firstTrain);
    // Stand back from the edge: the doors give you doorsOpen seconds, beep doorWarn before.
    sim.player.z = 4;
    let open = 0, beepAt = -1;
    log.length = 0;
    while (sim.train.state === 'open') {
      tick(sim, log); open += T.step;
      if (beepAt < 0 && has(log, 'voice', (e) => e.type === 'voice' && e.id === 'metro-doors-closing')) beepAt = open;
    }
    expect(open).toBeCloseTo(S.doorsOpen, 1);
    expect(beepAt).toBeCloseTo(S.doorsOpen - S.doorWarn, 1);
    expect(run.stats.missedTrains).toBe(1);
    expect(has(log, 'toast', (e) => e.type === 'toast' && e.title === 'TRAIN CHHERE DILO')).toBe(true);
    while (sim.train.state === 'leaving') tick(sim, log);
    expect(sim.train.state).toBe('away');
    expect(sim.train.t).toBeCloseTo(S.nextTrain, 1);
  });

  it('boards only while the doors are open, at a door, at the edge', () => {
    const { sim, log } = make();
    toPlatform(sim, log);
    const door = sim.doorX(1);
    clearDoor(sim, door);
    sim.player.x = door; sim.player.z = S.edgeZ + 0.4;
    for (let i = 0; i < 30; i++) tick(sim, log);
    expect(sim.phase).toBe('platform'); // the train is not here yet
    while (sim.train.state !== 'open') { sim.player.x = door; sim.player.z = 3; tick(sim, log); }
    // A door's width away along the platform does not count.
    sim.player.x = door + 3; sim.player.z = S.edgeZ + 0.4;
    tick(sim, log);
    expect(sim.phase).toBe('platform');
    sim.player.x = door;
    tick(sim, log);
    expect(sim.phase).toBe('ride');
    expect(sim.player.state).toBe('gone');
    expect(has(log, 'sfx', (e) => e.type === 'sfx' && e.name === 'whoosh')).toBe(true);
  });

  it('half the platform rushes the doors and gets in', () => {
    const { sim, log } = make();
    toPlatform(sim, log);
    sim.player.z = 5;
    while (sim.train.state !== 'leaving') tick(sim, log);
    const gone = sim.crowd.people.filter((n) => n.gone).length;
    expect(gone).toBeGreaterThan(3);
    expect(sim.crowd.people.filter((n) => n.kind !== 'platform').every((n) => !n.gone)).toBe(true);
  });
});

/** Board a train at a cleared door; returns the sim on the ride. */
function boarded(seed = 3, from: string | null = null) {
  const m = make(seed);
  m.run.metroFrom = from;
  toPlatform(m.sim, m.log);
  const door = m.sim.doorX(2);
  clearDoor(m.sim, door);
  while (m.sim.phase !== 'ride') {
    if (m.sim.train.state === 'open') { m.sim.player.x = door; m.sim.player.z = S.edgeZ + 0.4; }
    tick(m.sim, m.log);
  }
  return m;
}

const tapEvery = (secs: number) => (t: number) => Math.floor((t - T.step) / secs) !== Math.floor(t / secs);

function rideOn(sim: StationSim, log: GameEvent[], tap: (t: number) => boolean, secs = 40) {
  let t = 0;
  while (t < secs && !has(log, 'end') && !has(log, 'arrive')) { t += T.step; tick(sim, log, { ...NO_INTENT, action: tap(t) }); }
  return t;
}

describe('station: the ride', () => {
  it('seated and tapping, you reach Sealdah and get off', () => {
    const { sim, log, run } = boarded();
    sim.ride!.seated = true;
    let atSealdah = false;
    rideOn(sim, log, (t) => { if (sim.ride!.atSealdah) atSealdah = true; return atSealdah || tapEvery(0.5)(t); });
    expect(sim.ride!.outcome).toBe('arrived');
    expect(sim.phase).toBe('arrived');
    expect(has(log, 'arrive', (e) => e.type === 'arrive' && e.mode === 'metro')).toBe(true);
    expect(run.stats.missedTrains).toBe(0);
  });

  it('miss the stop: no tap while the Sealdah doors are open sends you on to Howrah', () => {
    const { sim, log } = boarded();
    sim.ride!.seated = false;
    rideOn(sim, log, () => false);
    expect(sim.ride!.outcome).toBe('missed');
    expect(has(log, 'end', (e) => e.type === 'end' && e.ending === 'howrah-express')).toBe(true);
    expect(has(log, 'toast', (e) => e.type === 'toast' && e.title === 'DARJA BONDHO')).toBe(true);
  });

  it('seated without tapping, you fall asleep', () => {
    const { sim, log } = boarded();
    sim.ride!.seated = true;
    rideOn(sim, log, () => false);
    expect(sim.ride!.outcome).toBe('asleep');
    expect(has(log, 'toast', (e) => e.type === 'toast' && e.title === 'GHUMIYE PORLAM')).toBe(true);
  });

  it('standing: BRAKES! unless you held on just before', () => {
    const a = boarded();
    a.sim.ride!.seated = false;
    rideOn(a.sim, a.log, () => false, S.ride.legSecs * 3 + 0.1);
    expect(a.log.filter((e) => e.type === 'toast' && e.title === 'BRAKES!').length).toBeGreaterThanOrEqual(2);
    const b = boarded();
    b.sim.ride!.seated = false;
    // Tap just before each brake (every legSecs).
    rideOn(b.sim, b.log, (t) => tapEvery(S.ride.legSecs)(t + 0.2), S.ride.legSecs * 3 + 0.1);
    expect(b.log.filter((e) => e.type === 'toast' && e.title === 'BRAKES!').length).toBe(0);
    expect(b.sim.ride!.jolts).toBe(0);
  });

  it('boarding further along the Green Line has fewer stops to Sealdah', () => {
    expect(startLeg(null)).toBe(0);
    expect(startLeg('Phoolbagan')).toBe(greenLine.indexOf('Phoolbagan'));
    expect(startLeg('Sealdah')).toBe(greenLine.length - 2);
    const { sim, log } = boarded(3, 'Phoolbagan');
    sim.ride!.seated = false;
    let atSealdah = false;
    const t = rideOn(sim, log, () => { if (sim.ride!.atSealdah) atSealdah = true; return atSealdah; });
    expect(sim.ride!.outcome).toBe('arrived');
    expect(t).toBeLessThan(S.ride.legSecs + S.ride.arriveDelay + 0.5); // one stop, not seven
  });
});

describe('station: seeded replay', () => {
  function play(seed: number) {
    const { sim, log, run } = make(seed);
    toPlatform(sim, log);
    walkTo(sim, log, sim.doorX(2), S.edgeZ + 0.3, 30);
    while (sim.phase === 'platform') {
      const p = sim.player, dx = sim.doorX(2) - p.x, dz = S.edgeZ + 0.3 - p.z, d = Math.hypot(dx, dz) || 1;
      tick(sim, log, { ...NO_INTENT, moveX: d > 0.2 ? dx / d : 0, moveZ: d > 0.2 ? dz / d : 0 });
      if (sim.t > 120) break;
    }
    rideOn(sim, log, tapEvery(0.4));
    return { gates: sim.gateOpen.join(), phase: sim.phase, t: sim.t.toFixed(3), x: sim.player.x.toFixed(4), money: run.money, squeezes: run.stats.squeezes, seated: sim.ride?.seated, events: log.map((e) => JSON.stringify(e)).join('|') };
  }

  it('the same seed plays out the same', () => {
    expect(play(11)).toEqual(play(11));
  });

  it('different seeds deal different gates or crowds', () => {
    const a = make(11).sim, b = make(12).sim;
    const sig = (s: StationSim) => s.gateOpen.join() + s.crowd.people.map((n) => n.x.toFixed(2)).join();
    expect(sig(a)).not.toBe(sig(b));
  });
});
