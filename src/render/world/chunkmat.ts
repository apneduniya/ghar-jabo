// The one material every streamed chunk shares: draws the atlas (chunkatlas.ts) from the existing procedural
// textures, its night-glow twin (lit windows only, like litMask), the text slots, and patches the Lambert shader
// to wrap uvs inside atlas regions. Night glow follows the same `nightUniform` as bakedMat (gfx.ts / sky.ts):
// lit windows, lamps, stall tube lights and signs light up after dark at no extra draw calls.

import * as THREE from 'three';
import { nightUniform, fitFont } from '../gfx';
import { asphalt, facadeBlock, facadeClad, facadeOffice, facadeOld, facadeResidential, facadeShop, kerbStripes, pavers } from './textures';
import { ATLAS_H, ATLAS_W, RECT_COUNT, SIGN_COUNT, TEXT_COLS, TEXT_H, TEXT_ROWS, TEXT_W, TextSlots, Tile, rectUniform, tileRects } from './chunkatlas';
import { streetAds } from '../../content/text';
import { SHOP_SIGNS } from './frontage';
import { addWind, LEAF_FADE, leafFadeUniform } from './trees';
import { TREES } from '../../content/worldgen';

/**
 * Wind sway for the chunk shader's foliage only (glow < 0, see chunkprops.ts): addWind (trees.ts) sways every
 * vertex by height, so its code is lifted out of a stub shader and wrapped in a foliage test.
 */
function foliageWind(sh: { vertexShader: string; uniforms: Record<string, unknown> }) {
  const stub = { vertexShader: '#include <common>\n#include <begin_vertex>', uniforms: sh.uniforms };
  addWind(stub, true, TREES.wind);
  const [decl, sway] = stub.vertexShader.split('#include <begin_vertex>');
  return { decl: decl.replace('#include <common>', ''), sway: `if (glow < 0.0) ${sway.trim()}` };
}

/** Salt Lake house bay: plastered wall, a wide grilled window under a sunshade (chhajja), a plant pot. */
function house(g: CanvasRenderingContext2D) {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, 120, 128, 8);
  g.fillStyle = '#e4ded2'; g.fillRect(16, 26, 96, 9); // chhajja
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(16, 35, 96, 4);
  g.fillStyle = '#4a5560'; g.fillRect(26, 44, 76, 50);
  g.fillStyle = 'rgba(255,218,150,0.88)'; g.fillRect(30, 48, 68, 42); // lit room
  g.strokeStyle = '#ece7dc'; g.lineWidth = 3;
  for (let x = 34; x < 100; x += 11) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x, 94); g.stroke(); }
  g.beginPath(); g.moveTo(26, 69); g.lineTo(102, 69); g.stroke();
  g.fillStyle = '#8a4b2a'; g.fillRect(96, 98, 14, 10); g.fillStyle = '#4f7d3a'; g.fillRect(94, 90, 18, 9); // plant pot
}

/** Market bay: an open front under a tarp, goods stacked on shelves, a lit bulb inside. */
function market(g: CanvasRenderingContext2D) {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3b3b3b'; g.fillRect(6, 30, 116, 98);
  g.fillStyle = 'rgba(255,214,140,0.9)'; g.fillRect(10, 36, 108, 30); // lit inside
  const cols = ['#e2402c', '#f2c230', '#1f8a46', '#2f6db5', '#f08a24', '#d35c8a'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    g.fillStyle = cols[(r * 3 + c) % cols.length]; g.fillRect(12 + c * 15, 70 + r * 14, 12, 10);
  }
  g.fillStyle = '#2f6db5'; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(122, 30); g.lineTo(6, 30); g.fill(); // tarp
  g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < 128; x += 20) g.fillRect(x, 0, 8, 30);
}

