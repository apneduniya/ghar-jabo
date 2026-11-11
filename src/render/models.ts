// Low-poly people and Kolkata vehicles. Each model is baked to one mesh (plus one textured mesh for buses),
// so a full street of traffic stays inside the draw-call budget. Vehicles face +x (left is -z); people face +z.
// Vehicles bake with bakeVehicle: their wheels turn and their brake lights light in the shader (actors.ts).

import * as THREE from 'three';
import { bake, bakeVehicle, box, C, mat, fitFont } from './gfx';
import { figure, RiggedFigure, type Look } from './rig';
import { BUS_FRONT_DOOR, BUS_LEN, BUS_REAR_DOOR, BUS_WIDTH } from '../sim/vehicles';

/** Deterministic pick from a variant number, so the same vehicle always looks the same. */
const vpick = <T>(xs: readonly T[], v: number, salt = 0) => xs[(v * 7 + salt * 13) % xs.length];

const SKIN = [0xc68a5e, 0xb07850, 0x8d5a3b, 0xd29b72, 0x9c6644];
const HAIR = [0x161210, 0x1f1712, 0x2a221c, 0x161210, 0x6e6a66];

/**
 * Kolkata at office hour, one look per crowd mesh: office shirt and trousers, kurta-pyjama, saree, salwar
 * kameez with dupatta, a schoolkid in uniform, a young man in a tee with an umbrella. Clothes are light
 * enough that a per-instance tint (render/world/walkers.ts) still varies them.
 */
export const CROWD_LOOKS: (Look & { scale: number })[] = [
  { dress: 'shirt', skin: SKIN[0], hair: HAIR[0], top: 0xdfe8f2, bottom: 0x3a4656, shoes: 0x1a1a1a, bag: 'shoulder', bagColor: 0x2b2b2b, scale: 1 },
  { dress: 'kurta', skin: SKIN[2], hair: HAIR[4], top: 0xf1ead8, bottom: 0xeae6dc, shoes: 0x5a3a24, scale: 0.97 },
  { dress: 'saree', skin: SKIN[1], hair: HAIR[1], top: 0x8e2a3a, bottom: 0xf0e2c8, accent: 0xc0392b, shoes: 0x5a3a24, longHair: true, bag: 'shoulder', bagColor: 0x7a3b22, scale: 0.93 },
  { dress: 'salwar', skin: SKIN[3], hair: HAIR[2], top: 0x9fc4e8, bottom: 0xf2f2ee, accent: 0xe8a33a, shoes: 0x3a2a20, longHair: true, scale: 0.94 },
  { dress: 'uniform', skin: SKIN[4], hair: HAIR[0], top: 0xf6f6f2, bottom: 0x24324a, accent: 0x8a1f2a, shoes: 0x111111, shorts: true, bag: 'backpack', bagColor: 0x2f6db5, sleeves: 'short', scale: 0.78 },
  { dress: 'tee', skin: SKIN[1], hair: HAIR[3], top: 0xe8e8e8, bottom: 0x34495e, shoes: 0xe8e8e8, bag: 'backpack', bagColor: 0x3b3b3b, umbrella: true, scale: 1.03 },
];

/** The student: orange tee, jeans, white sneakers, a backpack on both straps. */
export const PLAYER_LOOK: Look = { dress: 'tee', skin: C.skin, hair: HAIR[0], top: C.player, bottom: 0x2f4a6e, shoes: 0xf2f2f2, bag: 'backpack', bagColor: 0x2b2b2b };

const staticFigureMat = new THREE.MeshLambertMaterial({ vertexColors: true });

/**
 * A standing person baked in its rest pose (stall keepers, bus hangers, the conductor, queues): the same
 * figure as the walkers, without the rig. `shirt` picks the top; with no shirt, a random look from the crowd.
 */
