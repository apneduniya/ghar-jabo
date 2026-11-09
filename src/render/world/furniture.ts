// Junction furniture and landmarks at the surveyed spots (content/streetlife.ts FURNITURE, SIGNS): police
// booths, signals, the PwC More high mast and island, auto stands, the College More shelter under its banyan,
// gateways and the parody shop signs. Boxes are baked with the dressing; boards go into the sign atlas.

import * as THREE from 'three';
import { box, sign } from '../gfx';
import { auto, person, toto } from '../models';
import { FOOTPATH, PWC_BUILDING, SIGNS, STANDEE_AT, STREETS } from '../../content/streetlife';
import { standees, streetAds } from '../../content/text';
import type { MapData } from '../../sim/mapdata';
import type { StreetLayout } from '../../sim/streetlayout';
import { frameAt, kerbOffset, sideNormal, type Placed } from '../../sim/streetlife';
import type { Forest } from './greenery';
import type { Rails } from './kit';

/** A billboard face: brand in big letters, the punchline under it. */
export function adBoard(title: string, line: string, bg: string, fg: string, w = 8, h = 4) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg; g.textAlign = 'center';
  let size = 84;
  g.font = `bold ${size}px system-ui, sans-serif`;
  while (g.measureText(title).width > 480 && size > 30) { size -= 4; g.font = `bold ${size}px system-ui, sans-serif`; }
  g.fillText(title, 256, 120);
  g.font = '30px system-ui, sans-serif';
  g.fillText(line, 256, 190, 490);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
}

const ad = (k: keyof typeof streetAds, w: number, h: number) => { const [a, b, c, d] = streetAds[k]; return adBoard(a, b, c, d, w, h); };

/** A booth with vertical stripes: blue-and-white at PwC More, yellow at Wipro More. */
function booth(g: THREE.Group, a: number, b: number) {
  g.add(box(1.6, 2.4, 1.6, a, 0, 0, 0));
  for (const s of [-1, 1]) for (const k of [-0.5, 0, 0.5]) {
    g.add(box(0.22, 1.2, 0.04, b, k, 0, s * 0.81), box(0.04, 1.2, 0.22, b, s * 0.81, 0, k));
  }
  g.add(box(1.62, 0.6, 1.62, 0x2a3440, 0, 1.4, 0), box(1.9, 0.12, 1.9, a, 0, 2.4, 0));
}

function signal(g: THREE.Group, h = 4.2) {
  for (let k = 0; k < 4; k++) g.add(box(0.14, h / 4, 0.14, k % 2 ? 0xf4f4f0 : 0x222222, 0, (k * h) / 4, 0));
  g.add(box(0.4, 1.1, 0.32, 0x151515, 0, h - 0.2, 0.25));
  [0xff3b2f, 0xffb02e, 0x2ecc71].forEach((c, k) => { const l = box(0.2, 0.2, 0.05, c, 0, h + 0.6 - k * 0.32, 0.42); l.userData.glow = k === 0 ? 2.2 : 0.4; g.add(l); });
}

/** A scooter or motorbike, plain boxes in a few colours (cheaper than the riding bike model). */
function scooter(c: number) {
  const g = new THREE.Group();
  g.add(box(1.5, 0.35, 0.32, c, 0, 0.35, 0), box(0.6, 0.12, 0.3, 0x1b1b1b, -0.2, 0.72, 0), box(0.1, 0.6, 0.5, 0x333333, 0.62, 0.5, 0));
  g.add(box(0.5, 0.5, 0.1, 0x111111, -0.55, 0, 0), box(0.5, 0.5, 0.1, 0x111111, 0.6, 0, 0));
  return g;
}

