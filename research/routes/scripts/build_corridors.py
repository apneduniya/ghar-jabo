"""Build research/routes/corridors.json from the raw Overpass extracts in research/routes/osm-*.json.

Run: python3 -I research/routes/scripts/build_corridors.py [--print]
Game coords: tools/map/geo.py to_game (x east, z south, 0.5 units per metre, origin 22.57700, 88.42935).
Map data (c) OpenStreetMap contributors, ODbL.
"""
import json, math, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from route_lib import ROUTES, WALK, Graph, dist_ll, game, load, project, seg_intersect, xy  # noqa: E402
from corridor_defs import CORRIDORS, START, SEALDAH, W  # noqa: E402

PRINT = '--print' in sys.argv
roads, minor, fore = load('osm-roads.json'), load('osm-minor-roads.json'), load('osm-sealdah-forecourt.json')
railw, lm = load('osm-rail-water.json'), load('osm-landmarks.json')

G = Graph()
for src in (roads, minor, fore):
    for e in src['elements']:
        if e['type'] == 'way': G.add_way(e)
GW = Graph(WALK)
for e in fore['elements']:   # ground level only: never walk over the flyover
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('bridge') in (None, 'no') and t.get('layer', '0') in ('0', '-1') and not t.get('name', '').startswith('Vidyapati'):
        GW.add_way(e, directed=False)

GAP_ID = -1   # synthetic connector where OSM's ground network is broken
GW.ways[GAP_ID] = {'tags': {'highway': 'gap', 'name': 'OSM gap: at-grade road/footpath beside Vidyapati Setu (not mapped)', 'fixme': 'check Street View'}}

WAYPOINT_LABEL = {
    'start': 'Techno India University gate (Street 2)', 'karunamoyee': 'Karunamoyee', 'central_park': 'Central Park',
    'city_centre': 'City Centre', 'stadium': 'Salt Lake Stadium (Bypass)', 'phoolbagan': 'Phoolbagan',
    'rajabazar': 'Rajabazar (Narkeldanga Main Rd x APC Rd)', 'webel': 'Webel More', 'sdf': 'SDF More',
    'nicco': 'Nicco Park', 'nalban': 'Nalban (start of Salt Lake Bypass, by Nicco Park)', 'chingrighata': 'Chingrighata (Salt Lake Bypass x EM Bypass)',
    'id_hospital': 'Beliaghata ID Hospital / Subhas Sarobar', 'cit_more': 'CIT More (Beliaghata Main Rd x CIT Rd)',
    'pnb': 'PNB Island (Salt Lake)', 'hudco': 'Hudco More (Ultadanga)', 'khanna': 'Khanna (APC Rd x Aurobindo Sarani)',
    'maniktala': 'Maniktala crossing (APC Rd)', 'kankurgachi': 'Kankurgachi (CIT Rd x Maniktala Main Rd)',
    'sealdah': 'Sealdah station forecourt', 'sealdah_n': 'Sealdah: APC Rd at north foot of Vidyapati Setu'}


def name_of(t):
    return t.get('name') or t.get('alt_name') or ''


def route_corridor(c):
    rx = re.compile(c['prefer'], re.I)
    pref = lambda t: bool(rx.search(' '.join(t.get(k, '') for k in ('name', 'alt_name', 'ref'))))   # noqa: E731
    via = c['via']
    walk_tail = via[-2:] == ['sealdah_n', 'sealdah']
    drive_via = via[:-1] if walk_tail else via
    # Start: try the nearest node of every major way within 70 m (divided roads: either carriageway).
    starts = {}
    for n in G.major_nodes:
        d = dist_ll(n, START)
        if d < 70:
            wid = next(w for _, _, w in G.adj[n]) if G.adj[n] else None
            if wid and (wid not in starts or d < starts[wid][0]): starts[wid] = (d, n)
    first_target = set(G.near(W[drive_via[1]]))
    best = None
    for d, n in starts.values():
        try:
            p = G.route(n, first_target, pref)
        except ValueError:
            continue
        L = sum(x[3] for x in p) + d
        if best is None or L < best[0]: best = (L, p)
    path = [(a, b, w, d, 'drive') for a, b, w, d in best[1]]
    for a, b in zip(drive_via[1:], drive_via[2:]):
        tgt = set(G.near(W[b], major=(b != 'sealdah')))
        path += [(p, q, w, d, 'drive') for p, q, w, d in G.route(path[-1][1], tgt, pref)]
    if walk_tail:
        s = GW.snap(path[-1][1], major=False, max_m=60)
        t = GW.snap(SEALDAH, major=False, max_m=80)
        try:
            path += [(p, q, w, d, 'walk') for p, q, w, d in GW.route(s, t)]
        except ValueError:   # OSM gap: bridge with a straight connector to the nearest node that reaches the forecourt
            seen, stack = {t}, [t]
            while stack:
                n = stack.pop()
                for m, _, _ in GW.adj.get(n, []):
                    if m not in seen: seen.add(m); stack.append(m)
            j = min(seen, key=lambda n: dist_ll(n, path[-1][1]))
            path.append((path[-1][1], j, GAP_ID, dist_ll(path[-1][1], j), 'walk'))
            path += [(p, q, w, d, 'walk') for p, q, w, d in GW.route(j, t)]
    return path


