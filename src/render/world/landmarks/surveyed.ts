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

/**
 * Bidhan Nagar Road (Street View Dec 2025, satellite; gaps3/bnr-*, sat-bnr): four tracks running about NNE with
 * platform 1 on the east side, an island platform and platform 4 on the west, all under long thin sheds. There is
 * no street-facing front: the booking and reservation counters are small blocks east of platform 1, reached by
 * lanes off CIT Rd (behind a weathered housing block) and by the footbridge, whose east arm comes down to the
 * street. Bidhannagar Rd dips under the line just north of it (the Ultadanga underpass): the tracks cross on girders.
 */
export function railStation(f: Frame) {
  const U0 = -46, U1 = 31, tracks = [1.6, -1.8, -7.8, -11.2];
  f.box(U0, U1, -12.9, 3.1, 0, 0.25, C.ballast); // the track bed
  for (const c of tracks) { // sleepers every 1.2 u, two rails
    for (let u = U0 + 0.4; u < U1; u += 1.2) f.box(u, u + 0.3, c - 1.25, c + 1.25, 0.25, 0.4, C.sleeper);
    for (const s of [-0.84, 0.84]) f.box(U0, U1 + 9, c + s - 0.04, c + s + 0.04, 0.4, 0.58, C.steel);
  }
  // The girder bridge over the underpass at the north end: two deep steel side girders, the rails run on.
  for (const v of [-13.2, 3.4]) f.box(U1, U1 + 9, v - 0.25, v + 0.25, 0.3, 2.3, C.fob);
  for (let u = U1 + 0.5; u < U1 + 9; u += 1.5) for (const v of [-13.2, 3.4]) f.box(u, u + 0.15, v - 0.3, v + 0.3, 0.3, 2.3, C.steel);
  // Platforms (1 east, the island 2/3, 4 west) with yellow edge lines on the track sides.
  for (const [a, b, edges] of [[3.1, 7, [3.1]], [-6.3, -3.3, [-6.3, -3.55]], [-16, -12.9, [-13.15]]] as const) {
    f.box(-40, 28, a, b, 0, 0.95, C.platform);
    for (const e of edges) f.box(-40, 28, e, e + 0.25, 0.95, 0.97, C.edge);
  }
  // Long thin sheds on single posts over each platform.
  for (const [a, b] of [[3.3, 6.8], [-6.1, -3.5], [-15.8, -13.1]] as const) {
    for (let u = -36; u <= 24; u += 6) f.box(u - 0.12, u + 0.12, (a + b) / 2 - 0.12, (a + b) / 2 + 0.12, 0.95, 4.2, C.post);
    f.box(-38, 26, a - 0.6, b + 0.6, 4.2, 4.4, C.shed);
  }
  // Classic yellow station boards (name in three scripts), both faces, on every platform.
  for (const [u, v] of [[-22, 5.9], [8, 5.9], [-8, -4.8], [-14, -14.4]] as const) {
    for (const s of [-1, 1]) f.box(u + s * 2.2 - 0.08, u + s * 2.2 + 0.08, v - 0.08, v + 0.08, 0.95, 3.4, C.post);
    f.sign(LM_TEXT.railBoard, 5, 0.9, u, v + 0.1, 3.0, 0, 1, '#f2c230', '#1d1d1d');
    f.sign(LM_TEXT.railBoard, 5, 0.9, u, v - 0.1, 3.0, 0, -1, '#f2c230', '#1d1d1d');
    f.sign(LM_TEXT.railBoardBn, 5, 0.6, u, v + 0.1, 2.2, 0, 1, '#f2c230', '#1d1d1d');
  }
  // The booking counter (south-east) and the reservation counter (north-east): low cream blocks, maroon band.
  for (const [u0, u1, v0, v1, text] of [[-17, -6, 8, 13.5, LM_TEXT.railCounter], [4, 11, 8, 12, LM_TEXT.railBoardHi]] as const) {
    f.box(u0, u1, v0, v1, 0, 3.8, C.station);
    f.box(u0 - 0.1, u1 + 0.1, v0 - 0.1, v1 + 0.1, 3.8, 4.1, C.maroon);
    for (let u = u0 + 1; u < u1 - 1.5; u += 2.6) f.box(u, u + 1.4, v1, v1 + 0.06, 0.9, 2.1, 0xffd59a, 0.9); // counter windows
    f.sign(text, Math.min(9, u1 - u0 - 1), 0.75, (u0 + u1) / 2, v1 + 0.1, 3.2, 0, 1, '#7a2a2a', '#fff6e8');
  }
  // The footbridge across all four tracks, its east arm reaching over the side lanes to the street.
  const fu = 14;
  f.box(fu - 1.3, fu + 1.3, -17, 19, 6.4, 6.9, C.fob);
  for (const s of [-1, 1]) f.box(fu + s * 1.25 - 0.06, fu + s * 1.25 + 0.06, -17, 19, 6.9, 8, C.fob); // side railings
  for (const v of [-17, -4.8, 5, 19]) for (const s of [-1, 1]) f.box(fu + s * 1.2 - 0.15, fu + s * 1.2 + 0.15, v - 0.15, v + 0.15, 0, 6.4, C.fob);
  for (let k = 0; k < 8; k++) f.box(fu - 1.2 - (k + 1) * 0.8, fu - 1.2 - k * 0.8, 17, 19, 6.4 - k * 0.8, 6.6 - k * 0.8, C.fob); // stair down to the street
  for (const v of [-5.6, 5.6]) for (let k = 0; k < 6; k++) f.box(fu + 1.3 + k * 0.8, fu + 2.1 + k * 0.8, v - 0.6, v + 0.6, 6.4 - (k + 1) * 0.9, 6.6 - (k + 1) * 0.9, C.fob); // platform stairs
  // CIT Rd's edge: blue lock-up kiosks against the housing block, and the auto queue at the kerb.
  for (let i = 0; i < 4; i++) f.box(-20 + i * 6.5, -16 + i * 6.5, 16.5, 18.3, 0, 2.4, 0x3d7fc0);
  hoarding(f, 26, 18, 0, 9, 4, LM_TEXT.hoardings[0], 0, 1, '#e86a1a', '#ffffff');
  for (let i = 0; i < 9; i++) auto(f, -16 + i * 3.4, 21, i % 4 === 2 ? 0x4d93cf : 0x2e8b4a);
}

