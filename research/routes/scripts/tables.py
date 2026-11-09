"""Print markdown tables (per corridor: road stretches, crossings, landmarks) from corridors.json, for ROUTES.md."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(os.path.dirname(HERE), 'corridors.json')))
SKIP = {'bus_stop', 'salt_lake_block', 'temple_mosque_church', 'fuel', 'rail_station_building', 'sight', 'police', 'area'}


def stretches(segs):
    """Merge consecutive segments with the same name into readable stretches (tiny ones fold into the previous)."""
    out = []
    for s in segs:
        nm = s.get('name') or ''
        if s['mode'] == 'walk': nm = 'walk: ' + (nm or s['highway'])
        if out and nm == out[-1]['name'] and s['mode'] == out[-1]['mode']:
            o = out[-1]; o['to'] = s['to_m']; o['cls'].add(s['highway'])
            if s.get('lanes'): o['lanes'].add(s['lanes'])
            if s.get('bridge'): o['br'] += s['length_m']
            o['ow'] = o['ow'] or s.get('oneway') == 'yes'
        else:
            out.append({'name': nm, 'from': s['from_m'], 'to': s['to_m'], 'cls': {s['highway']}, 'mode': s['mode'],
                        'lanes': {s['lanes']} if s.get('lanes') else set(), 'br': s['length_m'] if s.get('bridge') else 0,
                        'ow': s.get('oneway') == 'yes'})
    # fold tiny stretches (< 60 m) into the previous one
    res = []
    for o in out:
        if res and res[-1]['name'] == o['name'] and o['mode'] == res[-1]['mode']:
            res[-1]['to'] = o['to']; res[-1]['br'] += o['br']; res[-1]['cls'] |= o['cls']; res[-1]['lanes'] |= o['lanes']
        elif res and o['to'] - o['from'] < 60 and o['mode'] == res[-1]['mode']:
            res[-1]['to'] = o['to']; res[-1]['br'] += o['br']; res[-1]['cls'] |= o['cls']
        else: res.append(o)
    return res


for c in d['corridors']:
    print(f"\n#### {c['id']}: {c['title']}\n")
    print(f"Total {c['length_m'] / 1000:.2f} km (drive {c['drive_m'] / 1000:.2f} km, walk to forecourt {c['walk_tail_m']} m).\n")
    print('| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |')
    print('|---|---|---|---|---|---|---|')
    for o in stretches(c['segments']):
        print(f"| {o['from'] / 1000:.2f} | {o['to'] / 1000:.2f} | {o['name'] or '(unnamed)'} | {'/'.join(sorted(o['cls']))} | "
              f"{'/'.join(sorted(o['lanes'])) or '-'} | {'yes' if o['ow'] else 'no'} | {round(o['br']) or ''} |")
    print('\nCrossings and alongside features:\n')
    for a in c['alongside']:
        print(f"- {a['from_m'] / 1000:.2f}-{a['to_m'] / 1000:.2f} km: runs along {a['name']} ({a['level']})")
    for x in c['crossings']:
        print(f"- {x['d_m'] / 1000:.2f} km: crosses {x['name']} ({x['kind']}): {x['how']}; road = {x['road']}")
    print('\nLandmarks in order (km, side of travel, offset m):\n')
    items = [f"{l['d_m'] / 1000:.2f} {l['name']} ({l['kind']}, {l['side']}, {l['offset_m']})" for l in c['landmarks'] if l['kind'] not in SKIP]
    print('; '.join(items))
    stops = [f"{l['name']} {l['d_m'] / 1000:.2f}" for l in c['landmarks'] if l['kind'] == 'bus_stop' and l['name'] != 'Bus stop']
    print(f"\nNamed bus stops on the line (OSM): {', '.join(stops) or 'none mapped'}.")

m = d['metro']
print(f"\n#### {m['id']}: {m['title']}\n\nTrack length {m['length_m'] / 1000:.2f} km.\n")
print('| Station | km | Level (OSM) |\n|---|---|---|')
for s in m['stations']:
    lvl = next((x['level'] for x in m['levels'] if x['from_m'] - 1 <= s['d_m'] <= x['to_m'] + 1), '?')
    print(f"| {s['name']} | {s['d_m'] / 1000:.2f} | {lvl} |")
p = m['portal']
print(f"\nElevated to underground at {p['d_m'] / 1000:.2f} km ({p['lat']}, {p['lon']}; game {p['game']}).")
for x in m['crossings']: print(f"- {x['d_m'] / 1000:.2f} km: {x['name']}: {x['how']}")
