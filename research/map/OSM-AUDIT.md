# OSM audit: Salt Lake Sector V (Ghar Jabo map data)

Date: 2026-11-09. Centre 22.57700, 88.42935 (Street 13 x Street 2). Game coords `(x, z)` use `to_game()` from `tools/build-map.py`: x = east, z = south, 0.5 units per metre. The play square is |x|, |z| <= 360. All coords below are game units unless they say m.

Map data (c) OpenStreetMap contributors, ODbL.

## Raw extracts (new, in this folder)

| File | Contents | Bbox | OSM base |
|---|---|---|---|
| `osm-buildings.json` | `building=*`, `building:part=*`, tags + geometry | ±760 m | 2026-11-08 21:53 |
| `osm-pois.json` | every amenity, shop, vending, office, tourism, craft (tags + centre) | ±800 m | 2026-11-08 21:54 |
| `osm-water.json` | waterway, natural=water/wetland, water=*, reservoir/basin, water_park, every bridge/culvert way | ±1800 m | 2026-07-15 (kumi mirror) |
| `osm-streets.json` | footways/paths, sidewalk/lanes/width-tagged roads, crossings, signals, bus stops/platforms, stations, taxi, parking, fuel, kerbs, street lamps | ±800 m | 2026-11-08 21:59 |
| `osm-landuse.json` | landuse, campuses (university/college/school/hospital), leisure, barrier (ways + nodes), entrances | ±800 m | 2026-07-15 (kumi mirror) |

overpass-api.de was at capacity for part of the run, so water and landuse came from the overpass.kumi.systems mirror, which runs about four months behind. Rerun `osm-water` and `osm-landuse` against overpass-api.de before you rely on anything mapped after July 2026.

## How the game uses the data today

- `buildings[]` = `{p, h, n?}`. A building is kept only if **every** vertex falls inside the square, so footprints that cross the edge are dropped. 816 are exported. In the new extract, 995 building footprints have their centroid inside the square.
- **Heights are mostly guessed.** Only 12 buildings in the square have `building:levels`, and none has `height`. If `building:levels` is missing, the script sets the height from footprint area plus `hash(id)`: more than 900 u² (3,600 m²) gives 30–54 u, 250–900 u² gives 12–21 u, and anything smaller gives 5–9 u. A tagged building gets `levels × 3.2 × 0.5`. That makes the two methods inconsistent. Adventz Infinity is the tallest building tagged in OSM (18 levels) and renders at 28.8 u, while any untagged large footprint renders at 30–54 u (the equivalent of 19–34 floors). So anonymous campus blocks end up taller than the real towers.
- `building:part` ways (4 of them) are exported as separate full buildings. Relations aren't fetched. No building in the square is a relation today.
- No building type, levels, `office`, or address is exported. Only `n` is, and only when the name isn't purely digits.
- `water[]`: 2 open rings. (1) **Keshtopur Canal**, the `natural=water` polygon w153755336, simplified to 58 points. It's exported in full, about 8 km, because any vertex within 1.3R qualifies. (2) **"Tank No 10"**, w223468438: `man_made=storage_tank` + `natural=water`, 15×15 m, at (-276.7, -286.3). It's a storage tank, but the game renders it as open water.
- `citymap.ts` draws water as a flat mesh 0.02 units above ground. `World` builds `BuildingGrid` from `buildings[].p` only, so **water, compounds and walls don't block movement**.
- `pois` is hand-entered (4 points). `tiu` and `pwc` match OSM. `burger` (68.9, 44.2) is about 11 u (22 m) south of the OSM Burger King node (71.6, 33.5).
- `stops` takes only `highway=bus_stop` nodes from the older `area.json` (14). It misses the platform-only stops `Techno India` (-0.2, 9.6), `Infinity Crossing` (103.8, 385.8, just outside the square) and `Nicco Park`.

## 1. Buildings

- 995 footprints in the square, all `way`. Building tags: `yes` 866, `residential` 86, `office` 15, `apartments` 9, `commercial` 6, `college` 3, plus a few others. 512 have `name`, but most of those are Salt Lake plot numbers (digits only).
- With levels: **12**. With height: **0**. With `building:part`: 4, none of them with levels or `min_level`. Roof tags: 3. Colour/material: 3–5.

