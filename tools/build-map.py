"""Convert OpenStreetMap extracts (research/map/*.json) into the game's compact map: src/data/sectorv.json.

Game units: x = east, z = south (so north is -z), 1 unit = 1/SCALE metres. Centre = the Street 13 x Street 2 junction.
Map data (c) OpenStreetMap contributors, ODbL.
"""
import json, math, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'research', 'map')
OUT = os.path.join(ROOT, 'src', 'content', 'maps', 'sectorv.json')

CENTRE = (22.57700, 88.42935)   # Street 13 x Street 2, by PwC
SCALE = 0.5                     # game units per metre: compresses distances so runs stay short
RADIUS_M = 720

def to_game(lat, lon):
    x = (lon - CENTRE[1]) * 111320 * math.cos(math.radians(CENTRE[0]))
    y = (lat - CENTRE[0]) * 110540
    return (round(x * SCALE, 1), round(-y * SCALE, 1))

def inside(p, r=RADIUS_M * SCALE):
    return abs(p[0]) <= r and abs(p[1]) <= r

def simplify(pts, tol=1.0):
    """Ramer-Douglas-Peucker."""
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L
        if d > best: best, idx = d, i
    if best > tol: return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)
    return [a, b]

area = json.load(open(os.path.join(SRC, 'area.json')))['elements']
bld = json.load(open(os.path.join(SRC, 'buildings.json')))['elements']

WIDTH = {'primary': 9, 'trunk': 9, 'secondary': 7, 'tertiary': 5, 'primary_link': 4.5, 'secondary_link': 4.5,
         'tertiary_link': 4, 'residential': 3.4, 'unclassified': 3.4, 'service': 2.6}
roads = []
for e in area:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'highway' not in t or t['highway'] not in WIDTH: continue
    pts = [to_game(g['lat'], g['lon']) for g in e['geometry']]
    if not any(inside(p) for p in pts): continue
    pts = simplify(pts, 0.6)
    roads.append({
        'n': t.get('name', ''), 'k': t['highway'], 'w': WIDTH[t['highway']],
        'b': 1 if t.get('bridge') else 0, 'o': 1 if t.get('oneway') == 'yes' else 0, 'p': pts,
    })

rails = []
for e in area:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('railway') == 'subway' and 'Line-2' in (t.get('name') or ''):
        pts = [to_game(g['lat'], g['lon']) for g in e['geometry']]
        if any(inside(p, RADIUS_M * SCALE * 1.6) for p in pts): rails.append(simplify(pts, 0.6))

stations, stops, pois = [], [], []
for e in area:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('railway') == 'station':
        p = to_game(e['lat'], e['lon'])
        if inside(p, RADIUS_M * SCALE * 1.6): stations.append({'n': t.get('name'), 'p': p})
    if e['type'] == 'node' and t.get('highway') == 'bus_stop':
        p = to_game(e['lat'], e['lon'])
        if inside(p): stops.append({'n': t.get('name', 'Bus stop'), 'p': p})

buildings = []
for e in bld:
    t = e.get('tags', {})
    pts = [to_game(g['lat'], g['lon']) for g in e.get('geometry', [])]
    if len(pts) < 4 or not all(inside(p) for p in pts): continue
    pts = simplify(pts[:-1], 0.4)
    if len(pts) < 3: continue
    # Footprint area (game units^2) decides the height when OSM has none.
    a = abs(sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))) / 2
    lv = t.get('building:levels')
    if lv and lv.replace('.', '').isdigit(): h = float(lv) * 3.2 * SCALE
    elif a > 900: h = 30 + (hash(e['id']) % 25)   # big Sector V office blocks
    elif a > 250: h = 12 + (hash(e['id']) % 10)
    else: h = 5 + (hash(e['id']) % 5)             # Salt Lake houses
    b = {'p': pts, 'h': round(h, 1)}
    if t.get('name') and not t['name'].isdigit(): b['n'] = t['name']
    buildings.append(b)

# Water (the Keshtopur canal) and green spaces (parks, grounds), if the extract exists.
water, green = [], []
wpath = os.path.join(SRC, 'water.json')
if os.path.exists(wpath):
    for e in json.load(open(wpath))['elements']:
        t = e.get('tags', {})
        if e['type'] != 'way' or 'geometry' not in e: continue
        pts = [to_game(g['lat'], g['lon']) for g in e['geometry']]
        if len(pts) < 4 or not any(inside(q, RADIUS_M * SCALE * 1.3) for q in pts): continue
        pts = simplify(pts[:-1], 0.5)
        if t.get('natural') == 'water': water.append(pts)
        elif t.get('leisure') in ('park', 'pitch', 'garden') or t.get('landuse') in ('grass', 'park', 'recreation_ground'): green.append(pts)

data = {'scale': SCALE, 'roads': roads, 'rails': rails, 'stations': stations, 'stops': stops, 'buildings': buildings, 'water': water, 'green': green,
        'attribution': 'Map data © OpenStreetMap contributors (ODbL)'}
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print(f"roads {len(roads)} rails {len(rails)} stations {len(stations)} stops {len(stops)} buildings {len(buildings)} -> {os.path.getsize(OUT)//1024} KB")
for s in stations: print('station', s)
for s in stops: print('stop', s)

# --- Bus corridor: Street Number 13 chained from College More, through the PWH junction, past Wipro More, north-west.
import heapq
adj = {}
def key(p): return (round(p[0], 1), round(p[1], 1))
for r in roads:
    if r['n'] != 'Street Number 13': continue
    for a, b in zip(r['p'], r['p'][1:]):
        ka, kb = key(a), key(b)
        w = math.dist(a, b)
        adj.setdefault(ka, []).append((kb, w)); adj.setdefault(kb, []).append((ka, w))
nodes = list(adj)
start = min(nodes, key=lambda k: math.dist(k, (234.0, 114.7)))   # College More
dist, prev = {start: 0}, {}
pq = [(0, start)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist.get(u, 1e18): continue
    for v, w in adj[u]:
        if d + w < dist.get(v, 1e18):
            dist[v] = d + w; prev[v] = u; heapq.heappush(pq, (d + w, v))
end = min(dist, key=lambda k: k[0] + k[1])  # furthest north-west reachable along Street 13
path, u = [end], end
while u != start: u = prev[u]; path.append(u)
path.reverse()
data['busPath'] = [list(p) for p in path]

def g(lat, lon): return list(to_game(lat, lon))
data['pois'] = {
    'tiu': g(22.57603, 88.42844), 'pwc': g(22.57753, 88.42967), 'burger': g(22.57620, 88.43069),
    'wiproMore': g(22.57900, 88.42660),
}
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print('bus path points', len(path), 'from', path[0], 'to', path[-1], 'length', round(dist[end]))
print('pois', data['pois'])
