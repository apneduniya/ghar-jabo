"""Convert OpenStreetMap extracts (research/map/*.json) into the game's compact map: public/data/sectorv.json.

Game units: x = east, z = south (so north is -z), SCALE units per metre. Centre = the Street 13 x Street 2 junction.
Street View corrections live in research/map/overrides.json (keyed by OSM way id, 'r<relation id>' or 'new:<slug>'),
road widths measured on Street View included (overrides 'roads': OSM way id -> {w}).
Map data (c) OpenStreetMap contributors, ODbL.
"""
import heapq, json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map'))   # npm run map uses python -I, which drops the script dir

import buildings as B   # noqa: E402
import water as W       # noqa: E402
from geo import HALF, SCALE, centroid, clip_square, inside_sq, line_dist, ring_of, simplify, simplify_ring, to_game  # noqa: E402

SRC = os.path.join(ROOT, 'research', 'map')
OUT = os.path.join(ROOT, 'public', 'data', 'sectorv.json')
CLIP = HALF * 1.15           # water and green are kept a little past the square, for the horizon


def load(name):
    with open(os.path.join(SRC, name)) as f: return json.load(f)


area, osm_b, osm_rel = load('area.json'), load('osm-buildings.json'), load('osm-building-relations.json')
osm_w, osm_lu, osm_poi, osm_st = load('osm-water.json'), load('osm-landuse.json'), load('osm-pois.json'), load('osm-streets.json')
overrides = load('overrides.json')
log = []

# --- Roads (area.json is still the road source), plus any bridge ways the water extract has and area.json lacks.
WIDTH = {'primary': 9, 'trunk': 9, 'secondary': 7, 'tertiary': 5, 'primary_link': 4.5, 'secondary_link': 4.5,
         'tertiary_link': 4, 'residential': 3.4, 'unclassified': 3.4, 'service': 2.6}
roads, road_ids = [], set()
ROAD_FIX = {int(k): v for k, v in overrides.get('roads', {}).items() if not k.startswith('_')}   # Street View widths


def add_road(e, need_inside=HALF):
    t = e.get('tags', {})
    if e['type'] != 'way' or t.get('highway') not in WIDTH or e['id'] in road_ids or 'geometry' not in e: return
    pts = [to_game(g['lat'], g['lon']) for g in e['geometry']]
    if not any(inside_sq(p, need_inside) for p in pts): return
    road_ids.add(e['id'])
    w = ROAD_FIX.get(e['id'], {}).get('w', WIDTH[t['highway']])
    if e['id'] in ROAD_FIX: log.append(f"road w{e['id']} width {WIDTH[t['highway']]} -> {w} (overrides)")
    roads.append({'n': t.get('name', ''), 'k': t['highway'], 'w': w,
                  'b': 1 if t.get('bridge') not in (None, 'no') else 0, 'o': 1 if t.get('oneway') == 'yes' else 0,
                  'p': simplify(pts, 0.6)})


for e in area['elements']: add_road(e)
n0 = len(roads)
for e in osm_w['elements']:
    if e.get('tags', {}).get('bridge') and 'highway' in e.get('tags', {}): add_road(e, CLIP)
log.append(f'bridges added from osm-water: {len(roads) - n0}')

rails = []
for e in area['elements']:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('railway') == 'subway' and 'Line-2' in (t.get('name') or ''):
        pts = [to_game(g['lat'], g['lon']) for g in e['geometry']]
        if any(inside_sq(p, HALF * 1.6) for p in pts): rails.append(simplify(pts, 0.6))

stations = []
for e in area['elements']:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('railway') == 'station':
        p = to_game(e['lat'], e['lon'])
        if inside_sq(p, HALF * 1.6): stations.append({'n': t.get('name'), 'p': p})

# --- Buildings.
plots = [ring_of(e['geometry']) for e in osm_lu['elements']
         if e['type'] == 'way' and e.get('tags', {}).get('landuse') in ('commercial', 'industrial', 'retail') and 'geometry' in e]