/** A parked three-wheeler: body, yellow canopy, one front wheel, two rear ones (for static queues). */
function auto(f: Frame, u: number, v: number, body: number) {
  f.box(u - 1.3, u + 1.3, v - 0.7, v + 0.7, 0.35, 1.25, body);
  f.box(u - 1.4, u + 1.0, v - 0.75, v + 0.75, 1.25, 1.95, 0xf2c230);
  f.box(u + 1.0, u + 1.35, v - 0.55, v + 0.55, 0.9, 1.7, 0x2a3036); // windscreen
  for (const [du, dv] of [[1.1, 0], [-1, -0.6], [-1, 0.6]]) f.box(u + du - 0.25, u + du + 0.25, v + dv - 0.1, v + dv + 0.1, 0, 0.5, 0x1d1d1d);
}

/**
 * St John's Church on Sealdah's north approach (Street View Oct 2025 from the deck, gaps3/lane6-115; satellite):
 * red walls with cream trim; two towers with green louvred openings, small spires and crosses; a central gable
 * with a round medallion and a cross; a small gabled entrance portico; a black iron fence and gate on the stall
 * strip, and the blue name board. A cross-shaped plan behind. The frame faces the flyover (u toward it).
 */
export function redChurch(f: Frame) {
  const red = 0xc8322c, trim = 0xf0e3c4, louvre = 0x2f7a43, spire = 0xb0302a, cross = 0xf4efe4;
  f.box(-34, -6, -7, 7, 0, 10, red); // the nave
  f.box(-24, -16, -15, 15, 0, 9, red); // the transepts (the cross plan)
  f.box(-34.2, -5.8, -7.2, 7.2, 10, 10.4, trim);
  for (let k = 0; k < 4; k++) f.box(-34, -6, -6 + k * 1.5, 6 - k * 1.5, 10.4 + k * 1.1, 11.5 + k * 1.1, red); // stepped gable roof
  f.box(-6.4, -5.9, -2.6, 2.6, 10.4, 14.6, red); // the front gable
  f.box(-6.5, -6.3, -1.3, 1.3, 11.3, 13.9, trim); // the round medallion
  f.box(-6.2, -6, -0.12, 0.12, 14.6, 16.4, cross); f.box(-6.2, -6, -0.7, 0.7, 15.6, 15.9, cross);
  for (const v of [-3.6, 0, 3.6]) f.box(-6.1, -5.9, v - 0.8, v + 0.8, 4.2, 8.4, trim); // tall arched windows
  for (const v of [-8.6, 8.6]) { // the two towers
    f.box(-9.6, -5.2, v - 2.2, v + 2.2, 0, 15, red);
    for (const y of [4.8, 10, 15]) f.box(-9.7, -5.1, v - 2.3, v + 2.3, y, y + 0.35, trim);
    f.box(-5.25, -5.1, v - 0.8, v + 0.8, 11, 14, louvre); // green louvred openings
    f.box(-9, -5.8, v - 1.6, v + 1.6, 15.35, 17.2, red);
    f.box(-8.3, -6.5, v - 0.9, v + 0.9, 17.2, 19.2, spire);
    f.box(-7.5, -7.3, v - 0.1, v + 0.1, 19.2, 20.8, cross); f.box(-7.5, -7.3, v - 0.5, v + 0.5, 20.1, 20.35, cross);
  }
  f.box(-5.2, -1.8, -2.2, 2.2, 0, 4.2, trim); // the entrance portico
  f.box(-5.3, -1.7, -2.4, 2.4, 4.2, 4.8, red);
  f.sign(LM_TEXT.churchBoard, 6, 0.8, -5.0, 0, 6.4, 1, 0, '#2f5fa8', '#ffffff');
  // The black iron fence on the strip, with the gate in front of the portico.
  for (const [a, b] of [[-16, -2.6], [2.6, 16]] as const) {
    f.box(-0.8, -0.6, a, b, 0, 0.6, 0x9a948a);
    for (let v = a; v <= b; v += 0.5) f.box(-0.75, -0.65, v - 0.03, v + 0.03, 0.6, 2.4, 0x1d1d1d);
  }
}
