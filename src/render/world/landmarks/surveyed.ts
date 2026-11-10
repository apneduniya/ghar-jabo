// Places surveyed in research/routes/GAPS.md (from user photos, satellite and OSM; Google car tiles were blocked):
// - City Centre (Salt Lake) mall, §1: not one box but cream concrete masses cut by open-air lanes and small
//   courtyards; a set-back mauve upper band carrying big store signs (parody here); a projecting square concrete
//   frame filled with horizontal louvres; a grey rooftop box and a thin parapet rail. About 3-4 retail storeys.
//   Its frame faces 3rd Ave (u toward the road), where the Green Line and City Centre station stand.
// - Bidhan Nagar Road (Ultadanga) suburban station, §2: tracks bearing ~12 deg east of north (the frame's u runs
//   along them); the booking and reservation counters on the east side (v > 0); island platforms under long sheds;
//   the classic yellow station boards; a footbridge over the tracks; a wall of banner hoardings beyond.

import { LM_TEXT } from '../../../content/landmarks';
import type { Frame } from './ctx';
import { hoarding, palm } from './kit';

const C = {
  cream: 0xe8e0cc, creamDark: 0xcfc6b0, mauve: 0xa9879a, louvre: 0xd6cfbf, roofBox: 0x9a9c9e, rail: 0x6f7378,
  paver: 0xb9ab9c, lane: 0x8f8a84, glass: 0x5d7fa3,
  ballast: 0x6e655c, sleeper: 0x4a3f36, steel: 0x8f969c, platform: 0xbdb6a8, edge: 0xe9d24a, shed: 0x6f8a7a,
  post: 0x5f6b72, station: 0xe9d9b4, maroon: 0x7a2a2a, fob: 0x7f8b93,
};

/** City Centre: two cream masses either side of an open-air lane, mauve sign band, the louvred frame. */
export function cityCentreMall(f: Frame) {
  const H = 11.5; // ~3.5 retail storeys
  f.box(-36, 4, -32, 32, 0, 0.05, C.paver); // forecourt pavers toward 3rd Ave
  // Two masses split by an open-air lane (a glimpse into the block), the back one taller.
  for (const [v0, v1, h] of [[-30, -4, H], [4, 30, H - 1.5]] as const) {
    f.box(-34, 0, v0, v1, 0, h, C.cream);
    for (let y = 2.8; y < h - 2.5; y += 2.9) f.box(-0.06, 0.02, v0 + 0.5, v1 - 0.5, y, y + 0.12, C.creamDark); // board-marked panels
    f.box(-34.6, -0.6, v0 - 0.3, v1 + 0.3, h, h + 2.4, C.mauve); // the set-back mauve band
    f.box(-34.7, -0.5, v0 - 0.35, v1 + 0.35, h + 2.4, h + 2.5, C.creamDark);
    f.box(-33.5, -1, v0 + 0.5, v1 - 0.5, h + 2.5, h + 2.62, C.rail); // parapet rail
  }
  f.box(-34, -18, -4, 4, 0, 0.06, C.lane); // the lane into the block
  f.box(-20, -12, -4, 4, H + 0.6, H + 0.9, C.creamDark); // a bridge across the lane, upper level
  // Big store signs on the mauve band, facing the road.
  LM_TEXT.ccStores.forEach((t, i) => {
    const v = [-24, -12, 10, 22][i];
    f.sign(t, 9, 1.8, -0.45, v, H + 1.2 - (v > 0 ? 1.5 : 0), 1, 0, ['#f2c230', '#c4202a', '#1d1d1d', '#2f6db5'][i], '#ffffff');
  });
  f.sign(LM_TEXT.ccName, 12, 1.6, 0.1, 0, 4.4, 1, 0, '#a9879a', '#fff6e8');
  // The projecting square frame with horizontal louvres.
  f.box(0, 1.6, -20, -11, 2.5, 3.1, C.cream);
  f.box(0, 1.6, -20, -11, 10.9, 11.5, C.cream);
  for (const v of [-20, -11.6]) f.box(0, 1.6, v, v + 0.6, 2.5, 11.5, C.cream);
  for (let y = 3.6; y < 10.9; y += 0.7) f.box(0.3, 1.2, -19.4, -11.6, y, y + 0.18, C.louvre);
  f.box(-26, -16, 10, 20, H - 1.5 + 2.5, H - 1.5 + 6, C.roofBox); // rooftop plant box
  // Shop glazing at street level along the road face, lit at night.
  for (let v = -29; v < 30; v += 5) if (Math.abs(v) > 5) f.box(-0.08, 0.02, v, v + 3.6, 0.4, 2.6, C.glass, 0.7);
  for (const v of [-28, -6, 6, 28]) palm(f, 3, v);
}

