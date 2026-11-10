# Survey gaps: City Centre, Ultadanga station, Sealdah north ground road

Follow-up to `LANDMARKS.md` and `ROUTES.md` §6 (gap 1). Surveyed 2026-11-11 from the Mac (headless Chromium, Metal GPU).
Images are in `img/gaps/` (gitignored). Coordinates are WGS84. Game coordinates come from `tools/map/geo.py` `to_game`
(x east, z south, 0.5 u/m, origin 22.57700, 88.42935).

**Limit on this pass.** From the first minutes onward, Google returned **HTTP 403 on every car Street View tile**
(`streetviewpixels-pa…/v1/tile`). It happened on a fresh browser profile too, and again on a retry about 40 minutes
later. Car panoramas load as black frames. User photospheres and photos (served from `lh3.googleusercontent`),
satellite imagery, map labels and the Street View coverage layer all still worked. So this pass relies on:
- user photospheres and photos;
- satellite and the coverage layer;
- the car images the earlier survey already saved in `img/` (Oct 2025 – Jan 2026);
- OSM geometry.

Anything that needs a ground-level car view is marked *unverified*. I didn't try to get around the block.

Another catch: **user photosphere headings are not calibrated.** At Sealdah, the "h0" view shows the station entrance,
which really lies to the east. Treat the `_hNNN` suffix on `sd_ps*` images as a label, not a compass bearing.

---

## 1. City Centre (Salt Lake) mall

**Location (verified).** Google's place "City Centre", DC Block, Sector 1, Bidhannagar, has its pin at
**22.58812, 88.40825** (`cc_search.jpg`). That's about 50 m north-west of the brief's 22.5876, 88.4085. The block sits
in the angle between:
- **3rd Ave** on its south-east side, a dual carriageway with the Green Line viaduct;
- **Salt Lake Rd** on its north-east side, which runs up to a large roundabout at about 22.5881, 88.4092
  (3rd Ave × Salt Lake Rd × 2nd Cross Rd);
- 1A Cross Rd and 2nd Ave on its west and north-west sides.

Sources: `cc_sat.jpg`, `sat_cc19.jpg`, `cov_cc19.jpg`.

**Why the earlier points missed it.** 22.5876, 88.4085 resolves to an indoor shop photosphere (a menswear store, May
2023, `cc_3rdave_*`). The car coverage on 3rd Ave's north carriageway runs along the mall frontage (`cov_cc19.jpg`), but
it is blocked this session. Clicking the line opens car pano `FRKCL2Tselb48m5-mmQ5xg` at **22.58778, 88.40898**.
Re-shoot from there when tiles work, headings about 325 (mall), 235 and 55 (along 3rd Ave) and 145 (metro side).

**Facade (partly verified, one user photo, Sep 2021, `ph_cc.jpg`).**
- Big plain **off-white / cream concrete walls** with board-marked panels. Above them sits a set-back **mauve /
  dusty-pink rendered band** carrying large store signs (an anchor-store box sign, a burger chain, a restaurant name).
  Use parody signs only.
- A **projecting square concrete frame filled with horizontal louvres**, set in the cream wall.
- A plain grey box (plant room or lift core) on top, plus a thin steel rail along the parapet.
- I saw **no terracotta** in what I could get. The "terracotta" idea is *unverified* and probably wrong for this
  street face.
- Height: about **3–4 storeys** of retail plus the rooftop box (estimated from the photo, *unverified*).

**Plan and plaza (inferred from satellite and the coverage layer).**
- The block isn't one box. It is cut through by a network of **open-air pedestrian lanes and small courtyards**. User
  photo paths trace them in `cov_cc19.jpg` / `sat_cc19.jpg`, along with dozens of indoor photospheres.
- Roof heights vary in buff, grey and white.
- Café and restaurant pins cluster where the lanes meet the edge: Starbucks and Chili's near the 3rd Ave (south)
  side, and the Samsung and phone-store edge on the north.
- Lane entries probably open from 3rd Ave at the south-west and from the north / 2nd Ave side (*unverified*).
- There's a small green "City Centre Adjoined Park" just west of the block (`cc_sat.jpg`).

**Across the road and the metro (verified layout, earlier car imagery Dec 2025).**
- **City Centre metro station** is on the Green Line viaduct over 3rd Ave, **directly across from the mall's south-west
  half**, at about **22.5870, 88.4077** (station roof visible in `cc_sat.jpg`). It's about 100–150 m south-west of
  the roundabout.
