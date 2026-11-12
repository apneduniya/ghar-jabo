// AUDIT.md 23 and 29: beyond the map the camera's pull-in sees generated buildings and landmark models, and the
// landmark models are solid.
import { describe, expect, it } from 'vitest';
import worldJson from '../../public/data/world.json';
import { landmarkModel, landmarkPlace } from './gen/landmarks';
import { framePt } from './gen/layout';
import { loadNet } from './gen/net';
import { Streamed } from './streamed';

const net = loadNet(worldJson);

describe('Streamed sight and landmark collision', () => {
  for (const mode of ['free', 'timed'] as const) it(`camera and walkers are stopped by buildings and landmark models (${mode})`, () => {
    const sw = new Streamed(net, mode, 7);
    const cc = net.landmarks.find((l) => l.id.startsWith('city-centre-1'))!;
    const p = landmarkPlace(net, sw.store.warp, cc), model = landmarkModel(net, sw.store.warp, cc)!;
    sw.store.fill(p.x, p.z);
    // Inside the mall's main block (u -34..0, v -30..30): solid for walking and for the camera.
    const [x, z] = framePt(p.x, p.z, p.h, -17, 0);
    expect(model.solid.length).toBeGreaterThan(0);
    expect(sw.blocked(x, z, 0.4)).toBe(true);
    expect(sw.camBlocked(x, z, 0.6)).toBe(true);
    // A generated building is in the camera's way too.
    const b = [...sw.store.loaded()].flatMap((c) => c.buildings)[0];
    const bx = b.p.reduce((a, q) => a + q[0], 0) / b.p.length, bz = b.p.reduce((a, q) => a + q[1], 0) / b.p.length;
    expect(sw.camBlocked(bx, bz, 0.6)).toBe(true);
    // In front of the mall, out on the road, the camera is free.
    const [rx, rz] = framePt(p.x, p.z, p.h, 8, 0);
    expect(sw.camBlocked(rx, rz, 0.6)).toBe(false);
  });
});
