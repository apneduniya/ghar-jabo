"""Builds public/data/world.json (the streamed world's real network, `WorldNet` in src/sim/gen/types.ts) from
research/routes/corridors.json and the raw OSM extracts beside it. Map data (c) OpenStreetMap contributors, ODbL.

Real coordinates in game units (tools/map/geo.py to_game: x east, z south, 0.5 u per metre, origin PwC More).
Nothing inside the Sector V square (|x|, |z| <= 360) is emitted: the real map (public/data/sectorv.json) owns it.
Corridor roads that leave the square start exactly where the real map's road crosses the square edge, computed
with the same formula as src/sim/gen/clip.ts (squareCut), so both sides meet at bit-identical points.

Run: python3 -I tools/build-world.py
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, 'map'))
sys.path.insert(0, HERE)
from geo import HALF, simplify, simplify_ring, to_game, signed_area, point_in  # noqa: E402
from world_snap import simplify_keeping, snap_line, snap_point  # noqa: E402

RES = os.path.join(ROOT, 'research', 'routes')
OUT = os.path.join(ROOT, 'public', 'data', 'world.json')
MAP = os.path.join(ROOT, 'public', 'data', 'sectorv.json')


def load(name):
    with open(os.path.join(RES, name)) as f: return json.load(f)


def g(lat, lon):
    """Game coords, unrounded."""
    return to_game(lat, lon, nd=9)


def r1(p): return [round(p[0], 1), round(p[1], 1)]
def cheb(p): return max(abs(p[0]), abs(p[1]))
def inside(p): return cheb(p) <= HALF


def square_cut(a, b):
    """Where segment a (inside) -> b (outside) crosses the square edge. Mirrors squareCut in src/sim/gen/clip.ts."""
    t = 1.0
    for k in (0, 1):
        if abs(b[k]) > HALF:
            e = HALF if b[k] > 0 else -HALF
            tk = (e - a[k]) / (b[k] - a[k])
            if tk < t: t = tk
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]


def seg_d(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dz * dz or 1e-9
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
    return math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1])


def line_d(p, line): return min(seg_d(p, a, b) for a, b in zip(line, line[1:]))


def length(pts): return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))


def samples(pts, step):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.dist(a, b) / step))
        out += [[a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n] for i in range(1, n + 1)]
    return out


def bbox(pts, pad=0):
    xs, zs = [p[0] for p in pts], [p[1] for p in pts]
    return (min(xs) - pad, min(zs) - pad, max(xs) + pad, max(zs) + pad)


def boxes_meet(a, b): return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


corr = load('corridors.json')
osm_roads = {e['id']: e for e in load('osm-roads.json')['elements'] if e['type'] == 'way'}
minor = {e['id']: e for e in load('osm-minor-roads.json')['elements'] if e['type'] == 'way'}
forecourt = {e['id']: e for e in load('osm-sealdah-forecourt.json')['elements'] if e['type'] == 'way' and 'geometry' in e}
ways = {**forecourt, **minor, **osm_roads}
railwater = load('osm-rail-water.json')['elements']
corridor_lines = {c['id']: [p['game'] for p in c['polyline']] for c in corr['corridors']}
all_lines = list(corridor_lines.values())

# --- Roads --------------------------------------------------------------------------------------------------
CLS = {'motorway': 'primary', 'trunk': 'primary', 'primary': 'primary', 'secondary': 'secondary', 'tertiary': 'tertiary',
       'residential': 'residential', 'unclassified': 'residential', 'service': 'residential', 'living_street': 'lane',
       'pedestrian': 'lane', 'footway': 'lane', 'gap': 'lane'}
WIDTH = {'primary': 9, 'secondary': 7, 'tertiary': 5, 'residential': 3.4, 'lane': 2.6}  # carriageway, as the real map
LANES = {'primary': 3, 'secondary': 2, 'tertiary': 2, 'residential': 2, 'lane': 1}


def cls_of(hw): return CLS.get(hw.replace('_link', ''), 'residential')


used = {}
for c in corr['corridors']:
    for s in c['segments']:
        if s['mode'] != 'drive': continue
        for w in s['osm_ways']:
            if w in ways: used.setdefault(w, set()).add(c['id'])


def way_pts(w):
    pts = [g(q['lat'], q['lon']) for q in ways[w]['geometry']]
    return pts[::-1] if ways[w]['tags'].get('oneway') == '-1' else pts


def oneway(w): return ways[w]['tags'].get('oneway') in ('yes', '1', '-1') or ways[w]['tags'].get('junction') == 'roundabout'


# Divided roads: the corridor drives one carriageway; add the opposite one so traffic runs both ways.
cand = [w for w, e in osm_roads.items() if w not in used and oneway(w) and cls_of(e['tags'].get('highway', '')) in ('primary', 'secondary', 'tertiary')]
cand_pts = {w: way_pts(w) for w in cand}
cand_box = {w: bbox(p) for w, p in cand_pts.items()}
for w in list(used):
    if not oneway(w): continue
    wp = way_pts(w)
    if length(wp) < 10: continue
    wb = bbox(wp, 25)
    for c in cand:
        if c in used or not boxes_meet(wb, cand_box[c]): continue
        cp = cand_pts[c]
        sc = samples(cp, 5)
        near = sum(1 for p in sc if line_d(p, wp) < 17) / len(sc)
        if near < 0.6: continue
        a, b = (wp[-1][0] - wp[0][0], wp[-1][1] - wp[0][1]), (cp[-1][0] - cp[0][0], cp[-1][1] - cp[0][1])
        if a[0] * b[0] + a[1] * b[1] < -0.5 * math.hypot(*a) * math.hypot(*b): used[c] = set(used[w])

tram_lines = [[g(q['lat'], q['lon']) for q in e['geometry']] for e in railwater if e['type'] == 'way' and e['tags'].get('railway') == 'tram']
rail_lines = [[g(q['lat'], q['lon']) for q in e['geometry']] for e in railwater if e['type'] == 'way' and e['tags'].get('railway') in ('rail', 'construction')]
water_polys = []
for e in load('osm-water-polygons.json')['elements']:
    if e['type'] == 'way' and 'geometry' in e:
        ring = [g(q['lat'], q['lon']) for q in e['geometry']]
        if len(ring) > 3: water_polys.append(ring[:-1] if ring[0] == ring[-1] else ring)
    elif e['type'] == 'relation':
        for m in e.get('members', []):
            if m.get('role') == 'outer' and 'geometry' in m and len(m['geometry']) > 3:
                water_polys.append([g(q['lat'], q['lon']) for q in m['geometry']])


def bridge_kind(pts):
    mid = samples(pts, 4)
    if any(point_in(w, p[0], p[1]) for w in water_polys for p in mid): return 'canal'
    if any(line_d(p, r) < 6 for r in rail_lines for p in mid): return 'rail'
    return 'flyover'


def is_tram(pts):
    s = samples(pts, 6)
    return sum(1 for p in s if any(line_d(p, t) < 4 for t in tram_lines)) / len(s) > 0.5


# Vertices shared by two or more used ways are junctions: keep them through simplification so the sim's road
# graph connects T-junctions as well as way ends.
share = {}
for w in used:
    for q in way_pts(w): share[(round(q[0], 6), round(q[1], 6))] = share.get((round(q[0], 6), round(q[1], 6)), 0) + 1


def simplify_keep(pts, tol):
    keep = [i for i, q in enumerate(pts) if i in (0, len(pts) - 1) or share.get((round(q[0], 6), round(q[1], 6)), 0) > 1]
    out = []
    for a, b in zip(keep, keep[1:]): out += simplify(pts[a:b + 1], tol)[:-1]
    return out + [pts[-1]]


roads = []
for w, cs in used.items():
    t = ways[w]['tags']
    pts = simplify_keep(way_pts(w), 0.4)
    if len(pts) < 2: continue
    k = cls_of(t.get('highway', 'residential'))
    ow = oneway(w)
    try: lanes = int(t['lanes'].split(';')[0])
    except (KeyError, ValueError): lanes = LANES[k] if ow else LANES[k] * (1 if k == 'lane' else 2) // (1 if ow else 1)
    if not ow and 'lanes' not in t: lanes = max(2, LANES[k])
    r = {'name': t.get('name'), 'cls': k, 'lanes': lanes, 'oneway': ow,
         'w': round(max(WIDTH[k], lanes * 3.3 if ow else lanes * 3.0), 1), 'p': pts, 'corridors': sorted(cs)}
    if t.get('bridge') in ('yes', 'viaduct'): r['bridge'] = bridge_kind(pts)
    if is_tram(pts): r['tram'] = True
    roads.append(r)

# The walk tails into the Sealdah forecourt (pedestrian ways, plus the synthetic OSM gap), as lanes.
# From the north (APC Rd), the real ground route is the stall-lined pedestrian strip on the station side of
# Vidyapati Setu, then Sealdah Station Rd's drop-off loop into the forecourt (research/routes/GAPS.md §3,
# OSM w105833278 + Google photo path). It replaces OSM's synthetic gap link and the under-deck walk.
SEALDAH_NORTH_WALK = [
    [-2987.0, 340.4], [-2981.2, 342.8], [-2987.4, 356.2], [-2993.5, 369.5], [-2999.6, 382.9], [-3005.7, 396.2],
    [-3011.8, 409.6], [-3017.9, 422.9], [-3024.1, 436.2], [-3030.2, 449.6], [-3036.2, 462.9], [-3042.3, 476.3],
    [-3048.5, 489.6], [-3054.6, 503.0], [-3043.3, 510.3], [-3035.4, 526.7], [-3028.6, 543.2], [-3034.8, 549.9],
]
tails = {}
for c in corr['corridors']:
    poly = c['polyline']
    walk = [s for s in c['segments'] if s['mode'] != 'drive']
    if not walk: continue
    pts = [poly[i]['game'] for i in range(walk[0]['from_i'], walk[-1]['to_i'] + 1)]
    if math.dist(pts[0], SEALDAH_NORTH_WALK[0]) < 60:  # arriving from the north along APC Rd
        pts = SEALDAH_NORTH_WALK
    key = tuple(map(tuple, pts))
    tails.setdefault(key, set()).add(c['id'])
for key, cs in tails.items():
    roads.append({'cls': 'lane', 'lanes': 1, 'oneway': False, 'w': 4.0, 'p': [list(p) for p in key], 'corridors': sorted(cs)})


def key_of(r): return (r.get('name'), r['cls'], r['lanes'], r['oneway'], r.get('bridge'), r.get('tram', False), tuple(r['corridors']), r['w'])


def merge(roads):
    """Joins roads with identical attributes end to start, so the network is a few long polylines."""
    changed = True
    while changed:
        changed = False
        ends = {}
        for i, r in enumerate(roads): ends.setdefault((key_of(r), tuple(r1(r['p'][0]))), []).append(i)
        dead = set()
        for i, r in enumerate(roads):
            if i in dead: continue
            hits = [j for j in ends.get((key_of(r), tuple(r1(r['p'][-1]))), []) if j != i and j not in dead]
            if len(hits) == 1:
                j = hits[0]
                r['p'] = r['p'] + roads[j]['p'][1:]
                dead.add(j); changed = True
        roads = [r for i, r in enumerate(roads) if i not in dead]
    return roads


roads = merge(roads)

# --- Meet the real map at the square edge ------------------------------------------------------------------
with open(MAP) as f: sv = json.load(f)
map_cuts = []   # (crossing point, outward unit dir, road)
for mr in sv['roads']:
    p = mr['p']
    for a, b in zip(p, p[1:]):
        if inside(a) != inside(b):
            out = 1 if inside(a) else -1
            cut = square_cut(a, b) if inside(a) else square_cut(b, a)
            dx, dz = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dz) or 1
            map_cuts.append({'p': cut, 'd': [dx / L * out, dz / L * out], 'out': out, 'r': mr, 'used': False})


def outside_runs(r):
    """Splits a road into its pieces outside the square, each starting/ending on the square edge."""
    p, runs, cur = r['p'], [], None
    for i, q in enumerate(p):
        if not inside(q):
            if cur is None:
                cur = [{'cut': square_cut(p[i - 1], q), 'dir': 1}] if i > 0 else []
            cur.append(q)
        elif cur is not None:
            cur.append({'cut': square_cut(q, p[i - 1]), 'dir': -1})
            runs.append(cur); cur = None
    if cur is not None: runs.append(cur)
    return runs


def snap(cut, d_out):
    best, bd = None, 10.0
    for m in map_cuts:
        dist = math.dist(m['p'], cut)
        if dist >= bd or m['d'][0] * d_out[0] + m['d'][1] * d_out[1] < 0.6: continue
        best, bd = m, dist
    return best


net_roads = []
for r in roads:
    for run in outside_runs(r):
        pts = []
        for i, q in enumerate(run):
            if isinstance(q, dict):
                nb = run[1] if i == 0 else run[-2]
                dvec = [nb[0] - q['cut'][0], nb[1] - q['cut'][1]]
                L = math.hypot(*dvec) or 1
                m = snap(q['cut'], [dvec[0] / L, dvec[1] / L])
                if m and r['oneway'] and m['r']['o'] and (m['out'] == 1) != (q['dir'] == 1): m = None
                if m: m['used'] = True; pts.append(m['p'])
                else: pts.append(r1(q['cut']))
            else: pts.append(r1(q))
        if len(pts) >= 2 and length(pts) > 1: net_roads.append({**r, 'p': pts})

map_ends = [{'p': m['p'], 'd': [round(m['d'][0], 3), round(m['d'][1], 3)], 'w': m['r']['w'], 'k': m['r']['k']}
            for m in map_cuts if not m['used'] and not m['r']['b']]

# --- Landmarks -----------------------------------------------------------------------------------------------
KIND = {'metro_station': 'metro-station', 'bus_terminus': 'bus-terminus', 'stadium': 'stadium-gate', 'mall': 'mall',
        'market': 'market', 'hospital': 'hospital', 'police': 'police-kiosk', 'cinema': 'billboards'}
RADIUS = {'sealdah-station': 70, 'metro-station': 16, 'metro-portal': 24, 'bus-terminus': 26, 'clock-tower': 5,
          'stadium-gate': 30, 'traffic-island': 9, 'statue': 5, 'kolkata-sign': 7, 'flyover': 10, 'canal-bridge': 12,
          'rail-underbridge': 12, 'mall': 36, 'market': 18, 'hospital': 22, 'police-kiosk': 3, 'billboards': 6, 'generic': 10}
SALT_LAKE_BOX = (-1600, -1100, 0, 0)   # where key junctions are Salt Lake islands rather than old-city crossings


def nearest_line_pt(p):
    best, bd = p, 1e18
    for line in all_lines:
        for a, b in zip(line, line[1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            L2 = dx * dx + dz * dz or 1e-9
            t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
            q = [a[0] + dx * t, a[1] + dz * t]
            d = math.dist(p, q)
            if d < bd: best, bd = q, d
    return best


def road_heading(c, d_m):
    poly = c['polyline']
    for a, b in zip(poly, poly[1:]):
        if a['d_m'] <= d_m <= b['d_m']: return math.atan2(b['game'][1] - a['game'][1], b['game'][0] - a['game'][0])
    return 0.0


def crossing_pt(c, x):
    """A crossing on the median of the road it's on (OSM puts it on whichever carriageway the route walked), so the
    bridge gap lines up with the road."""
    h = road_heading(c, x['d_m'])
    return snap_point(x['game'], (math.cos(h), math.sin(h)), net_roads)


landmarks, seen = [], {}


def add_lm(name, kind, p, corridor=None, d=None, r=None):
    if inside(p): return
    for (n, k), q in seen.items():
        if k == kind and (n == name or kind in ('canal-bridge', 'rail-underbridge', 'flyover')) and math.dist(q, p) < 30: return
    seen[(name, kind)] = p
    q = nearest_line_pt(p)
    head = math.atan2(q[1] - p[1], q[0] - p[0]) if math.dist(p, q) > 0.5 else 0.0
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:28] or kind
    lid, n = slug, 2
    while any(l['id'] == lid for l in landmarks): lid, n = f'{slug}-{n}', n + 1
    lm = {'id': lid, 'name': name, 'kind': kind, 'x': round(p[0], 1), 'z': round(p[1], 1), 'heading': round(head, 2), 'r': r or RADIUS[kind]}
    if corridor: lm['corridor'] = corridor; lm['d'] = round(d)
    landmarks.append(lm)


for c in corr['corridors']:
    for l in c['landmarks']:
        k, nm, p = l['kind'], l['name'], l['game']
        if k == 'rail_station': kind = 'sealdah-station' if nm == 'Sealdah' else 'generic'
        elif k == 'key_junction':
            if 'forecourt' in nm: continue
            sl = SALT_LAKE_BOX[0] <= p[0] <= SALT_LAKE_BOX[2] and SALT_LAKE_BOX[1] <= p[1] <= SALT_LAKE_BOX[3]
            kind = 'traffic-island' if sl or 'Island' in nm else 'police-kiosk'
        elif k == 'sight':
            if 'Clock tower' in nm: kind = 'clock-tower'
            elif nm in ('Gautam Buddha', 'Netaji Subhas Chandra Bose'): kind, nm = 'statue', 'Statue island'  # no real figures modelled
            else: kind = 'generic'
        elif k in KIND: kind = KIND[k]
        elif k in ('hotel', 'college', 'fuel', 'theme_park', 'temple_mosque_church', 'park'): kind = 'generic'
        else: continue
        add_lm(nm, kind, p, c['id'], l['d_m'])

# Surveyed in Street View (research/routes/LANDMARKS.md), not tagged in OSM.
for nm, kind, ll in [('Karunamoyee clock tower', 'clock-tower', (22.5853, 88.4210)),
                     ('I Love Kolkata sign', 'kolkata-sign', (22.5632, 88.3961)),
                     ('Statue island, Beleghata', 'statue', (22.5631, 88.3963)),
                     ('Traffic police kiosk, Beleghata', 'police-kiosk', (22.5630, 88.3966)),
                     ('Phoolbagan island', 'traffic-island', (22.5723, 88.3894)),
                     ('Ultadanga flyover', 'flyover', (22.5905, 88.3974)),
                     ('Vidyapati Setu', 'flyover', (22.5680, 88.3697))]:
    add_lm(nm, kind, g(*ll))
sealdah = corr['end']['game']
add_lm('Forecourt statue', 'statue', [sealdah[0] + 8, sealdah[1] - 6])
mp = corr['metro']['portal']
add_lm('Green Line portal', 'metro-portal', mp['game'])
for c in corr['corridors']:
    for x in c['crossings']:
        if x['kind'].startswith('water') and x['how'] == 'road bridge':
            add_lm(f"{x['name'].split(' (')[0]} bridge", 'canal-bridge', crossing_pt(c, x), c['id'], x['d_m'])
        elif x['kind'] == 'rail:rail' and 'above' in x['how']:
            add_lm('Rail underbridge', 'rail-underbridge', crossing_pt(c, x), c['id'], x['d_m'])
        elif x['kind'] == 'rail:rail': add_lm('Sealdah Beliaghata Flyover', 'flyover', x['game'], c['id'], x['d_m'])

# --- Crossings ------------------------------------------------------------------------------------------------

def water_width(p, h):
    for w in water_polys:
        if not point_in(w, p[0], p[1]): continue
        span = [s for s in range(-120, 121) if point_in(w, p[0] + math.cos(h) * s * 0.5, p[1] + math.sin(h) * s * 0.5)]
        return (max(span) - min(span)) * 0.5 + 1
    return 12.0


def rail_width(p, h):
    hits = []
    for s in range(-80, 81):
        q = [p[0] + math.cos(h) * s * 0.5, p[1] + math.sin(h) * s * 0.5]
        if any(line_d(q, r) < 0.6 for r in rail_lines): hits.append(s * 0.5)
    return (max(hits) - min(hits) + 6) if hits else 8.0


crossings = []
for c in corr['corridors']:
    for x in c['crossings']:
        k, p = x['kind'], x['game']
        if inside(p) or k == 'water:drain' or 'tunnel' in x['how'] or 'underground' in x['how']: continue
        if any(math.dist(p, [q['x'], q['z']]) < 25 for q in crossings): continue
        h = road_heading(c, x['d_m'])
        p = crossing_pt(c, x)
        if k.startswith('water'): kind, width, over = 'canal', water_width(p, h), True
        else: kind, width, over = 'rail', rail_width(p, h), 'above' not in x['how']
        crossings.append({'kind': kind, 'x': round(p[0], 1), 'z': round(p[1], 1), 'heading': round(h, 2), 'width': round(width, 1), 'over': over})

# --- Metro ------------------------------------------------------------------------------------------------------
m = corr['metro']
mp_pts = [q['game'] for q in m['polyline']]
mdist = [q['d_m'] for q in m['polyline']]
elev = [lv for lv in m['levels'] if lv['level'] == 'elevated']
ranges = [[next(i for i, d in enumerate(mdist) if d >= lv['from_m']), max(i for i, d in enumerate(mdist) if d <= lv['to_m'])] for lv in elev]
# Above the median of the roads it follows (3rd Avenue, the Bypass); the elevated ranges' ends survive.
dense, at_old = snap_line(mp_pts, net_roads, inside, lambda i: any(i0 <= i < i1 for i0, i1 in ranges))
mp_pts, where = simplify_keeping(dense, [at_old[i] for rg in ranges for i in rg], 0.25, simplify)
ranges = [[where[at_old[i0]], where[at_old[i1]]] for i0, i1 in ranges]
green = {'name': 'Green Line', 'p': [r1(q) for q in mp_pts], 'elevated': ranges,
         'stations': [{'name': s['name'], 'x': round(s['game'][0], 1), 'z': round(s['game'][1], 1), 'elevated': s['d_m'] < elev[-1]['to_m']}
                      for s in m['stations'] if not inside(s['game'])]}
orange = [[g(q['lat'], q['lon']) for q in e['geometry']] for e in railwater
          if e['type'] == 'way' and e['tags'].get('name') == 'New Garia - Airport (Line 6)']
metro = [green]
if orange:
    line, _ = snap_line(simplify(max(orange, key=length), 1.0), net_roads, inside)
    line = simplify(line, 0.25)
    metro.append({'name': 'Orange Line', 'p': [r1(q) for q in line], 'elevated': [[0, len(line) - 1]], 'stations': []})

# --- Water, areas, stops -----------------------------------------------------------------------------------------


def clip_half(ring, axis, v, keep_less):
    out = []
    ins = (lambda q: q[axis] <= v) if keep_less else (lambda q: q[axis] >= v)
    for i in range(len(ring)):
        cur, prev = ring[i], ring[i - 1]
        if ins(cur) != ins(prev):
            t = (v - prev[axis]) / (cur[axis] - prev[axis])
            out.append([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t])
        if ins(cur): out.append(cur)
    return out


def outside_square(ring):
    """The ring minus the square, as up to four convex-clipped pieces (west, east, north strip, south strip)."""
    pieces = [clip_half(ring, 0, -HALF, True), clip_half(ring, 0, HALF, False)]
    mid = clip_half(clip_half(ring, 0, -HALF, False), 0, HALF, True)
    if mid: pieces += [clip_half(mid, 1, -HALF, True), clip_half(mid, 1, HALF, False)]
    return [p for p in pieces if len(p) >= 3 and abs(signed_area(p)) > 4]


water = []
for ring in water_polys:
    b = bbox(ring)
    cx, cz = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    rad = math.hypot(b[2] - b[0], b[3] - b[1]) / 2
    if not any(any(math.dist([cx, cz], q) < rad + 200 for q in line[::3]) for line in all_lines): continue
    if not any(line_d(q, line) < 160 for q in samples(ring, 30)[::2] for line in all_lines): continue
    for piece in outside_square(ring):
        s = simplify_ring(piece, 1.2)
        if len(s) >= 3 and abs(signed_area(s)) > 30: water.append([r1(q) for q in s])

AREA = {'sector_v': 'sectorv', 'ultadanga_hudco': 'ultadanga', 'kankurgachi': 'kankurgachi', 'phoolbagan_kadapara': 'phoolbagan',
        'beliaghata': 'beliaghata', 'narkeldanga_rajabazar': 'narkeldanga', 'maniktala': 'maniktala',
        'sealdah_baithakkhana': 'sealdah', 'chingrighata_bypass_edge': 'chingrighata'}
areas = []
for k, a in corr['areas'].items():
    kind = 'saltlake' if k.startswith('salt_lake') else AREA[k]
    p = g(*a['centre'])
    ar = {'kind': kind, 'x': round(p[0], 1), 'z': round(p[1], 1), 'r': round(a['radius_m'] * 0.5)}
    if kind in ('saltlake', 'sectorv'): ar['gridDeg'] = a['dominant_bearings_deg'][0]
    areas.append(ar)
# The EM Bypass edge: small centres along it, so only its frontage gets the colony-and-bheri character.
bypass = [r for r in net_roads if r.get('name') == 'Eastern Metropolitan Bypass']
pts = [q for r in bypass for q in samples(r['p'], 250)]
for q in pts:
    if all(math.dist(q, [b['x'], b['z']]) > 200 for b in areas if b['kind'] == 'bypass'):
        areas.append({'kind': 'bypass', 'x': round(q[0], 1), 'z': round(q[1], 1), 'r': 70})

# Ultadanga's suburban station is "Bidhan Nagar Road" (research/routes/GAPS.md §2): the real pin, a station model
# laid along the tracks (OSM rails near it bear about 12 degrees east of north), clear of generated buildings.
for lm in landmarks:
    if lm['id'] == 'bidhannagar-road':
        sx, sz = g(22.59145, 88.39081)
        lm.update({'kind': 'rail-station', 'name': 'Bidhan Nagar Road', 'x': round(sx, 1), 'z': round(sz, 1),
                   'heading': round(math.atan2(-math.cos(math.radians(12)), math.sin(math.radians(12))), 2), 'r': 50})
# Nothing else stands in the station's footprint: OSM's "Bidhannagar Road" bus-stand point, a club name board and a
# mislabelled "Sealdah Beliaghata flyover" point (no flyover road is near; the real Ultadanga flyover is ~400 m east)
# would otherwise be drawn across the platforms.
st = next((l for l in landmarks if l['kind'] == 'rail-station'), None)
if st:
    landmarks[:] = [l for l in landmarks if l is st or l['kind'] == 'police-kiosk' or math.dist([l['x'], l['z']], [st['x'], st['z']]) > st['r'] + 5]

# The red church with two domed towers on Sealdah's north approach, east of the walk-in strip (Street View Oct 2025,
# research/routes/img/gaps2/sdn-foot-180; GAPS.md §3 point 8 "church compound to the east"). Faces the road (west).
cx, cz = g(22.5692, 88.3711)
landmarks.append({'id': 'sealdah-north-church', 'name': 'Church (Sealdah north)', 'kind': 'church', 'x': round(cx, 1), 'z': round(cz, 1),
                  'heading': round(math.pi, 2), 'r': 22})

stops = []
for e in load('osm-landmarks.json')['elements']:
    t = e.get('tags', {})
    if e['type'] != 'node' or t.get('highway') != 'bus_stop' or not t.get('name'): continue
    p = g(e['lat'], e['lon'])
    if inside(p) or not any(line_d(p, r['p']) < 14 for r in net_roads if r['cls'] != 'lane'): continue
    if any(s['name'] == t['name'] and math.dist([s['x'], s['z']], p) < 40 for s in stops): continue
    stops.append({'name': t['name'], 'x': round(p[0], 1), 'z': round(p[1], 1)})

for r in net_roads:
    if not r.get('name'): r.pop('name', None)
out = {
    'about': 'Ghar Jabo streamed world: real network Sector V -> Sealdah, game units (tools/build-world.py). '
             'Map data (c) OpenStreetMap contributors, ODbL.',
    'roads': [{**r, 'id': f'r{i}'} for i, r in enumerate(net_roads)],
    'landmarks': landmarks, 'crossings': crossings, 'metro': metro, 'water': water, 'areas': areas,
    'sealdah': {'x': sealdah[0], 'z': sealdah[1], 'r': 26}, 'stops': stops, 'mapEnds': map_ends,
    # The drivable part of each corridor (bus routes, HUD), real game coords from the TIU gate.
    'corridors': [{'id': c['id'], 'p': [r1(q) for q in simplify([p['game'] for p in c['polyline'] if p['d_m'] <= c['drive_m'] + 0.1], 0.6)]}
                  for c in corr['corridors']],
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f: json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
print(f'world.json: {os.path.getsize(OUT) / 1024:.1f} KB, {len(net_roads)} roads ({sum(len(r["p"]) for r in net_roads)} pts), '
      f'{len(landmarks)} landmarks, {len(crossings)} crossings, {len(water)} water rings, {len(stops)} stops, '
      f'{len(map_ends)} map ends, {sum(1 for m in map_cuts if m["used"])} snapped')
