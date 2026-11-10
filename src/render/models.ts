// Low-poly people and Kolkata vehicles. Each model is baked to one mesh (plus one textured mesh for buses),
// so a full street of traffic stays inside the draw-call budget. Every model faces +x; left is -z.

import * as THREE from 'three';
import { bake, box, C, mat, fitFont } from './gfx';
import { BUS_FRONT_DOOR, BUS_LEN, BUS_REAR_DOOR, BUS_WIDTH } from '../sim/vehicles';

/** Deterministic pick from a variant number, so the same vehicle always looks the same. */
const vpick = <T>(xs: readonly T[], v: number, salt = 0) => xs[(v * 7 + salt * 13) % xs.length];

export function person(shirt = C.shirt[Math.floor(Math.random() * C.shirt.length)], opts: { umbrella?: boolean; bag?: boolean; pants?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  const pants = opts.pants ?? C.pants[Math.floor(Math.random() * C.pants.length)];
  g.add(box(0.18, 0.75, 0.2, pants, -0.12, 0, 0), box(0.18, 0.75, 0.2, pants, 0.12, 0, 0));
  g.add(box(0.55, 0.6, 0.3, shirt, 0, 0.75, 0));
  g.add(box(0.14, 0.55, 0.16, shirt, -0.36, 0.8, 0), box(0.14, 0.55, 0.16, shirt, 0.36, 0.8, 0));
  g.add(box(0.32, 0.32, 0.3, C.skin, 0, 1.38, 0), box(0.34, 0.1, 0.32, 0x1d1d1d, 0, 1.68, 0));
  if (opts.bag) g.add(box(0.42, 0.45, 0.18, 0x2b2b2b, 0, 0.8, -0.24));
  if (opts.umbrella) g.add(box(0.04, 1.0, 0.04, 0x222222, 0.42, 0.9, 0));
  bake(g);
  return g;
}

export function playerPerson() { return person(C.player, { bag: true }); }

/** A cylinder part (wheels, headlights, tanks). Axis 'z' lies across the vehicle, 'x' points forward. */
function cyl(r: number, len: number, color: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'z', seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat(color));
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

/** Round wheels with a grey hub. */
function wheels(g: THREE.Group, xs: number[], halfW: number, size = 0.4) {
  for (const x of xs) for (const z of [-halfW, halfW]) {
    g.add(cyl(size / 2, 0.16, 0x161616, x, size / 2 + 0.02, z));
    g.add(cyl(size / 4.5, 0.17, 0x9a9a9a, x, size / 2 + 0.02, z, 'z', 6));
  }
}

/** Headlights at the front (+x) and taillights at the back, at height y, half-spacing z. */
function lights(g: THREE.Group, front: number, back: number, y: number, z: number, round = false) {
  for (const s of [-z, z]) {
    const head = round ? cyl(0.09, 0.05, 0xfff2c4, front + 0.01, y, s, 'x', 10) : box(0.05, 0.12, 0.22, 0xfff2c4, front, y - 0.06, s);
    const tail = box(0.05, 0.1, 0.18, 0xc0281f, back, y - 0.05, s);
    head.userData.glow = 1.4; // see nightUniform in gfx.ts
    tail.userData.glow = 1;
    g.add(head, tail);
  }
}

const GLASS = 0x2f3a47;

/** Kolkata's yellow Ambassador: humped bonnet, rounded boot, chrome grille, round headlamps, roof sign. */
export function ambassador(): THREE.Group {
  const g = new THREE.Group();
  const Y = C.taxi;
  g.add(box(2.6, 0.5, 1.16, Y, 0, 0.28, 0)); // body
  g.add(box(0.75, 0.16, 1.1, Y, 0.88, 0.78, 0), box(0.5, 0.1, 1.0, Y, 0.95, 0.9, 0)); // humped bonnet
  g.add(box(0.55, 0.12, 1.08, Y, -1.0, 0.78, 0)); // rounded boot
  g.add(box(1.25, 0.06, 1.08, Y, -0.1, 1.3, 0)); // roof
  for (const x of [0.48, -0.68]) for (const z of [-0.5, 0.5]) g.add(box(0.07, 0.5, 0.07, Y, x, 0.78, z)); // pillars
  g.add(box(0.05, 0.42, 0.95, GLASS, 0.5, 0.82, 0), box(0.05, 0.4, 0.95, GLASS, -0.7, 0.82, 0)); // wind/rear screen
  for (const z of [-0.555, 0.555]) g.add(box(1.1, 0.36, 0.02, GLASS, -0.1, 0.86, z)); // side windows
  g.add(box(0.06, 0.24, 0.6, 0xd8d8d8, 1.31, 0.42, 0)); // chrome grille
  g.add(box(0.1, 0.14, 1.22, 0xd0d0d0, 1.32, 0.22, 0), box(0.1, 0.14, 1.22, 0xd0d0d0, -1.32, 0.22, 0)); // chrome bumpers
  lights(g, 1.31, -1.31, 0.5, 0.42, true);
  g.add(box(0.5, 0.18, 0.32, 0x1d1d1d, -0.1, 1.33, 0), box(0.46, 0.12, 0.33, Y, -0.1, 1.37, 0)); // TAXI roof sign
  g.add(box(2.0, 0.08, 0.02, 0x1e6b3a, 0, 0.42, -0.585), box(2.0, 0.08, 0.02, 0x1e6b3a, 0, 0.42, 0.585)); // green "no refusal" stripe
  wheels(g, [-0.82, 0.82], 0.56, 0.5);
  bake(g);
  return g;
}

const CAR_COLOURS = [0xeeeeee, 0x9aa5b1, 0x2b2b2b, 0xb03a2e, 0x2c5f8a, 0xd8d2c4, 0x6b4f3a];

/** Ordinary cars: hatchbacks, sedans, SUVs and white app cabs. */
export function car(variant: number): THREE.Group {
  const g = new THREE.Group();
  const type = vpick(['hatch', 'hatch', 'sedan', 'suv', 'cab'] as const, variant);
  const col = type === 'cab' ? 0xf4f4f4 : vpick(CAR_COLOURS, variant, 1);
  const L = type === 'hatch' ? 2.0 : type === 'suv' ? 2.4 : 2.3;
  const H = type === 'suv' ? 0.7 : 0.55;
  g.add(box(L, H, 1.1, col, 0, 0.2, 0));
  const cabinL = type === 'hatch' ? L * 0.62 : type === 'suv' ? L * 0.7 : L * 0.5;
  const cabinX = type === 'hatch' ? -0.2 : type === 'suv' ? -0.15 : -0.1;
  g.add(box(cabinL, 0.45, 1.02, col, cabinX, 0.2 + H, 0));
  g.add(box(cabinL - 0.16, 0.32, 1.04, GLASS, cabinX, 0.26 + H, 0)); // side glass
  g.add(box(0.05, 0.34, 0.9, GLASS, cabinX + cabinL / 2 + 0.01, 0.25 + H, 0), box(0.05, 0.3, 0.9, GLASS, cabinX - cabinL / 2 - 0.01, 0.27 + H, 0));
  lights(g, L / 2 + 0.01, -L / 2 - 0.01, 0.2 + H * 0.75, 0.38);
  if (type === 'cab') g.add(box(0.5, 0.06, 1.05, 0x111111, 0, 0.45, 0)); // app-cab stripe
  wheels(g, [-L * 0.32, L * 0.32], 0.52, 0.44);
  bake(g);
  return g;
}

/** Kolkata auto-rickshaw: green body, yellow canopy, tapered nose with one front wheel, a windscreen and a meter. */
export function auto(): THREE.Group {
  const g = new THREE.Group();
  const green = 0x1f8a46, yellow = 0xf2c230;
  g.add(box(1.4, 0.45, 1.18, green, -0.25, 0.25, 0)); // rear body
  g.add(box(0.45, 0.6, 0.9, green, 0.65, 0.25, 0), box(0.3, 0.45, 0.6, green, 0.95, 0.3, 0)); // tapered nose
  g.add(box(0.05, 0.5, 0.95, GLASS, 0.7, 0.9, 0)); // windscreen
  g.add(box(1.5, 0.08, 1.22, yellow, -0.15, 1.62, 0)); // canopy roof
  g.add(box(0.08, 0.95, 1.18, yellow, -0.9, 0.7, 0)); // back panel
  for (const z of [-0.57, 0.57]) { g.add(box(0.05, 0.95, 0.05, 0x222222, 0.6, 0.7, z)); g.add(box(1.3, 0.12, 0.04, 0x111111, -0.2, 1.5, z)); } // rods, rolled canvas
  g.add(box(0.5, 0.05, 0.7, 0x111111, 0.55, 1.18, 0)); // handlebar
  g.add(box(0.14, 0.12, 0.14, 0xf2f2f2, 0.62, 1.25, 0.32)); // fare meter
  g.add(box(0.7, 0.2, 1.0, 0x3a2a20, -0.45, 0.72, 0)); // passenger bench
  const lamp = cyl(0.09, 0.05, 0xfff2c4, 1.11, 0.55, 0, 'x');
  lamp.userData.glow = 1.4;
  g.add(lamp);
  g.add(cyl(0.2, 0.14, 0x161616, 0.95, 0.22, 0)); // single front wheel
  for (const z of [-0.6, 0.6]) g.add(cyl(0.22, 0.14, 0x161616, -0.6, 0.24, z));
  bake(g);
  return g;
}

/** Toto (e-rickshaw): open sides, a flat canopy, four passengers' worth of bench. */
export function toto(variant: number): THREE.Group {
  const g = new THREE.Group();
  const body = vpick([0x2f6db5, 0x1f8a46, 0xd9534f], variant);
  g.add(box(2.0, 0.35, 1.05, body, 0, 0.28, 0), box(1.3, 0.25, 0.95, 0x444444, -0.25, 0.63, 0));
  g.add(box(2.1, 0.06, 1.1, body, -0.05, 1.7, 0));
  for (const x of [-0.95, 0.75]) for (const z of [-0.5, 0.5]) g.add(box(0.05, 1.1, 0.05, 0x333333, x, 0.6, z));
  g.add(box(0.1, 0.5, 0.9, 0x2a3440, 0.95, 1.0, 0));
  wheels(g, [-0.7, 0.75], 0.5, 0.36);
  bake(g);
  return g;
}

/** A bike with its rider. */
export function bike(rider = true): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.5, 0.35, 0.3, 0xd9534f, 0, 0.45, 0));
  g.add(box(0.5, 0.5, 0.12, 0x111111, -0.6, 0, 0), box(0.5, 0.5, 0.12, 0x111111, 0.6, 0, 0));
  g.add(box(0.1, 0.6, 0.6, 0x333333, 0.6, 0.6, 0));
  if (rider) {
    const r = person(C.shirt[Math.floor(Math.random() * C.shirt.length)]);
    r.position.set(0.3, 0.55, 0);
    r.scale.setScalar(0.9);
    g.add(r);
  }
  bake(g);
  return g;
}

