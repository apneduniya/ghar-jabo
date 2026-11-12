import { describe, expect, it } from 'vitest';
import worldJson from '../../../public/data/world.json';
import { groundRoadsNear } from './layout';
import { landmarkPlace, modelSize, rectsOnRoad } from './landmarks';
import { loadNet } from './net';
import { makeWarp } from './warp';

const net = loadNet(worldJson);

describe('landmark placement', () => {
  for (const mode of ['free', 'timed'] as const) it(`no landmark footprint overlaps a carriageway (${mode})`, () => {
    const warp = makeWarp(mode), bad: string[] = [], moved: string[] = [];
    for (const lm of net.landmarks) {
      const p = landmarkPlace(net, warp, lm), size = modelSize(lm);
      if (p.moved > 0 || p.island) moved.push(`${lm.id} ${lm.kind}: ${p.island ? 'island' : `moved ${p.moved.toFixed(1)}`}`);
      if (!size || lm.kind === 'sealdah-station') continue;
      if (lm.kind === 'metro-station' && p.moved === 0) continue;
      if (rectsOnRoad(groundRoadsNear(net, warp, p.x, p.z, 200), p.x, p.z, p.h, size.foot, 0)) bad.push(lm.id);
    }
    console.log(`${mode}: ${moved.length} placed off their warped spot\n  ${moved.join('\n  ')}`);
    expect(bad).toEqual([]);
  });
});