### Buildings tagged with levels

| Name | Levels | Centroid | Footprint | Game |
|---|---|---|---|---|
| Adventz Infinity (commercial) | 18 | 22.57968, 88.43563 | 99×119 m, 6,080 m² | (322.8, -148.0) |
| (unnamed, w358887127) | 18 | 22.57107, 88.43256 | 36×43 m | (164.8, 327.6) |
| sidco global tower | 12 | 22.57724, 88.43455 | 22×23 m | (267.3, -13.3) |
| Advantage Tower | 10 | 22.57353, 88.43193 | 32×24 m | (132.5, 191.7) |
| R S Softwares | 10 | 22.57669, 88.43450 | 38×34 m | (264.6, 17.1) |
| WB Land Reforms & Tenancy Tribunal | 7 | 22.58152, 88.42442 | 25×26 m | (-253.4, -249.9) |
| Rabindra Bharati University | 6 | 22.58038, 88.42519 | 28×31 m | (-213.7, -186.8) |
| (college, Techno campus, w134101285) | 5 | 22.57631, 88.42715 | 53×70 m | (-112.8, 38.2) |
| Jalpaiguri Bhawan | 4 | 22.58084, 88.42485 | 26×22 m | (-231.0, -212.1) |
| Univ. of Burdwan office / Dakshin Dinajpur ZP Bhawan | 3 | 22.5808, 88.4249 | ~21×18 m | (-227, -207) / (-234, -218) |
| Rajib er Randikhana | 2 | 22.58318, 88.43185 | 14×15 m | (128.5, -341.7) |

### Named towers and campuses (no levels in OSM)

| Name | Type | Centroid | Footprint | Game |
|---|---|---|---|---|
| PWC Office | yes | 22.57754, 88.42964 | 61×105 m, 2,283 m² | (14.8, -30.1) |
| TCS Gitobitan | office | 22.57830, 88.43031 | 81×62 m | (49.4, -72.0) |
| Wipro Tower 5 | yes, office=company | 22.57909, 88.43074 | 61×83 m | (71.6, -115.6) |
| Millennium City IBM Daksh | yes | 22.57702, 88.43125 | 75×60 m | (97.6, -1.3) |
| Haldia Petrochemicals | yes | 22.57786, 88.43117 | 38×63 m | (93.7, -47.7) |
| Meridian Capital | yes, company | 22.57868, 88.43121 | 38×43 m | (95.4, -93.0) |
| Webel Electronics Comm. Systems | yes | 22.57741, 88.43157 | 70×56 m | (113.9, -22.6) |
| Srijan Tech Park | yes, company | 22.57729, 88.43228 | 68×91 m | (150.4, -16.0) |
| CSIR IICB Guest House | yes | 22.57753, 88.43406 | 52×39 m | (242.3, -29.1) |
| Janaswasthya Karigari Bhawan | yes, govt | 22.57755, 88.43482 | 42×33 m | (281.2, -30.3) |
| TCG Lifesciences (Chembiotek) | yes, research | 22.57902, 88.43521 | 47×52 m | (301.0, -111.4) |
| Sleek Infosolutions | yes | 22.57963, 88.43371 | 14×15 m | (224.2, -145.2) |
| IT Centre (Sector V) | construction | 22.58109, 88.42996 | 130×96 m | (31.3, -226.1) |
| Salt Lake Sector V metro | train_station | 22.58091, 88.42902 | 126×85 m | (-16.9, -215.9) |
| Techno India campus block (w134101262) | college | 22.57578, 88.42831 | 66×91 m | (-53.4, 67.4) |
| Institute of Engineering & Management | college | 22.57421, 88.43369 | 48×69 m | (222.8, 153.9) |
| Swasthya Bhawan | yes | 22.57153, 88.42880 | 58×66 m | (-28.2, 302.3) |
| Swasthya Sathi / SIHFW | yes, govt | 22.5723, 88.4277–88.4282 | 44×35 / 48×43 m | (-60.3, 260.3) / (-106.3, 259.5) |
| Godrej & Boyce | yes, company | 22.57176, 88.42695 | 52×31 m | (-123.5, 289.4) |
| Victoria Park / Smart Works | commercial | 22.57139, 88.43064 | 58×60 m | (66.1, 310.2) |
| Asyst Park | yes, office=it | 22.57201, 88.43088 | 39×59 m | (78.4, 276.0) |
| National Atlas & Thematic Mapping Org. | yes, govt | 22.57054, 88.43082 | 78×116 m | (75.5, 356.8) |
| Globsyn Crystals | office | 22.57199, 88.43343 | 56×81 m | (209.7, 277.1) |
| South City Pinnacle | yes | 22.57258, 88.43579 | 75×60 m | (331.2, 244.5) |
| DPSC | yes | 22.57165, 88.43510 | 54×56 m | (295.6, 295.6) |
| Kredent Tower / Shaila Towers / Delta Tower | yes/commercial | 22.5706–22.5712, 88.4355–88.4359 | ~35×32 m each | (326.5, 320.5) / (317.2, 345.3) / (336.7, 353.8) |
| Dynamic Digital Technology | commercial | 22.57340, 88.43595 | 23×21 m | (339.4, 199.0) |