// --- Buses ------------------------------------------------------------------

const busSlogans = [
  'মা তারা ভরসা', 'জয় বাবা লোকনাথ', 'MAA TARA BHAROSA', 'JOY BABA LOKNATH', 'AASTE LADIES · KOLE BACHCHA',
  'PICHHONE EGIYE JAAN', 'MAYER ASHIRBAD', 'BIPODE MA', 'HORN PLEASE · USE DIPPER AT NIGHT', 'NO SMOKING · NO SPITTING · NO HOPE',
];
const toSealdah = ['SEALDAH · শিয়ালদহ', 'SECTOR V → SEALDAH', 'KARUNAMOYEE · SEALDAH', 'ULTADANGA · SEALDAH'];
const toSectorV = ['SECTOR V · সেক্টর ফাইভ', 'COLLEGE MORE · NABADIGANTA', 'SALT LAKE SECTOR V'];

/** One canvas holding a bus's destination board, side slogan and back text, so all its text is one mesh. */
function busTextAtlas(board: string, slogan: string, back: string, bg: string, fg: string) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 192;
  const g = cv.getContext('2d')!;
  const row = (text: string, y: number, rowBg: string, rowFg: string) => {
    g.fillStyle = rowBg; g.fillRect(0, y, 512, 64);
    g.fillStyle = rowFg;
    fitFont(g, text, 480, 40, 10, (n) => `bold ${n}px system-ui, "Noto Sans Bengali", sans-serif`);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, y + 32);
  };
  row(board, 0, '#111', '#ffb347');
  row(slogan, 64, bg, fg);
  row(back, 128, bg, fg);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A textured quad using one row (0, 1 or 2) of the atlas, placed and turned. */