def polyline(path):
    pts, cum = [path[0][0]], [0.0]
    for a, b, w, d, m in path:
        pts.append(b); cum.append(cum[-1] + d)
    return pts, cum


SEG_KEYS = ('name', 'highway', 'lanes', 'oneway', 'bridge', 'tunnel', 'layer', 'maxspeed', 'ref', 'surface', 'sidewalk')


def segments(path, cum):
    segs, i = [], 0
    for k, (a, b, w, d, mode) in enumerate(path):
        e = G.ways.get(w) or GW.ways.get(w)
        t = e['tags']
        attrs = {kk: t[kk] for kk in SEG_KEYS if kk in t}
        if 'name' not in attrs and t.get('alt_name'): attrs['name'] = t['alt_name']
        attrs['mode'] = mode
        if segs and segs[-1]['_key'] == attrs:
            segs[-1]['to_m'] = round(cum[k + 1], 1); segs[-1]['to_i'] = k + 1
            if w not in segs[-1]['osm_ways']: segs[-1]['osm_ways'].append(w)
        else:
            segs.append({'_key': attrs, 'from_m': round(cum[k], 1), 'to_m': round(cum[k + 1], 1), 'from_i': k,
                         'to_i': k + 1, 'osm_ways': [w], **attrs})
    for s in segs:
        del s['_key']; s['length_m'] = round(s['to_m'] - s['from_m'], 1)
    return segs


# --- Crossings: rail, tram, metro, canals/drains and named water polygons.
CROSS = []
for e in railw['elements']:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'geometry' not in e: continue
    g = [(p['lat'], p['lon']) for p in e['geometry']]
    if t.get('railway') in ('rail', 'subway', 'tram', 'construction', 'abandoned', 'disused'):
        if t.get('service') in ('yard', 'siding', 'spur', 'crossover'): continue
        CROSS.append(('rail:' + t['railway'], t.get('name') or t.get('railway'), t, g))
    elif t.get('waterway') in ('canal', 'river', 'drain', 'stream'):
        CROSS.append(('water:' + t['waterway'], t.get('name') or f"unnamed {t['waterway']}", t, g))
    elif t.get('natural') == 'water':
        CROSS.append(('water:polygon', t.get('name'), t, g))


WATER_LABEL = {218969690: 'Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel)',
               51765640: 'canal at Beliaghata (polygon, unnamed in OSM)', 51765648: 'canal at Beliaghata (polygon, unnamed in OSM)'}
for e in load('osm-water-polygons.json')['elements']:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('water') in ('canal', 'river') and 'geometry' in e and not t.get('name'):
        CROSS.append(('water:polygon', WATER_LABEL.get(e['id'], f"unnamed {t['water']} (OSM w{e['id']})"), t,
                      [(p['lat'], p['lon']) for p in e['geometry']]))


