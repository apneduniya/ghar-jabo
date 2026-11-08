"""Buildings: OSM footprints -> {id, p, h, lv, t, hs, n?, colour?, label?, holes?}.

Levels come from, in order: research/map/overrides.json (Street View, `hs: 'sv'`), OSM `building:levels`
(`hs: 'osm'`), or a guess (`hs: 'guess'`) that is plausible for the type and size and deterministic per OSM id.
Height is always lv * FLOOR_M * SCALE (geo.height).

Styles (`t`): office = glass tower, block = concrete office/govt, college, resi, shop, low (sheds, kiosks).
"""
import re
from geo import (HALF, centroid, height, ihash, point_in, ring_of, signed_area, simplify_ring, to_game)

STYLES = ('office', 'block', 'college', 'resi', 'shop', 'low')
SKIP_TYPES = {'train_station'}   # drawn by render/world/structures.ts (the elevated metro station)
RESI_TAGS = {'residential', 'apartments', 'house', 'detached', 'terrace', 'semidetached_house', 'dormitory', 'bungalow'}
HOUSE_TAGS = {'house', 'detached', 'terrace', 'semidetached_house', 'bungalow'}
LOW_TAGS = {'shed', 'garage', 'garages', 'hut', 'roof', 'service', 'cabin', 'toilets', 'kiosk', 'carport', 'warehouse', 'industrial'}
SHOP_TAGS = {'retail', 'shop', 'supermarket'}
COLLEGE_TAGS = {'college', 'university', 'school'}
GOVT_TAGS = {'government', 'public', 'civic'}
GOVT_WORDS = re.compile(r'bhawan|bhavan|department|directorate|tribunal|parishad|zilla|organisation|government|police|'
                        r'institute of health|swasthya|guest house|atlas', re.I)
COLLEGE_WORDS = re.compile(r'universit|college|school|institute of engineering', re.I)
IT_WORDS = re.compile(r'tower|tech|park|infinity|pinnacle|crystals|software|infosol|capital|gitobitan|wipro|tcs|webel|'
                      r'ibm|petrochem|lifescien|digital|smart works', re.I)
PLOT_NAME = re.compile(r'[A-Z]{1,3}[- ]?\d+[A-Z]?')


def clean_name(n):
    """OSM names that are only Salt Lake plot numbers ('212', 'DN-12') aren't names."""
    if not n or n.isdigit() or PLOT_NAME.fullmatch(n): return None
    return n


def area_m2(p):
    return abs(signed_area(p)) * 4   # game units are half metres


def classify(tags, a, name, in_plot):
    """Building style from OSM tags, footprint area (m^2), a cleaned name, and whether it stands in a commercial plot."""
    b = tags.get('building', 'yes')
    if b in COLLEGE_TAGS or tags.get('amenity') in COLLEGE_TAGS or (name and COLLEGE_WORDS.search(name)): return 'college'
    if b in RESI_TAGS: return 'resi'
    if b in SHOP_TAGS or 'shop' in tags: return 'shop'
    if b in LOW_TAGS or a < 40: return 'low'
    if b in GOVT_TAGS or tags.get('office') == 'government' or (name and GOVT_WORDS.search(name)): return 'block'
    if name and (b in ('office', 'commercial') or 'office' in tags or IT_WORDS.search(name)) and a >= 600: return 'office'
    if in_plot or b in ('office', 'commercial', 'construction') or 'office' in tags or a >= 600: return 'block'
    return 'resi'


def guess_levels(t, tags, a, name, h):
    """Plausible storeys for an untagged building. `h` is a deterministic hash of its OSM id."""
    b = tags.get('building', 'yes')
    if t == 'low': return 1 + h % 2
    if t == 'shop': return 1 + h % 2
    if t == 'resi':
        if b in HOUSE_TAGS or (b == 'yes' and a < 250): return 2 + h % 3          # Salt Lake houses: 2-4
        return 3 + h % 3                                                          # flats: 3-5
    if t == 'college': return 5 + h % 4                                           # 5-8
    if t == 'office':                                                             # named IT buildings only
        if a >= 1500: return 10 + h % 5                                           # 10-14
        return 6 + h % 4                                                          # 6-9
    govt = b in GOVT_TAGS or tags.get('office') == 'government' or bool(name and GOVT_WORDS.search(name))
    if govt: return 4 + h % 4                                                     # 4-7
    if a >= 2000: return 5 + h % 5                                                # big campus blocks: 5-9
    if a >= 600: return 4 + h % 4                                                 # 4-7
    return 3 + h % 3                                                              # small offices: 3-5


