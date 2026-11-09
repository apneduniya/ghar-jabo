"""Corridor definitions: ordered waypoints (lat, lon) and name preferences for the router.

Waypoints are real junctions/places; the router fills in the real OSM road between them. `prefer` is a regex on
name/alt_name/ref that gets a cost discount, so the path sticks to the road commuters actually use.
"""
START = (22.57604, 88.42844)       # Techno India University gate, Street 2
SEALDAH = (22.56705, 88.37030)     # Sealdah main-station forecourt (parking/drop-off in front of the main building)

W = {
    'start': START,
    'karunamoyee': (22.58600, 88.42160),
    'central_park': (22.59010, 88.41560),
    'city_centre': (22.58740, 88.40780),
    'stadium': (22.57311, 88.40309),
    'phoolbagan': (22.57213, 88.39024),
    'rajabazar': (22.57663, 88.37353),
    'webel': (22.57198, 88.43229),
    'sdf': (22.56881, 88.43062),
    'nicco': (22.56950, 88.42200),
    'nalban': (22.57310, 88.42110),   # Salt Lake Bypass begins here (S-12 bus path), by Nalban metro (Orange Line) and Nicco Park
    'chingrighata': (22.55780, 88.41180),
    'id_hospital': (22.56450, 88.39840),
    'cit_more': (22.56285, 88.39630),
    'pnb': (22.59149, 88.39968),
    'hudco': (22.59219, 88.39151),
    'khanna': (22.59418, 88.37532),
    'maniktala': (22.58530, 88.37475),
    'kankurgachi': (22.58010, 88.39055),
    'sealdah': SEALDAH,
    'sealdah_n': (22.57014, 88.37090),   # APC Road at the north foot of Vidyapati Setu (flyover)
}

CORRIDORS = [
    {'id': 'A_saltlake_phoolbagan',
     'title': 'Salt Lake interior -> Stadium -> Phoolbagan -> Narkeldanga Main Rd -> Rajabazar -> Sealdah',
     'via': ['start', 'karunamoyee', 'central_park', 'city_centre', 'stadium', 'phoolbagan', 'rajabazar', 'sealdah_n', 'sealdah'],
     'prefer': r'Narkeldanga|Maulana Abul Kalam|Acharya Prafulla|Broadway|Avenue|Cross Road|Eastern Metropolitan'},
    {'id': 'B_saltlake_beliaghata',
     'title': 'Salt Lake interior -> Stadium -> EM Bypass -> Beliaghata Main Rd -> CIT More -> Sealdah',
     'via': ['start', 'karunamoyee', 'central_park', 'city_centre', 'stadium', 'cit_more', 'sealdah'],
     'prefer': r'Bele?i?a?ghata|Beleghata|Avenue|Cross Road|Eastern Metropolitan|Sealdah Beliaghata'},
    {'id': 'C_bypass_chingrighata_beliaghata',
     'title': 'Street 2 -> Nalban/Nicco Park -> Salt Lake Bypass -> Chingrighata -> EM Bypass -> Beliaghata Main Rd -> CIT More -> Sealdah',
     'via': ['start', 'nalban', 'chingrighata', 'cit_more', 'sealdah'],
     'prefer': r'Salt Lake Bypass|Eastern Metropolitan|Bele?i?a?ghata|Beleghata|Sealdah Beliaghata'},
    {'id': 'D_bypass_chingrighata_phoolbagan',
     'title': 'Street 2 -> Nalban -> Salt Lake Bypass -> Chingrighata -> EM Bypass north -> Stadium/Kadapara -> Phoolbagan -> Rajabazar -> Sealdah',
     'via': ['start', 'nalban', 'chingrighata', 'stadium', 'phoolbagan', 'rajabazar', 'sealdah_n', 'sealdah'],
     'prefer': r'Salt Lake Bypass|Eastern Metropolitan|Narkeldanga|Maulana Abul Kalam|Acharya Prafulla'},
    {'id': 'E_ultadanga_maniktala_apc',
     'title': 'Salt Lake -> PNB -> Hudco/Ultadanga -> Khanna -> APC Road via Maniktala and Rajabazar -> Sealdah',
     'via': ['start', 'karunamoyee', 'central_park', 'city_centre', 'pnb', 'hudco', 'khanna', 'maniktala', 'rajabazar', 'sealdah_n', 'sealdah'],
     'prefer': r'Avenue|Bidhan ?Nagar Road|Bidhannagar Road|Acharya Prafulla|Ultadanga|Aurobindo'},
    {'id': 'F_ultadanga_kankurgachi_phoolbagan',
     'title': 'Salt Lake -> PNB -> Hudco -> CIT Road -> Kankurgachi -> Phoolbagan -> Narkeldanga Main Rd -> Sealdah',
     'via': ['start', 'karunamoyee', 'central_park', 'city_centre', 'pnb', 'hudco', 'kankurgachi', 'phoolbagan', 'rajabazar', 'sealdah_n', 'sealdah'],
     'prefer': r'Avenue|CIT Road|Hem Chandra|Sundari Mohan|Narkeldanga|Maulana Abul Kalam|Acharya Prafulla'},
]