- Under the viaduct (`img/citycentre_metro_h0.jpg`): heavy beam/waffle soffit, round piers, blue hoarding walls,
  railings with parked cycles, a "City Centre" sign and paver footpaths.
- Beyond 3rd Ave: low 2–4 storey DC/EC Block houses with trees (`sat_cc19.jpg`).
- I found no skywalk between the station and the mall in satellite. Assume you cross 3rd Ave at grade (*unverified*).

**Must have for recognisability**
1. A cream concrete mass with a **mauve upper band and big store signs**, plus the **louvred square frame**.
2. The **Green Line viaduct and City Centre station right across 3rd Ave** from the mall.
3. The **big roundabout** at the mall's east corner (3rd Ave × Salt Lake Rd).
4. Glimpses of open-air lanes or a courtyard into the block (no single box mall).

---

## 2. Ultadanga suburban station ("Bidhan Nagar Road")

**Location (verified).** Google names the station **"Bidhan Nagar Road"**, pin **22.59145, 88.39081**
(`ult_search.jpg`, `cov_ult19.jpg`, `gal_ult_0.jpg`). The brief's 22.5890, 88.3900 is about 280 m south, on the
residential lanes west of the tracks.
- Platforms run **north–south** between about 22.5900 and 22.5925, at lon 88.3905–88.3910 (`sat_ult20.jpg`).
- **Ultadanga flyover** (VIP Rd / EM Bypass) is a separate structure **400–600 m east** (88.3952–88.3996,
  `LANDMARKS.md`). The station is not under or beside it.

**Station surroundings (map and satellite, verified layout).**
- **Bidhannagar Rd passes under the railway** at the station's north end, at about **22.5925, 88.3910**. It's a dual
  carriageway with the rail bridge overhead (`cov_ult19n.jpg`).
- **"Bidhan Nagar Station Footover Bridge"** is at about 22.5922, 88.3910.
- **Ticket counter and railway reservation counter are on the east side**, at about 22.5919–22.5921, 88.3911
  (`sat_ult20.jpg`).
- **CIT Rd** forks south off Bidhannagar Rd at about 22.5922, 88.3915 and runs 30–40 m east of the platforms.
  Car pano `fVM7aw1b5sqtNUpYiakALg` at 22.59152, 88.39141 is the closest street view of the station's east side
  (blocked this session).
- **Ultadanga Main Rd** carries on ESE to Ultadanga More and the flyover.

**Street look (earlier car images Jan 2026 plus one user photo Oct 2022).**
- `img/ultadanga_underpass_h270.jpg` looks west along Bidhannagar Rd from 70 Ultadanga Main Rd toward the station. It
  shows:
  - **tram rails set in the road**;
  - a **floral-painted private bus** (Garia route);
  - a blue-and-white railing median, green and yellow autos;
  - a long wall of hoardings and murals;
  - the **rail bridge / FOB spanning the road** on the horizon.
- `img/ultadanga_underpass_h0.jpg`: the junction corner with 5-storey sign-covered blocks (an insurer's blue sign, a
  gold-loan red sign, a telecom store). There are crowds on the kerb and a cluster of autos.
- `gal_ult_0.jpg` (user photo labelled "Bidhan Nagar Road", taken from height, probably the FOB):
  - a very wide junction packed with **yellow autos and yellow taxis**, private buses and coaches, and a tanker;
  - a continuous **wall of orange and blue banner hoardings**;
  - **blue tarpaulin stalls** on the footpath;
  - 4–6 storey blocks with huge billboards;
  - tram rails in the foreground.

**Still unverified.**
- The **station building's own front or entrance**: Google has no outdoor car or user pano of it, and every user photo
  of the station is indoors.
- Whether the main entry is from the Bidhannagar Rd underpass stairs or from the east-side lane by the ticket
  counter.
- The exact **auto stand** spot. Autos mass at the junction east of the rail bridge.

**Must have for recognisability**
1. **Bidhannagar Rd dipping under a rail bridge**, with the station FOB beside it and platforms running off south.
2. A wide, chaotic junction east of the bridge: autos and yellow taxis in a mass, floral private buses, tram rails in
   the asphalt.
3. A **hoarding wall** and blue tarp stalls. Corner blocks of 4–6 storeys plastered with signs.
4. The Ultadanga flyover (blue-white diamond parapet) visible **to the east**, not overhead.

---

## 3. Sealdah north: the ground route beside Vidyapati Setu

