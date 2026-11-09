// FIXTURE (debug only, `?fixture=1`): a small stand-in for the real WorldNet that builder G loads from
// public/data/world.json, so the chunk renderer can be developed and measured before the generator lands.
// Corridor polylines are research/routes/corridors.json simplified to ~10 u, in game coords, free-roam scale.

import type { AreaKind, NetRoad, Pt, Warp, WorldNet } from '../../../sim/gen/types';

const road = (id: string, cls: NetRoad['cls'], w: number, p: Pt[], extra: Partial<NetRoad> = {}): NetRoad =>
  ({ id, cls, w, lanes: w >= 12 ? 4 : 2, oneway: false, p, corridors: [id.split('-')[0]], ...extra });

const AREAS: [AreaKind, number, number, number][] = [
  ['sectorv', 85, 138, 150], ['saltlake', -326, -553, 120], ['saltlake', -994, -608, 120], ['saltlake', -840, 276, 160],
  ['ultadanga', -2125, -829, 70], ['kankurgachi', -2125, -166, 160], ['phoolbagan', -1765, 332, 70], ['beliaghata', -2022, 663, 80],
  ['narkeldanga', -2639, 221, 70], ['maniktala', -2588, -497, 70], ['sealdah', -3153, 497, 70], ['chingrighata', -994, 940, 170],
];

export const fixtureNet: WorldNet = {
  roads: [
    road('A-saltlake', 'secondary', 12, [[-30, 51], [-11, 11], [-76, -23], [-120, -69], [-524, -694], [-785, -752], [-1079, -707], [-1499, -443], [-1534, -401], [-1447, -206], [-1336, 246], [-1297, 341], [-1749, 322], [-1882, 285]]),
    road('A-narkeldanga', 'primary', 12, [[-1882, 285], [-2055, 275], [-2869, 20], [-2885, 112], [-3095, 560], [-3045, 577], [-3036, 550]], { tram: true }),
    road('B-beliaghata', 'secondary', 10, [[-1336, 246], [-1074, 836], [-1084, 844], [-1299, 865], [-2573, 598], [-2668, 613], [-2816, 752], [-2882, 761], [-2961, 687], [-3057, 641], [-3042, 566]]),
    road('C-bypass', 'primary', 16, [[-34, 70], [-168, 342], [-419, 219], [-788, 977], [-888, 1058], [-1080, 848]]),
    road('E-ultadanga', 'secondary', 10, [[-1019, -620], [-1240, -970], [-1522, -793], [-1598, -914], [-1670, -865], [-1703, -896], [-1857, -775], [-1933, -835], [-2280, -961], [-2773, -946], [-2804, -456], [-2878, 83]]),
  ],
  landmarks: [],
  crossings: [],
  metro: [],
  water: [],
  areas: AREAS.map(([kind, x, z, gridDeg]) => ({ kind, x, z, r: 225, gridDeg })),
  sealdah: { x: -3035, z: 550, r: 30 },
};

/** Free roam: game coords are real coords. */
export const identityWarp: Warp = { mode: 'free', toGame: (p) => [p[0], p[1]], toReal: (p) => [p[0], p[1]] };

/** Parody dead-end signs for the fixture only (G's generator takes its lines from content/text.ts). */
export const FIXTURE_DEAD_ENDS = ['GALI BANDH · TRY TOMORROW', 'NO ENTRY · PUJO PANDAL WORK', 'WATER-LOGGED SINCE 1998', 'ROAD CLOSED · MEETING'];
