"""Dev fixture for task 020 landmarks: a small WorldNet (src/sim/gen/types.ts) in real game coordinates, built from
research/routes/corridors.json and the OSM extracts beside it. It stands in for G's public/data/world.json so the
landmark models can be checked at their real positions (?landmarks=1) and unit-tested.

Run: python3 -I tools/landmarks-fixture.py  ->  public/dev/landmarks-fixture.json (fetched by ?landmarks=1, read by the unit tests)
Map data (c) OpenStreetMap contributors, ODbL.
"""
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map'))
from geo import to_game  # noqa: E402

R = os.path.join(ROOT, 'research', 'routes')
cor = json.load(open(os.path.join(R, 'corridors.json')))
osm = json.load(open(os.path.join(R, 'osm-roads.json')))['elements']
water = json.load(open(os.path.join(R, 'osm-water-polygons.json')))['elements']

g = lambda lat, lon: to_game(lat, lon)

# Landmarks: id, kind, name, position (lat/lon or game), r. Heading faces the nearest major road unless given.
LM = [
    ('sealdah', 'sealdah-station', 'Sealdah station', (-3020.0, 530.0), 110, math.pi),
    ('ultadanga-flyover', 'flyover', 'Ultadanga flyover', g(22.5914, 88.3935), 40, None),
    ('phoolbagan-island', 'traffic-island', 'Phoolbagan', g(22.57232, 88.38942), 16, None),
    ('phoolbagan-hoardings', 'billboards', 'Phoolbagan hoardings', g(22.57262, 88.38962), 10, None),
    ('beliaghata-kolkata-sign', 'kolkata-sign', 'Beliaghata crossing', g(22.56318, 88.39595), 14, 0.0),  # faces east (beliaghata_x2_h270)
    ('beliaghata-police', 'police-kiosk', 'Beliaghata traffic police', g(22.56322, 88.39648), 4, None),
    ('beliaghata-khalpar', 'canal-bridge', 'Beleghata canal bridge', g(22.5657, 88.3822), 20, None),
    ('stadium-gate', 'stadium-gate', 'Salt Lake Stadium', g(22.5700, 88.4062), 60, None),
    ('karunamoyee-terminus', 'bus-terminus', 'Karunamoyee bus terminus', g(22.5851, 88.4205), 45, None),
    ('karunamoyee-clock', 'clock-tower', 'Karunamoyee clock tower', g(22.58565, 88.42085), 5, None),
    ('city-centre-mall', 'mall', 'City Centre', g(22.5880, 88.4085), 35, None),
    ('beleghata-metro', 'metro-station', 'Beleghata metro (Orange Line)', g(22.56205, 88.40865), 12, None),
    ('green-line-portal', 'metro-portal', 'Green Line portal', (-1561.5, 346.0), 30, None),
    ('nrs-hospital', 'hospital', 'NRS Medical College', g(22.5638, 88.3722), 40, None),
    ('koley-market', 'market', 'Koley Market', g(22.56615, 88.3678), 25, None),
    ('narkeldanga-club', 'generic', 'Narkeldanga', g(22.5745, 88.3810), 6, None),
]

AREAS = {  # corridors.json area key -> AreaKind
    'sector_v': 'sectorv', 'salt_lake_sector_ii_karunamoyee': 'saltlake', 'salt_lake_sector_i_central_park': 'saltlake',
    'salt_lake_sector_iii_stadium': 'saltlake', 'ultadanga_hudco': 'ultadanga', 'kankurgachi': 'kankurgachi',
    'phoolbagan_kadapara': 'phoolbagan', 'beliaghata': 'beliaghata', 'narkeldanga_rajabazar': 'narkeldanga',
    'maniktala': 'maniktala', 'sealdah_baithakkhana': 'sealdah', 'chingrighata_bypass_edge': 'chingrighata',
}

def near(p, q, d):
    return math.dist(p, q) <= d

# Roads: primary..tertiary within 260 game units (520 m) of a landmark or crossing, plus every flyover.
CLASSES = {'primary': ('primary', 4), 'secondary': ('secondary', 2), 'tertiary': ('tertiary', 2),
           'primary_link': ('primary', 1), 'secondary_link': ('secondary', 1), 'trunk': ('primary', 4)}
anchors = [lm[3] for lm in LM]
for c in cor['corridors']:
    anchors += [x['game'] for x in c['crossings']]