function drawBoard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, line: string, bg: string, fg: string) {
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, title, w * 0.9, line ? h * 0.36 : h * 0.42, 9, (s) => `bold ${s}px system-ui, "Noto Sans Bengali", sans-serif`);
  g.fillText(title, x + w / 2, y + (line ? h * 0.38 : h * 0.54));
  if (line) { g.font = `${Math.round(h * 0.15)}px system-ui, sans-serif`; g.fillText(line, x + w / 2, y + h * 0.75, w * 0.92); }
}

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

/** The atlas and its night-glow twin (lit windows warm, signs and plain regions as they are, roads black). */
function drawAtlas() {
  const cv = canvas(ATLAS_W, ATLAS_H), g = cv.getContext('2d')!;
  const rects = tileRects();
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  const blit = (tex: THREE.Texture, tile: number) => {
    const [x, y, w, h] = rects[tile];
    g.drawImage(tex.image as HTMLCanvasElement, x, y, w, h);
    tex.dispose();
  };
  blit(asphalt(), Tile.asphalt); blit(pavers(), Tile.pavers); blit(kerbStripes(), Tile.kerb);
  blit(facadeResidential(), Tile.resi); blit(facadeOld(), Tile.old); blit(facadeOffice(), Tile.office);
  blit(facadeClad(), Tile.clad); blit(facadeBlock(), Tile.block); blit(facadeShop(), Tile.shop);
  const own = (tile: number, draw: (g: CanvasRenderingContext2D) => void) => {
    const [x, y] = rects[tile];
    g.save(); g.translate(x, y); draw(g); g.restore();
  };
  own(Tile.house, house); own(Tile.market, market);
  for (let i = 0; i < SIGN_COUNT; i++) {
    const [text, bg, fg] = SHOP_SIGNS[i % SHOP_SIGNS.length];
    const [x, y, w, h] = rects[Tile.sign0 + i];
    drawBoard(g, x, y, w, h, text, '', bg, fg);
  }
  Object.values(streetAds).forEach(([title, line, bg, fg], i) => {
    const [x, y, w, h] = rects[Tile.ad0 + i];
    drawBoard(g, x, y, w, h, title, line, bg, fg);
  });

  // Glow twin: facades keep only their warm "lit window" pixels; ground goes black; signs and white stay.
  const gcv = canvas(ATLAS_W, ATLAS_H), gg = gcv.getContext('2d')!;
  gg.drawImage(cv, 0, 0);
  for (const t of [Tile.asphalt, Tile.pavers, Tile.kerb]) { const [x, y, w, h] = rects[t]; gg.fillStyle = '#000'; gg.fillRect(x, y, w, h); }
  for (const t of [Tile.resi, Tile.old, Tile.office, Tile.clad, Tile.block, Tile.shop, Tile.house, Tile.market]) {
    const [x, y, w, h] = rects[t];
    const img = gg.getImageData(x, y, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const warm = d[i] > 185 && d[i + 1] > 150 && d[i + 2] < 200 && d[i] - d[i + 2] > 40;
      if (!warm) d[i] = d[i + 1] = d[i + 2] = 0;
    }
    gg.putImageData(img, x, y);
  }
  for (const t of [Tile.ad0, Tile.ad0 + 1, Tile.ad0 + 2, Tile.ad0 + 3, Tile.ad0 + 4]) { const [x, y, w, h] = rects[t]; gg.fillStyle = '#fff'; gg.fillRect(x, y, w, h); }
  return { cv, gcv };
}