function quad(w: number, h: number, rowIndex: number, x: number, y: number, z: number, rotY: number) {
  const q = new THREE.PlaneGeometry(w, h);
  const uv = q.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (rowIndex + (1 - uv.getY(i))) / 3);
  q.rotateY(rotY);
  q.translate(x, y, z);
  return q;
}

/**
 * A Kolkata bus: blue-and-white government livery or red-and-yellow private, doors on the left (local -z),
 * a destination board that matches where it's going, a painted slogan and a conductor at the rear door.
 */
export function bus(variant: number, towardsSealdah: boolean): THREE.Group {
  const g = new THREE.Group();
  const govt = variant % 100 < 55;
  const L = BUS_LEN, W = BUS_WIDTH;
  const lower = govt ? 0x2f6db5 : 0xb3262b, upper = govt ? 0xf1efe8 : 0xf2c14e, stripe = govt ? 0xf5c518 : 0x1f7a3a;
  g.add(box(L, 1.3, W, lower, 0, 0.45, 0), box(L, 1.25, W, upper, 0, 1.75, 0));
  g.add(box(L + 0.04, 0.14, W + 0.04, stripe, 0, 1.68, 0));
  g.add(box(L - 0.6, 0.12, W - 0.3, 0xdddddd, 0, 3.0, 0));
  // Window panes with pillars between them; no panes over the left-side doors.
  for (let x = -L / 2 + 0.7; x < L / 2 - 1.2; x += 1.15) {
    for (const z of [-W / 2 - 0.01, W / 2 + 0.01]) {
      const overDoor = z < 0 && [BUS_FRONT_DOOR, BUS_REAR_DOOR].some((d) => Math.abs(d - x) < 0.8);
      if (!overDoor) g.add(box(0.92, 0.62, 0.04, GLASS, x, 1.82, z));
    }
  }
  g.add(box(0.06, 0.95, W - 0.3, GLASS, L / 2 + 0.01, 1.65, 0)); // windscreen
  g.add(box(0.06, 0.5, W - 0.6, GLASS, -L / 2 - 0.01, 1.95, 0)); // rear window
  g.add(box(0.08, 0.35, 1.2, 0x2b2b2b, L / 2 + 0.02, 0.6, 0)); // grille
  lights(g, L / 2 + 0.03, -L / 2 - 0.03, 0.85, 0.95, true);
  for (const dx of [BUS_FRONT_DOOR, BUS_REAR_DOOR]) g.add(box(1.1, 2.3, 0.1, 0x161616, dx, 0.35, -W / 2 - 0.02));
  for (const x of [-L / 2 + 1.6, L / 2 - 1.8]) for (const z of [-W / 2 + 0.05, W / 2 - 0.05]) {
    g.add(cyl(0.5, 0.3, 0x161616, x, 0.5, z), cyl(0.22, 0.32, 0x8a8a8a, x, 0.5, z, 'z', 6));
  }
  const cond = person(0x6b5d4a, { pants: 0x3b3326 });
  cond.position.set(BUS_REAR_DOOR + 0.1, 0.55, -W / 2 - 0.25);
  cond.rotation.set(0.12, Math.PI, 0);
  g.add(cond);
  bake(g);
  // All text in one mesh: board up front, slogan on both sides, "HORN PLEASE" on the back.
  const bg = govt ? '#2f6db5' : '#b3262b', fg = govt ? '#ffffff' : '#ffe680';
  const board = vpick(towardsSealdah ? toSealdah : toSectorV, variant, 2);
  const tex = busTextAtlas(board, vpick(busSlogans, variant, 3), 'HORN PLEASE · OK TATA', bg, fg);
  const text = new THREE.Mesh(
    (() => {
      const parts = [
        quad(2.2, 0.38, 0, L / 2 + 0.07, 2.62, 0, Math.PI / 2),
        quad(5.2, 0.55, 1, -0.4, 0.95, W / 2 + 0.03, 0),
        quad(5.2, 0.55, 1, -0.4, 0.95, -W / 2 - 0.03, Math.PI),
        quad(2, 0.4, 2, -L / 2 - 0.03, 1.0, 0, -Math.PI / 2),
      ];
      const merged = new THREE.BufferGeometry();
      const pos: number[] = [], uv: number[] = [], nor: number[] = [];
      for (const p of parts) {
        const q = p.toNonIndexed();
        pos.push(...(q.attributes.position.array as Float32Array));
        uv.push(...(q.attributes.uv.array as Float32Array));
        nor.push(...(q.attributes.normal.array as Float32Array));
      }
      merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      return merged;
    })(),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  g.add(text);
  return g;
}
