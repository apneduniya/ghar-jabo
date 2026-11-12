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


# --- Divided roads: pull overlapping carriageways apart (task 029) -------------------------------------------------
# OSM draws each carriageway of a divided road on its own centre line, at its real spacing, but the game draws roads
# at about twice real width (as the Sector V map does, so vehicles fit). So the two carriageways of the Bypass, APC Rd,
# CIT Rd, KNI Avenue and the Salt Lake avenues overlap, and whatever stands in the median lands in a lane. `separate`
# moves each road sideways, vertex by vertex, until no two roughly parallel roads overlap and opposite carriageways
# keep a real median between their inner edges. The move of each vertex is kept (`off`, real units), so the timed
# warp can keep the spacing true while it squeezes positions (src/sim/gen/roadwarp.ts).
SEP_STEP = 8.0          # densify roads to at most this, so the move can vary along them
SEP_PARALLEL = 0.92     # |cos| of the angle between two roads that run side by side
SEP_SLOPE = 0.35        # the move grows at most this much per unit along a road (from a vertex that can't move)
SEP_MAX = 9.0           # never move a road further than this
SEP_GAP_SAME = 1.0      # two roads side by side the same way (a ramp beside the at-grade road): kerb to kerb
SEP_GAP_DECK = 1.4      # beside a flyover deck (its parapet stands 0.6 out)


def _key(q): return (round(q[0], 1), round(q[1], 1))


def _densify(p, step):
    out = [list(p[0])]
    for a, b in zip(p, p[1:]):
        n = max(1, math.ceil(math.dist(a, b) / step))
        out += [[a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n] for k in range(1, n)]
        out.append(list(b))
    return out


def _tangent(p, k):
    a, b = p[max(0, k - 1)], p[min(len(p) - 1, k + 1)]
    L = math.dist(a, b) or 1
    return ((b[0] - a[0]) / L, (b[1] - a[1]) / L)