export function person(shirt?: number, opts: { umbrella?: boolean; bag?: boolean; pants?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  const base = CROWD_LOOKS[shirt === undefined ? Math.floor(Math.random() * CROWD_LOOKS.length) : Math.random() < 0.5 ? 0 : 5];
  const look: Look = { ...base, umbrella: opts.umbrella ?? (shirt === undefined && base.umbrella) };
  if (shirt !== undefined) look.top = shirt;
  if (opts.pants !== undefined) look.bottom = opts.pants;
  if (opts.bag !== undefined) look.bag = opts.bag ? 'backpack' : undefined;
  const m = new THREE.Mesh(figure(look), staticFigureMat);
  m.scale.setScalar(shirt === undefined ? base.scale : 1);
  g.add(m); // facing +z, like people always have here (vehicles face +x)
  bake(g);
  return g;
}

/** The hero, rigged: walk, run, jump, tumble, hang (render/rig.ts). Faces +z. */
export function playerPerson() { return new RiggedFigure(PLAYER_LOOK); }

// --- Vehicle kit ----------------------------------------------------------------

/** A cylinder part (wheels, headlights, tanks). Axis 'z' lies across the vehicle, 'x' points forward. */
function cyl(r: number, len: number, color: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'z', seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat(color));
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

/** A part that turns with the wheel whose hub is at (x, y), radius r. */
const spins = <M extends THREE.Object3D>(m: M, x: number, y: number, r: number) => { m.userData.hub = [x, y, r]; return m; };

/** One wheel: tyre, rim and a cross of spokes (so you can see it roll), all turning about the hub. */
function wheel(g: THREE.Group, x: number, z: number, size: number, width = 0.18) {
  const r = size / 2, y = r + 0.02;
  g.add(spins(cyl(r, width, 0x161616, x, y, z, 'z', 12), x, y, r));
  g.add(spins(cyl(r * 0.55, width + 0.02, 0x9a9a9a, x, y, z, 'z', 8), x, y, r));
  for (const a of [0, Math.PI / 2]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.18, width + 0.04), mat(0x3a3a3a));
    s.position.set(x, y, z);
    s.rotation.z = a;
    g.add(spins(s, x, y, r));
  }
}

/** Wheels at each x, both sides, with dark arches over them cut into the body side. */
function wheels(g: THREE.Group, xs: number[], halfW: number, size = 0.4, arch = true) {
  for (const x of xs) for (const z of [-halfW, halfW]) {
    wheel(g, x, z, size);
    if (arch) g.add(box(size * 1.15, size * 0.55, 0.03, 0x1a1a1a, x, size * 0.62, z + Math.sign(z) * 0.06));
  }
}

/** Headlights at the front (+x) and tail/brake lights at the back, at height y, half-spacing z. */
function lights(g: THREE.Group, front: number, back: number, y: number, z: number, round = false) {
  for (const s of [-z, z]) {
    const head = round ? cyl(0.09, 0.05, 0xfff2c4, front + 0.01, y, s, 'x', 10) : box(0.05, 0.12, 0.22, 0xfff2c4, front, y - 0.06, s);
    const tail = box(0.05, 0.11, 0.2, 0xa8231b, back, y - 0.05, s);
    head.userData.glow = 1.4; // see nightUniform in gfx.ts
    tail.userData.glow = 1;
    tail.userData.brake = 1;
    g.add(head, tail);
  }
}

/** Number plates front and back (white, black text band). */
function plates(g: THREE.Group, front: number, back: number, y: number) {
  for (const x of [front, back]) g.add(box(0.03, 0.12, 0.36, 0xf2f2ee, x, y, 0), box(0.035, 0.04, 0.26, 0x222222, x, y + 0.04, 0));
}

/** Side mirrors on short stalks at the front of the cabin. */
function mirrors(g: THREE.Group, x: number, y: number, halfW: number, color = 0x222222) {
  for (const z of [-halfW, halfW]) g.add(box(0.1, 0.1, 0.14, color, x, y, z + Math.sign(z) * 0.07));
}

/**
 * A seated driver or rider facing +x: torso and head above the seat, legs tucked in front. `helmet` puts a
 * helmet on (bike riders); India drives on the left, so a car's driver sits on the right (+z).
 */
