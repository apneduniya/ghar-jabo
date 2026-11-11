import { describe, expect, it } from 'vitest';
import mapJson from '../../public/data/sectorv.json';
import worldJson from '../../public/data/world.json';
import { T } from '../content/tuning';
import { LM } from '../content/landmarks';
import { flyoverDecks, isCanalBridge, roofs } from './elevated';
import { clipMap } from './gen/clip';
import { framePt, metroLayout, netDeckY, netDecks, stationOver } from './gen/layout';
import { crossingSite, parapet } from './gen/sites';
import { marks, sample } from './gen/lines';
import { loadNet } from './gen/net';
import { allSolids, structureConflicts } from './gen/solids';
import type { MapData } from './mapdata';
import { NO_INTENT } from './player';
import { Rng } from './rng';
import { Run } from './run';
import { ON_ROAD, SolidGrid } from './solids';
import { elevatedLayout, FLY, flyoverSteps } from './structures';
import { World } from './world';

const map = clipMap(mapJson as unknown as MapData);
const net = loadNet(worldJson);
const R = T.player.radius;

function makeWorld(mode: 'timed' | 'free' | null = null, seed = 5) {
  const run = new Run(mode ?? 'timed');
  run.clockRunning = true;
  run.seed = seed;
  return new World(map, run, new Rng(seed), { x: map.pois.tiu[0], z: map.pois.tiu[1] }, mode ? net : null);
}

/**
 * Best-first search over half-unit cells: can a body of the player's radius walk from `a` to within `r` of `b`?
 * With `stream`, chunks are filled as the search reaches them.
 */
function reachable(w: World, a: { x: number; z: number }, b: { x: number; z: number }, r = 2, stream = false, limit = 600_000) {
  const C = 0.5, key = (i: number, j: number) => i * 1_000_003 + j;
  if (stream) w.streamed!.store.fill(a.x, a.z);
  const s = w.freeSpotNear(a.x, a.z);
  const heap: [number, number, number][] = [];
  const push = (i: number, j: number) => {
    heap.push([Math.hypot(i * C - b.x, j * C - b.z), i, j]);
    for (let k = heap.length - 1; k > 0;) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ;) {
        const l = 2 * k + 1, rr = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
      }
    }
    return top;
  };
  const i0 = Math.round(s.x / C), j0 = Math.round(s.z / C), seen = new Set([key(i0, j0)]);
  push(i0, j0);
  let best = Infinity, lastChunk = '';
  while (heap.length && seen.size < limit) {
    const [d, i, j] = pop();
    best = Math.min(best, d);
    if (d < r) return { ok: true, best };
    if (stream) { const ck = `${Math.floor(i * C / 128)},${Math.floor(j * C / 128)}`; if (ck !== lastChunk) { w.streamed!.store.fill(i * C, j * C); lastChunk = ck; } }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, k = key(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!w.walkBlocked(ni * C, nj * C, R)) push(ni, nj);
    }
  }
  return { ok: false, best };
}

/** Walk straight at (tx, tz) for `secs` from (x, z); returns the closest the player's centre got. */
function walkAt(w: World, x: number, z: number, tx: number, tz: number, secs = 4) {
  w.player.x = x; w.player.z = z;
  let closest = Infinity;
  for (let i = 0; i < secs * 60; i++) {
    const dx = tx - w.player.x, dz = tz - w.player.z, L = Math.hypot(dx, dz) || 1;
    w.step({ ...NO_INTENT, moveX: dx / L, moveZ: dz / L });
    closest = Math.min(closest, Math.hypot(w.player.x - tx, w.player.z - tz));
  }
  return closest;
}

