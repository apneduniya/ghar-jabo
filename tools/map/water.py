"""Water that blocks walking: closed rings clipped to the play square plus a margin.

The Keshtopur canal is one long natural=water polygon (about 8 km); only the part near the square is kept.
Where OSM squeezes the canal narrower than MIN_W (the banks are snapped to the Street 13 bridges), small
octagons along the local centreline widen it, so the collision mask has no walkable gap. Storage tanks are not water.
"""
import math
from geo import HALF, SCALE, clip_square, ring_of, signed_area, simplify_ring

MIN_W = 12 * SCALE        # minimum canal width, game units (12 m)
SAMPLE = 1.5              # bank sampling step, game units
ARC_GAP = 25              # a point this far along the outline is the "other bank", not a neighbour
PATCH_STEP = 2.0          # spacing between widening octagons (radius ~3.25), so they overlap into one strip


def is_water(t):
    if t.get('man_made') == 'storage_tank': return False
    return t.get('natural') == 'water' or t.get('water') in ('canal', 'river', 'pond', 'lake', 'reservoir', 'basin')


def octagon(c, r):
    return [[round(c[0] + r * math.cos(a), 1), round(c[1] + r * math.sin(a), 1)] for a in (k * math.pi / 4 + math.pi / 8 for k in range(8))]


def narrow_patches(ring, clip_r):
    """Octagons of diameter MIN_W centred between the banks wherever the ring is narrower than MIN_W.

    Each bank sample looks for the nearest point of the outline that is at least ARC_GAP away along the outline
    (so its own bank doesn't count). Edges made by clipping aren't banks and are ignored on both sides."""
    n = len(ring)
    on_clip = lambda a, b: (abs(abs(a[0]) - clip_r) < 0.05 and abs(a[0] - b[0]) < 0.05) or (abs(abs(a[1]) - clip_r) < 0.05 and abs(a[1] - b[1]) < 0.05)
    seg_arc, s = [], 0.0
    for i in range(n):
        seg_arc.append(s); s += math.dist(ring[i], ring[(i + 1) % n])
    total = s
    samples = []
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        if on_clip(a, b): continue
        L = math.dist(a, b)
        k = max(1, int(L / SAMPLE))
        for j in range(k): samples.append(((a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k), seg_arc[i] + L * j / k))
    patches = []
    for p, sp in samples:
        best, bq = 1e9, None
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            if on_clip(a, b): continue
            dx, dz = b[0] - a[0], b[1] - a[1]
            L2 = dx * dx + dz * dz or 1e-9
            t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
            sa = abs(seg_arc[i] + t * math.sqrt(L2) - sp)
            if min(sa, total - sa) < ARC_GAP: continue        # its own bank
            q = (a[0] + dx * t, a[1] + dz * t)
            d = math.dist(p, q)
            if d < best: best, bq = d, q
        if bq and best < MIN_W:
            c = ((p[0] + bq[0]) / 2, (p[1] + bq[1]) / 2)
            if abs(c[0]) > HALF or abs(c[1]) > HALF: continue   # only where you can walk

            if all(math.dist(c, q) > PATCH_STEP for q in patches): patches.append(c)
    return [octagon(c, MIN_W / 2 + 0.25) for c in patches]


def build(elements, clip_r):
    """Water rings (clipped) plus min-width patches. Returns (rings, names, report)."""
    rings, report = [], []
    for e in elements:
        t = e.get('tags', {})
        if e['type'] != 'way' or 'geometry' not in e or not is_water(t): continue
        raw = ring_of(e['geometry'])
        if len(raw) < 3: continue
        if not any(abs(p[0]) <= clip_r and abs(p[1]) <= clip_r for p in raw):
            # a ring can still cross the clip square without a vertex inside; test edges against the square
            if not any(_crosses_square(raw[i - 1], raw[i], clip_r) for i in range(len(raw))): continue
        clipped = clip_square(raw, clip_r)
        if len(clipped) < 3 or abs(signed_area(clipped)) < 4: continue
        ring = simplify_ring(clipped, 0.4)
        patches = narrow_patches(clipped, clip_r)
        rings.append(ring)
        rings.extend(patches)
        report.append(f'water w{e["id"]} {t.get("name", "")}: {len(raw)} -> {len(ring)} pts clipped, {len(patches)} min-width patches')
    return rings, report


def _crosses_square(a, b, r):
    # cheap test: sample the segment
    for k in range(21):
        x, z = a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20
        if abs(x) <= r and abs(z) <= r: return True
    return False


def segs_cross(p1, p2, q1, q2):
    def o(a, b, c): return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    d1, d2, d3, d4 = o(q1, q2, p1), o(q1, q2, p2), o(p1, p2, q1), o(p1, p2, q2)
    return (d1 > 0) != (d2 > 0) and (d3 > 0) != (d4 > 0)


def crossings(roads, rings):
    """Roads whose centre line crosses a water outline without a bridge flag (would block walking along them)."""
    out = []
    for r in roads:
        if r['b'] or r['k'] == 'service': continue
        for a, b in zip(r['p'], r['p'][1:]):
            if any(segs_cross(a, b, ring[i - 1], ring[i]) for ring in rings for i in range(len(ring))):
                out.append((r['n'] or r['k'], a, b)); break
    return out
