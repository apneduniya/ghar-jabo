// AUDIT.md 19-22: the camera stays under every streamed structure, as under the Nabadiganta flyover in Sector V.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { LM } from '../../content/landmarks';
import { DECK_SLAB, netDeckY, netDecks, STATION_MIN_Y, metroLayout } from './layout';
import { inSectorV, sample } from './lines';
import { loadNet } from './net';
import { allRoofs, CameraRoof, roofsAt } from './roofs';
import { crossingSite } from './sites';
import { makeWarp } from './warp';

const net = loadNet(worldJson);
const FREE_Y = 8; // the camera's height in the open, portrait (stages/sectorv.ts)

/** The lowest underside right over (x, z) (no margin), or Infinity. */
const raw = (warp: ReturnType<typeof makeWarp>, x: number, z: number) => roofsAt(net, warp, x, z, 0) ?? Infinity;

describe('streamed roofs', () => {
  for (const mode of ['free', 'timed'] as const) {
    const warp = makeWarp(mode);
    const roof = (x: number, z: number) => roofsAt(net, warp, x, z);

    it(`every elevated structure beyond Sector V has an underside (${mode})`, () => {
      for (const d of netDecks(net, warp)) for (let s = 0; s <= d.l.len; s += 5) {
        const q = sample(d.l, s), y = netDeckY(d, s);
        if (inSectorV(q.x, q.z) || y < 4) continue;
        expect(roof(q.x, q.z), `${d.r.name} at ${s.toFixed(0)}`).toBeLessThanOrEqual(y - DECK_SLAB + 1e-6);
      }
      for (const mp of metroLayout(net, warp)) for (const st of mp.stations) {
        const q = sample(mp.l, st.s);
        if (!st.elevated || inSectorV(q.x, q.z) || (mp.y(st.s) ?? 0) <= STATION_MIN_Y) continue;
        expect(roof(q.x, q.z), st.name).toBeLessThanOrEqual(LM.station.concourse);
      }
      for (const c of net.crossings) {
        const [x, z] = warp.toGame([c.x, c.z]);
        if (c.over || c.kind !== 'rail' || inSectorV(x, z)) continue;
        const b = crossingSite(net, warp, c, x, z);
        expect(roof(b.x, b.z), `rail bridge at ${x.toFixed(0)},${z.toFixed(0)}`).toBe(LM.railClearance);
      }
    });

    it(`a camera rig walked through every structure stays below it (${mode})`, () => {
      const all = allRoofs(net, warp), kinds = new Map<string, number>(), bad: string[] = [];
      // Every station and bridge; every 3rd deck piece and every 40th viaduct piece (the rest are the same shape).
      all.forEach((r, i) => {
        kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
        if ((/viaduct|metro pier cap/.test(r.kind) && i % 40) || (/flyover|stand-in/.test(r.kind) && i % 3)) return;
        const s = r.s;
        for (const [ax, az] of [[s.ux, s.uz], [-s.uz, s.ux]]) for (const speed of [6, 14]) {
          const cam = new CameraRoof(), dt = 1 / 60, back = 11, start = 30;
          let under = 0;
          for (let t = -start; t <= start; t += speed * dt) {
            const px = s.x + ax * t, pz = s.z + az * t, cx = px - ax * back, cz = pz - az * back;
            const y = cam.apply(dt, roof, FREE_Y, px, pz, cx, cz);
            const atCam = raw(warp, cx, cz), atPlayer = raw(warp, px, pz);
            // Never in the concrete over the camera...
            if (y > atCam - 0.5) bad.push(`${r.kind} at ${s.x.toFixed(0)},${s.z.toFixed(0)}: camera y ${y.toFixed(2)} under ${atCam.toFixed(2)}`);
            // ...and once the player has been under a structure for a moment, the camera is under it too.
            under = atPlayer < Infinity ? under + dt : 0;
            if (under > 0.4 && y > atPlayer - 0.6) bad.push(`${r.kind} at ${s.x.toFixed(0)},${s.z.toFixed(0)}: camera y ${y.toFixed(2)} not under the player's ${atPlayer.toFixed(2)}`);
          }
        }
      });
      console.log(`${mode} roofs: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')}`);
      expect(kinds.get('station') ?? 0).toBeGreaterThanOrEqual(4);
      expect(kinds.get('rail underbridge') ?? 0).toBeGreaterThanOrEqual(4);
      expect(kinds.get('flyover deck') ?? 0).toBeGreaterThan(10);
      expect(bad.slice(0, 20)).toEqual([]);
    }, 120_000);
  }

  it('eases: ducks quickly under a deck and rises gently after', () => {
    const cam = new CameraRoof(), over = (x: number) => (x > 0 && x < 20 ? 7 : undefined);
    let y = 0, n = 0;
    // The player walks under at x 0; the camera follows 11 behind.
    for (let x = -12; x < 0; x += 0.1) y = cam.apply(1 / 60, (px) => over(px), FREE_Y, x, 0, x - 11, 0);
    expect(y).toBe(FREE_Y);
    for (let x = 0; x < 3; x += 0.1, n++) y = cam.apply(1 / 60, (px) => over(px), FREE_Y, x, 0, x - 11, 0);
    expect(y).toBeLessThan(7 - 1.2); // under it within half a second
    let last = y;
    for (let x = 34; x < 40; x += 0.1) { const v = cam.apply(1 / 60, (px) => over(px), FREE_Y, x, 0, x - 11, 0); expect(v - last).toBeLessThan(0.12); last = v; }
    expect(n).toBeGreaterThan(0);
  });
});
