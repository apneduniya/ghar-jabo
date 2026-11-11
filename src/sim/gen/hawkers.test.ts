// Sealdah's walk-in (GAPS.md re-shoot): a ~4 m walkway beside Vidyapati Setu with a continuous row of stalls on the
// flyover side, and nothing generated standing in that strip.
import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { loadNet } from './net';
import { ChunkStore } from './stream';
import { GEN } from '../../content/worldgen';

describe('Sealdah walk-in hawker row', () => {
  for (const mode of ['free', 'timed'] as const) it(`${mode}: stalls line the flyover side, no building in the strip`, () => {
    const net = loadNet(worldJson);
    const road = net.roads.find((r) => r.hawkers)!;
    expect(road).toBeTruthy();
    const store = new ChunkStore(net, mode, 7);
    const pts = road.p.map((q) => store.warp.toGame(q));
    for (const [x, z] of pts) store.update(x, z, () => true);
    const chunks = [...store.loaded()];
    const stalls = chunks.flatMap((c) => c.props).filter((p) => p.kind === 'stall' || p.kind === 'cart');
    // Walk the lane in 3.4 u steps; on the hawker side within reach, count slots that have a stall.
    let slots = 0, filled = 0;
    const L = pts.slice(1).reduce((m, q, i) => m + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    // The stretch beside the deck (GAPS.md §3 points 6-12): north of it APC Rd still runs at grade right beside the
    // lane (no room for a row on that side on the halved map), south of it the lane turns into the forecourt loop.
    for (let i = 7; i <= 12; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
      for (let s = 2; s < len - 2; s += GEN.hawkerStep) {
        const x = ax + tx * s + tz * road.hawkers! * (road.w / 2 + GEN.hawkerGap), z = az + tz * s - tx * road.hawkers! * (road.w / 2 + GEN.hawkerGap);
        if (Math.abs(x) < 370 && Math.abs(z) < 370) continue;
        slots++;
        if (stalls.some((p) => Math.hypot(p.x - x, p.z - z) < 3)) filled++; // within a stall width: slots restart per segment, stalls run on;
      }
    }
    expect(L).toBeGreaterThan(20);
    // Timed squeezes this stretch to ~6 slots; its two ends touch APC Rd and the forecourt loop (no stall there).
    expect(filled / slots).toBeGreaterThan(mode === "timed" ? 0.6 : 0.75);
    // No generated building corner within the stall strip.
    const near = (x: number, z: number) => pts.some((q, i) => i > 0 && segD(x, z, pts[i - 1], q) < road.w / 2 + GEN.hawkerGap + 2);
    const intruders = chunks.flatMap((c) => c.buildings).filter((b) => b.p.some(([x, z]) => near(x, z)));
    expect(intruders.length).toBe(0);
  });
});

function segD(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
}
