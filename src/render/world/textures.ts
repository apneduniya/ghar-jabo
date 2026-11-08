// Procedural textures drawn on canvases at load time: no image downloads.
// Facade textures are white-based so each building can be tinted with vertex colours.

import * as THREE from 'three';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** A tiny deterministic noise source so textures look the same every load. */
function rnd(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Worn asphalt: grain, darker patches, tar-sealed cracks and the odd pothole patch. */
export function asphalt() {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rnd(11);
    g.fillStyle = '#5b5960';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 70 + Math.floor(r() * 40);
      g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(45,43,49,${0.06 + r() * 0.08})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(30,29,33,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      let x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 2; i++) {
      g.fillStyle = 'rgba(70,68,74,0.45)'; // tar patches, a shade off the asphalt
      g.fillRect(r() * w, r() * h, 26 + r() * 26, 14 + r() * 16);
    }
  });
}

/** Brick-paved footpath (Kolkata's red/grey pavers). */
export function pavers() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = rnd(5);
    g.fillStyle = '#9a8b7e';
    g.fillRect(0, 0, w, h);
    const bw = 32, bh = 16;
    for (let y = 0; y < h; y += bh) for (let x = -(y / bh % 2) * bw / 2; x < w; x += bw) {
      const v = 150 + Math.floor(r() * 25);
      g.fillStyle = `rgb(${v + 18},${v + 2},${v - 8})`;
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  });
}

/** Yellow-and-black kerb stripes. */
export function kerbStripes() {
  return canvasTex(64, 16, (g) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, 32, 16);
    g.fillStyle = '#1d1d1d'; g.fillRect(32, 0, 32, 16);
  });
}

/** One window bay of a Kolkata residential block: grilled window, green shutters, balcony ledge, an AC box. */
export function facadeResidential() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 118, 128, 10); // floor line
    g.fillStyle = '#d9d2c0'; g.fillRect(14, 96, 100, 10); // balcony ledge
    g.fillStyle = '#4c5a66'; g.fillRect(34, 30, 60, 58); // window
    g.fillStyle = 'rgba(255,214,140,0.85)'; g.fillRect(38, 34, 52, 50); // warm light inside
    g.strokeStyle = '#2b2b2b'; g.lineWidth = 3;
    for (let x = 42; x < 92; x += 10) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 88); g.stroke(); } // grille
    g.fillStyle = '#3f7a4a'; g.fillRect(22, 30, 12, 58); g.fillRect(94, 30, 12, 58); // shutters
    g.fillStyle = '#cfcfcf'; g.fillRect(96, 92, 22, 14); // AC unit
    g.fillStyle = 'rgba(80,60,40,0.18)'; g.fillRect(0, 0, 6, 128); // grime streak
  });
}

/** Older North-Kolkata style bay: tall arched window with louvred shutters. */
export function facadeOld() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 116, 128, 12);
    g.fillStyle = '#3e6b45';
    g.beginPath(); g.moveTo(36, 100); g.lineTo(36, 40); g.arc(64, 40, 28, Math.PI, 0); g.lineTo(92, 100); g.closePath(); g.fill();
    g.strokeStyle = '#2a4a30'; g.lineWidth = 2;
    for (let y = 46; y < 100; y += 6) { g.beginPath(); g.moveTo(36, y); g.lineTo(92, y); g.stroke(); }
    g.fillStyle = 'rgba(255,214,140,0.6)'; g.fillRect(60, 40, 8, 60);
    g.fillStyle = 'rgba(70,50,30,0.25)'; g.fillRect(0, 100, 128, 6);
  });
}

/**
 * Sector V glass tower, one floor by one bay: pale glass between white spandrel bands and fins, a lit panel.
 * Light on purpose: the vertex tint gives the glass its colour (blue-grey by default, peach or teal per building).
 */
export function facadeOffice() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#b4c3cf'; g.fillRect(0, 0, 128, 128);
    const grad = g.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,236,180,0.85)'; g.fillRect(14, 22, 40, 70); // opaque enough for litMask
    g.fillStyle = '#f4f4f2';
    g.fillRect(0, 0, 128, 18); g.fillRect(0, 0, 8, 128); g.fillRect(60, 0, 8, 128); // spandrel and fins
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 18, 128, 3);
  });
}

/** Clad tower (stone, peach or yellow panels, per the vertex tint) with dark vertical glass strips. */
export function facadeClad() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    for (const x of [14, 78]) {
      const grad = g.createLinearGradient(x, 0, x + 36, 128);
      grad.addColorStop(0, '#7d8e9c'); grad.addColorStop(1, '#4f5e6b');
      g.fillStyle = grad; g.fillRect(x, 0, 36, 128);
    }
    g.fillStyle = 'rgba(255,230,170,0.9)'; g.fillRect(78, 30, 36, 60); // a lit floor
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 122, 128, 6); // floor line
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(14, 0, 36, 4); g.fillRect(78, 0, 36, 4);
  });
}

/** Concrete office or government block: a painted band per floor over a ribbon of dark windows. */
export function facadeBlock() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#56626b'; g.fillRect(0, 44, 128, 52); // window ribbon
    g.fillStyle = 'rgba(255,224,160,0.85)'; g.fillRect(20, 50, 36, 40); // a lit office
    g.fillStyle = '#e6e2da'; g.fillRect(0, 38, 128, 8); // sunshade ledge
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 46, 128, 3);
    g.fillStyle = '#c9c4ba'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 44, 4, 52); // mullions
    g.fillStyle = 'rgba(80,60,40,0.12)'; g.fillRect(0, 96, 128, 32); // grime under the sill
  });
}

/** Ground-floor shop bay: a coloured signboard (white, tinted per building), shutter half up, lit inside. */
export function facadeShop() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 34); // signboard (tinted)
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 0; i < 4; i++) g.fillRect(14 + i * 26, 12, 18, 10); // "lettering"
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 34, 128, 94);
    g.fillStyle = 'rgba(255,220,150,0.95)'; g.fillRect(6, 70, 116, 58); // lit shop interior
    g.fillStyle = '#8c8c8c';
    for (let y = 36; y < 70; y += 5) g.fillRect(6, y, 116, 3); // rolled-up shutter
    g.fillStyle = '#2b2b2b'; g.fillRect(0, 34, 6, 94); g.fillRect(122, 34, 6, 94);
  });
}

/** Faded posters for pillars: a strip of overlapping rectangles in Kolkata-poster colours. */
export function posters() {
  return canvasTex(256, 128, (g) => {
    const r = rnd(3);
    g.fillStyle = '#b8b0a6'; g.fillRect(0, 0, 256, 128);
    const cols = ['#e2402c', '#f2c230', '#2f6db5', '#1f8a46', '#ffffff', '#d7a9c9'];
    for (let i = 0; i < 14; i++) {
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.globalAlpha = 0.75;
      g.fillRect(r() * 220, 20 + r() * 70, 30 + r() * 40, 30 + r() * 30);
    }
    g.globalAlpha = 1;
  });
}

/**
 * A night-glow map for a facade: only the warm "lit window" pixels survive, everything else goes black.
 * Used as the emissiveMap so windows light up after dark while walls stay dark.
 */
export function litMask(tex: THREE.Texture) {
  const src = tex.image as HTMLCanvasElement;
  const cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  const g = cv.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const warm = d[i] > 185 && d[i + 1] > 150 && d[i + 2] < 200 && d[i] - d[i + 2] > 40;
    if (!warm) { d[i] = d[i + 1] = d[i + 2] = 0; }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