**Where the data stops now.** In `corridors.json` corridor A, the drive ends at polyline i=103 (22.570136, 88.370904),
where APC Rd becomes the ramp. Then:
1. a 7 m synthetic `gap` (way -1);
2. the 583 m walk tail: Nahindra Nath Mitra Row → `pedestrian` w1124385976 (under the APC arm of the deck) → subway
   w1124385977 → w105833315 (under the deck south of the Y) → BB Ganguly St → one-way service w51766048 → forecourt
   22.56705, 88.3703.

So the current walk goes **under** the deck to BB Ganguly St and loops back east. `osm-sealdah-forecourt.json` has no
drivable way north of the forecourt's parking aisles (w693289706, w1453655287, apex about 22.5678).

**What is really there (verified from OSM, Google map and satellite; partly from imagery).**
- **The ground route is on the east (station) side, about 17 m east of the deck's centreline.**
  - OSM maps it as `highway=pedestrian` **w105833278**, a straight 365 m line from APC Rd at Kaiser St
    (22.570797, 88.371343) down to the forecourt.
  - Google shows a **user photo path along exactly this line** (`cov_sdah19n.jpg`, `cov_sdah19s.jpg`, `sat_sdah20n.jpg`),
    so people walk it end to end.
  - It sits between the deck's east edge and the **St John's Church / compound wall** on the east.
- **No Google road is drawn there north of about 22.5682.** At that point Google's **"Sealdah Station Rd"** begins and
  runs SSE into the forecourt's **drop-off loop** (`cov_sdah19s.jpg`). Treat the strip north of 22.5682 as **a
  walk / handcart lane, not a car road** (*car use unverified*).
- **Ground-level look (Oct 2025 deck photo `img/sealdah_north_entry_h90.jpg`, `_h180`):**
  - a **row of tin-roofed shops and stalls** faces the deck along the strip (a lottery-ticket counter, small agencies,
    colourful market umbrellas);
  - **utility poles with heavy cable bundles** line the deck edge;
  - **a tall old masonry compound wall** stands behind the stalls, with a red-and-cream colonial building and big trees
    beyond.
  - At the north end there's a market with green tarps (`_h90` left).
- **Width:** about 8–12 m between the deck edge and the wall, roughly half of it taken by the stall row
  (satellite estimate, *unverified*).
- **Direction:** *unknown*. There are no arrows, it's tagged pedestrian, and nothing in the imagery shows cars on it.
- **Forecourt end (user photospheres May 2022 `sd_ps22_*`, `sd_vp_ps_h180`, and Apr 2019 `sd_ps19_h300`,
  `sd_vp_fc_h90`):**
  - **cracked concrete paving**;
  - a **raised garden island**: brick plinth, red-and-cream railings, clipped shrubs, and a **golden winged-angel
    statue against a blue arched backdrop**;
  - painted **mural hoardings**, big **lattice billboards**, steel crowd barricades, white railing fences,
    yellow-black bollards;
  - **cycle-vans**, blue kiosks;
  - the long **green vertical-garden wall with a tall flag mast**;
  - the orange-and-white **Sealdah North** block with "শিয়ালদহ (উত্তর)" / "SEALDAH" on the canopy over wide steps
    (pink neon at night, very crowded).
- **Where vehicles drop passengers:**
  - **(a)** at grade on **APC Rd just before the ramp**, around the Kaiser St junction (22.5708, 88.3712);
  - **(b)** in the **forecourt drop-off and parking loop**: two U-shaped aisles, OSM paid surface parking w1453657661.
    It's reached from the **south** by the one-way service road w51766048 off BB Ganguly St / Parikshit Roy Lane.
    That's the route corridors B and C already use.

  On the north side, nothing shows cars reaching the forecourt from APC Rd at ground level (*unverified, no car
  imagery*).
- **Hawkers:** the stall row along the strip (above) and tin-roofed stall rows under and beside the deck
  (`LANDMARKS.md` §1). Their state after the October 2026 eviction drive is *unknown*.

**Ordered ground path: APC Rd (flyover foot) → forecourt**, about 485 m. Points 1–13 follow OSM w105833278. Points
13–18 enter the drop-off loop (OSM w693289706 / w1453655287) and end at the corridor's forecourt point. Spacing is
about 29 m.