/** Bidhan Nagar Road: three tracks, two platforms under sheds, the east-side station building, the footbridge. */
export function railStation(f: Frame) {
  const U0 = -46, U1 = 46;
  f.box(U0, U1, -10, 3, 0, 0.25, C.ballast); // the track bed
  for (const c of [1.7, -3.4, -7.4]) { // tracks: sleepers every 1.2 u, two rails
    for (let u = U0 + 0.4; u < U1; u += 1.2) f.box(u, u + 0.3, c - 1.25, c + 1.25, 0.25, 0.4, C.sleeper);
    for (const s of [-0.84, 0.84]) f.box(U0, U1, c + s - 0.04, c + s + 0.04, 0.4, 0.58, C.steel);
  }
  // Platforms: the east one beside the building, an island between the tracks; yellow edge lines on the track side.
  for (const [a, b, edge] of [[3, 6.6, 3], [-1.6, -0.1, -0.35]] as const) {
    f.box(-40, 40, a, b, 0, 0.95, C.platform);
    f.box(-40, 40, edge, edge + 0.25, 0.95, 0.97, C.edge);
  }
  // Long sheds on posts over both platforms.
  for (const [a, b] of [[3.2, 6.4], [-1.5, -0.2]] as const) {
    for (let u = -36; u <= 36; u += 6) f.box(u - 0.12, u + 0.12, (a + b) / 2 - 0.12, (a + b) / 2 + 0.12, 0.95, 4.2, C.post);
    f.box(-38, 38, a - 0.8, b + 0.8, 4.2, 4.45, C.shed);
  }
  // Classic yellow station boards (name in three scripts) on both platforms.
  for (const [u, v] of [[-22, 5.6], [18, 5.6], [-4, -0.85]] as const) {
    for (const s of [-1, 1]) f.box(u + s * 2.2 - 0.08, u + s * 2.2 + 0.08, v - 0.08, v + 0.08, 0.95, 3.4, C.post);
    f.sign(LM_TEXT.railBoard, 5, 0.9, u, v + 0.1, 3.0, 0, 1, '#f2c230', '#1d1d1d');
    f.sign(LM_TEXT.railBoard, 5, 0.9, u, v - 0.1, 3.0, 0, -1, '#f2c230', '#1d1d1d');
    f.sign(LM_TEXT.railBoardBn, 5, 0.6, u, v + 0.1, 2.2, 0, 1, '#f2c230', '#1d1d1d');
  }
  // The station building on the east side: cream with a maroon band, booking windows facing the street.
  f.box(-14, 14, 6.6, 15, 0, 5.6, C.station);
  f.box(-14.1, 14.1, 6.5, 15.1, 2.6, 3.1, C.maroon);
  f.box(-14.3, 14.3, 6.3, 15.3, 5.6, 5.9, C.maroon);
  for (let u = -11; u <= 9; u += 4) f.box(u, u + 2, 15, 15.06, 0.9, 2.2, 0xffd59a, 0.9); // counter windows, lit warm at night
  f.sign(LM_TEXT.railCounter, 10, 0.8, 0, 15.1, 4.2, 0, 1, '#7a2a2a', '#fff6e8');
  f.sign(LM_TEXT.railBoardHi, 8, 0.8, 0, 15.1, 5.0, 0, 1, '#f2c230', '#1d1d1d');
  // The footbridge over the tracks at the north end, with stairs down to both platforms.
  const fu = 30;
  f.box(fu - 1.2, fu + 1.2, -11, 9, 6.4, 6.9, C.fob);
  for (const s of [-1, 1]) f.box(fu + s * 1.15 - 0.06, fu + s * 1.15 + 0.06, -11, 9, 6.9, 8, C.fob); // side railings
  for (const v of [-11, 9]) for (const s of [-1, 1]) f.box(fu + s * 1.1 - 0.15, fu + s * 1.1 + 0.15, v - 0.15, v + 0.15, 0, 6.4, C.fob);
  for (let k = 0; k < 8; k++) f.box(fu + 1.3 + k * 0.8, fu + 2.1 + k * 0.8, 7.2, 9, 6.4 - k * 0.7, 6.6 - k * 0.7, C.fob); // stair down east
  // A wall of banner hoardings beyond the building, and a couple of palms.
  hoarding(f, -30, 16, 0, 10, 4, LM_TEXT.hoardings[0], 0, 1, '#e86a1a', '#ffffff');
  hoarding(f, 28, 16, 0, 10, 4, LM_TEXT.hoardings[1], 0, 1, '#1f5f9a', '#ffffff');
  for (const u of [-18, 18]) palm(f, u, 17);
}