function seated(g: THREE.Group, x: number, seatY: number, z: number, shirt: number, opts: { helmet?: number; scale?: number } = {}) {
  const s = opts.scale ?? 0.85, p = new THREE.Group();
  p.add(box(0.5, 0.55, 0.32, shirt, 0, 0, 0)); // torso
  p.add(box(0.13, 0.42, 0.15, shirt, -0.3, 0.1, 0.12), box(0.13, 0.42, 0.15, shirt, 0.3, 0.1, 0.12)); // arms forward
  p.add(box(0.3, 0.3, 0.28, C.skin, 0, 0.6, 0)); // head
  if (opts.helmet !== undefined) p.add(box(0.38, 0.26, 0.36, opts.helmet, 0, 0.78, 0), box(0.3, 0.08, 0.04, 0x1b2430, 0, 0.72, 0.17));
  else p.add(box(0.32, 0.09, 0.3, 0x1d1d1d, 0, 0.88, 0));
  p.add(box(0.2, 0.18, 0.5, 0x2c3e50, -0.13, -0.1, 0.25), box(0.2, 0.18, 0.5, 0x2c3e50, 0.13, -0.1, 0.25)); // thighs forward
  p.rotation.y = Math.PI / 2; // its front (+z) faces the vehicle's +x
  p.scale.setScalar(s);
  p.position.set(x, seatY, z);
  g.add(p);
}

const GLASS = 0x2f3a47;
const shirtOf = (v: number, salt: number) => vpick(C.shirt, v, salt);

// --- Vehicles ---------------------------------------------------------------------

/** Kolkata's yellow Ambassador: humped bonnet, rounded boot, chrome grille, round headlamps, roof sign, a driver. */
export function ambassador(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const Y = C.taxi;
  g.add(box(2.6, 0.42, 1.12, Y, 0, 0.3, 0)); // body
  g.add(box(2.4, 0.08, 1.18, Y, 0, 0.68, 0)); // waist line, a touch wider
  g.add(box(0.8, 0.18, 1.06, Y, 0.88, 0.72, 0), box(0.55, 0.1, 0.92, Y, 0.95, 0.88, 0)); // humped bonnet
  g.add(box(0.55, 0.14, 1.06, Y, -1.0, 0.72, 0), box(0.3, 0.06, 0.9, Y, -1.12, 0.84, 0)); // rounded boot
  g.add(box(1.25, 0.07, 1.06, Y, -0.1, 1.32, 0), box(1.05, 0.04, 0.95, Y, -0.1, 1.39, 0)); // domed roof
  for (const x of [0.48, -0.68]) for (const z of [-0.5, 0.5]) g.add(box(0.07, 0.52, 0.07, Y, x, 0.78, z)); // pillars
  g.add(box(0.05, 0.44, 0.95, GLASS, 0.5, 0.84, 0), box(0.05, 0.42, 0.95, GLASS, -0.7, 0.84, 0)); // wind/rear screen
  for (const z of [-0.545, 0.545]) g.add(box(1.1, 0.38, 0.02, GLASS, -0.1, 0.86, z)); // side windows
  g.add(box(0.06, 0.24, 0.62, 0xd8d8d8, 1.31, 0.42, 0)); // chrome grille
  for (let i = 0; i < 4; i++) g.add(box(0.07, 0.02, 0.58, 0x8a8a8a, 1.32, 0.46 + i * 0.05, 0));
  g.add(box(0.1, 0.13, 1.22, 0xd0d0d0, 1.33, 0.22, 0), box(0.1, 0.13, 1.22, 0xd0d0d0, -1.33, 0.22, 0)); // chrome bumpers
  lights(g, 1.31, -1.31, 0.55, 0.42, true);
  plates(g, 1.39, -1.39, 0.32);
  mirrors(g, 0.55, 0.78, 0.56, 0xd0d0d0);
  g.add(box(0.5, 0.18, 0.32, 0x1d1d1d, -0.1, 1.4, 0), box(0.46, 0.12, 0.33, Y, -0.1, 1.44, 0)); // TAXI roof sign
  g.add(box(2.1, 0.07, 0.02, 0x1e6b3a, 0, 0.5, -0.57), box(2.1, 0.07, 0.02, 0x1e6b3a, 0, 0.5, 0.57)); // "no refusal" stripe
  seated(g, 0.05, 0.62, 0.26, vpick([0xeeeeee, 0x6b5d4a, 0x3f7cc4], variant)); // driver on the right
  wheels(g, [-0.82, 0.82], 0.56, 0.5);
  bakeVehicle(g);
  return g;
}