| # | lat, lng | game x, z | step m | cum m | note |
|---|---|---|---|---|---|
| 0 | 22.570841, 88.371231 | -2987.0, 340.4 | 0 | 0 | APC Rd at Kaiser St (corridor A polyline i=102); leave APC before the ramp |
| 1 | 22.570797, 88.371343 | -2981.2, 342.8 | 12 | 12 | east kerb; start of the strip (w105833278) |
| 2 | 22.570556, 88.371224 | -2987.4, 356.2 | 29 | 42 | market with green tarps at the north end |
| 3 | 22.570314, 88.371105 | -2993.5, 369.5 | 29 | 71 | |
| 4 | 22.570073, 88.370986 | -2999.6, 382.9 | 29 | 101 | ramp is beside you to the west, still low |
| 5 | 22.569831, 88.370867 | -3005.7, 396.2 | 29 | 130 | deck now overhead-height to the west |
| 6 | 22.569590, 88.370748 | -3011.8, 409.6 | 29 | 159 | stall row and compound wall to the east |
| 7 | 22.569349, 88.370629 | -3017.9, 422.9 | 29 | 189 | |
| 8 | 22.569107, 88.370510 | -3024.1, 436.2 | 29 | 218 | St John's Church compound to the east |
| 9 | 22.568866, 88.370391 | -3030.2, 449.6 | 29 | 247 | opposite the deck's Y (MG Rd arm splits west) |
| 10 | 22.568624, 88.370273 | -3036.2, 462.9 | 29 | 277 | |
| 11 | 22.568383, 88.370154 | -3042.3, 476.3 | 29 | 306 | |
| 12 | 22.568141, 88.370035 | -3048.5, 489.6 | 29 | 335 | Google "Sealdah Station Rd" begins; forecourt opens east |
| 13 | 22.567900, 88.369916 | -3054.6, 503.0 | 29 | 365 | leave the strip, turn east |
| 14 | 22.567768, 88.370136 | -3043.3, 510.3 | 27 | 392 | apex of the drop-off loop |
| 15 | 22.567777, 88.370166 | -3041.7, 509.8 | 3 | 395 | |
| 16 | 22.567470, 88.370290 | -3035.4, 526.7 | 36 | 431 | east arm of the loop |
| 17 | 22.567171, 88.370421 | -3028.6, 543.2 | 36 | 467 | south end of the aisle |
| 18 | 22.567050, 88.370300 | -3034.8, 549.9 | 18 | 485 | forecourt end (`corridors.json` `end`) |

This is about 100 m shorter than today's 583 m walk tail, and it keeps the player at grade on the station side the
whole way. Point positions come from OSM. My pixel estimates from Google tiles agree to within about 10–15 m.

**Obstacles along it**
- **Deck edge and piers** on the west side the whole way. Pier spacing and positions are *unverified*: no ground car
  imagery. Plan for piers about every 25–30 m, roughly 8 m west of the path.
- **Utility poles with cable bundles** at the deck edge (pts 1–12).
- **Stall row** (tin roofs, umbrellas, counters) on the east side (pts 2–12). The **compound wall** is behind it. There
  is no exit east until the forecourt.
- At the **north end** (pts 1–3), market stalls under green tarps and the APC Rd kerb. Crossing traffic at the Kaiser
  St junction.
- In the **forecourt** (pts 12–18):
  - the garden island with the angel statue and railings;
  - steel crowd barricades and white railing fences;
  - yellow-black bollards;
  - lattice billboard legs, parked taxis in the loop, cycle-vans and handcarts;
  - the flag mast and vertical-garden wall along the south;
  - dense crowds by the Sealdah North steps.

**Game suggestion (not applied).** Swap the `gap` link plus the under-deck walk tail for points 0–18. Make points 1–13
a walk / handcart lane with the stall row. Let vehicles end either at point 0 (APC Rd drop) or in the forecourt loop
from the south.

**Still unverified for gap 3:** the strip's width, surface and whether cars use it. Pier positions. The live state of
the stalls. All of these need a ground car view (piers) or a fresh visit.

---

## Re-shoot list (when car tiles load again)

- `FRKCL2Tselb48m5-mmQ5xg` (22.58778, 88.40898): City Centre frontage on 3rd Ave.
- `okA9eKimVRneFuSPiTfETQ` (22.58798, 88.40843): inside the City Centre block (trekker-style car pano).
- `fVM7aw1b5sqtNUpYiakALg` (22.59152, 88.39141): CIT Rd beside Bidhan Nagar Road station.
- `GyLpN1e0sumtLZVCQiU-jA` (22.57004, 88.37085) and `HS6koHNsjV-mqct5IfnHsg` (22.56947, 88.37056): Sealdah north,
  the ramp foot and beside the deck.
- The coverage layer (`…/data=!5m1!1e5`) plus a click on the line is the reliable way to land on these. The
  `viewpoint=` URL often misses them by 10–20 m.