function spot(g: THREE.Group, s: Placed & { spot: { kind: string; len?: number; text?: string } }, forest: Forest, rails: Rails) {
  const k = s.spot.kind;
  const world = (lx: number, lz: number): [number, number] => [s.x + Math.cos(s.rot) * lx + Math.sin(s.rot) * lz, s.z - Math.sin(s.rot) * lx + Math.cos(s.rot) * lz];
  switch (k) {
    case 'policeBooth': { // SOUTH §3: striped booth on a small fenced island, a lit school ad on its roof
      booth(g, 0xf4f4f0, 0x2456a8);
      const a = ad('booth', 2.2, 1.0); a.position.set(0, 3.1, 0); g.add(a);
      g.add(box(3.6, 0.2, 3.0, 0x9a9a96, 0, 0, 0));
      const c = [world(-1.8, -1.5), world(1.8, -1.5), world(1.8, 1.5), world(-1.8, 1.5)];
      for (let i = 0; i < 4; i++) if (i !== 2) rails.strip(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], 0.2, 1.1, 'barrier');
      break;
    }
    case 'yellowBooth': // NORTH §2: yellow booth covered in ads, red-white barricades nearby
      booth(g, 0xf2c230, 0xe2402c);
      break;
    case 'medianKiosk': { // SOUTH §5: police kiosk in the median, hoarding on top
      booth(g, 0xf4f4f0, 0x2456a8);
      g.add(box(0.12, 1.2, 0.12, 0x555555, 0, 2.4, 0));
      const a = ad('kiosk', 3.0, 1.3); a.position.set(0, 4.2, 0); g.add(a);
      break;
    }
    case 'signal': signal(g); break;
    case 'highMast': { // SOUTH §2: about 20 m, a ring of lamps
      g.add(box(0.6, 4, 0.6, 0x8d9196, 0, 0, 0), box(0.45, 5, 0.45, 0x8d9196, 0, 4, 0), box(0.3, 5.5, 0.3, 0x8d9196, 0, 9, 0));
      g.add(box(2.2, 0.15, 2.2, 0x6b6f74, 0, 14.4, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const l = box(0.5, 0.35, 0.5, 0xfff1c9, Math.cos(a) * 0.9, 14.0, Math.sin(a) * 0.9);
        l.userData.glow = 3;
        g.add(l);
      }
      break;
    }
    case 'lotus': { // NORTH §1: white concrete lotus in the median
      g.add(box(1.6, 0.7, 1.6, 0xe9e6dc, 0, 0.28, 0));
      for (let i = 0; i < 8; i++) {
        const p = box(0.55, 1.3, 0.12, 0xf6f4ee, 0, 0, 0);
        const a = (i / 8) * Math.PI * 2, pg = new THREE.Group();
        p.position.set(0, 0.65, 0.35); p.rotation.x = 0.45; pg.add(p); pg.rotation.y = a; pg.position.y = 0.95; g.add(pg);
      }
      g.add(box(0.6, 1.2, 0.6, 0xf6f4ee, 0, 1.0, 0));
      break;
    }
    case 'busShelter': { // SOUTH §4: curved roof on posts, ad panel at the back, a bench, under a banyan
      for (const x of [-2.6, 2.6]) g.add(box(0.12, 2.6, 0.12, 0x5a5f66, x, 0, -0.7));
      for (let i = 0; i < 5; i++) {
        const r = box(5.8, 0.06, 0.6, 0x6f767e, 0, 2.55 + Math.sin((i / 4) * Math.PI) * 0.35, -1.2 + i * 0.55);
        r.rotation.x = (i - 2) * 0.28; g.add(r);
      }
      const a = ad('shelter', 4.6, 1.6); a.position.set(0, 1.5, -0.95); g.add(a);
      g.add(box(4.2, 0.45, 0.5, 0x8a8f96, 0, 0, -0.45));
      for (let i = 0; i < 3; i++) { const p = person(); p.position.set(-1.4 + i * 1.3, -0.3, -0.4); p.rotation.y = -Math.PI / 2; g.add(p); }
      const [bx, bz] = world(4.5, -3.5);
      forest.rain(bx, bz, 1.35);
      break;
    }
    case 'autoStand': case 'autoQueue': { // yellow-green autos and totos waiting along the kerb
      const n = Math.floor(((s.spot.len ?? 20) * 0.5) / 2.6);
      for (let i = 0; i < n; i++) {
        const v = i % 4 === 3 && k === 'autoStand' ? toto(i) : auto();
        v.position.set(-n * 1.3 + i * 2.6, 0, -0.85); // on the footpath edge, clear of the traffic lane
        v.rotation.y = Math.PI; // parked facing back along the kerb
        g.add(v);
        if (i % 3 === 1) { const p = person(0xf4f4f0); p.position.set(-n * 1.3 + i * 2.6 + 0.4, 0, -2.0); p.rotation.y = Math.PI / 2; g.add(p); }
      }
      if (k === 'autoStand') for (const x of [-n * 0.9, n * 0.6]) { // tarp shacks behind (NORTH §1)
        const z = -FOOTPATH - 1.2;
        g.add(box(2.4, 0.06, 2.2, 0x2f6db5, x, 2.3, z + 0.2), box(0.06, 2.3, 0.06, 0x444444, x - 1.1, 0, z + 1.1), box(0.06, 2.3, 0.06, 0x444444, x + 1.1, 0, z + 1.1));
        g.add(box(1.6, 0.9, 0.6, 0x8a5a3c, x, 0, z - 0.5), box(1.4, 0.42, 0.35, 0x6b4a33, x, 0, z + 0.6));
      }
      break;
    }
    case 'barricades': // NORTH §2: Bidhannagar police barricades, red and white with a blue panel
      for (let i = 0; i < 6; i++) {
        const x = -6 + i * 2.1;
        for (let j = 0; j < 4; j++) g.add(box(0.45, 0.25, 0.12, j % 2 ? 0xf4f4f0 : 0xd9342b, x - 0.68 + j * 0.45, 0.75, 0));
        g.add(box(0.5, 0.3, 0.13, 0x2456a8, x, 0.42, 0), box(0.08, 1.0, 0.5, 0x333333, x - 0.85, 0, 0), box(0.08, 1.0, 0.5, 0x333333, x + 0.85, 0, 0));
      }
      break;
    case 'bikes': { // SOUTH §1: motorbikes parked nose-in along the TIU kerb
      const n = Math.floor(((s.spot.len ?? 40) * 0.5) / 0.95);
      for (let i = 0; i < n; i++) {
        if ((i * 7) % 10 < 3) continue;
        const b = scooter([0x1b1b1b, 0xd9342b, 0x2f6db5, 0xf4f4f0, 0x6b6f74][(i * 3) % 5]);
        b.position.set(-n * 0.47 + i * 0.95, 0, -0.9);
        b.rotation.y = Math.PI / 2 + ((i % 3) - 1) * 0.12;
        g.add(b);
      }
      break;
    }
    case 'archGate': { // SOUTH §1: blue-grey arch on brick pillars, opposite the TIU gate
      for (const x of [-2.9, 2.9]) g.add(box(0.9, 3.4, 0.9, 0xa4553a, x, 0, 0));
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI, seg = box(1.2, 0.45, 0.8, 0x7f93a8, Math.cos(a) * 2.9, 3.4 + Math.sin(a) * 1.1, 0);
        seg.rotation.z = Math.atan2(1.1 * Math.cos(a), -2.9 * Math.sin(a)); g.add(seg); // along the ellipse
      }
      break;
    }
    case 'steelGate': { // SOUTH §4: grey steel gate and a blue board, breaking the stall row
      for (const x of [-3, 3]) g.add(box(0.7, 2.8, 0.7, 0xefe3c4, x, 0, 0));
      const [ax, az] = world(-2.6, 0), [bx, bz] = world(2.6, 0);
      rails.strip(ax, az, bx, bz, 0.05, 2.1, 'sheet', 0x8f969c);
      const b = sign('GOVT. TRAINING INSTITUTE', 5, 0.7, '#1f4f9a', '#ffffff'); b.position.set(0, 3.1, 0.4); g.add(b);
      break;
    }
    case 'portal': { // SOUTH §4: beige concrete gate frame of the Bose Institute campus (~400 m)
      for (const x of [-3.6, 3.6]) g.add(box(1.1, 4.4, 1.1, 0xd8c7a4, x, 0, 0));
      g.add(box(8.4, 1.2, 1.3, 0xd8c7a4, 0, 4.4, 0));
      const b = sign('BOSHU INSTITUTE · বসু-ইশ বিজ্ঞান', 7, 0.8, '#d8c7a4', '#5a3a1a'); b.position.set(0, 5.0, 0.67); g.add(b);
      break;
    }
    case 'portico': { // SOUTH §1: TIU's pillared portico at its south end, palms in front
      for (const x of [-3, -1, 1, 3]) g.add(box(0.5, 3.6, 0.5, 0xf2f2ee, x, 0, 0.8));
      g.add(box(7.6, 0.5, 3.4, 0xe8e8e2, 0, 3.6, 0), box(0.7, 0.7, 0.1, 0xd0281f, -3, 2.4, 1.07));
      const b = sign('TECHNO INDIGO UNIVERSITY', 6.4, 0.6, '#ffffff', '#1f3f8f'); b.position.set(0, 3.85, 1.72); g.add(b);
      for (const lx of [-5, 5]) { const [px, pz] = world(lx, 2.6); forest.palm(px, pz, lx < 0 ? 'coconut' : 'areca'); }
      break;
    }
    case 'tiuGate': { // SOUTH §1: the TIU gate in its blue railing, brick-red pillars (the start)
      for (const x of [-2.6, 2.6]) g.add(box(0.8, 2.6, 0.8, 0xa0452e, x, 0, 0), box(0.95, 0.2, 0.95, 0xd8d2c6, x, 2.6, 0));
      const b = sign('TECHNO INDIGO UNIVERSITY · GATE 1', 4.4, 0.55, '#1f3f8f', '#ffffff'); b.position.set(0, 2.45, 0.42); g.add(b);
      break;
    }
    case 'policeGate': { // SOUTH §4: Electronics Complex police station, a blue arch-board on two posts
      for (const x of [-2.8, 2.8]) g.add(box(0.25, 3.6, 0.25, 0x2456a8, x, 0, 0));
      const b = sign('POLICE STATION · ELECTRONICS COMPLEX', 6, 0.8, '#1f4f9a', '#ffffff'); b.position.set(0, 3.4, 0.15); g.add(b);
      break;
    }
    case 'billboard': { // the island hoarding at PwC More, or a big board on a blue-and-white pole
      const tall = s.spot.text === 'st13';
      for (let i = 0; i < (tall ? 6 : 3); i++) g.add(box(0.3, 1, 0.3, i % 2 ? 0xf4f4f0 : 0x2456a8, 0, 0.28 + i, 0));
      const a = ad(tall ? 'st13' : 'island', tall ? 6 : 2.6, tall ? 3 : 1.4); a.position.set(0, tall ? 7.6 : 3.9, 0.2); g.add(a);
      break;
    }
  }
}

