import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { loadNet } from './net';
import { ChunkStore } from './stream';
import { CHUNK } from './types';

const net = loadNet(worldJson);

describe('ChunkStore', () => {
  it('loads chunks near the player, nearest first, a few per update', () => {
    const s = new ChunkStore(net, 'free', 7, { load: 260, unload: 400, perStep: 2 });
    const seen: [number, number][] = [];
    s.onLoad((c) => seen.push([c.cx, c.cz]));
    expect(s.update(-2000, 300)).toBe(2);
    expect(s.size).toBe(2);
    expect(s.pending).toBeGreaterThan(5);
    // The first chunk built is the one the player stands in.
    expect(seen[0]).toEqual([Math.floor(-2000 / CHUNK), Math.floor(300 / CHUNK)]);
    s.fill(-2000, 300);
    expect(s.pending).toBe(0);
    for (const c of s.loaded()) expect(Math.hypot((c.cx + 0.5) * CHUNK + 2000, (c.cz + 0.5) * CHUNK - 300)).toBeLessThanOrEqual(260);
  });

  it('time-sliced: one slice per call when the clock says stop, same chunks in the end', () => {
    const s = new ChunkStore(net, 'free', 7, { load: 200, unload: 330 });
    let calls = 0, done = 0;
    while (s.size < 3 && calls < 500) { done += s.update(-2000, 300, () => false); calls++; }
    expect(done).toBe(3);
    expect(calls).toBeGreaterThan(3); // a chunk takes several slices
    const whole = new ChunkStore(net, 'free', 7, { load: 200, unload: 330 });
    whole.update(-2000, 300, 3);
    expect(JSON.stringify([...s.loaded()])).toBe(JSON.stringify([...whole.loaded()]));
  });

  it('unloads chunks beyond the unload radius and tells subscribers', () => {
    const s = new ChunkStore(net, 'free', 7, { load: 200, unload: 330, perStep: 64 });
    const gone: number[] = [];
    s.onUnload((c) => gone.push(c.cx));
    s.fill(-2000, 300);
    s.update(-2100, 300, 0); // a short step: nothing leaves yet
    expect(gone).toEqual([]);
    s.fill(-2600, 300);
    expect(gone.length).toBeGreaterThan(0);
    expect(gone.every((cx) => (cx + 0.5) * CHUNK > -2600 + 200)).toBe(true);
  });

  it('never generates chunks wholly inside the Sector V square', () => {
    const s = new ChunkStore(net, 'free', 7, { load: 420, unload: 500, perStep: 64 });
    s.fill(0, 0);
    expect(s.size).toBeGreaterThan(0);
    for (const c of s.loaded()) expect(c.x0 < -360 || c.x0 + CHUNK > 360 || c.z0 < -360 || c.z0 + CHUNK > 360).toBe(true);
  });

  it('collides with generated buildings and, in timed mode, keeps you on the road band', () => {
    const s = new ChunkStore(net, 'free', 7, { load: 200, unload: 300, perStep: 64 });
    s.fill(-2000, 300);
    const c = [...s.loaded()].find((k) => k.buildings.length)!;
    const b = c.buildings[0].p;
    const cx = b.reduce((a, p) => a + p[0], 0) / b.length, cz = b.reduce((a, p) => a + p[1], 0) / b.length;
    expect(s.blocked(cx, cz, 0.35)).toBe(true);
    expect(s.blocked(0, 0, 0.35)).toBe(false); // the real map answers inside the square

    const t = new ChunkStore(net, 'timed', 7, { load: 200, unload: 300, perStep: 64 });
    const road = net.roads.find((r) => r.p.length > 3 && Math.abs(r.p[1][0]) > 1500)!;
    const g = t.warp.toGame(road.p[1]);
    t.fill(g[0], g[1]);
    const chunk = t.chunkAt(g[0], g[1])!;
    const r = chunk.roads.find((k) => k.real)!;
    const mid = r.p[Math.floor(r.p.length / 2)];
    expect(t.blocked(mid[0], mid[1], 0.35)).toBe(false);
    // Off the roads there's no ground in the timed run.
    let off = 0;
    for (let i = 0; i < 40; i++) if (t.blocked(chunk.x0 + ((i * 37) % 128), chunk.z0 + ((i * 53) % 128), 0.35)) off++;
    expect(off).toBeGreaterThan(10);
  });
});