buildings, rep = B.build(osm_b['elements'], osm_rel['elements'], plots, overrides.get('buildings', {}))
log += rep

# --- Water and green.
water, rep = W.build(osm_w['elements'], CLIP)
log += rep
for name, a, b in W.crossings(roads, water): log.append(f'WARNING road {name} crosses water at {a}->{b} without a bridge flag')

GREEN_LEISURE, GREEN_LANDUSE = ('park', 'pitch', 'garden', 'recreation_ground'), ('grass', 'park', 'recreation_ground', 'village_green')
green = []
for e in osm_lu['elements']:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'geometry' not in e: continue
    if t.get('leisure') in GREEN_LEISURE or t.get('landuse') in GREEN_LANDUSE:
        ring = clip_square(ring_of(e['geometry']), CLIP)
        if len(ring) >= 3: green.append(simplify_ring(ring, 0.5))

# --- Stops: highway=bus_stop nodes and public_transport=platform bus platforms, deduped by name within 30 m,
# and pushed off the carriageway onto the left kerb (where buses stop when you keep left).
cands = []
for e in area['elements'] + osm_st['elements']:
    t = e.get('tags', {})
    if e['type'] != 'node': continue
    rail = 'railway' in t or any(t.get(k) == 'yes' for k in ('train', 'subway', 'tram', 'light_rail'))
    if t.get('highway') == 'bus_stop' or (t.get('public_transport') == 'platform' and not rail):   # 'Techno India' has no bus=yes
        p = to_game(e['lat'], e['lon'])
        if inside_sq(p): cands.append({'n': t.get('name', 'Bus stop'), 'p': p})
stops = []
for s in cands:
    if any(q['n'].lower() == s['n'].lower() and math.dist(q['p'], s['p']) < 30 * SCALE for q in stops): continue
    stops.append(s)


CARRIAGEWAYS = [r for r in roads if r['k'] != 'service' and not r['b']]


def on_carriageway(p, pad=0.5):
    return any(line_dist(p, r['p']) < r['w'] / 2 + pad for r in CARRIAGEWAYS)


def to_kerb(p):
    """A stop node on a carriageway moves to its left kerb (keep left), or the right one, or further out,
    whichever first lands clear of every carriageway (divided roads have two)."""
    best = None
    for r in CARRIAGEWAYS:
        for a, b in zip(r['p'], r['p'][1:]):
            L = math.dist(a, b)
            if L < 1e-6: continue
            ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            t = max(0, min(L, (p[0] - a[0]) * ux + (p[1] - a[1]) * uz))
            q = (a[0] + ux * t, a[1] + uz * t)
            d = math.dist(p, q)
            if d < r['w'] / 2 + 0.5 and (best is None or d < best[0]): best = (d, q, ux, uz, r)
    if not best: return p
    d, q, ux, uz, r = best
    lx, lz = uz, -ux                                     # left of travel
    side = 1 if r['o'] or (p[0] - q[0]) * lx + (p[1] - q[1]) * lz >= 0 else -1
    for extra in (1.6, 3, 5, 8):
        for sd in (side, -side):
            c = [round(q[0] + lx * sd * (r['w'] / 2 + extra), 1), round(q[1] + lz * sd * (r['w'] / 2 + extra), 1)]
            if not on_carriageway(c): return c
    log.append(f'WARNING stop at {p} could not be moved off the road')
    return p


for b in buildings:   # footprints added by hand (overrides 'new:') must not sit on a road
    if not str(b['id']).startswith('new:'): continue
    ring = b['p']
    edge = [(a[0] + (c[0] - a[0]) * k / 8, a[1] + (c[1] - a[1]) * k / 8) for a, c in zip(ring, ring[1:] + ring[:1]) for k in range(8)]
    if any(on_carriageway(q, 0) for q in edge): log.append(f'WARNING {b["id"]} footprint overlaps a carriageway')

for s in stops:
    k = to_kerb(s['p'])
    if k != s['p']: log.append(f'stop {s["n"]} moved off the carriageway {s["p"]} -> {k}'); s['p'] = k