The largest **unnamed** footprints are probably IT campuses and need a name and height from Street View: w358887257 (153×101 m at (226.1, 224.9)), w194273945 (106×126 m at (27.6, 272.7)), w194273714 (150×91 m at (-96.6, 299.6)), w362948051 (80×100 m at (314.7, -0.4)), w194273805 (90×80 m at (4.8, 232.8)), w193230779 (81×95 m at (330.5, -212.8)), w193308960 (69×69 m at (110.0, -121.0)), and w193475625 (64×87 m at (168.8, -7.9)), which sits next to Srijan. There are also three unnamed Wipro-campus blocks: w158019905 (-0.2, -81.2), w158019904 (-36.0, -66.0) and w158019907 (-63.0, -97.4), the last with an addr tag for "Wipro Limited".

## 2. Shops and food

OSM is thin here. There are **no** `shop=convenience`, `kiosk`, `pharmacy/chemist`, `amenity=street_vendor/vending_machine`, `cafe` near the centre, or `Starbucks` anywhere in the ±800 m box. Every footpath stall the owner remembers is missing from OSM, so those will have to come from Street View.

### Café strip on Street 2, south of the centre (owner's ~22.5762, 88.4307)

| Item | lat, lng | Game |
|---|---|---|
| Burger King (fast_food) | 22.57639, 88.43074 | (71.6, 33.5) |
| Nizams Express (fast_food) | 22.57636, 88.43082 | (75.4, 35.3) |
| Pepperfry (shop=furniture) | 22.57642, 88.43067 | (67.8, 31.9) |
| Domino's (fast_food) | 22.57651, 88.43114 | (92.2, 27.1) |
| HP Petrol Pump (fuel) | 22.57654, 88.43038 | (53.0, 25.3) |
| Starbucks | **not in OSM** | — |
| Private gates on this frontage | — | (61.3, 35.1), (89.3, 48.6), (103.4, 56.1), (135.3, 71.2) |

### Other food, banks and services in or near the square