anchors += [s['game'] for s in cor['metro']['stations']]
roads = []
for e in osm:
    t = e.get('tags', {})
    if t.get('highway') not in CLASSES or not e.get('geometry'):
        continue
    p = [g(q['lat'], q['lon']) for q in e['geometry']]
    name = t.get('name', '')
    fly = t.get('bridge') == 'yes' and ('Flyover' in name or 'Setu' in name)
    if not fly and not any(near(q, a, 260) for q in p[:: max(1, len(p) // 6)] + [p[-1]] for a in anchors):
        continue
    if any(abs(q[0]) <= 360 and abs(q[1]) <= 360 for q in p):
        continue
    cls, lanes = CLASSES[t['highway']]
    try:
        lanes = int(t.get('lanes', lanes))
    except ValueError:
        pass
    oneway = t.get('oneway') == 'yes'
    if oneway and 'lanes' not in t:
        lanes = max(1, lanes // 2) if cls == 'primary' else lanes
    r = {'id': f"w{e['id']}", 'cls': cls, 'lanes': lanes, 'oneway': oneway, 'w': round(lanes * 1.75 + 0.5, 1), 'p': p, 'corridors': []}
    if name:
        r['name'] = name
    if fly:
        r['bridge'] = 'flyover'
    if 'Vidyapati' in name or ('Prafulla Chandra' in name and p[0][0] < -2950):
        r['tram'] = True
    roads.append(r)

# Crossings from the corridors (deduplicated), headed along the road there.
def tangent(poly, d):
    for a, b in zip(poly, poly[1:]):
        if a['d_m'] <= d <= b['d_m']:
            return math.atan2(b['game'][1] - a['game'][1], b['game'][0] - a['game'][0])
    return 0.0

crossings = []
for c in cor['corridors']:
    bridges = [s for s in c['segments'] if s.get('bridge')]
    for x in c['crossings']:
        k, how = x['kind'], x['how']
        if k.startswith('rail:subway') or k.startswith('rail:construction') or k == 'water:drain':
            continue
        if abs(x['game'][0]) <= 360 and abs(x['game'][1]) <= 360:
            continue
        if any(near(x['game'], (q['x'], q['z']), 12) for q in crossings):
            continue
        h = tangent(c['polyline'], x['d_m'])
        if k.startswith('water'):
            seg = next((s for s in bridges if s['from_m'] - 5 <= x['d_m'] <= s['to_m'] + 5), None)
            width = round(min(14.0, max(8.0, ((seg['to_m'] - seg['from_m']) if seg else 30) * 0.5 - 4)), 1)  # flyover-long bridge segments: cap at a canal's ~28 m
            crossings.append({'kind': 'canal', 'x': x['game'][0], 'z': x['game'][1], 'heading': round(h, 3), 'width': width, 'over': True})
        elif k.startswith('rail'):
            over = 'road bridge' in how
            crossings.append({'kind': 'rail', 'x': x['game'][0], 'z': x['game'][1], 'heading': round(h, 3), 'width': 9.0 if not over else 14.0, 'over': over})

# The Green Line: polyline, elevated range, stations.
m = cor['metro']
mp = [v['game'] for v in m['polyline']]
md = [v['d_m'] for v in m['polyline']]
portal_i = min(range(len(md)), key=lambda i: abs(md[i] - m['portal']['d_m']))
mp[portal_i] = m['portal']['game']
elevated_to = m['levels'][0]['to_m']
stations = [{'name': s['name'], 'x': s['game'][0], 'z': s['game'][1], 'elevated': s['d_m'] < elevated_to} for s in m['stations']]
metro = [{'name': 'Green Line', 'p': mp, 'elevated': [[0, portal_i]], 'stations': stations}]

# Canal water near the crossings (simplified rings, for the debug view).
rings = []
for e in water:
    geo = e.get('geometry')
    if e.get('type') != 'way' or not geo:
        continue
    p = [g(q['lat'], q['lon']) for q in geo]
    if not any(near(q, (c['x'], c['z']), 200) for q in p for c in crossings if c['kind'] == 'canal'):
        continue
    rings.append([q for i, q in enumerate(p) if i % 2 == 0 or i == len(p) - 1])

areas = []
for k, a in cor['areas'].items():
    if k in AREAS:
        x, z = g(*a['centre'])
        areas.append({'kind': AREAS[k], 'x': x, 'z': z, 'r': a['radius_m'] * 0.5})

def facing(pt):
    """Heading from a landmark towards the nearest point of the nearest primary/secondary road."""
    best = (1e9, 0.0)
    for r in roads:
        if r['cls'] == 'tertiary' or r.get('bridge'):
            continue
        for a, b in zip(r['p'], r['p'][1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            L2 = dx * dx + dz * dz or 1
            t = max(0, min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dz) / L2))
            q = (a[0] + dx * t, a[1] + dz * t)
            d = math.dist(q, pt)
            if d < best[0]:
                best = (d, math.atan2(q[1] - pt[1], q[0] - pt[0]) if d > 0.5 else math.atan2(dz, dx))
    return best[1]

landmarks = []
for i, (lid, kind, name, pos, r, h) in enumerate(LM):
    landmarks.append({'id': lid, 'name': name, 'kind': kind, 'x': pos[0], 'z': pos[1],
                      'heading': round(h if h is not None else facing(pos), 3), 'r': r})

end = cor['end']['game']
net = {'roads': roads, 'landmarks': landmarks, 'crossings': crossings, 'metro': metro, 'water': rings,
       'areas': areas, 'sealdah': {'x': end[0], 'z': end[1], 'r': 40}}
out = os.path.join(ROOT, 'public', 'dev', 'landmarks-fixture.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(net, open(out, 'w'), separators=(',', ':'))
print(f'{out}: {len(roads)} roads, {len(landmarks)} landmarks, {len(crossings)} crossings, {len(rings)} water rings, '
      f'{len(stations)} stations, {os.path.getsize(out) // 1024} KB')