def alongside(pts, cum, kinds=('rail:tram', 'rail:subway', 'rail:construction'), near=22, step=15):
    """Stretches where the route runs along a tram track or metro viaduct/tunnel (within `near` m)."""
    feats = [(k, n, t, g) for k, n, t, g in CROSS if k in kinds]
    from route_lib import seg_intersect as _  # noqa: F401
    out = []
    d = 0.0; i = 0
    while d <= cum[-1]:
        while i < len(cum) - 2 and cum[i + 1] < d: i += 1
        f = 0 if cum[i + 1] == cum[i] else (d - cum[i]) / (cum[i + 1] - cum[i])
        ll = (pts[i][0] + f * (pts[i + 1][0] - pts[i][0]), pts[i][1] + f * (pts[i + 1][1] - pts[i][1]))
        for k, n, t, g in feats:
            off, _a = project(ll, g, [0.0] * len(g))
            if off <= near:
                lvl = 'tunnel' if t.get('tunnel') not in (None, 'no') else 'viaduct' if t.get('bridge') not in (None, 'no') else 'surface'
                key = (k, n, lvl)
                if out and out[-1]['_k'] == key and d - out[-1]['to_m'] <= step * 3: out[-1]['to_m'] = round(d)
                else: out.append({'_k': key, 'kind': k, 'name': n, 'level': lvl, 'from_m': round(d), 'to_m': round(d)})
                break
        d += step
    merged = []
    for o in out:
        if merged and merged[-1]['_k'] == o['_k'] and o['from_m'] - merged[-1]['to_m'] < 150: merged[-1]['to_m'] = o['to_m']
        else: merged.append(o)
    res = [m for m in merged if m['to_m'] - m['from_m'] >= 60]
    for m in res: del m['_k']
    return res


def crossings(pts, cum, path):
    out = []
    for kind, name, t, g in CROSS:
        if kind == 'water:polygon' and len(g) > 2 and g[0] != g[-1]: g = g + [g[0]]
        for i in range(len(pts) - 1):
            for q1, q2 in zip(g, g[1:]):
                tt = seg_intersect(pts[i], pts[i + 1], q1, q2)
                if tt is None: continue
                d = cum[i] + tt * (cum[i + 1] - cum[i])
                rt = (G.ways.get(path[i][2]) or GW.ways.get(path[i][2]))['tags']
                ll = (pts[i][0] + tt * (pts[i + 1][0] - pts[i][0]), pts[i][1] + tt * (pts[i + 1][1] - pts[i][1]))
                how = 'road bridge' if rt.get('bridge') not in (None, 'no') else (
                    'road tunnel/underpass' if rt.get('tunnel') not in (None, 'no') else 'at grade')
                if kind.startswith('rail'):
                    if t.get('tunnel') not in (None, 'no'): how = 'rail in tunnel below'
                    elif t.get('bridge') not in (None, 'no') and how == 'at grade': how = 'rail on bridge/viaduct above'
                    elif how == 'at grade' and int(rt.get('layer', '0') or 0) == 0 and t.get('railway') == 'rail':
                        how = 'at grade (OSM shows no bridge: check; may be a level crossing or missing bridge tag)'
                if kind.startswith('water') and how == 'at grade':
                    how = 'culvert or untagged bridge (OSM road has no bridge tag)' if 'culvert' not in str(t.get('tunnel')) else 'culvert'
                out.append({'d_m': round(d, 1), 'kind': kind, 'name': name, 'how': how, 'lat': round(ll[0], 6),
                            'lon': round(ll[1], 6), 'game': game(ll), 'road': name_of(rt) or rt.get('highway')})
    out.sort(key=lambda c: c['d_m'])
    along = alongside(pts, cum)
    out = [c for c in out if not any(a['kind'] == c['kind'] and a['from_m'] - 30 <= c['d_m'] <= a['to_m'] + 30 for a in along)]
    named = [c for c in out if c['kind'] != 'water:polygon' and not c['name'].startswith('unnamed')]
    out = [c for c in out if not (c['kind'] == 'water:polygon' and 'unnamed in OSM' in c['name']
                                  and any(n['kind'].startswith('water') and abs(n['d_m'] - c['d_m']) < 40 for n in named))]
    dedup = []
    for c in out:   # multi-track / two banks of one canal: keep one per feature within 60 m
        if any(c['name'] == o['name'] and c['kind'] == o['kind'] and abs(c['d_m'] - o['d_m']) < 60 for o in dedup): continue
        dedup.append(c)
    return dedup