describe('Sector V: what the elevated north stands on is solid', () => {
  it("can't walk into a flyover column", () => {
    const w = makeWorld();
    const cols = flyoverDecks(map.roads).flatMap((d) => flyoverSteps(d, map.roads).filter((f) => f.pier));
    expect(cols.length).toBeGreaterThan(4);
    let tried = 0;
    for (const { s } of cols) {
      const from = w.freeSpotNear(s.x + s.dx * 4, s.z + s.dz * 4);
      if (Math.hypot(from.x - s.x, from.z - s.z) > 6) continue;
      tried++;
      expect(w.walkBlocked(s.x, s.z, R)).toBe(true);
      // The oval is 0.72 along the deck: you stop at its face, not at its centre.
      expect(walkAt(w, from.x, from.z, s.x, s.z)).toBeGreaterThan(FLY.pier.r + R - 0.05);
    }
    expect(tried).toBeGreaterThan(2);
  });

  it("can't walk through a ramp's retaining wall, but can walk under the high deck", () => {
    const w = makeWorld();
    const { solids } = elevatedLayout(map);
    const grid = new SolidGrid(solids);
    const decks = flyoverDecks(map.roads);
    const steps = decks.flatMap((d) => flyoverSteps(d, map.roads).map((f) => ({ ...f, deck: d })));
    // A ramp piece (on its retaining walls) that is solid: walking across it from one side to the other stops.
    const ramp = steps.find((f) => f.y < FLY.retain && f.y > 1 && grid.blocked(f.s.x, f.s.z, 0));
    expect(ramp).toBeDefined();
    const { s, deck } = ramp!, nx = s.dz, nz = -s.dx, o = deck.w / 2 + 1.5;
    const from = w.freeSpotNear(s.x + nx * o, s.z + nz * o);
    expect(walkAt(w, from.x, from.z, s.x - nx * o, s.z - nz * o)).toBeGreaterThan(o - deck.w / 2 - 0.4);
    // Under the high deck, away from the columns, nothing of the structure is in the way.
    const cols = steps.filter((f) => f.pier).map((f) => f.s);
    const under = steps.filter((f) => f.y > 5 && cols.every((c) => Math.hypot(c.x - f.s.x, c.z - f.s.z) > 3));
    expect(under.length).toBeGreaterThan(30);
    for (const f of under) expect(grid.blocked(f.s.x, f.s.z, R)).toBe(false);
  });

  it('keeps the camera under the deck wherever you can stand under it', () => {
    const w = makeWorld();
    const roof = roofs(map.roads);
    let n = 0;
    for (const d of flyoverDecks(map.roads)) for (const f of flyoverSteps(d, map.roads)) {
      if (f.y < 5 || w.walkBlocked(f.s.x, f.s.z, R)) continue;
      n++;
      const y = roof(f.s.x, f.s.z);
      expect(y).toBeDefined();
      expect(y!).toBeLessThan(f.y - 0.5);
    }
    expect(n).toBeGreaterThan(20);
  });

  it('the metro entrance is reachable on foot from PwC More and Wipro More', () => {
    const w = makeWorld();
    for (const p of [map.pois.pwc, map.pois.wiproMore]) {
      expect(reachable(w, { x: p[0], z: p[1] }, w.metroEntrance).ok).toBe(true);
    }
  });

  it('the canal bridges stay open: you can walk across', () => {
    const w = makeWorld();
    const bridges = map.roads.filter(isCanalBridge);
    expect(bridges.length).toBeGreaterThan(0);
    for (const b of bridges) {
      const a = b.p[0], c = b.p[b.p.length - 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
      const res = reachable(w, { x: a[0] - ux * 6, z: a[1] - uz * 6 }, { x: c[0] + ux * 6, z: c[1] + uz * 6 }, 3);
      expect(res.ok, b.n).toBe(true);
    }
  });

  it("traffic lanes never run through a column or a wall", () => {
    const w = makeWorld();
    const bad: string[] = [];
    for (const e of w.graph.edges) for (let s = 0; s <= e.len; s += 1) {
      const p = w.graph.at(e, s, T.traffic.laneOffset);
      if (w.solids.blocked(p.x, p.z, 0)) bad.push(`${p.x.toFixed(0)},${p.z.toFixed(0)}`);
    }
    expect(bad).toEqual([]);
  });

  it('no wide piece of structure (ramp, tin, wall) is solid on a carriageway: those are reported instead', () => {
    const { solids, conflicts } = elevatedLayout(map);
    for (const s of solids) if (s.hw > 0.5) {
      for (const [a, c] of [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const x = s.x + s.ux * s.hl * a - s.uz * s.hw * c, z = s.z + s.uz * s.hl * a + s.ux * s.hw * c;
        for (const r of map.roads) if (!r.b) {
          const n = r.p.reduce((m, _, i) => i ? Math.min(m, segD(x, z, r.p[i - 1], r.p[i])) : m, Infinity);
          expect(n).toBeGreaterThan(r.w / 2 - ON_ROAD - 1e-6);
        }
      }
    }
    expect(conflicts.every((c) => c.depth > ON_ROAD)).toBe(true);
  });
});

function segD(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
}

describe('the streamed world: what its structures stand on is solid', () => {
  it("can't walk into a metro pier, and nothing of the viaduct is in the way under its deck", () => {
    const w = makeWorld('timed');
    const mp = metroLayout(net, w.streamed!.store.warp)[0];
    const grid = new SolidGrid(allSolids(net, w.streamed!.store.warp));
    let tried = 0;
    for (let cx = -12; cx <= 0 && tried < 3; cx++) for (let cz = -6; cz <= 6 && tried < 3; cz++) {
      for (const s of marks(mp.l, cx, cz, LM.pierStep)) {
        const y = mp.y(s);
        if (y === null || y < 9 || stationOver(mp, s)) continue;
        const q = sample(mp.l, s);
        w.streamed!.store.fill(q.x, q.z);
        expect(w.walkBlocked(q.x, q.z, R)).toBe(true);
        // Halfway to the next pier, under the deck, the structure leaves you be.
        const m = sample(mp.l, s + LM.pierStep / 2);
        expect(grid.blocked(m.x, m.z, R)).toBe(false);
        // Walk at it along the line from 5 units off.
        const from = w.freeSpotNear(q.x - q.dz * 5, q.z + q.dx * 5);
        if (Math.hypot(from.x - q.x, from.z - q.z) > 7) continue;
        tried++;
        expect(walkAt(w, from.x, from.z, q.x, q.z)).toBeGreaterThan(1.06 + R - 0.05);
        break;
      }
    }
    expect(tried).toBeGreaterThan(0);
  });

  it("a flyover's low ramp is solid unless the data puts it on a road (then reported), its high deck open underneath", () => {
    let low = 0;
    for (const mode of ['timed', 'free'] as const) {
      const w = makeWorld(mode), warp = w.streamed!.store.warp;
      const grid = new SolidGrid(allSolids(net, warp));
      let high = 0;
      for (const d of netDecks(net, warp)) for (let s = 1; s < d.l.len; s += 2.5) {
        const y = netDeckY(d, s), q = sample(d.l, s);
        if (y > 1.5 && y < 2.5) {
          low++;
          const reported = structureConflicts(net, warp).some((c) => c.kind === 'flyover ramp' && Math.hypot(c.x - q.x, c.z - q.z) < 3);
          expect(grid.blocked(q.x, q.z, 0) || reported, `${mode} ramp at ${q.x.toFixed(0)},${q.z.toFixed(0)}`).toBe(true);
        }
        if (y >= 4.5) { // the underside is well over head height
          // Off the columns (which sit on the line every few metres), half a deck to the side.
          const o = d.r.w / 2 - 1;
          expect(grid.blocked(q.x + q.dz * o, q.z - q.dx * o, R), `${mode} under deck ${q.x.toFixed(0)},${q.z.toFixed(0)}`).toBe(false);
          high++;
        }
      }
      // Timed squeezes the net's short flyover ways so no deck gets above ~3.6: nothing to walk under there.
      if (mode === 'free') expect(high).toBeGreaterThan(20);
    }
    expect(low).toBeGreaterThan(0);
  });

  it('you can walk across the canal bridges', () => {
    const w = makeWorld('timed'), warp = w.streamed!.store.warp;
    let n = 0;
    for (const c of net.crossings) {
      if (c.kind !== 'canal' || !c.over) continue;
      const [x, z] = warp.toGame([c.x, c.z]);
      if (Math.abs(x) < 400 && Math.abs(z) < 400) continue;
      const b = crossingSite(net, warp, c, x, z), { L } = parapet(b);
      const a = framePt(b.x, b.z, b.h, -L - 4, 0), e = framePt(b.x, b.z, b.h, L + 4, 0);
      w.streamed!.store.fill(x, z);
      if (w.walkBlocked(a[0], a[1], R) || w.walkBlocked(e[0], e[1], R)) continue; // the crossing point isn't on the road
      n++;
      expect(reachable(w, { x: a[0], z: a[1] }, { x: e[0], z: e[1] }, 2, true, 60_000).ok, `bridge at ${x.toFixed(0)},${z.toFixed(0)}`).toBe(true);
    }
    expect(n).toBeGreaterThan(1);
  });

  it('walks in to the Sealdah forecourt from the end of the bus line, both modes', () => {
    for (const mode of ['timed', 'free'] as const) {
      const w = makeWorld(mode);
      const end = w.traffic.busRoute.pts[w.traffic.busRoute.pts.length - 1], s = w.streamed!.sealdah;
      expect(reachable(w, { x: end[0], z: end[1] }, s, s.r - 1, true).ok, mode).toBe(true);
    }
  });
});

describe('collision cost', () => {
  it("walkBlocked doesn't get slower with the structures (micro-benchmark, printed)", () => {
    const w = makeWorld('timed');
    w.streamed!.store.fill(-500, 0);
    const pts: [number, number][] = [];
    const rng = new Rng(7);
    for (let i = 0; i < 10_000; i++) pts.push(i % 2 ? [rng.range(-360, 360), rng.range(-360, 360)] : [rng.range(-650, -360), rng.range(-200, 200)]);
    const run = () => {
      // eslint-disable-next-line no-restricted-globals
      const t0 = performance.now();
      let n = 0;
      for (let k = 0; k < 5; k++) for (const [x, z] of pts) if (w.walkBlocked(x, z, R)) n++;
      // eslint-disable-next-line no-restricted-globals
      return { ms: performance.now() - t0, n };
    };
    const store = w.streamed!.store as unknown as { chunks: Map<number, { structs: SolidGrid }> };
    const saved = [...store.chunks.values()].map((l) => l.structs), sb = w.solids.blocked;
    const off = () => { w.solids.blocked = () => false; for (const l of store.chunks.values()) l.structs = new SolidGrid(); };
    const on = () => { w.solids.blocked = sb; [...store.chunks.values()].forEach((l, i) => { l.structs = saved[i]; }); };
    // Interleaved, best of five each, so JIT warm-up and GC don't favour either side.
    let withS = { ms: Infinity, n: 0 }, without = { ms: Infinity, n: 0 };
    for (let k = 0; k < 5; k++) {
      off(); const a = run(); if (a.ms < without.ms) without = a;
      on(); const b = run(); if (b.ms < withS.ms) withS = b;
    }
    const per = (r: { ms: number }) => (r.ms * 1e6 / (pts.length * 5)).toFixed(0);
    console.log(`walkBlocked: ${per(without)} ns/call without structures, ${per(withS)} ns/call with (${withS.n - without.n} more blocked of ${pts.length * 5})`);
    expect(withS.ms).toBeLessThan(without.ms * 1.6 + 20);
  }, 60_000);
});