- Mio Amore (fast_food), 22.57777, 88.43202, at (137.4, -42.8).
- Boudir Bhater (tagged tourism=hotel; it's a restaurant/eatery), 22.57582, 88.42957, at (11.4, 65.4).
- BB's (restaurant) at (-188.5, -6.9).
- Sizzle Club n Dine (166.3, 254.7), Alibaba (164.2, 267.9).
- ATMs: SBI (273.1, 17.8), Indian Overseas (227.8, 158.5), United Bank (236.1, 174.8), HDFC (-221.3, -204.2).
- Banks: PNB (224.8, 189.7), Axis (188.3, 289.0), Axis (-191.3, -150.9), HDFC (-221.2, -196.4).
- Shops and services NW near CK/EE block: In & Out supermarket (-192.7, -155.4), Bharat Petroleum fuel (-182.7, -144.3), Cafe Coffee Day (-244.4, -242.5), Blue Plum and Swastineer Canteen (~(-237, -228)), Wow! Momo (-273.2, -299.5).
- Public toilets (244.2, 126.5). Shelter (-135.3, -89.4) at Wipro More. Sector V Police Station (26.8, 12.2), right by the centre.
- Further out: Kolkata@99, Punjab Mirchi and Yummy Puds (~(280–300, -360 to -376)); Decathlon (288.4, 322.9); Bistro bar (310.6, 347.1); China One (253.7, 320.7); Red Hot Chilli Peppers (126.8, 352.4).
- Marketplace: CK Market (-166.8, -400.5), outside the square.

The full list with ids is in `osm-pois.json`: 123 elements, including 40 office/company/college/university nodes that make useful building labels.

## 3. Water

### In the play square

**Keshtopur Canal** is the only open water inside the square. It's mapped as one `natural=water` + `water=canal` area (w153755336, carrying the fixme "create a way down the center"). There is **no waterway centreline** for it. It runs diagonally along the NW edge of Sector V: from the SW near Nalban/Nicco Park, NE to the Street 13 bridge at Wipro More, then ENE past the north side of the metro station, then out of the square to the NE.

Approximate centreline, as midpoints of the two banks in game coords: (-415, 145) → (-375, 70) → (-342, 0) → (-325, -30) → (-300, -45) → (-230, -88) → (-170, -126) → (-140, -147) [Street 13 bridges] → (-90, -178) → (3, -239) → (110, -310) → (190, -362) → (250, -390) → (330, -450).

- Width, measured bank-to-bank from the polygon: **15–19 m** SW of Street 13, **13–15 m** NE of it, and about 10–12 m near (227, -380). Divide by 2 for game units (6.5–9.5 u).
- Mapping glitch: at the Street 13 crossing (-142 to -133, -145 to -150) the polygon pinches to 2–6 m, because both banks are snapped to the bridge. A collision mask built straight from this would leave a walkable gap. Better to keep the bridge as the crossing and buffer the water polygon to a minimum width of 12 m.
- Banks: OSM has no bank, embankment or retaining-wall data. `Canal Side Road` (2 ways in `area.json`) runs along the north bank further NE. Street View needs to confirm whether the banks are sloped earth, concrete or railings.
- The Salt Lake Bypass viaduct (w153759679/83, layer 1) passes over Street 13 near (-138, -122). It doesn't cross the canal polygon.
- Metro Line-2 runs on a viaduct (layer 3) and crosses the canal next to the Sector V station. That doesn't affect walking.

Other water in the square: Tank No 10 (storage tank, not a pond, see above), and three small `leisure=water_park` pools inside Nicco Park at about (-342…-384, 270–285), which fall just outside |x| <= 360.

### Bridges and culverts where roads cross water

| Way | Road | Where (lat, lng) | Game | Note |
|---|---|---|---|---|
| w153805231 | Street Number 13, secondary, 2 lanes, bridge | 22.57970, 88.42615 | (-164.6, -149.2) | ~46 m, one carriageway |
| w153805232 | Street Number 13, secondary, 2 lanes, bridge | 22.57929, 88.42630 | (-156.9, -126.6) | ~44 m, other carriageway |
| w154887804 / w154887806 | tertiary, bridge (Nalban side) | 22.5744, 88.4214 | (-410, 140) | outside square, at the SW edge |
| w207360357 / w207360359 | secondary, bridge (NE, toward New Town) | 22.5835, 88.4333 | (~203, -364) | just outside |
| w174251679 | "Sluice Gate", residential, bridge | 22.58466, 88.43502 | (291.2, -423.3) | outside, NE |

OSM has no `tunnel=culvert`, drains (`waterway=drain/ditch`) or footbridges anywhere within 1.8 km. The roadside nullahs common in Sector V are completely unmapped.

### Around the radius (horizon and edge scenery)

| Feature | Tags | Closest approach | Game (centroid) | Size |
|---|---|---|---|---|
| Large lake S of Sector V (Nalban/Bidhannagar side), w51766199 | natural=water, lake | 834 m | (-58.5, 673.0) | 1.18 km² |
| Lake SW, w51766201 | water=lake | 1,204 m | (-485.3, 642.4) | 0.22 km² |
| Bheri/reservoirs E–SE (wetlands fringe), w51766089 / 90 / 91 | water=reservoir | 1,035–1,288 m | (460, 419), (688, 346), (609, 167) | 0.14–0.21 km² each |
| Nicco Park boating lake, w153759667 | natural=water | 1,025 m | (-410.7, 362.1) | 8,300 m² |
| Pond w194248868 | natural=water | 888 m | (-1.3, 456.3) | 1,470 m² |
| Wetland patches, w194449284/5/6 | natural=wetland | 1,138–1,241 m | ~(217–279, 541–563) | 600–1,400 m² |
| Ponds E: w194761163, w194763266, w194981079 | water/pond | 1.2–1.3 km | (548, 300), (552, 335), (638, -137) | 600–6,100 m² |
| Krishnapur Canal, w454630784 | waterway=canal (line) | 1,140 m | (306.6, -480.7) → (566.6, -343.5) → (732.5, -202.1) | no width tag |
| Unnamed canal w190321668 | waterway=canal (line) | 1,169 m | (374, -449) → (458, -644) | no width tag |
| Keshtopur Canal continuation (E), w153570736 | natural=water, canal | 1,119 m | large multi-km polygon | — |

No East Kolkata Wetlands boundary or `wetland=*` large area appears within 1.8 km. The reservoir/lake polygons to the S and SE are the visible fringe.

### Proposed data shape for water that blocks walking

```jsonc
"waterAreas": [
  { "n": "Keshtopur Canal", "k": "canal", "p": [[x,z], ...],   // closed outer ring, clipped to R*1.3
    "holes": [], "w": 16 }                                       // median width in metres (for banks/railings)
],
"waterLines": [ { "n": "Krishnapur Canal", "k": "canal", "p": [[x,z], ...], "w": 12 } ],  // horizon only, buffered for render
"bridges": [ { "n": "Street Number 13", "p": [[x,z],[x,z]], "w": 9, "over": "water" } ]
```

Collision would test water like a building, with one exception: a point inside `waterAreas` is blocked unless it lies within `w/2 + pad` of a `bridges` segment. Equivalently, `World` could build a second grid (`new BuildingGrid(waterAreas.map(w => w.p))`) and check `bridge` corridors first. Clip polygons to the play square plus a margin, so the full 8 km canal ring isn't shipped. Drop `man_made=storage_tank`.

## 4. Footpaths, medians, crossings, signals, stops, parking

- **Footways:** 12 `highway=footway` ways. All of them are inside Nicco Park, around the EE/CK Block parks, or near the BN block, and **none** are along Sector V streets. Only 2 roads have `sidewalk=*`, and nothing has `sidewalk:*`, `width`, `footway=sidewalk` or `kerb`.
- **Medians:** no `dual_carriageway`, no `man_made`/`area:highway` medians. Divided roads are mapped as **two parallel oneway ways** instead. 265 ways carry `oneway=yes` (game: 118 roads with `o=1`), including both carriageways of Street 13 and Salt Lake Bypass. A median can be inferred wherever two oneway ways with the same name run parallel 6–15 m apart.
- **Lanes:** 101 of 1,010 road ways have `lanes` (91×2, 9×3). `surface=asphalt` 93, `lit` 2, `maxspeed` 0, `width` 0. Roundabouts: 9 ways.
- **Crossings and traffic signals: none mapped** (zero `highway=crossing`, `crossing=*` or `traffic_signals` nodes in ±800 m). Junctions such as College More, Wipro More, Webel More and the PwC junction will need positions from Street View.
- **Street lamps:** 121 `highway=street_lamp` nodes, mostly in pairs (one per side) along Street 13 / DN-block road from about (-40, -166) to (202, -23), and along the road from (258, 139) to (398, 208). These are a good guide to footpath edges.
- **Bus stops/platforms** (`public_transport=platform`): Webel More (157.4, 273.4) & (143.5, 282.5); First Gate (208.8, 167.5); College More (234.0, 114.7) & (226.2, 123.8); RS Software (286.6, 7.6); **Techno India (-0.2, 9.6)**, which isn't in the game; Wipro (-136.2, -110.4) & (-144.7, -105.4); Japani Gate Mini Bus Terminus (-166.0, -112.5); 201 Nimta–Nicco Park Terminus (-155.1, -106.6); Swasthya Bhawan (-151.2, 351.6) & (-152.4, 340.4); Matri Sadan (-256.8, -276.1); EE Block (-264.3, -289.3); Infinity Crossing (103.8, 385.8); Nicco Park (-392.6, 134.0). Shelter tags: yes at RS Software, Japani Gate, 201 Terminus, Swasthya Bhawan, Matri Sadan.
- **Bus stations:** Salt Lake Bus Depot (WBSTC), area way w157926086, centre (13.0, -172.1), perimeter 598 m. ST-6 W-3 Bus Terminus, w193308965, (80.3, -158.9). Both are directly south of the metro station.
- **Metro:** Salt Lake Sector V station (-13.5, -218.0); Gate A (-35.5, -197.8); Gate B (-17.2, -233.6). A gate node and 3 benches are mapped at about (-33, -160) to (-28, -168).
- **Taxi/auto stands: none mapped.** Parking: one `amenity=parking` area at (-394.5, 42.1), outside the square. Fuel: HP (53.0, 25.3), Bharat Petroleum (-182.7, -144.3).

## 5. Land use, campuses, walls, gates

- **Walls and fences: none.** There is no `barrier=wall/fence/retaining_wall` anywhere in ±800 m; the only barrier way is a hedge at (97, -531). So compound walls have to be generated from plot outlines.
- **Plot outlines exist:** 27 `landuse=commercial` + 17 `landuse=industrial` + 2 `retail` polygons tile Sector V into its plots. In practice these are the compound boundaries. Key ones:
  - Wipro Technologies plot w153796170, 350×338 m, centre (-46.7, -85.1).
  - Commercial plot around PwC, w193475630, 144×146 m, (23.5, -30.6). Next to it, industrial w193475638, 83×98 m, at (24.4, -3.2).
  - Commercial w193475622 (122.2, -24.9), 312×217 m, holding IBM/Webel/Srijan.
  - Commercial w193477763 (128.8, 37.6) and retail w193477777 (159.2, 52.2), south of Street 2.
  - Commercial w134101163 (88.6, 18.2), 118×139 m, behind the café strip.
  - Commercial w193479536 (-79.7, 46.7), 213×195 m, the plot containing Techno India University. Construction w193479372, 178×137 m, at (-58.5, 5.9), between TIU and the centre; the construction tag may be stale.
  - Big commercial w134101342, 548×556 m, at (-19.6, 305.7) (Swasthya Bhawan/GN block). Commercial w193661466 (255.0, 258.8), 394×355 m. Commercial w193661473 (310.4, 192.9).
  - Residential polygons: NITTTR w193475628 (52.7, 10.0); BN Block (216.1, -204.3); ED Block (-407.6, -329.6).
- **Techno India University:** `amenity=university` node at (-46.7, 53.6) (22.57603, 88.42844), plus `amenity=college` "Techno India College" (-57.1, 74.8) and "Techno Main Salt Lake" (-114.4, 44.8). Campus buildings: w134101262 (college, 66×91 m) at (-53.4, 67.4), and w134101285 (college, 5 levels, 53×70 m) at (-112.8, 38.2). There's no `amenity=university` campus polygon, so use landuse w193479536 as the compound. Gates nearby: (-34.3, 49.6), (-29.5, 71.5), (-53.5, 92.1), (-57.7, 98.3), (-71.4, 127.3).
- **Other campus polygons:** CSTARI hostel campus w193660281, 273×370 m, at (35.5, 95.6). An unnamed `amenity=college` w193657670, 609×748 m, centred at (-257.7, 107.4), west of TIU toward Nalban; it's huge and overlaps other plots, so treat it with suspicion. Roopkala Kendro (-183.7, 259.8). NITTTR w238285654 (52.1, 4.5). IEM (222.8, 153.9). Brainware (282.1, 165.8).
- **Open ground:** `natural=scrub` w158645682, 240×283 m, at (-1.1, 144.4), directly south of the centre. Garden w986997169, 200×183 m, at (21.5, 338.6).
- **Gates:** 149 `barrier=gate` (about 130 with `access=private`), 5 `lift_gate`, 2 bollards, 1 jersey barrier and 1 `entrance=yes`, almost all on plot frontages where service roads meet streets. The ones near the centre: (0.1, 3.1), (-39.6, 3.2), (26.5, 19.3), (15.1, -125.1), (38.9, -109.7), (56.2, -100.8), (32.3, -97.9), (40.0, -95.3), (72.9, -78.9), (-72.6, -35.0), (-89.8, -30.7), (-94.3, -35.6). The full list with ids is in `osm-landuse.json`.

## Gaps (OSM doesn't have this; needs Street View or the owner)

1. Real heights for nearly every tower (only 12 have levels). Highest priority: PwC, TCS Gitobitan, Wipro Tower 5, IBM Daksh, Srijan, Webel, Godrej Waterside/Infinity-area towers, and the unnamed large footprints listed above.
2. Starbucks, tea/food stalls, kiosks, pharmacies, convenience stores, auto/taxi stands, hawker rows.
3. Crossings, traffic signals, footpath edges, medians and median gaps.
4. Compound walls and fences, and which gate is the main pedestrian entrance for each campus.
5. Canal bank treatment (railing, wall, slope); roadside drains.

## Recommendations for `tools/build-map.py`

1. **Switch the input to the new extracts** (`osm-buildings.json`, `osm-water.json`, `osm-landuse.json`, `osm-pois.json`, `osm-streets.json`) and keep `area.json` for roads/rails until it's refreshed.
2. **Buildings:** export `lv` (levels, if tagged), `t` (building type), `o` (office/operator), `id` (OSM way id, so Street View corrections can be keyed to it), and `hs`, a height source of `osm`, `guess` or `sv`. Clip footprints at the square edge, or keep a building if its centroid is inside, instead of requiring every vertex inside. Skip `building:part` (or merge parts under their parent). Make the guessed heights consistent with tagged levels, e.g. guess levels first (large office 8–14, medium 4–7, house 2–4), then `h = lv × 3.2 × SCALE`. Load an overrides file such as `research/map/height-overrides.json`, keyed by way id, with levels from Street View. Today an unnamed block can be 54 u while an 18-floor tower is 28.8 u.
3. **Water:** export `waterAreas` (closed rings, clipped to R×1.3, with a minimum width of 12 m, which fixes the Street 13 pinch) and `bridges` (`bridge=*` road segments with `w`). Skip `man_made=storage_tank`. Add `waterLines` (Krishnapur etc.) and the S/SE lakes as horizon-only polygons. The game side would then add a water blocker grid with bridge exemptions. That's a code change, outside the scope of this audit.
4. **POIs:** export `shops: [{n, k, brand, p}]` from amenity/shop/vending/fuel/atm/bank nodes in the square, replacing the hand-typed `pois.burger` with the OSM Burger King node (71.6, 33.5). Keep a manual `extraPois` list for Starbucks and stalls found on Street View.
5. **Stops:** include `public_transport=platform` + `bus=yes` nodes (this adds Techno India at (-0.2, 9.6)), and dedupe pairs by name within about 30 m. Export `busStations` (depot and ST-6 polygons) and `metroGates`.
6. **Compounds:** export `compounds: [{t:'commercial'|'industrial'|'college'|..., n?, p}]` from landuse and campus polygons, plus `gates: [{p, a:'private'|'yes', k:'gate'|'lift_gate'}]`. Generated boundary walls can follow compound rings with openings at gate points and wherever a road crosses the ring.
7. **Streets:** export `lamps` (street_lamp nodes) and `lanes` per road. Infer medians from parallel same-name oneway pairs. Leave crossings/signals to a manual list.
8. Record the OSM base timestamp of each extract in the output JSON for traceability.