const CAR_COLOURS = [0xeeeeee, 0x9aa5b1, 0x2b2b2b, 0xb03a2e, 0x2c5f8a, 0xd8d2c4, 0x6b4f3a];

/** Ordinary cars: hatchbacks, sedans, SUVs and white app cabs, each with a driver. */
export function car(variant: number): THREE.Group {
  const g = new THREE.Group();
  const type = vpick(['hatch', 'hatch', 'sedan', 'suv', 'cab'] as const, variant);
  const col = type === 'cab' ? 0xf4f4f4 : vpick(CAR_COLOURS, variant, 1);
  const L = type === 'hatch' ? 2.0 : type === 'suv' ? 2.4 : 2.3;
  const H = type === 'suv' ? 0.62 : 0.48, base = type === 'suv' ? 0.28 : 0.2;
  g.add(box(L, H, 1.08, col, 0, base, 0));
  g.add(box(L - 0.1, 0.06, 1.12, 0x2a2a2a, 0, base + 0.02, 0)); // dark sill
  const cabinL = type === 'hatch' ? L * 0.6 : type === 'suv' ? L * 0.68 : L * 0.48;
  const cabinX = type === 'hatch' ? -0.18 : type === 'suv' ? -0.15 : -0.1;
  const top = base + H;
  g.add(box(cabinL, 0.44, 0.98, col, cabinX, top, 0));
  g.add(box(cabinL - 0.14, 0.32, 1.0, GLASS, cabinX, top + 0.06, 0)); // side glass
  g.add(box(0.05, 0.34, 0.88, GLASS, cabinX + cabinL / 2 + 0.01, top + 0.05, 0), box(0.05, 0.3, 0.88, GLASS, cabinX - cabinL / 2 - 0.01, top + 0.07, 0));
  // A raked bonnet and boot: a thin slab stepping down to the bumpers.
  g.add(box(L * 0.18, 0.05, 1.02, col, L / 2 - L * 0.1, top - 0.03, 0));
  if (type !== 'hatch') g.add(box(L * 0.14, 0.05, 1.02, col, -L / 2 + L * 0.08, top - 0.03, 0));
  g.add(box(0.08, 0.12, 1.1, 0x2a2a2a, L / 2 + 0.02, base + 0.04, 0), box(0.08, 0.12, 1.1, 0x2a2a2a, -L / 2 - 0.02, base + 0.04, 0)); // bumpers
  lights(g, L / 2 + 0.01, -L / 2 - 0.01, top - 0.08, 0.38);
  plates(g, L / 2 + 0.05, -L / 2 - 0.05, base + 0.14);
  mirrors(g, cabinX + cabinL / 2 - 0.05, top + 0.05, 0.52);
  if (type === 'suv') for (const z of [-0.42, 0.42]) g.add(box(cabinL * 0.9, 0.05, 0.05, 0x1d1d1d, cabinX, top + 0.46, z)); // roof rails
  if (type === 'cab') g.add(box(0.5, 0.06, 1.05, 0x111111, 0, base + 0.25, 0)); // app-cab stripe
  seated(g, cabinX + 0.05, top - 0.05, 0.24, shirtOf(variant, 4));
  wheels(g, [-L * 0.32, L * 0.32], 0.52, type === 'suv' ? 0.54 : 0.44);
  bakeVehicle(g);
  return g;
}