function tex(cv: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface ChunkMaterial { material: THREE.MeshLambertMaterial; text: TextSlots; flush(): void; dispose(): void }

export function chunkMaterial(): ChunkMaterial {
  const { cv, gcv } = drawAtlas();
  const map = tex(cv), glowMap = tex(gcv);
  const tcv = canvas(TEXT_W, TEXT_H), tg = tcv.getContext('2d')!;
  tg.fillStyle = '#f6efe0'; tg.fillRect(0, 0, TEXT_W, TEXT_H);
  const textTex = tex(tcv);
  const sw = TEXT_W / TEXT_COLS, sh = TEXT_H / TEXT_ROWS;
  const text = new TextSlots((slot, t, bg, fg) => {
    const x = (slot % TEXT_COLS) * sw, y = Math.floor(slot / TEXT_COLS) * sh;
    drawBoard(tg, x, y, sw, sh, t, '', bg, fg);
  }, TEXT_COLS * TEXT_ROWS);

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, map });
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.uniforms.uLeafFade = leafFadeUniform;
    sh.uniforms.uGlowMap = { value: glowMap };
    sh.uniforms.uText = { value: textTex };
    sh.uniforms.uRects = { value: chunkRects() };
    const wind = foliageWind(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float glow;\nattribute float tile;\nvarying float vGlow;\nvarying float vTile;${wind.decl}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGlow = glow;\nvTile = tile;\n${wind.sway}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNight;
uniform float uLeafFade;
uniform sampler2D uGlowMap;
uniform sampler2D uText;
uniform vec4 uRects[${RECT_COUNT}];
varying float vGlow;
varying float vTile;
vec3 chunkGlow = vec3(0.0);
float hash12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      // Foliage (glow < 0) dissolves between the camera and the player, like greenery.ts; lamp pools (tile pool) only exist at night.
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      int tileId = int(vTile + 0.5);
      if (vGlow < 0.0) { ${LEAF_FADE} }`)
      .replace('#include <map_fragment>', `
      vec2 rep = vMapUv;
      vec4 texel; vec4 glowTexel;
      if (tileId >= ${Tile.text0}) {
        int s = tileId - ${Tile.text0};
        vec4 r = vec4(float(s % ${TEXT_COLS}) / ${TEXT_COLS}.0 + 1.0 / ${TEXT_W}.0, 1.0 - float(s / ${TEXT_COLS} + 1) / ${TEXT_ROWS}.0 + 1.0 / ${TEXT_H}.0,
          1.0 / ${TEXT_COLS}.0 - 2.0 / ${TEXT_W}.0, 1.0 / ${TEXT_ROWS}.0 - 2.0 / ${TEXT_H}.0);
        texel = texture2D(uText, r.xy + clamp(fract(rep), 0.0, 1.0) * r.zw);
        glowTexel = vec4(1.0);
      } else {
        vec4 r = uRects[tileId];
        vec2 a = r.xy + fract(rep) * r.zw;
        vec2 gx = dFdx(rep) * r.zw, gy = dFdy(rep) * r.zw;
        texel = textureGrad(map, a, gx, gy);
        glowTexel = textureGrad(uGlowMap, a, gx, gy);
      }
      diffuseColor *= texel;
      chunkGlow = glowTexel.rgb;
      // Ground glow (lamp pools) is a warm light of its own, not the surface lit up.
      if (tileId <= ${Tile.pavers}) chunkGlow = vec3(1.0, 0.62, 0.3);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      // Lit windows glow warm whatever the wall's tint (like Sector V's emissive 0xffd49a); lamps and signs keep
      // their own colour.
      bool facade = tileId >= ${Tile.resi} && tileId <= ${Tile.market};
      vec3 lit = tileId <= ${Tile.pavers} ? chunkGlow * 0.5 : facade ? vec3(1.0, 0.83, 0.6) * chunkGlow : diffuseColor.rgb * chunkGlow;
      totalEmissiveRadiance += lit * max(vGlow, 0.0) * uNight * 1.6;`);
  };
  material.customProgramCacheKey = () => 'chunk-atlas-v2';

  return {
    material, text,
    flush() { if (text.dirty) { textTex.needsUpdate = true; text.dirty = false; } },
    dispose() { material.dispose(); map.dispose(); glowMap.dispose(); textTex.dispose(); },
  };
}

function chunkRects() {
  const flat = rectUniform(), out: THREE.Vector4[] = [];
  for (let i = 0; i < RECT_COUNT; i++) out.push(new THREE.Vector4(flat[i * 4], flat[i * 4 + 1], flat[i * 4 + 2], flat[i * 4 + 3]));
  return out;
}
