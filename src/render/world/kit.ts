// The street kit's see-through parts: iron railings on compound walls, blue footpath barriers, white stall
// railings, the green pipe railing on Street 2's median, the white balustrade near College More and corrugated
// hoardings. All are quads on one alpha-tested atlas, so every railing on the map is a single draw call.

import * as THREE from 'three';

export type Band = 'iron' | 'barrier' | 'tube' | 'pipe' | 'baluster' | 'sheet' | 'spear';
const BANDS: Band[] = ['iron', 'barrier', 'tube', 'pipe', 'baluster', 'sheet', 'spear'];
const BAND_H = 64, W = 256, H = 512;

/** World units of railing per texture repeat. */
const TILE: Record<Band, number> = { iron: 1.6, barrier: 2.4, tube: 2.4, pipe: 2.4, baluster: 1.6, sheet: 2, spear: 1.6 };

function atlas() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const band = (b: Band, draw: (y: number) => void) => { const y = BANDS.indexOf(b) * BAND_H; g.save(); draw(y); g.restore(); };
  // Iron railing: vertical bars between two rails (white, so the vertex colour tints it black or red-brown).
  band('iron', (y) => {
    g.fillStyle = '#fff';
    g.fillRect(0, y + 4, W, 5); g.fillRect(0, y + BAND_H - 10, W, 5);
    for (let x = 4; x < W; x += 16) g.fillRect(x, y + 4, 4, BAND_H - 8);
  });
  // Spear-top railing (TIU's blue railing): bars with points above the top rail.
  band('spear', (y) => {
    g.fillStyle = '#fff';
    g.fillRect(0, y + 14, W, 5); g.fillRect(0, y + BAND_H - 8, W, 5);
    for (let x = 6; x < W; x += 16) {
      g.fillRect(x, y + 8, 4, BAND_H - 12);
      g.beginPath(); g.moveTo(x - 2, y + 9); g.lineTo(x + 2, y + 1); g.lineTo(x + 6, y + 9); g.fill();
    }
  });
  // Blue pedestrian barrier: blue posts, two pale rails.
  band('barrier', (y) => {
    g.fillStyle = '#e6e9ec'; g.fillRect(0, y + 8, W, 7); g.fillRect(0, y + 30, W, 6);
    g.fillStyle = '#2456a8'; g.fillRect(0, y + 4, 10, BAND_H - 6); g.fillRect(W / 2, y + 4, 10, BAND_H - 6);
    g.fillRect(0, y + 4, W, 4);
  });
  // White tubular railing in front of stalls: top and middle rails, a few posts.
  band('tube', (y) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, y + 6, W, 6); g.fillRect(0, y + 30, W, 5);
    for (let x = 0; x < W; x += 64) g.fillRect(x + 2, y + 6, 6, BAND_H - 8);
    for (let x = 32; x < W; x += 64) g.fillRect(x + 2, y + 12, 3, 22);
  });
  // Green "bamboo" pipe railing: three rails and X braces.
  band('pipe', (y) => {
    g.strokeStyle = '#3aa04a'; g.lineWidth = 6;
    for (const r of [8, 28, 48]) { g.beginPath(); g.moveTo(0, y + r); g.lineTo(W, y + r); g.stroke(); }
    for (let x = 0; x < W; x += 128) {
      g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 128, y + 48); g.moveTo(x, y + 48); g.lineTo(x + 128, y + 8); g.stroke();
      g.fillStyle = '#2f8a3c'; g.fillRect(x, y + 2, 8, BAND_H - 4);
    }
  });
  // White concrete balusters under a top rail.
  band('baluster', (y) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, y + 2, W, 9); g.fillRect(0, y + BAND_H - 8, W, 7);
    for (let x = 0; x < W; x += 32) {
      g.beginPath();
      g.moveTo(x + 10, y + 11); g.lineTo(x + 22, y + 11);
      g.quadraticCurveTo(x + 18, y + 26, x + 27, y + 40); g.quadraticCurveTo(x + 22, y + 54, x + 22, y + 56);
      g.lineTo(x + 10, y + 56); g.quadraticCurveTo(x + 10, y + 54, x + 5, y + 40); g.quadraticCurveTo(x + 14, y + 26, x + 10, y + 11);
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < W; x += 32) g.fillRect(x + 18, y + 14, 3, 40);
  });
  // Corrugated sheet: opaque ridges (tinted by the vertex colour).
  band('sheet', (y) => {
    for (let x = 0; x < W; x += 8) { g.fillStyle = x % 16 ? '#ffffff' : '#cfd4da'; g.fillRect(x, y, 8, BAND_H); }
    g.fillStyle = 'rgba(120,70,40,0.25)'; g.fillRect(0, y + BAND_H - 10, W, 10);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  // No mipmaps: they would bleed between bands and fade the thin bars out under the alpha test.
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/** Collects railing quads; `mesh()` returns them as one alpha-tested, double-sided, vertex-coloured mesh. */
export class Rails {
  private pos: number[] = []; private nor: number[] = []; private uv: number[] = []; private col: number[] = [];

  /** A vertical strip from (ax, az) to (bx, bz), y0..y1, using one band of the atlas. */
  strip(ax: number, az: number, bx: number, bz: number, y0: number, y1: number, band: Band, color = 0xffffff) {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.05) return;
    const b = BANDS.indexOf(band);
    const v0 = 1 - ((b + 1) * BAND_H - 1) / H, v1 = 1 - (b * BAND_H + 1) / H;
    const u1 = L / TILE[band];
    const nx = (bz - az) / L, nz = -(bx - ax) / L;
    const c = new THREE.Color(color);
    const P = [[ax, y0, az, 0, v0], [bx, y0, bz, u1, v0], [bx, y1, bz, u1, v1], [ax, y0, az, 0, v0], [bx, y1, bz, u1, v1], [ax, y1, az, 0, v1]];
    for (const [x, y, z, u, v] of P) { this.pos.push(x, y, z); this.nor.push(nx, 0, nz); this.uv.push(u, v); this.col.push(c.r, c.g, c.b); }
  }

  /** A strip along a polyline of points (e.g. a median edge). */
  along(p: [number, number][], y0: number, y1: number, band: Band, color?: number) {
    for (let i = 1; i < p.length; i++) this.strip(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], y0, y1, band, color);
  }

  mesh() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: atlas(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    m.userData.keep = true; // not for bake(): it has its own texture
    return m;
  }
}
