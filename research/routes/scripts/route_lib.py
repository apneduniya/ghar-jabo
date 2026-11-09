"""Routing helpers for the Sector V -> Sealdah corridor research. Pure stdlib.

Nodes are keyed by their exact OSM coordinates (Overpass `out geom` omits node ids; shared nodes have identical
coordinates). Map data (c) OpenStreetMap contributors, ODbL.
"""
import heapq, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(ROUTES))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'map'))
from geo import CENTRE, M_LAT, M_LON, SCALE, to_game  # noqa: E402


def load(name):
    with open(os.path.join(ROUTES, name)) as f: return json.load(f)


def xy(lat, lon):
    """Local metres, x east, y north."""
    return ((lon - CENTRE[1]) * M_LON, (lat - CENTRE[0]) * M_LAT)


def dist_ll(a, b):
    ax, ay = xy(*a); bx, by = xy(*b)
    return math.hypot(ax - bx, ay - by)


COST = {'motorway': 1.0, 'trunk': 1.0, 'primary': 1.0, 'secondary': 1.05, 'tertiary': 1.2,
        'motorway_link': 1.0, 'trunk_link': 1.0, 'primary_link': 1.0, 'secondary_link': 1.05, 'tertiary_link': 1.2,
        'unclassified': 1.7, 'residential': 2.0, 'living_street': 3.0, 'service': 3.5,
        'subway': 1.0, 'rail': 1.0}
WALK = {k: 1.0 for k in list(COST) + ['pedestrian', 'footway', 'path', 'steps', 'corridor', 'platform']}
MAJOR = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway_link', 'trunk_link', 'primary_link',
         'secondary_link', 'tertiary_link'}


class Graph:
    def __init__(self, costs=None):
        self.costs = costs or COST
        self.adj = {}      # node -> list of (node, metres, way)
        self.ways = {}
        self.major_nodes = set()

    def add_way(self, e, kind='highway', directed=True):
        t = e.get('tags', {})
        k = t.get(kind)
        if k not in self.costs or 'geometry' not in e: return
        if self.costs is COST and (t.get('area') == 'yes' or t.get('access') in ('no', 'private') or t.get('motor_vehicle') == 'no'): return
        if kind == 'highway' and k == 'service' and t.get('service') in ('parking_aisle',) and self.costs is COST: return
        self.ways[e['id']] = e
        ow = t.get('oneway')
        if t.get('junction') in ('roundabout', 'circular') and ow is None: ow = 'yes'
        if k == 'motorway' and ow is None: ow = 'yes'
        g = [(p['lat'], p['lon']) for p in e['geometry']]
        for a, b in zip(g, g[1:]):
            d = dist_ll(a, b)
            if directed and ow == '-1': self.adj.setdefault(b, []).append((a, d, e['id']))
            else: self.adj.setdefault(a, []).append((b, d, e['id']))
            if not directed or ow not in ('yes', '-1', 'true', '1'): self.adj.setdefault(b, []).append((a, d, e['id']))
            if k in MAJOR: self.major_nodes.update((a, b))
            self.adj.setdefault(b, self.adj.get(b, []))

    def snap(self, ll, major=True, max_m=400):
        cand = self.major_nodes if major else self.adj.keys()
        best = min(cand, key=lambda n: dist_ll(n, ll))
        if dist_ll(best, ll) > max_m: raise ValueError(f'nothing within {max_m} m of {ll}')
        return best

    def near(self, ll, r=45, major=True):
        cand = self.major_nodes if major else self.adj.keys()
        out = [n for n in cand if dist_ll(n, ll) <= r]
        return out or [self.snap(ll, major)]

    def route(self, a, b, prefer=None, avoid=None):
        """Dijkstra with class costs. b: a node or a set of nodes (stops at the cheapest one reached).
        prefer/avoid: functions(tags)->bool, scaling cost by 0.55 / 4."""
        targets = b if isinstance(b, (set, frozenset)) else {b}
        pq, best, prev = [(0.0, a)], {a: 0.0}, {}
        while pq:
            c, n = heapq.heappop(pq)
            if n in targets: b = n; break
            if c > best.get(n, 1e18): continue
            for m, d, wid in self.adj.get(n, []):
                t = self.ways[wid]['tags']
                k = t.get('highway') or t.get('railway')
                f = self.costs[k]
                if prefer and prefer(t): f *= 0.55
                if avoid and avoid(t): f *= 4
                nc = c + d * f
                if nc < best.get(m, 1e18):
                    best[m] = nc; prev[m] = (n, wid, d)
                    heapq.heappush(pq, (nc, m))
        if b not in prev and a != b: raise ValueError(f'no route {a} -> {b}')
        path, n = [], b
        while n != a:
            p, wid, d = prev[n]; path.append((p, n, wid, d)); n = p
        return path[::-1]


def project(ll, line, cum):
    """Nearest point of a lat/lon polyline: (offset metres, along metres)."""
    px, py = xy(*ll)
    best = (1e18, 0.0)
    for i in range(len(line) - 1):
        ax, ay = xy(*line[i]); bx, by = xy(*line[i + 1])
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
        qx, qy = ax + dx * t, ay + dy * t
        d = math.hypot(px - qx, py - qy)
        if d < best[0]: best = (d, cum[i] + t * math.sqrt(L2))
    return best


def seg_intersect(p1, p2, q1, q2):
    """Intersection parameter t along p1->p2 (in local metres), or None."""
    (x1, y1), (x2, y2), (x3, y3), (x4, y4) = xy(*p1), xy(*p2), xy(*q1), xy(*q2)
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(den) < 1e-9: return None
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
    u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den
    return t if 0 <= t <= 1 and 0 <= u <= 1 else None


def game(ll):
    return to_game(ll[0], ll[1])