export function buildFurniture(root: THREE.Object3D, map: MapData, layout: StreetLayout, rails: Rails, forest: Forest) {
  for (const s of layout.spots) {
    const g = new THREE.Group();
    spot(g, s, forest, rails);
    g.position.set(s.x, s.spot.where === 'median' ? 0.28 : 0, s.z);
    g.rotation.y = s.rot;
    root.add(g);
  }
  // Parody shop and landmark signs, facing the road.
  for (const t of SIGNS) {
    const f = frameAt(STREETS[t.street], t.at), n = sideNormal(f, t.side), k = kerbOffset(map.roads, f, n) + FOOTPATH + (t.back ?? 0);
    const b = sign(t.text, t.w, t.h, t.bg, t.fg);
    b.position.set(f.x + n[0] * k, t.y, f.z + n[1] * k);
    b.rotation.y = Math.atan2(-n[0], -n[1]);
    root.add(b);
  }
  // TIU standees along its railing.
  STANDEE_AT.forEach((at, i) => {
    const f = frameAt(STREETS.st2, at), n = sideNormal(f, 'W'), k = kerbOffset(map.roads, f, n) + FOOTPATH - 0.5;
    const g = new THREE.Group();
    g.add(box(0.06, 1.9, 0.06, 0x333333, -0.5, 0, 0), box(0.06, 1.9, 0.06, 0x333333, 0.5, 0, 0));
    const b = sign(standees[i % standees.length], 1.1, 1.6, '#1f3f8f', '#ffffff'); b.position.set(0, 1.1, 0.05); g.add(b);
    g.position.set(f.x + n[0] * k, 0, f.z + n[1] * k);
    g.rotation.y = Math.atan2(-n[0], -n[1]);
    root.add(g);
  });
  // The small orange "pwh" on the PwC parapet (SOUTH §3: a low white building, not a tower).
  const pwc = map.buildings.find((b) => b.id === PWC_BUILDING);
  if (pwc) {
    const south = pwc.p.reduce((a, q) => (q[1] > a[1] ? q : a));
    const xs = pwc.p.map((q) => q[0]);
    const b = sign('pwh', 2.2, 0.8, '#ffffff', '#e8601c');
    b.position.set((Math.min(...xs) + Math.max(...xs)) / 2 - 4, pwc.h + 0.5, south[1] + 0.12);
    root.add(b);
  }
}
