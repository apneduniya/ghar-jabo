import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildTree, LEAF_FADE, leafFadeUniform, pickWeighted, SPECIES, TRI_CAP, treeKit, VARIANTS } from './trees';
import { GeoBuf } from './chunkgeo';
import { buildProp } from './chunkprops';
import { Forest } from './greenery';

const arr = (g: THREE.BufferGeometry, a: string) => Array.from(g.getAttribute(a).array as Float32Array);

describe('tree kit', () => {
  it('is deterministic per species and seed, and seeds differ', () => {
    for (const s of SPECIES) {
      const a = buildTree(s, 3), b = buildTree(s, 3), c = buildTree(s, 4);
      expect(arr(a.leaf, 'position')).toEqual(arr(b.leaf, 'position'));
      expect(arr(a.wood, 'color')).toEqual(arr(b.wood, 'color'));
      expect(arr(a.leaf, 'position')).not.toEqual(arr(c.leaf, 'position'));
    }
  });

  it('keeps every variant of every species under its triangle cap', () => {
    for (const s of SPECIES) for (let v = 0; v < VARIANTS; v++) {
      const t = treeKit(s, v);
      expect(t.tris, `${s} ${v}`).toBeLessThanOrEqual(TRI_CAP[s]);
      expect(t.tris, `${s} ${v}`).toBeGreaterThan(60);
    }
  });

  it('stands on the ground at a believable height, with finite, unit normals and colours in range', () => {
    const tall: Record<string, [number, number]> = { rain: [7, 11], neem: [5.5, 8], gulmohar: [5, 7.5], banyan: [9, 14], ashoka: [8.5, 12.5], coconut: [8, 12], areca: [6.5, 10], royal: [9.5, 13] };
    for (const s of SPECIES) for (let v = 0; v < VARIANTS; v++) {
      const t = treeKit(s, v);
      expect(t.height).toBeGreaterThan(tall[s][0]);
      expect(t.height).toBeLessThan(tall[s][1]);
      for (const g of [t.wood, t.leaf]) {
        g.computeBoundingBox();
        expect(g.boundingBox!.min.y).toBeGreaterThan(-0.6);
        const n = g.getAttribute('normal'), c = g.getAttribute('color');
        for (let i = 0; i < n.count; i++) {
          expect(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1)).toBeLessThan(1e-3);
          for (const x of [c.getX(i), c.getY(i), c.getZ(i)]) expect(x >= 0 && x <= 1.2).toBe(true);
        }
      }
      expect(t.wood.boundingBox!.min.y).toBeGreaterThan(-0.05); // a leaning trunk dips its rim a hair
    }
  });

  it('shades crowns darker underneath than on top', () => {
    const t = treeKit('rain', 0), p = t.leaf.getAttribute('position'), c = t.leaf.getAttribute('color');
    let lo = 0, hi = 0, nl = 0, nh = 0;
    t.leaf.computeBoundingBox();
    const { min, max } = t.leaf.boundingBox!, mid = (min.y + max.y) / 2;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < mid) { lo += c.getY(i); nl++; } else { hi += c.getY(i); nh++; }
    expect(hi / nh).toBeGreaterThan((lo / nl) * 1.2);
  });

  it('picks species by weight', () => {
    const mix = { a: 1, b: 3 };
    expect(pickWeighted(mix, 0.1)).toBe('a');
    expect(pickWeighted(mix, 0.5)).toBe('b');
    expect(pickWeighted(mix, 0.9999)).toBe('b');
  });
});

describe('trees in the world', () => {
  it('streamed chunk trees land in the GeoBuf, leaves marked as foliage', () => {
    const buf = new GeoBuf();
    buildProp(buf, { kind: 'tree', x: 10, z: 20, rot: 0 }, 1, () => null);
    buildProp(buf, { kind: 'palm', x: 30, z: 20, rot: 1, v: 2 }, 2, () => null);
    const g = buf.build(), glow = g.getAttribute('glow');
    let foliage = 0;
    for (let i = 0; i < glow.count; i++) if (glow.getX(i) < 0) foliage++;
    expect(foliage).toBeGreaterThan(30);
    expect(foliage).toBeLessThan(glow.count);
    expect(buf.indices / 3).toBeLessThanOrEqual(Math.max(...Object.values(TRI_CAP)) * 2);
  });

  it('bakes the whole Sector V forest into two meshes', () => {
    const f = new Forest(), root = new THREE.Group();
    for (let i = 0; i < 40; i++) { f.rain(i * 9, 0); f.round(i * 9, 20); f.palm(i * 9, 40, (['coconut', 'areca', 'royal'] as const)[i % 3]); }
    f.round(0, 80, 0.45);
    f.build(root);
    expect(root.children.length).toBe(2);
    // The stage bakes its static group: the forest must keep its own wind/near-fade materials.
    expect(root.children.every((m) => m.userData.keep)).toBe(true);
    const tris = root.children.reduce((s, m) => s + ((m as THREE.Mesh).geometry.index!.count / 3), 0);
    expect(tris).toBeLessThan(121 * 360);
  });


  it('leaves between the camera and the player dissolve (the stage drives uLeafFade)', () => {
    // A crown between the chase camera (~11 u back) and the student used to fill the screen beyond 10 u.
    const f = new Forest(), root = new THREE.Group();
    f.rain(0, 0);
    f.build(root);
    const leaf = root.children.map((m) => (m as THREE.Mesh).material as THREE.Material).find((m) => m.customProgramCacheKey() === 'tree-leaf')!;
    const sh = { uniforms: {} as Record<string, unknown>, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
    leaf.onBeforeCompile(sh as never, undefined as never);
    expect(sh.uniforms.uLeafFade).toBe(leafFadeUniform);
    expect(sh.fragmentShader).toContain('uniform float uLeafFade;');
    expect(sh.fragmentShader).toContain(LEAF_FADE);
  });
});
