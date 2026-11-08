"""Geometry helpers for the map build: projection, simplification, clipping, polygon tests.

Game units: x = east, z = south (north is -z), SCALE units per metre. Centre = Street 13 x Street 2 (PwC More).
"""
import math

CENTRE = (22.57700, 88.42935)   # Street 13 x Street 2, by PwC
SCALE = 0.5                     # game units per metre: compresses distances so runs stay short
RADIUS_M = 720
HALF = RADIUS_M * SCALE         # the play square is |x|, |z| <= HALF
FLOOR_M = 3.3                   # one storey, metres. Height is always lv * FLOOR_M * SCALE.
M_LON = 111320 * math.cos(math.radians(CENTRE[0]))
M_LAT = 110540


def to_game(lat, lon, nd=1):
    x = (lon - CENTRE[1]) * M_LON
    y = (lat - CENTRE[0]) * M_LAT
    return [round(x * SCALE, nd), round(-y * SCALE, nd)]


def to_ll(x, z):
    """Inverse of to_game (for writing new footprints as lat/lon)."""
    return [round(CENTRE[0] - z / SCALE / M_LAT, 7), round(CENTRE[1] + x / SCALE / M_LON, 7)]


def height(lv):
    return round(lv * FLOOR_M * SCALE, 2)


def inside_sq(p, r=HALF):
    return abs(p[0]) <= r and abs(p[1]) <= r


def ring_of(geom):
    """OSM way geometry -> open ring of game points (drops the closing duplicate)."""
    pts = [to_game(g['lat'], g['lon']) for g in geom]
    if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
    return pts


def simplify(pts, tol=1.0):
    """Ramer-Douglas-Peucker on an open polyline."""
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


def simplify_ring(pts, tol):
    """RDP for a closed ring: split at the vertex farthest from the first, simplify both halves."""
    if len(pts) < 5: return pts
    far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
    a = simplify(pts[:far + 1], tol)
    b = simplify(pts[far:] + [pts[0]], tol)
    return a[:-1] + b[:-1]


def signed_area(p):
    return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2


def centroid(p):
    """Area centroid of a simple polygon (falls back to the vertex mean when degenerate)."""
    a = signed_area(p)
    if abs(a) < 1e-9: return [sum(q[0] for q in p) / len(p), sum(q[1] for q in p) / len(p)]
    cx = cz = 0.0
    for i in range(len(p)):
        (x0, z0), (x1, z1) = p[i], p[(i + 1) % len(p)]
        f = x0 * z1 - x1 * z0
        cx += (x0 + x1) * f; cz += (z0 + z1) * f
    return [cx / (6 * a), cz / (6 * a)]


def point_in(poly, x, z):
    hit = False
    j = len(poly) - 1
    for i in range(len(poly)):
        (xi, zi), (xj, zj) = poly[i], poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi: hit = not hit
        j = i
    return hit


def seg_dist(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dz * dz or 1e-9
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
    return math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1])


def line_dist(p, line):
    return min(seg_dist(p, a, b) for a, b in zip(line, line[1:]))


def ring_dist(p, ring):
    return min(seg_dist(p, ring[i - 1], ring[i]) for i in range(len(ring)))


def clip_square(ring, r):
    """Sutherland-Hodgman clip of a ring to the square |x|, |z| <= r (works for concave rings)."""
    def clip(pts, inside, cut):
        out = []
        for i in range(len(pts)):
            cur, prev = pts[i], pts[i - 1]
            if inside(cur):
                if not inside(prev): out.append(cut(prev, cur))
                out.append(cur)
            elif inside(prev): out.append(cut(prev, cur))
        return out

    def cut_x(v):
        return lambda a, b: [v, round(a[1] + (b[1] - a[1]) * (v - a[0]) / (b[0] - a[0]), 1)]

    def cut_z(v):
        return lambda a, b: [round(a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]), 1), v]

    pts = ring
    for inside, cut in ((lambda p: p[0] <= r, cut_x(r)), (lambda p: p[0] >= -r, cut_x(-r)),
                        (lambda p: p[1] <= r, cut_z(r)), (lambda p: p[1] >= -r, cut_z(-r))):
        if not pts: break
        pts = clip(pts, inside, cut)
    return pts


def ihash(n):
    """Deterministic 32-bit hash of an integer id (Knuth multiplicative), for variety that never changes."""
    return (int(n) * 2654435761) % 4294967296


def rect(c, u, length, depth):
    """Rectangle centred at c, long side along unit vector u."""
    v = (-u[1], u[0])
    hl, hd = length / 2, depth / 2
    return [[round(c[0] + sx * u[0] * hl + sy * v[0] * hd, 1), round(c[1] + sx * u[1] * hl + sy * v[1] * hd, 1)]
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