/** Kolkata auto-rickshaw: green body, yellow canopy, tapered nose, one front wheel, a driver in khaki up front. */
export function auto(): THREE.Group {
  const g = new THREE.Group();
  const green = 0x1f8a46, yellow = 0xf2c230;
  g.add(box(1.4, 0.45, 1.18, green, -0.25, 0.25, 0)); // rear body
  g.add(box(0.45, 0.6, 0.9, green, 0.65, 0.25, 0), box(0.3, 0.45, 0.6, green, 0.95, 0.3, 0)); // tapered nose
  g.add(box(0.12, 0.12, 0.4, 0x111111, 1.08, 0.18, 0)); // front mudguard
  g.add(box(0.05, 0.5, 0.95, GLASS, 0.7, 0.9, 0)); // windscreen
  g.add(box(1.5, 0.08, 1.22, yellow, -0.15, 1.62, 0), box(1.3, 0.06, 1.1, yellow, -0.2, 1.7, 0)); // canopy roof
  g.add(box(0.08, 0.95, 1.18, yellow, -0.9, 0.7, 0)); // back panel
  for (const z of [-0.57, 0.57]) { g.add(box(0.05, 0.95, 0.05, 0x222222, 0.6, 0.7, z)); g.add(box(1.3, 0.12, 0.04, 0x111111, -0.2, 1.5, z)); } // rods, rolled canvas
  g.add(box(0.06, 0.05, 0.7, 0x111111, 0.62, 1.12, 0)); // handlebar
  g.add(box(0.14, 0.12, 0.14, 0xf2f2f2, 0.62, 1.25, 0.32)); // fare meter
  g.add(box(0.7, 0.2, 1.0, 0x3a2a20, -0.45, 0.72, 0)); // passenger bench
  mirrors(g, 0.7, 1.15, 0.45);
  const lamp = cyl(0.09, 0.05, 0xfff2c4, 1.11, 0.55, 0, 'x');
  lamp.userData.glow = 1.4;
  g.add(lamp);
  for (const z of [-0.45, 0.45]) { const t = box(0.04, 0.1, 0.12, 0xa8231b, -0.96, 0.4, z); t.userData.glow = 1; t.userData.brake = 1; g.add(t); }
  seated(g, 0.25, 0.72, 0, 0xb09a6a); // the driver sits in the middle, khaki uniform
  wheel(g, 0.95, 0, 0.4, 0.14); // single front wheel
  for (const z of [-0.6, 0.6]) wheel(g, -0.6, z, 0.44, 0.14);
  bakeVehicle(g);
  return g;
}

/** Toto (e-rickshaw): open sides, a flat canopy, bench seats, a driver up front. */
export function toto(variant: number): THREE.Group {
  const g = new THREE.Group();
  const body = vpick([0x2f6db5, 0x1f8a46, 0xd9534f], variant);
  g.add(box(2.0, 0.35, 1.05, body, 0, 0.28, 0), box(1.3, 0.25, 0.95, 0x444444, -0.25, 0.63, 0));
  g.add(box(0.5, 0.55, 0.8, body, 0.8, 0.3, 0)); // front cowl
  g.add(box(2.1, 0.06, 1.1, body, -0.05, 1.7, 0), box(2.0, 0.08, 0.04, 0xf2f2f2, -0.05, 1.62, -0.54), box(2.0, 0.08, 0.04, 0xf2f2f2, -0.05, 1.62, 0.54));
  for (const x of [-0.95, 0.75]) for (const z of [-0.5, 0.5]) g.add(box(0.05, 1.1, 0.05, 0x333333, x, 0.6, z));
  g.add(box(0.1, 0.5, 0.9, 0x2a3440, 0.95, 1.0, 0)); // windscreen
  g.add(box(0.05, 0.05, 0.6, 0x111111, 0.62, 1.05, 0)); // handlebar
  const lamp = cyl(0.08, 0.05, 0xfff2c4, 1.06, 0.62, 0, 'x');
  lamp.userData.glow = 1.4;
  g.add(lamp);
  for (const z of [-0.42, 0.42]) { const t = box(0.04, 0.1, 0.12, 0xa8231b, -1.01, 0.4, z); t.userData.glow = 1; t.userData.brake = 1; g.add(t); }
  seated(g, 0.45, 0.72, 0, shirtOf(variant, 5));
  if (variant % 3) seated(g, -0.55, 0.82, 0.2, shirtOf(variant, 6), { scale: 0.8 }); // a passenger
  wheels(g, [-0.7, 0.75], 0.5, 0.36, false);
  bakeVehicle(g);
  return g;
}