# --- Landmarks.
def lm_kind(t):
    if t.get('railway') in ('station', 'halt') or t.get('station') == 'subway':
        return ('metro_station' if t.get('station') == 'subway' else 'rail_station'), 300
    if t.get('building') == 'train_station': return 'rail_station_building', 300
    if t.get('leisure') == 'stadium': return 'stadium', 400
    if t.get('shop') in ('mall', 'department_store'): return 'mall', 150
    if t.get('amenity') == 'hospital': return 'hospital', 120
    if t.get('amenity') == 'marketplace': return 'market', 150
    if t.get('amenity') == 'bus_station' or t.get('public_transport') == 'station': return 'bus_terminus', 150
    if t.get('junction') or (t.get('highway') == 'traffic_signals' and t.get('name')): return 'junction', 80
    if t.get('highway') == 'bus_stop' or (t.get('public_transport') == 'platform' and t.get('bus') == 'yes'): return 'bus_stop', 40
    if t.get('leisure') in ('park', 'sports_centre'): return 'park', 80
    if t.get('amenity') in ('college', 'university'): return 'college', 100
    if t.get('amenity') == 'cinema': return 'cinema', 100
    if t.get('amenity') == 'police': return 'police', 80
    if t.get('amenity') == 'fuel': return 'fuel', 40
    if t.get('tourism') == 'theme_park': return 'theme_park', 300
    if t.get('tourism') in ('museum', 'attraction', 'artwork') or t.get('historic'): return 'sight', 80
    if t.get('tourism') == 'hotel' and re.search(r'Hyatt|Regency|Raajkutir|Novotel|Westin|Radisson', t.get('name', '')): return 'hotel', 200
    if t.get('amenity') == 'place_of_worship': return 'temple_mosque_church', 40
    if t.get('place') in ('suburb', 'neighbourhood', 'quarter', 'locality'): return 'area', 450
    return None, 0


LMS = []
for e in lm['elements'] + fore['elements']:
    t = e.get('tags', {})
    if not t.get('name') or (t.get('place') and re.fullmatch(r'[A-Z]{2} Block', t.get('name', ''))): pass
    k, r = lm_kind(t)
    if not k: continue
    if k != 'bus_stop' and not t.get('name'): continue
    c = e.get('center') or ({'lat': e['lat'], 'lon': e['lon']} if 'lat' in e else None)
    if not c and e.get('geometry'):
        g = e['geometry']; c = {'lat': sum(p['lat'] for p in g) / len(g), 'lon': sum(p['lon'] for p in g) / len(g)}
    if not c: continue
    if k == 'area' and re.fullmatch(r'[A-Z]{2} Block', t['name']): k, r = 'salt_lake_block', 250
    LMS.append({'name': t.get('name', 'Bus stop'), 'kind': k, 'r': r, 'll': (c['lat'], c['lon']),
                'osm': f"{e['type'][0]}{e['id']}", 'religion': t.get('religion')})
for key, ll in W.items():
    LMS.append({'name': WAYPOINT_LABEL[key], 'kind': 'key_junction', 'r': 80, 'll': ll, 'osm': 'waypoint'})


def landmarks(pts, cum):
    out = []
    for L in LMS:
        off, along = project(L['ll'], pts, cum)
        if off > L['r']: continue
        side = side_of(L['ll'], pts, cum, along)
        d = {'d_m': round(along), 'name': L['name'], 'kind': L['kind'], 'offset_m': round(off), 'side': side,
             'lat': round(L['ll'][0], 6), 'lon': round(L['ll'][1], 6), 'game': game(L['ll']), 'osm': L['osm']}
        if L.get('religion'): d['religion'] = L['religion']
        out.append(d)
    out.sort(key=lambda x: x['d_m'])
    dedup = []
    for x in out:
        if any(x['name'].lower() == o['name'].lower() and x['kind'] == o['kind'] and abs(x['d_m'] - o['d_m']) < 120 for o in dedup): continue
        dedup.append(x)
    return dedup


def side_of(ll, pts, cum, along):
    """'left'/'right' of travel direction (Kolkata keeps left: left = kerb side for the player)."""
    i = max(0, min(len(pts) - 2, next((k for k in range(len(cum) - 1) if cum[k + 1] >= along), len(pts) - 2)))
    ax, ay = xy(*pts[i]); bx, by = xy(*pts[i + 1]); px, py = xy(*ll)
    cr = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    return 'left' if cr > 0 else 'right' if cr < 0 else 'on'