def separate(roads, fixed, median, iters=40):
    """
    roads: net roads ({'p', 'w', 'cls', 'oneway', 'bridge'?}); 'lane' roads (walks) take no part. Moves 'p' in
    place and sets r['off']: per vertex, the move [dx, dz] or None. fixed(q): True for a vertex that must stay (on
    the Sector V square's edge, where the real map's road continues it). median(q): the gap kept between the inner
    edges of two opposite carriageways near q.
    A vertex shared by several roads (a junction, or where one way continues another) moves as one; where the
    roads at it want opposite moves (the end of a median, where the two carriageways meet), it stays put and the
    moves ease in from it.
    """
    # The surveyed Sealdah walk-in (a hawker lane) stays where it is, and flyover decks keep off it.
    # Roundabouts (closed rings) keep their shape: the roads at them move, they don't.
    act = [r for r in roads if (r['cls'] != 'lane' or r.get('hawkers')) and not ring(r)]
    for r in act:
        if r['cls'] != 'lane': r['p'] = _densify(r['p'], SEP_STEP)
    base = [[list(q) for q in r['p']] for r in act]
    keys = [[_key(q) for q in r['p']] for r in act]
    V = {k: [0.0, 0.0] for ks in keys for k in ks}
    on_ring = {_key(q) for r in roads if ring(r) for q in r['p']}
    pin = {k for i, ks in enumerate(keys) for k, q in zip(ks, base[i]) if fixed(q) or act[i]['cls'] == 'lane' or k in on_ring}
    edge = {k for i, ks in enumerate(keys) for k, q in zip(ks, base[i]) if fixed(q) or k in on_ring}
    owners = {}
    for i, ks in enumerate(keys):
        for k in ks: owners.setdefault(k, set()).add(i)
    C = 24.0

    for it in range(iters):
        pos = [[[q[0] + V[k][0], q[1] + V[k][1]] for q, k in zip(base[i], keys[i])] for i in range(len(act))]
        grid = {}
        for i, p in enumerate(pos):
            for k in range(1, len(p)):
                a, b = p[k - 1], p[k]
                for cx in range(math.floor(min(a[0], b[0]) / C), math.floor(max(a[0], b[0]) / C) + 1):
                    for cz in range(math.floor(min(a[1], b[1]) / C), math.floor(max(a[1], b[1]) / C) + 1):
                        grid.setdefault((cx, cz), []).append((i, k))
        want = {}
        worst = 0.0
        for i, p in enumerate(pos):
            ri = act[i]
            for k, q in enumerate(p):
                t = _tangent(p, k)
                n = (-t[1], t[0])
                cx, cz = math.floor(q[0] / C), math.floor(q[1] / C)
                best = {}
                for gx in (cx - 1, cx, cx + 1):
                    for gz in (cz - 1, cz, cz + 1):
                        for j, m in grid.get((gx, gz), ()):
                            if j == i: continue
                            a, b = pos[j][m - 1], pos[j][m]
                            dx, dz = b[0] - a[0], b[1] - a[1]
                            L2 = dx * dx + dz * dz
                            if L2 < 1e-9: continue
                            s = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L2))
                            c = [a[0] + dx * s, a[1] + dz * s]
                            d = math.dist(q, c)
                            if j not in best or d < best[j][0]: best[j] = (d, c, (dx / math.sqrt(L2), dz / math.sqrt(L2)), s, m)
                hi = lo = 0.0  # the largest push to either side, along n
                for j, (d, c, tj, s, m) in best.items():
                    rj = act[j]
                    dot = t[0] * tj[0] + t[1] * tj[1]
                    if abs(dot) < SEP_PARALLEL: continue
                    # The other road continues this one (or joins it) at a shared vertex: that's a junction.
                    if keys[i][k] in owners and j in owners[keys[i][k]]: continue
                    if (s <= 0 or s >= 1) and d < 0.5: continue
                    deck = ri.get('bridge') == 'flyover' or rj.get('bridge') == 'flyover'
                    walk = ri['cls'] == 'lane' or rj['cls'] == 'lane'
                    gap = SEP_GAP_DECK if deck else 0.3 if walk else SEP_GAP_SAME if dot > 0 or not (ri['oneway'] and rj['oneway']) else median(q)
                    need = (ri['w'] + rj['w']) / 2 + gap
                    if d >= need: continue
                    worst = max(worst, need - d)
                    side = n[0] * (q[0] - c[0]) + n[1] * (q[1] - c[1])
                    sg = 1.0 if side > 1e-6 else -1.0 if side < -1e-6 else (1.0 if i < j else -1.0)
                    amt = (need - d) / 2 * sg
                    hi, lo = max(hi, amt), min(lo, amt)
                kk = keys[i][k]
                if hi or lo: want.setdefault(kk, []).append([n[0] * (hi + lo), n[1] * (hi + lo)])
        if worst < 0.05: break
        for kk, ps in want.items():
            if kk in pin: continue
            mx, mz = sum(v[0] for v in ps) / len(ps), sum(v[1] for v in ps) / len(ps)
            # Opposite wishes at one vertex: the two roads meet here (a median's end). It stays put.
            if any(a[0] * b[0] + a[1] * b[1] < 0 for a in ps for b in ps):
                pin.add(kk); V[kk] = [0.0, 0.0]; continue
            V[kk] = [V[kk][0] + mx * 0.8, V[kk][1] + mz * 0.8]
        # Smooth the moves along each road (neighbouring vertices are pushed by different bits of the other road),
        # then ease in from the vertices that can't move, and cap the move.
        for _ in range(3):
            nv = {}
            for i, ks in enumerate(keys):
                for k in range(1, len(ks) - 1):
                    a, b, c = V[ks[k - 1]], V[ks[k]], V[ks[k + 1]]
                    nv.setdefault(ks[k], []).append([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4])
            for kk, vs in nv.items():
                if len(vs) == len(owners[kk]): V[kk] = [sum(v[0] for v in vs) / len(vs), sum(v[1] for v in vs) / len(vs)]
        for kk in pin: V[kk] = [0.0, 0.0]
        for _ in range(2):
            for i, ks in enumerate(keys):
                for order in (range(1, len(ks)), range(len(ks) - 2, -1, -1)):
                    for k in order:
                        prev = k - 1 if order.step == 1 else k + 1
                        lim = min(SEP_MAX, math.hypot(*V[ks[prev]]) + SEP_SLOPE * math.dist(base[i][k], base[i][prev]))
                        m = math.hypot(*V[ks[k]])
                        if m > lim: V[ks[k]] = [V[ks[k]][0] * lim / m, V[ks[k]][1] * lim / m]
    # Unmoved vertices keep their exact values (a road's end on the square edge is bit-identical to the map's).
    for i, r in enumerate(act):
        r['p'] = [[round(q[0] + V[k][0], 1), round(q[1] + V[k][1], 1)] if V[k] != [0.0, 0.0] else q for q, k in zip(base[i], keys[i])]
    # Roads that take no part but end on a moved vertex (a walk's end on a road) follow it.
    for r in roads:
        if r['cls'] == 'lane' and not r.get('hawkers'):
            r['p'] = [[round(q[0] + V[_key(q)][0], 1), round(q[1] + V[_key(q)][1], 1)] if _key(q) in V else q for q in r['p']]
    pair_offsets(roads, edge, median)


OFF_SLOPE = 0.3  # a pair's offsets grow at most this much per unit from where the pair ends
RING_CLEAR = 24.0  # no pair offsets this close to a roundabout
JUNCTION_CLEAR = 6.0  # ... or to a junction of three or more roads
SEP_PAIR = 8.0  # a parallel road whose kerb is this close is this one's pair (the other carriageway, a ramp beside it)


def ring(r): return len(r['p']) > 3 and math.dist(r['p'][0], r['p'][-1]) < 0.5