/** A motorbike with its rider: helmet, a bag on the tank, a pillion sometimes. */
export function bike(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const paint = vpick([0xd9534f, 0x2b2b2b, 0x2c5f8a, 0xb7b7b7], variant);
  g.add(box(0.9, 0.12, 0.14, 0x333333, 0, 0.42, 0)); // frame
  g.add(box(0.48, 0.24, 0.34, paint, 0.2, 0.62, 0)); // tank
  g.add(box(0.6, 0.1, 0.3, 0x1a1a1a, -0.3, 0.72, 0)); // seat
  g.add(box(0.35, 0.18, 0.22, 0x555555, 0, 0.3, 0)); // engine
  g.add(box(0.5, 0.07, 0.07, 0x9a9a9a, -0.3, 0.28, 0.14)); // exhaust
  g.add(box(0.06, 0.55, 0.06, 0x777777, 0.58, 0.45, -0.07), box(0.06, 0.55, 0.06, 0x777777, 0.58, 0.45, 0.07)); // forks
  g.add(box(0.06, 0.05, 0.7, 0x111111, 0.52, 1.0, 0)); // handlebar
  g.add(box(0.28, 0.08, 0.2, paint, -0.6, 0.62, 0)); // rear mudguard
  const lamp = cyl(0.08, 0.06, 0xfff2c4, 0.66, 0.9, 0, 'x');
  lamp.userData.glow = 1.4;
  const tail = box(0.04, 0.08, 0.14, 0xa8231b, -0.75, 0.62, 0);
  tail.userData.glow = 1; tail.userData.brake = 1;
  g.add(lamp, tail);
  wheel(g, 0.6, 0, 0.6, 0.1);
  wheel(g, -0.58, 0, 0.6, 0.12);
  seated(g, -0.15, 0.98, 0, shirtOf(variant, 2), { helmet: vpick([0xf2f2f2, 0x111111, 0xd9534f, 0xf5c518], variant, 3), scale: 0.9 });
  if (variant % 4 === 1) seated(g, -0.55, 1.0, 0, shirtOf(variant, 7), { scale: 0.85 }); // pillion, no helmet, obviously
  bakeVehicle(g);
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

/** Someone hanging off the footboard at a door: one foot on the step, a hand on the rail, leaning out (local -z). */
function hanger(g: THREE.Group, x: number, shirt: number, lean: number) {
  const p = person(shirt);
  p.position.set(x, 0.3, -BUS_WIDTH / 2 - 0.3);
  p.rotation.set(lean, x > 0 ? -Math.PI / 2.4 : Math.PI / 2.4, 0);
  g.add(p);
}

/**
 * A Kolkata bus: blue-and-white government livery or red-and-yellow private, doors on the left (local -z),
 * a destination board that matches where it's going, a painted slogan, a driver on the right, a conductor at
 * the rear door and up to three people hanging off the footboards.
 */
export function bus(variant: number, towardsSealdah: boolean, hangers = 0): THREE.Group {
  const g = new THREE.Group();
  const govt = variant % 100 < 55;
  const L = BUS_LEN, W = BUS_WIDTH;
  const lower = govt ? 0x2f6db5 : 0xb3262b, upper = govt ? 0xf1efe8 : 0xf2c14e, stripe = govt ? 0xf5c518 : 0x1f7a3a;
  g.add(box(L, 1.3, W, lower, 0, 0.45, 0), box(L, 1.25, W, upper, 0, 1.75, 0));
  g.add(box(L + 0.04, 0.14, W + 0.04, stripe, 0, 1.68, 0), box(L + 0.04, 0.08, W + 0.04, stripe, 0, 1.05, 0));
  g.add(box(L - 0.6, 0.12, W - 0.3, 0xdddddd, 0, 3.0, 0));
  g.add(box(L - 0.2, 0.06, W + 0.08, 0x2a2a2a, 0, 0.42, 0)); // rubbing strip
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
  g.add(box(0.14, 0.22, W + 0.06, 0x1d1d1d, L / 2 + 0.05, 0.3, 0), box(0.14, 0.22, W + 0.06, 0x1d1d1d, -L / 2 - 0.05, 0.3, 0)); // bumpers
  lights(g, L / 2 + 0.03, -L / 2 - 0.03, 0.85, 0.95, true);
  plates(g, L / 2 + 0.1, -L / 2 - 0.1, 0.6);
  for (const z of [-W / 2 - 0.25, W / 2 + 0.25]) g.add(box(0.05, 0.05, 0.3, 0x222222, L / 2 - 0.1, 2.3, z - Math.sign(z) * 0.15), box(0.08, 0.35, 0.12, 0x222222, L / 2 - 0.05, 2.05, z)); // mirrors on arms
  for (const dx of [BUS_FRONT_DOOR, BUS_REAR_DOOR]) {
    g.add(box(1.1, 2.3, 0.1, 0x161616, dx, 0.35, -W / 2 - 0.02)); // open doorway
    g.add(box(1.1, 0.06, 0.35, 0x8a8a8a, dx, 0.3, -W / 2 - 0.15)); // footboard
    g.add(box(0.04, 1.6, 0.04, 0xc8c8c8, dx - 0.5, 0.75, -W / 2 - 0.08), box(0.04, 1.6, 0.04, 0xc8c8c8, dx + 0.5, 0.75, -W / 2 - 0.08)); // grab rails
  }
  for (const x of [-L / 2 + 1.6, L / 2 - 1.8]) for (const z of [-W / 2 + 0.08, W / 2 - 0.08]) {
    wheel(g, x, z, 1.0, 0.3);
    g.add(box(1.25, 0.55, 0.03, 0x1a1a1a, x, 0.62, z + Math.sign(z) * 0.08)); // arch
  }
  seated(g, L / 2 - 1.0, 1.3, W / 2 - 0.55, 0xeeeeee); // the driver, on the right
  const cond = person(0x6b5d4a, { pants: 0x3b3326 });
  cond.position.set(BUS_REAR_DOOR + 0.1, 0.3, -W / 2 - 0.25);
  cond.rotation.set(0.12, Math.PI, 0);
  g.add(cond);
  const at = [BUS_REAR_DOOR - 0.35, BUS_FRONT_DOOR, BUS_FRONT_DOOR + 0.35];
  for (let i = 0; i < Math.min(3, hangers); i++) hanger(g, at[i], shirtOf(variant, 8 + i), 0.18 + i * 0.06);
  bakeVehicle(g);
  // All text in one mesh: board up front, slogan on both sides, "HORN PLEASE" on the back.
  const bg = govt ? '#2f6db5' : '#b3262b', fg = govt ? '#ffffff' : '#ffe680';
  const board = vpick(towardsSealdah ? toSealdah : toSectorV, variant, 2);
  const tex = busTextAtlas(board, vpick(busSlogans, variant, 3), 'HORN PLEASE · OK TATA', bg, fg);
  const parts = [
    quad(2.2, 0.38, 0, L / 2 + 0.07, 2.62, 0, Math.PI / 2),
    quad(5.2, 0.55, 1, -0.4, 0.75, W / 2 + 0.03, 0),
    quad(5.2, 0.55, 1, -0.4, 0.75, -W / 2 - 0.03, Math.PI),
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
  g.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ map: tex })));
  return g;
}