def simplify_idx(pts, tol=1.5):
    """Douglas-Peucker on local metres; returns kept indices."""
    P = [xy(*p) for p in pts]
    keep = {0, len(P) - 1}
    stack = [(0, len(P) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = P[a], P[b]
        L = math.hypot(bx - ax, by - ay) or 1e-9
        best, bi = 0, None
        for i in range(a + 1, b):
            d = abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L
            if d > best: best, bi = d, i
        if bi is not None and best > tol:
            keep.add(bi); stack += [(a, bi), (bi, b)]
    return sorted(keep)


def corridor_json(c, path):
    pts, cum = polyline(path)
    segs = segments(path, cum)
    keep = simplify_idx(pts, 1.0)
    remap = {old: new for new, old in enumerate(keep)}
    for s in segs:   # snap segment index ranges onto the simplified polyline
        s['from_i'] = max(v for k, v in remap.items() if k <= s['from_i'])
        s['to_i'] = min(v for k, v in remap.items() if k >= s['to_i'])
    poly = [{'lat': round(pts[i][0], 7), 'lon': round(pts[i][1], 7), 'game': game(pts[i]), 'd_m': round(cum[i], 1)} for i in keep]
    drive = sum(d for *_, d, m in path if m == 'drive')
    return {'id': c['id'], 'title': c['title'], 'length_m': round(cum[-1]), 'drive_m': round(drive),
            'walk_tail_m': round(cum[-1] - drive), 'via': [{'key': k, 'name': WAYPOINT_LABEL[k], 'lat': W[k][0], 'lon': W[k][1]} for k in c['via']],
            'polyline': poly, 'segments': segs, 'crossings': crossings(pts, cum, path), 'alongside': alongside(pts, cum), 'landmarks': landmarks(pts, cum)}, (pts, cum)


# --- Green Line (metro) geometry: route along subway tracks from Sector V station to Sealdah station.
GM = Graph()
for e in railw['elements']:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('railway') == 'subway' and t.get('service') not in ('yard', 'siding', 'spur') \
            and not re.search(r'North-South|Blue|Line-1', t.get('name', '')):
        GM.add_way(e, kind='railway', directed=False)


def metro_json():
    stations = [L for L in LMS if L['kind'] == 'metro_station']
    sv = next(s for s in stations if s['name'] == 'Salt Lake Sector V')
    sd = min((s for s in stations if s['name'] == 'Sealdah'), key=lambda s: dist_ll(s['ll'], (22.5666, 88.3698)))
    a, b = GM.snap(sv['ll'], major=False, max_m=250), GM.snap(sd['ll'], major=False, max_m=250)
    path = [(p, q, w, d, 'metro') for p, q, w, d in GM.route(a, b)]
    pts, cum = polyline(path)
    segs = []
    for k, (p, q, w, d, m) in enumerate(path):
        t = GM.ways[w]['tags']
        lvl = 'underground' if t.get('tunnel') not in (None, 'no') else 'elevated' if t.get('bridge') not in (None, 'no') else 'unknown (no bridge/tunnel tag)'
        if segs and segs[-1]['level'] == lvl:
            segs[-1]['to_m'] = round(cum[k + 1], 1)
            if w not in segs[-1]['osm_ways']: segs[-1]['osm_ways'].append(w)
        else: segs.append({'level': lvl, 'from_m': round(cum[k], 1), 'to_m': round(cum[k + 1], 1), 'osm_ways': [w]})
    order = ['Salt Lake Sector V', 'Karunamoyee', 'Central Park', 'City Centre', 'Bengal Chemical', 'Salt Lake Stadium', 'Phoolbagan', 'Sealdah']
    st = []
    for nm in order:
        s = min((s for s in stations if s['name'] == nm), key=lambda s: project(s['ll'], pts, cum)[0])
        off, along = project(s['ll'], pts, cum)
        st.append({'name': nm, 'd_m': round(along), 'offset_m': round(off), 'lat': s['ll'][0], 'lon': s['ll'][1], 'game': game(s['ll']), 'osm': s['osm']})
    keep = simplify_idx(pts, 1.0)
    return {'id': 'M_green_line', 'title': 'Green Line metro: Salt Lake Sector V -> Sealdah (track geometry from OSM)',
            'length_m': round(cum[-1]), 'stations': st, 'levels': segs,
            'polyline': [{'lat': round(pts[i][0], 7), 'lon': round(pts[i][1], 7), 'game': game(pts[i]), 'd_m': round(cum[i], 1)} for i in keep],
            'portal': portal(segs, pts, cum), 'crossings': metro_cross(pts, cum, path, segs)}


def portal(segs, pts, cum):
    for a, b in zip(segs, segs[1:]):
        if a['level'] == 'elevated' and b['level'] == 'underground':
            d = a['to_m']; i = next(k for k in range(len(cum)) if cum[k] >= d)
            return {'d_m': round(d), 'lat': round(pts[i][0], 6), 'lon': round(pts[i][1], 6), 'game': game(pts[i]),
                    'note': 'OSM bridge->tunnel tag change; the real ramp starts before this point (ramp length not in OSM)'}


def metro_cross(pts, cum, path, segs):
    out = []
    for c in crossings(pts, cum, [(p, q, GAP_ID, d, m) for p, q, w, d, m in path]):
        lvl = next((s['level'] for s in segs if s['from_m'] <= c['d_m'] <= s['to_m']), '?')
        c['how'] = f'metro {lvl}'; c.pop('road', None); out.append(c)
    return out


# --- Network: shared junctions and shared stretches between corridors.
def network(built):
    hubs = []
    for key, ll in W.items():
        on = []
        for cid, (pts, cum) in built.items():
            off, along = project(ll, pts, cum)
            if off < 60: on.append({'corridor': cid, 'd_m': round(along)})
        if not on: continue
        hubs.append({'key': key, 'name': WAYPOINT_LABEL[key], 'lat': ll[0], 'lon': ll[1], 'game': game(ll), 'corridors': on})
    shared = []
    ids = list(built)
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            pa, ca = built[a]; pb = set(built[b][0])
            common = sum(ca[k + 1] - ca[k] for k in range(len(pa) - 1) if pa[k] in pb and pa[k + 1] in pb)
            # where they split: last common node in a's order
            last = max((k for k in range(len(pa)) if pa[k] in pb), default=None)
            first_div = next((k for k in range(len(pa)) if pa[k] not in pb), None)
            shared.append({'a': a, 'b': b, 'shared_m': round(common),
                           'split_at': None if first_div in (None, 0) else {'lat': pa[first_div - 1][0], 'lon': pa[first_div - 1][1], 'd_m_on_a': round(ca[first_div - 1])},
                           'last_common_on_a_m': None if last is None else round(ca[last])})
    return {'hubs': hubs, 'pairs': shared}


# --- Side-street character per area (from minor roads).
AREAS = {
    'sector_v': (22.5745, 88.4310), 'salt_lake_sector_ii_karunamoyee': (22.5870, 88.4230),
    'salt_lake_sector_i_central_park': (22.5880, 88.4100), 'salt_lake_sector_iii_stadium': (22.5720, 88.4130),
    'ultadanga_hudco': (22.5920, 88.3880), 'kankurgachi': (22.5800, 88.3880), 'phoolbagan_kadapara': (22.5710, 88.3950),
    'beliaghata': (22.5650, 88.3900), 'narkeldanga_rajabazar': (22.5730, 88.3780), 'maniktala': (22.5860, 88.3790),
    'sealdah_baithakkhana': (22.5680, 88.3680), 'chingrighata_bypass_edge': (22.5600, 88.4100),
}


def area_stats(radius=450):
    out = {}
    allw = [e for e in roads['elements'] + minor['elements'] if e['type'] == 'way']
    for name, c in AREAS.items():
        cx, cy = xy(*c)
        L = {}; named = 0; ow = 0; tot = 0; bins = [0.0] * 18; deg = {}
        for e in allw:
            t = e['tags']; g = e['geometry']
            k = t.get('highway')
            for a, b in zip(g, g[1:]):
                (ax, ay), (bx, by) = xy(a['lat'], a['lon']), xy(b['lat'], b['lon'])
                mx, my = (ax + bx) / 2 - cx, (ay + by) / 2 - cy
                if mx * mx + my * my > radius * radius: continue
                d = math.hypot(bx - ax, by - ay)
                L[k] = L.get(k, 0) + d; tot += d
                if t.get('name'): named += d
                if t.get('oneway') == 'yes': ow += d
                if k in ('residential', 'unclassified', 'living_street', 'tertiary'):
                    ang = math.degrees(math.atan2(by - ay, bx - ax)) % 180
                    bins[int(ang // 10) % 18] += d
                for p in (a, b):
                    if k == 'service': continue
                    key = (p['lat'], p['lon']); deg[key] = deg.get(key, set()); deg[key].add(e['id'])
        area_km2 = math.pi * radius * radius / 1e6
        inter = sum(1 for v in deg.values() if len(v) >= 2)
        sb = sorted(bins, reverse=True)
        out[name] = {'centre': c, 'radius_m': radius, 'road_km_per_km2': round(tot / 1000 / area_km2, 1),
                     'by_class_km': {k: round(v / 1000, 2) for k, v in sorted(L.items(), key=lambda x: -x[1])},
                     'named_share': round(named / tot, 2) if tot else 0, 'oneway_share': round(ow / tot, 2) if tot else 0,
                     'junctions_per_km2': round(inter / area_km2),
                     'grid_score': round((sb[0] + sb[9 if len(sb) > 9 else -1]) / sum(bins), 2) if sum(bins) else 0,
                     'dominant_bearings_deg': [i * 10 for i, v in sorted(enumerate(bins), key=lambda x: -x[1])[:2]]}
    return out


def main():
    built, out = {}, []
    for c in CORRIDORS:
        path = route_corridor(c)
        cj, geom = corridor_json(c, path)
        built[c['id']] = geom
        out.append(cj)
        if PRINT:
            print('==', c['id'], cj['length_m'], 'm  (walk tail', cj['walk_tail_m'], ')')
            for s in cj['segments']:
                print(f"  {s['from_m']:7.0f} {s['length_m']:6.0f}  {s.get('name', '-'):38.38} {s['highway']:14} lanes={s.get('lanes', '?'):2} ow={s.get('oneway', '-'):3} br={s.get('bridge', '-')} {s['mode']}")
            for x in cj['alongside']: print('   =', x['from_m'], x['to_m'], x['kind'], x['name'], x['level'])
            for x in cj['crossings']: print('   X', x['d_m'], x['kind'], x['name'], '|', x['how'], '|', x['road'])
            for x in cj['landmarks']:
                if x['kind'] not in ('bus_stop', 'salt_lake_block', 'temple_mosque_church', 'fuel'): print('   L', x['d_m'], x['kind'], x['name'], x['side'], x['offset_m'])
    m = metro_json()
    if PRINT:
        print('== metro', m['length_m']); [print('  ', s) for s in m['stations']]; [print('  ', s['level'], s['from_m'], s['to_m']) for s in m['levels']]
    doc = {'_about': 'Sector V (TIU gate) -> Sealdah corridors for Ghar Jabo. Built by research/routes/scripts/build_corridors.py '
                     'from research/routes/osm-*.json (Overpass, base 2026-11-09). d_m = metres along the corridor from the start. '
                     'game = tools/map/geo.py to_game (x east, z south, 0.5 u/m, origin 22.57700, 88.42935). side = left/right of '
                     'travel direction. Unnamed segments are unnamed in OSM. Map data (c) OpenStreetMap contributors, ODbL.',
           'start': {'name': 'Techno India University gate, Street 2', 'lat': START[0], 'lon': START[1], 'game': game(START)},
           'end': {'name': 'Sealdah station forecourt', 'lat': SEALDAH[0], 'lon': SEALDAH[1], 'game': game(SEALDAH)},
           'corridors': out, 'metro': m, 'network': network(built), 'areas': area_stats()}
    with open(os.path.join(ROUTES, 'corridors.json'), 'w') as f: json.dump(doc, f, separators=(',', ':'))
    print('wrote corridors.json', os.path.getsize(os.path.join(ROUTES, 'corridors.json')), 'bytes')


main()
