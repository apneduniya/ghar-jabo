// AUDIT.md 6: the two carriageways of a divided road (and a ramp beside its road) don't overlap, in either mode.
import { expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { loadNet } from './net';
import { overlaps } from './roadcheck';
import { MEDIAN_HALF, medianLines } from './medians';
import { netLines } from './layout';
import { nearestOn, sample } from './lines';
import { makeWarp } from './warp';
import { makeCtx } from './ctx';
import { looseEnds } from './streets';

const net = loadNet(worldJson);

/**
 * Known short overlaps (at most 30 u each unless noted), by place, with the reason. Anything longer, or anywhere else, fails.
 * Before task 029 there were 27 pairs in timed (up to 254 u) and 41 in free (up to 511 u).
 */
const ALLOWED: { mode: 'free' | 'timed'; at: [number, number]; why: string; max?: number }[] = [
  // Vidyapati Setu: deck ways fork off one deck at the Y and at the Parikshit Roy Lane arm (the real deck widens).
  { mode: 'free', at: [-3044, 458], why: 'Vidyapati Setu Y fork' }, { mode: 'free', at: [-3110, 612], why: 'Parikshit Roy Lane arm fork' },
  { mode: 'timed', at: [-850, 165], why: 'Vidyapati Setu forks' }, { mode: 'timed', at: [-833, 120], why: 'Vidyapati Setu Y fork' },
  // Timed squeezes whole junctions about 3x: where several roads converge on one, their approaches touch.
  // Three roads side by side (the service road, then KNI Avenue's two carriageways): the warp keeps one spacing true
  // per road (sim/gen/roadwarp.ts), so the service road touches KNI Avenue for a stretch before it joins.
  { mode: 'timed', at: [-564, -368], why: 'Ultadanga: service road beside KNI Avenue at the flyover foot', max: 40 },
  { mode: 'timed', at: [-583, -313], why: 'Ultadanga: KNI Avenue\'s carriageways between the flyover feet and the canal', max: 50 },
  { mode: 'timed', at: [-574, -311], why: 'Salt Lake: 1st Avenue meeting a cross road at its corner' },
  { mode: 'timed', at: [-598, -265], why: 'Ultadanga: the two KNI Avenue canal bridges at Hudco More' },
  { mode: 'timed', at: [-690, -280], why: 'Bidhan Nagar Rd: side road at the canal bridge' },
  { mode: 'timed', at: [-389, 498], why: 'Chingrighata: Salt Lake Bypass Y' },
  { mode: 'timed', at: [-564, -172], why: '2nd Avenue joining the Bypass' },
  { mode: 'timed', at: [-509, 391], why: 'Beleghata Main Rd joining the Bypass' },
  { mode: 'timed', at: [-772, -59], why: 'APC Rd at Rajabazar: a carriageway changes name' },
  { mode: 'timed', at: [-508, -325], why: 'City Centre roundabout approaches' },
  { mode: 'timed', at: [-543, 61], why: 'Bypass at Apollo: the side road between the carriageways' },
];

for (const mode of ['free', 'timed'] as const) it(`${mode}: no two parallel carriageways overlap by more than 0.5 u`, () => {
  const ok = (h: { run: number; at: number[] }) => ALLOWED.some((a) => a.mode === mode && h.run <= (a.max ?? 30) && Math.hypot(a.at[0] - h.at[0], a.at[1] - h.at[1]) < 20);
  const hits = overlaps(net, makeWarp(mode)).filter((h) => !ok(h));
  expect(hits.map((h) => `${h.a} / ${h.b}: ${h.run} u, ${h.worst} u deep at ${h.at}`)).toEqual([]);
}, 120_000);

// AUDIT.md 7: the Bypass median railing is drawn once per carriageway pair, in the median, never on a carriageway.
for (const mode of ['free', 'timed'] as const) it(`${mode}: the Bypass median runs between the carriageways, once`, () => {
  const warp = makeWarp(mode), lines = medianLines(net, warp), ground = netLines(net, warp).filter(({ r }) => r.bridge !== 'flyover' && r.cls !== 'lane');
  const total = lines.reduce((a, l) => a + l.len, 0);
  expect(total, 'median length').toBeGreaterThan(mode === 'free' ? 1500 : 500);
  const onRoad: string[] = [];
  lines.forEach((l, i) => {
    for (let s = 0; s <= l.len; s += 2) {
      const q = sample(l, s);
      for (const { r, l: rl } of ground) if (nearestOn(rl, q.x, q.z).d < r.w / 2 + MEDIAN_HALF - 0.05) onRoad.push(`${r.id} at ${q.x.toFixed(0)},${q.z.toFixed(0)}`);
      // Drawn once: no other median line runs along this one.
      lines.forEach((o, j) => { if (j > i && nearestOn(o, q.x, q.z).d < 1.5) onRoad.push(`median ${i} doubled by ${j} at ${q.x.toFixed(0)},${q.z.toFixed(0)}`); });
    }
  });
  expect(onRoad.slice(0, 20)).toEqual([]);
}, 120_000);

// AUDIT.md 17: timed dead ends cap only roads that leave the corridor band, 30 u or more from any corridor road.
it('timed: no dead-end cap on or near a corridor road', () => {
  const ctx = makeCtx(net, makeWarp('timed'), 'timed', 5), bad: string[] = [];
  for (const e of looseEnds(ctx)) for (const r of ctx.wn.roads) {
    if (!r.road.corridors.length) continue;
    const d = nearestOn({ p: r.p, d: r.cum, at: [], len: r.cum[r.cum.length - 1] }, e.p[0], e.p[1]).d;
    if (d < 30 + r.road.w / 2) bad.push(`cap at ${e.p[0].toFixed(0)},${e.p[1].toFixed(0)}: ${d.toFixed(0)} u from ${r.road.name ?? r.road.id}`);
  }
  expect(bad).toEqual([]);
}, 60_000);