def osm_levels(tags):
    v = (tags.get('building:levels') or '').strip()
    try:
        lv = round(float(v))
    except ValueError:
        return None
    return lv if lv >= 1 else None


def footprint_ring(raw, tol=0.4):
    p = simplify_ring(raw, tol)
    if len(p) < 3: return None
    if abs(signed_area(p)) < 1: return None
    return p


def collect(ways, relations, plots):
    """Raw building records (before overrides) whose centroid lies in the play square."""
    out = []
    for e in ways:
        t = e.get('tags', {})
        if e['type'] != 'way' or 'geometry' not in e: continue
        if 'building' not in t or 'building:part' in t: continue   # parts are pieces of a parent we already have
        if t['building'] in SKIP_TYPES: continue
        p = footprint_ring(ring_of(e['geometry']))
        if not p: continue
        out.append({'id': e['id'], 'tags': t, 'p': p})
    for e in relations:
        t = e.get('tags', {})
        if 'building' not in t or t['building'] in SKIP_TYPES: continue
        outers = [ring_of(m['geometry']) for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry')]
        inners = [ring_of(m['geometry']) for m in e.get('members', []) if m.get('role') == 'inner' and m.get('geometry')]
        for k, o in enumerate(outers):
            p = footprint_ring(o)
            if not p: continue
            holes = [h for h in (footprint_ring(i) for i in inners) if h and point_in(p, *h[0])]
            rec = {'id': f'r{e["id"]}' + (f'-{k}' if k else ''), 'tags': t, 'p': p}
            if holes: rec['holes'] = holes
            out.append(rec)
    kept = []
    for r in out:
        c = centroid(r['p'])
        if abs(c[0]) > HALF or abs(c[1]) > HALF: continue
        r['c'] = c
        r['in_plot'] = any(point_in(pl, *c) for pl in plots)
        kept.append(r)
    return kept


def new_footprint(key, o):
    if 'll' in o: p = [to_game(lat, lon) for lat, lon in o['ll']]
    elif 'p' in o: p = [list(q) for q in o['p']]
    else: raise SystemExit(f'overrides: {key} is new but has no footprint (ll or p)')
    if signed_area(p) == 0: raise SystemExit(f'overrides: {key} footprint is degenerate')
    return p


def build(ways, relations, plots, overrides):
    """Apply overrides and fill levels/styles. Returns (buildings, report lines)."""
    report = []
    recs = collect(ways, relations, plots)
    by_id = {str(r['id']): r for r in recs}
    used = set()
    for key, o in overrides.items():
        if key.startswith('_'): continue
        if key.startswith('new:'):
            p = new_footprint(key, o)
            r = {'id': key, 'tags': {}, 'p': p, 'c': centroid(p), 'in_plot': True}
            recs.append(r); by_id[key] = r
        elif key not in by_id:
            report.append(f'WARNING override {key} matches no building in the square')
            continue
        used.add(key)
    out = []
    for r in recs:
        key = str(r['id'])
        o = overrides.get(key, {})
        if o.get('drop'): report.append(f'dropped {key}: {o.get("src", "")}'); continue
        tags = r['tags']
        a = area_m2(r['p'])
        name = clean_name(tags.get('name'))
        if 'n' in o: name = o['n']                     # null removes a bad OSM name
        t = o.get('t') or classify(tags, a, name, r['in_plot'])
        if t not in STYLES: raise SystemExit(f'overrides: {key} has unknown style {t}')
        if 'lv' in o:
            lv, hs = o['lv'], o.get('hs', 'sv')
        elif osm_levels(tags):
            lv, hs = osm_levels(tags), 'osm'
            if t == 'block' and lv >= 10 and not o.get('t'): t = 'office'   # a known 10+ storey building is a tower
        else:
            lv, hs = guess_levels(t, tags, a, name, ihash(hash_id(r['id']))), 'guess'
        b = {'id': r['id'], 'p': r['p'], 'h': height(lv), 'lv': int(lv), 't': t, 'hs': hs}
        if name: b['n'] = name
        if o.get('colour'): b['colour'] = o['colour']
        if o.get('label'): b['label'] = o['label']
        if r.get('holes'): b['holes'] = r['holes']
        out.append(b)
    return out, report


def hash_id(i):
    """Numeric seed for any id (OSM way ids, 'r123' relations, 'new:slug')."""
    if isinstance(i, int): return i
    s = 0
    for ch in str(i): s = (s * 131 + ord(ch)) % 2147483647
    return s