def pair_offsets(roads, pin, median):
    """
    Sets r['off'] on each road: per vertex, its offset (real units) from the middle of it and the parallel road
    beside it (its pair), or None. The timed warp squeezes the middle line like any position but adds the offset at
    true length, so a divided road keeps its true spacing (src/sim/gen/roadwarp.ts). A vertex shared by several roads
    gets one offset; the offsets ease to nothing toward vertices with no pair (and the pinned ones), at SEP_SLOPE.
    """
    act = [r for r in roads if r['cls'] != 'lane' and not ring(r)]
    rings = [q for r in roads if ring(r) for q in r['p']]
    keys = [[_key(q) for q in r['p']] for r in act]
    owners = {}
    for i, ks in enumerate(keys):
        for k in ks: owners.setdefault(k, set()).add(i)
    # Junctions (three or more road ends or crossings at a vertex): their roads meet there as the warp puts them.
    pos = {k: q for i, ks in enumerate(keys) for k, q in zip(ks, act[i]['p'])}
    junctions = [pos[k] for k, o in owners.items() if len(o) >= 3]
    O = {}
    boxes = [(min(q[0] for q in r['p']), min(q[1] for q in r['p']), max(q[0] for q in r['p']), max(q[1] for q in r['p'])) for r in act]
    for i, r in enumerate(act):
        p = r['p']
        for k, q in enumerate(p):
            kk = keys[i][k]
            # Near a roundabout the warp squeezes the ring to a few units: the roads at it meet it unmoved.
            if kk in pin or any(math.dist(q, c) < RING_CLEAR for c in rings) or any(math.dist(q, c) < JUNCTION_CLEAR for c in junctions):
                O[kk] = [0.0, 0.0]; pin.add(kk); continue
            t = _tangent(p, k)
            near = []  # (score, distance, nearest point) of each road running beside this one
            for j, o in enumerate(act):
                if j == i or j in owners[kk]: continue
                bx, R = boxes[j], (r['w'] + o['w']) / 2 + SEP_PAIR
                if q[0] < bx[0] - R or q[0] > bx[2] + R or q[1] < bx[1] - R or q[1] > bx[3] + R: continue
                d, c, tj = _nearest(q, o['p'])
                if c is None or abs(t[0] * tj[0] + t[1] * tj[1]) < SEP_PARALLEL: continue
                if d > R or d < 0.5: continue
                # The other carriageway of the same road comes first (not a slip road that runs between them).
                twin = r.get('name') and o.get('name') == r.get('name') and t[0] * tj[0] + t[1] * tj[1] < 0
                deck = r.get('bridge') == 'flyover' or o.get('bridge') == 'flyover'
                gap = SEP_GAP_DECK if deck else median(q) if twin else SEP_GAP_SAME
                near.append((d - (100 if twin else 0), d, c, (r['w'] + o['w']) / 2 + gap))
            if not near: O.setdefault(kk, [0.0, 0.0]); continue
            near.sort(key=lambda h: h[0])
            c, need = near[0][2], near[0][3]
            v = [(q[0] - c[0]) / 2, (q[1] - c[1]) / 2]
            # Only as much as keeps the two apart (half the spacing they need): roads further apart than that may
            # come closer in timed like everything else, and a junction's roads stay where the warp puts them.
            m = math.hypot(*v)
            if m > need / 2: v = [v[0] * need / 2 / m, v[1] * need / 2 / m]
            # Another road beside it on the side the offset moves it toward: the warp would bring the two together
            # (three roads side by side). There it keeps no offset: they squeeze together rather than cross.
            if any((h[2][0] - q[0]) * v[0] + (h[2][1] - q[1]) * v[1] > 0 for h in near[1:]):
                O[kk] = [0.0, 0.0]; pin.add(kk); continue
            prev = O.get(kk)
            # Shared (a side road ending on a carriageway): the carriageway's offset; opposite wishes: none.
            if prev is None or (prev[0] * v[0] + prev[1] * v[1] >= 0 and math.hypot(*v) > math.hypot(*prev)): O[kk] = v
            elif prev[0] * v[0] + prev[1] * v[1] < 0: O[kk] = [0.0, 0.0]; pin.add(kk)
    # Smooth along each road: where the nearest parallel road changes from one vertex to the next (a slip road
    # starts), the offset must not jump, or the warped road would kink.
    for _ in range(4):
        nv = {}
        for i, ks in enumerate(keys):
            for k in range(len(ks)):
                a, b, c = O[ks[max(0, k - 1)]], O[ks[k]], O[ks[min(len(ks) - 1, k + 1)]]
                nv.setdefault(ks[k], []).append([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4])
        for kk, vs in nv.items():
            if kk not in pin: O[kk] = [sum(v[0] for v in vs) / len(vs), sum(v[1] for v in vs) / len(vs)]
    for _ in range(2):
        for i, ks in enumerate(keys):
            for order in (range(1, len(ks)), range(len(ks) - 2, -1, -1)):
                for k in order:
                    prev = k - 1 if order.step == 1 else k + 1
                    lim = math.hypot(*O[ks[prev]]) + OFF_SLOPE * math.dist(act[i]['p'][k], act[i]['p'][prev])
                    m = math.hypot(*O[ks[k]])
                    if m > lim: O[ks[k]] = [O[ks[k]][0] * lim / m, O[ks[k]][1] * lim / m]
    for r in roads:
        off = [O.get(_key(q)) for q in r['p']]
        off = [[round(o[0], 2), round(o[1], 2)] if o and math.hypot(*o) > 0.05 else None for o in off]
        if any(off): r['off'] = off
        else: r.pop('off', None)