# --- Street furniture inputs for the lead: lamps, compounds (plot rings) and gates. Not rendered here.
lamps = [to_game(e['lat'], e['lon']) for e in osm_st['elements']
         if e['type'] == 'node' and e.get('tags', {}).get('highway') == 'street_lamp' and inside_sq(to_game(e['lat'], e['lon']))]
COMPOUND = ('commercial', 'industrial', 'retail', 'residential', 'construction')
compounds = []
for e in osm_lu['elements']:
    t = e.get('tags', {})
    k = t.get('landuse') if t.get('landuse') in COMPOUND else t.get('amenity') if t.get('amenity') in ('college', 'university', 'school', 'hospital') else None
    if e['type'] != 'way' or not k or 'geometry' not in e: continue
    ring = simplify_ring(ring_of(e['geometry']), 0.5)
    if len(ring) < 3 or not inside_sq(centroid(ring)): continue
    c = {'t': k, 'p': ring}
    if t.get('name'): c['n'] = t['name']
    compounds.append(c)
gates = []
for e in osm_lu['elements']:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('barrier') in ('gate', 'lift_gate'):
        p = to_game(e['lat'], e['lon'])
        if not inside_sq(p): continue
        g = {'p': p, 'k': t['barrier']}
        if t.get('access') in ('private', 'no'): g['a'] = 'private'
        gates.append(g)

data = {'scale': SCALE, 'roads': roads, 'rails': rails, 'stations': stations, 'stops': stops, 'buildings': buildings,
        'water': water, 'green': green, 'lamps': lamps, 'compounds': compounds, 'gates': gates,
        'attribution': 'Map data © OpenStreetMap contributors (ODbL)',
        'sources': {k: v.get('osm3s', {}).get('timestamp_osm_base') for k, v in
                    (('area', area), ('buildings', osm_b), ('buildingRelations', osm_rel), ('water', osm_w),
                     ('landuse', osm_lu), ('pois', osm_poi), ('streets', osm_st))}}

# --- Bus corridor: Street Number 13 chained from College More, through the PWH junction, past Wipro More, north-west.
adj = {}


def key(p): return (round(p[0], 1), round(p[1], 1))


for r in roads:
    if r['n'] != 'Street Number 13': continue
    for a, b in zip(r['p'], r['p'][1:]):
        ka, kb = key(a), key(b)
        w = math.dist(a, b)
        adj.setdefault(ka, []).append((kb, w)); adj.setdefault(kb, []).append((ka, w))
start = min(adj, key=lambda k: math.dist(k, (234.0, 114.7)))   # College More
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

# --- Points of interest (overrides.json -> pois): a lat/lon, or an OSM node id from osm-pois.json.
nodes = {e['id']: e for e in osm_poi['elements'] + osm_st['elements'] if e['type'] == 'node'}
pois = {}
for name, o in overrides.get('pois', {}).items():
    if name.startswith('_'): continue
    if 'osm' in o: n = nodes[o['osm']]; pois[name] = to_game(n['lat'], n['lon'])
    else: pois[name] = to_game(*o['ll'])
data['pois'] = pois

with open(OUT, 'w') as f: json.dump(data, f, separators=(',', ':'), ensure_ascii=False)

by_src = {s: sum(1 for b in buildings if b['hs'] == s) for s in ('sv', 'osm', 'guess')}
print(f"roads {len(roads)} rails {len(rails)} stations {len(stations)} stops {len(stops)} buildings {len(buildings)} {by_src} "
      f"water rings {len(water)} green {len(green)} lamps {len(lamps)} compounds {len(compounds)} gates {len(gates)} "
      f"-> {os.path.getsize(OUT) // 1024} KB")
print('bus path points', len(path), 'from', path[0], 'to', path[-1], 'length', round(dist[end]))
print('pois', pois)
for s in stops: print('stop', s['n'], s['p'])
for line in log: print(line)
tall = sorted(buildings, key=lambda b: -b['lv'])[:12]
for b in tall: print('tall', b['id'], b['lv'], b['t'], b['hs'], b.get('n', ''))
