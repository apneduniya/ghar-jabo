"""Snapping helpers for tools/build-world.py: put structures where the real ones stand relative to the roads.

- The Green Line (and the Orange Line) run above the median of the roads they follow. OSM draws the viaduct a few
  metres off it, so wherever a metro line runs close to and roughly parallel with a corridor road, its vertices move
  onto that road's median: the midline between the two carriageways of a divided road, or the centre line of a
  single one. Where it crosses a road at an angle, or nothing runs beside it, it's left alone.
- Rail and canal crossings move onto the centre of the road they cross, so the bridge gap lines up with the road.

All coordinates are real game units (x east, z south, 0.5 u per metre).
"""
import math

# A road this close to the line (centre to centre), and this parallel (|cos|), is the one the line follows.
NEAR = 14.0
PARALLEL = 0.94
# Two opposite one-way carriageways this far apart (centre to centre) are one divided road.
PAIR_MAX = 30.0
# A run of snapped samples must be at least this long, and eases in and out over this distance at both ends.
MIN_RUN = 40.0
EASE = 24.0
STEP = 4.0
SNAP_CLS = ('primary', 'secondary', 'tertiary')


def _nearest(p, line):
    """(distance, nearest point, unit direction of that segment)."""
    best = (1e18, None, None)
    for a, b in zip(line, line[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L2 = dx * dx + dz * dz
        if L2 < 1e-9: continue
        t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
        q = [a[0] + dx * t, a[1] + dz * t]
        d = math.dist(p, q)
        if d < best[0]:
            L = math.sqrt(L2)
            best = (d, q, (dx / L, dz / L))
    return best


def _boxed(roads, pad):
    out = []
    for r in roads:
        xs, zs = [q[0] for q in r['p']], [q[1] for q in r['p']]
        out.append((r, (min(xs) - pad, min(zs) - pad, max(xs) + pad, max(zs) + pad)))
    return out


def median_at(p, t, roads, near=NEAR, parallel=PARALLEL):
    """
    The median point of the road running beside p in direction t (unit), or None.
    roads: [(road, bbox)] with road = {'p', 'oneway', ...}. t None: any direction (crossings).
    """
    hits = []
    for r, b in roads:
        if not (b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3]): continue
        d, q, rd = _nearest(p, r['p'])
        if q is None or d > near: continue
        if t is not None and abs(t[0] * rd[0] + t[1] * rd[1]) < parallel: continue
        hits.append((d, q, rd, r))
    if not hits: return None
    hits.sort(key=lambda h: h[0])
    d0, q0, rd0, r0 = hits[0]
    if r0['oneway']:
        # Its opposite carriageway: one-way, heading the other way, on the far side of the median.
        for d1, q1, rd1, r1 in hits[1:]:
            if not r1['oneway'] or rd0[0] * rd1[0] + rd0[1] * rd1[1] > -0.8: continue
            if math.dist(q0, q1) > PAIR_MAX: continue
            return [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2]
    return q0 if d0 < near / 2 else None


def snap_line(pts, roads, keep_out, seg_ok=lambda i: True):
    """
    Moves a polyline's runs that follow a road onto its median. Returns (dense points, old index -> dense index).
    keep_out(p): True where nothing may move (inside the Sector V square). seg_ok(i): False for original segments
    (i to i + 1) that stay put (underground).
    """
    roads = [r for r in roads if r['cls'] in SNAP_CLS and r.get('bridge') != 'flyover']
    boxed = _boxed(roads, NEAR + 1)
    # Densify, remembering where each original vertex went.
    dense, idx, seg, ok = [list(pts[0])], [0], [], [seg_ok(0)]
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        n = max(1, int(math.dist(a, b) / STEP))
        L = math.dist(a, b) or 1
        for k in range(1, n + 1):
            dense.append([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])
            seg.append(((b[0] - a[0]) / L, (b[1] - a[1]) / L))
            ok.append(seg_ok(i))
        idx.append(len(dense) - 1)
    seg = [seg[0]] + seg
    s = [0.0]
    for a, b in zip(dense, dense[1:]): s.append(s[-1] + math.dist(a, b))
    target = [None if keep_out(p) or not ok[i] else median_at(p, seg[i], boxed) for i, p in enumerate(dense)]
    # Smooth the targets a little (the two carriageways' vertices don't line up).
    sm = []
    for i in range(len(dense)):
        win = [target[j] for j in range(max(0, i - 2), min(len(dense), i + 3)) if target[j] is not None]
        sm.append(None if target[i] is None else [sum(q[0] for q in win) / len(win), sum(q[1] for q in win) / len(win)])
    # Runs of consecutive targets, long enough to be a road the line follows.
    out = [list(p) for p in dense]
    i = 0
    while i < len(dense):
        if sm[i] is None: i += 1; continue
        j = i
        while j + 1 < len(dense) and sm[j + 1] is not None: j += 1
        if s[j] - s[i] >= MIN_RUN:
            for k in range(i, j + 1):
                e = min(s[k] - s[i], s[j] - s[k], EASE) / EASE
                w = e * e * (3 - 2 * e)
                out[k] = [dense[k][0] + (sm[k][0] - dense[k][0]) * w, dense[k][1] + (sm[k][1] - dense[k][1]) * w]
        i = j + 1
    return out, idx


def simplify_keeping(pts, keep, tol, simplify):
    """simplify() between the kept indices (they survive); returns (points, old kept index -> new index)."""
    keep = sorted(set([0, len(pts) - 1] + list(keep)))
    res, where = [], {}
    for a, b in zip(keep, keep[1:]):
        part = simplify(pts[a:b + 1], tol)
        where[a] = len(res)
        res += part[:-1]
    where[keep[-1]] = len(res)
    res.append(pts[-1])
    return res, where


def snap_point(p, t, roads, near=12.0):
    """A crossing point moved onto the median of the road through it (heading t), or p if none is near."""
    roads = [r for r in roads if r.get('bridge') != 'flyover' and r['cls'] != 'lane']
    q = median_at(p, t, _boxed(roads, near + 1), near=near, parallel=0.8)
    return [round(q[0], 1), round(q[1], 1)] if q is not None else p
