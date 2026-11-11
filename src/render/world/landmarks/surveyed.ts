// Places surveyed in research/routes/GAPS.md (from user photos, satellite and OSM; Google car tiles were blocked):
// - City Centre (Salt Lake) mall, §1, re-shot in Street View (Dec 2025, research/routes/img/gaps2/cc-front-*): the
//   3rd Ave face is white with punched windows, not the mauve band of an older photo. Its frame faces 3rd Ave
//   (u toward the road), where the Green Line runs over the median and City Centre station stands.
// - Bidhan Nagar Road (Ultadanga) suburban station, §2: tracks bearing ~12 deg east of north (the frame's u runs
//   along them); the booking and reservation counters on the east side (v > 0); island platforms under long sheds;
//   the classic yellow station boards; a footbridge over the tracks; a wall of banner hoardings beyond.

import { LM_TEXT } from '../../../content/landmarks';
import type { Frame } from './ctx';
import { hoarding, palm } from './kit';

const C = {
  cream: 0xe8e0cc, creamDark: 0xcfc6b0, mauve: 0xa9879a, louvre: 0xd6cfbf, roofBox: 0x9a9c9e, rail: 0x6f7378,
  paver: 0xb9ab9c, lane: 0x8f8a84, glass: 0x5d7fa3, white: 0xf1f0ec, recess: 0xd9d6cf, planter: 0x6b8f4a, yellow: 0xe0b31e,
  ballast: 0x6e655c, sleeper: 0x4a3f36, steel: 0x8f969c, platform: 0xbdb6a8, edge: 0xe9d24a, shed: 0x6f8a7a,
  post: 0x5f6b72, station: 0xe9d9b4, maroon: 0x7a2a2a, fob: 0x7f8b93,
};

/**
 * City Centre (3rd Ave face, Street View Dec 2025): a white block of about five storeys with a grid of small deep-set
 * square windows, a tall recessed entrance with dark glass in the middle, colourful shopfronts at ground level, a
 * planted strip of palms and frangipani with a paved entrance plaza, and the "City Centre 1" board on a yellow pole.
 */
export function cityCentreMall(f: Frame) {
  const H = 13; // ~5 storeys
  f.box(-36, 5, -32, 32, 0, 0.05, C.paver);
  f.box(-34, 0, -30, 30, 0, H, C.white);
  f.box(-34.3, 0.3, -30.3, 30.3, H, H + 0.4, C.creamDark);
  f.box(-30, -20, 8, 20, H + 0.4, H + 3, C.roofBox); // rooftop plant room
  // Punched windows: small deep-set squares in a grid on the upper floors.
  for (let y = 4.4; y < H - 1.5; y += 2.6) for (let v = -27; v <= 26; v += 4.2) {
    if (Math.abs(v + 1) < 4) continue; // the entrance bay
    f.box(-0.4, 0.02, v, v + 1.7, y, y + 1.6, C.recess);
    f.box(-0.38, -0.3, v + 0.15, v + 1.55, y + 0.15, y + 1.45, C.glass, (Math.round(v + y) % 3 === 0) ? 0.6 : 0.1);
  }
  // The tall recessed entrance: dark glass set back in a white frame.
  f.box(-3, 0.02, -4.6, 2.6, 0, 9.5, C.recess);
  f.box(-2.9, -2.6, -4.2, 2.2, 0.2, 9.2, 0x23303a, 0.5);
  // Shopfronts: coloured parody fascias over lit glazing.
  LM_TEXT.ccStores.forEach((t, i) => {
    const v = [-26, -16, 7, 17][i];
    f.box(-0.1, 0.05, v, v + 8, 0.4, 3, C.glass, 0.8);
    f.sign(t, 8, 1, 0.12, v + 4, 3.6, 1, 0, ['#e8611a', '#c4202a', '#1d1d1d', '#2f6db5'][i], '#ffffff');
  });
  // Planted strip along the road with a gap at the entrance, palms and frangipani.
  for (const [a, b] of [[-31, -6], [5, 31]] as const) f.box(1.5, 4.5, a, b, 0, 0.5, C.planter);
  for (const v of [-26, -15, 10, 22]) palm(f, 3, v);
  // "City Centre 1" board on a yellow pole by the kerb.
  f.box(4.6, 4.9, -9.2, -8.9, 0, 4.6, C.yellow);
  f.sign(LM_TEXT.ccName, 3.2, 1.8, 4.75, -9.05, 5.2, 1, 0, '#3b2a3a', '#f4e9d8');
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
  // The auto queue at the kerb of the street outside (bnr-cit-270): green-yellow CNG autos and blue e-autos.
  for (let i = 0; i < 9; i++) auto(f, -16 + i * 3.4, 20.5, i % 4 === 2 ? 0x4d93cf : 0x2e8b4a);
}

/** A parked three-wheeler: body, yellow canopy, one front wheel, two rear ones (for static queues). */
function auto(f: Frame, u: number, v: number, body: number) {
  f.box(u - 1.3, u + 1.3, v - 0.7, v + 0.7, 0.35, 1.25, body);
  f.box(u - 1.4, u + 1.0, v - 0.75, v + 0.75, 1.25, 1.95, 0xf2c230);
  f.box(u + 1.0, u + 1.35, v - 0.55, v + 0.55, 0.9, 1.7, 0x2a3036); // windscreen
  for (const [du, dv] of [[1.1, 0], [-1, -0.6], [-1, 0.6]]) f.box(u + du - 0.25, u + du + 0.25, v + dv - 0.1, v + dv + 0.1, 0, 0.5, 0x1d1d1d);
}

/**
 * The red church on Sealdah's north approach (Street View Oct 2025, gaps2/sdn-foot-180): red walls with white
 * trim, two square towers with small domes and finials, behind an old compound wall east of the walk-in strip.
 * The frame faces the road (u toward it).
 */
export function redChurch(f: Frame) {
  const red = 0xc8322c, trim = 0xf2ece0, dome = 0x8a2a24;
  f.box(-30, -6, -10, 10, 0, 9, red);
  f.box(-30.2, -5.8, -10.2, 10.2, 9, 9.5, trim);
  f.box(-30, -6, -6, 6, 9.5, 12.5, red); // the nave's raised gable band
  for (let v = -8; v <= 8; v += 4) f.box(-5.9, -5.8, v - 0.6, v + 0.6, 2.5, 6.5, trim); // tall arched-window bays
  for (const v of [-8, 8]) { // the two front towers
    f.box(-8, -3, v - 2.5, v + 2.5, 0, 16, red);
    for (const y of [5.5, 10.5, 15.5]) f.box(-8.1, -2.9, v - 2.6, v + 2.6, y, y + 0.35, trim);
    f.box(-7.2, -3.8, v - 1.7, v + 1.7, 16, 18, dome);
    f.box(-6, -5, v - 0.5, v + 0.5, 18, 20.2, trim); // finial
  }
  f.box(-2, -1.4, -14, 14, 0, 2.6, 0x9a948a); // the old compound wall toward the road
}
