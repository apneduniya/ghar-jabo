# Route landmarks: Salt Lake Sector V to Sealdah (Street View survey)

Surveyed 2026-11-09 in Google Street View (headed Chromium on the Mac, not signed in). Junction coordinates
come from OSM (Overpass, © OpenStreetMap contributors). Screenshots are in `img/` (gitignored, reference only).
`img/log.txt` lists each shot with the point, capture date, "car" (Google Street View car) or "USER" (a
contributed photosphere), and the pano ID. File names are `<point>_h<heading>.jpg`, where heading 0 = north and 90 = east.

**Imagery dates.** Most car imagery is **Nov 2025 – Feb 2026**. Exceptions: Sealdah south and the Bengal
Chemical underpass are Dec 2022; the Karunamoyee bus terminus is Jun 2024. User photospheres run from 2017 to 2025.
The Sealdah station front has **no car imagery**, so its facade comes from user photospheres (May 2017, May 2022,
Jul 2022, Aug 2025).

**Didn't get:** the Salt Lake Stadium bowl from street level (trees and the outer fence hide it; there's no
imagery inside the grounds), the City Centre mall facade (the shots by its block show a vacant SUDA plot and
leafy 2nd Avenue, not the mall), and a car view of Ultadanga station (every attempt snapped indoors). Treat
those three as unverified.

## Things that repeat along the whole route (build once, use everywhere)

- **Blue-and-white kerbs** (alternating painted blocks, about 1 m each) on almost every median and island.
  The state colour scheme, also on railings, flyover parapets and pillar plinths.
- **Blue iron pedestrian railings** with spear-tip posts, along medians and corners. Older ones are plain blue
  vertical bars. Newer ones have blue-and-white panels (`chingrighata_*`, `beleghata_bypass_*`).
- **Flyover parapets**: low concrete walls painted blue and white. On Ultadanga flyover the pattern is a
  **big blue-and-white diamond/zig-zag** (`ultadanga_flyover_*`). On Vidyapati Setu (Sealdah) it's a blue wall
  with white-framed panels and **red-and-white bollards** splitting the lanes (`sealdah_flyover_top_*`).
- **Green Line metro viaduct** (Karunamoyee to Bengal Chemical): a wide box deck over 3rd Ave with a **waffle
  soffit**, round grey piers, and blue-and-white painted pier bases. It's dark and cavernous underneath. Under
  the stations the piers have mosaic tiles and painted geometric murals (`stadium_metro_*`, `centralpark_*`).
- **Vehicles**: yellow-and-green CNG autos (stand in packs at corners); yellow Ambassador taxis (fewer now, still
  a rank at Sealdah); private buses in blue and yellow with painted flower borders and a hand-lettered route
  (`ultadanga_underpass_h180`); WBTC buses in white with a red or blue band; cycle-rickshaws and hand carts;
  white Kolkata Police cars with a blue stripe; green "Bidhannagar Police" vans.
- **Hoardings** sit on steel lattice frames, often 2–3 stacked at junctions. Use parody brands only.
  Political banners are everywhere in the real imagery. **Don't model politicians' faces.** Use blank or
  generic festival banners.
- **Overhead cables**: dense bundles on concrete or steel poles in old Kolkata (Sealdah, Narkeldanga,
  Beliaghata). Salt Lake and the Bypass have far fewer.
- **Tarpaulin hawker stalls** (blue, grey and black sheets on bamboo) along footpaths at Sealdah, Narkeldanga
  and Phoolbagan.

---

## 1. Sealdah (station forecourt, Vidyapati Setu flyover, APC Road)

Station: 22.5680, 88.3711 (OSM). Vidyapati flyover deck runs 22.5651–22.5710 at about 88.3684–88.3709,
N–S along APC Road / SH1, passing the west side of the station.

**Road cross-section.**
- **Vidyapati Setu** (flyover), about 4 lanes and one-way per carriageway. The deck is roughly 6–7 m up, level
  with the 2nd floor of the old buildings beside it. Red-and-white plastic bollards split the lanes. The
  parapets are blue with white-framed panels. **Tram tracks are set into the flyover deck** (visible in
  `sealdah_a_h180` from 2017 and `sealdah_north_entry_h270` from 2025). Overhead tram wires were visible in 2017.
- **APC Road / Sealdah Flyover Rd at grade** (`sealdah_apc_s_*`, `sealdah_e_*`): 3–4 lanes and chaotic. Buses,
  taxis and autos merge. There's a Kolkata Traffic Police kiosk and steel barricades, with crowds crossing
  everywhere. A **pedestrian footbridge** crosses SH1 south of the station (yellow-green girders covered in
  ad banners, `sealdah_e_h180`).
- North of the station (`sealdah_apc_n_*`): wide road, a median with blue-white diamond kerbs, and a long row
  of **tarpaulin shanty stalls** along the east footpath.

**Station building.**
- **Sealdah North** (`sealdah_d_*`, `sealdah_fore2_h0`): a long 3–4 storey block. Its facade is **white with
  bright orange vertical fins and orange horizontal bands**, with box windows and AC units. Big pink/maroon
  letters **"SEALDAH (NORTH)"** run along a concrete canopy over the entrance, with Bengali and Hindi beside
  them. There are wide entry steps, white railings and colourful murals on the ground-floor walls.
  A green LED clock or display sits on the roof line (`sealdah_d_h90`). The building is about 300 m long.
- **Forecourt**: a big open paved area with steel crowd barriers, luggage piles and people sitting. There's a
  round **brick planter with railings and a golden winged statue** on a blue disc, a fountain-style centrepiece
  (`sealdah_d_h270`). The forecourt is ringed by billboards on lattice frames.
- **Sealdah Main** (`sealdah_front_h90`, May 2017): a long **red-brick building with cream bands and white window
  frames**, 3–4 storeys, older colonial style. A big **yellow Ambassador taxi rank** with barricades sits in front.
- **Concourse** (`sealdah_fore1_*`, `sealdah_front_h0`, Aug 2025): a huge **green translucent polycarbonate
  roof on a steel lattice**, a stone floor, a row of food stalls and kiosks, and a **yellow sign reading
  "শিয়ালদহ মেইন / Sealdah Main"**. Murals of old Calcutta (trams) cover the walls.
- I found **no station clock** in any shot of the facade. Don't build the clock from memory. Check before adding
  one.

**Around.**
- Old 4–5 storey colonial buildings with crumbling plaster line the flyover (cream, grey). There are small
  "Hotel" signs, like the 5-storey cream **Ashoka Hotel** at the south end (`sealdah_bbg_*`).
- East of the flyover's north end is a **red-brick 3-storey railway building with white trim**
  (`sealdah_north_entry_h90`).
- A tall **Indian flag on a mast** stands east of the flyover near the station (`sealdah_flyover_top_h90`).
- **Hawker zone**: tin-roofed stall rows run below and beside the flyover (`sealdah_north_entry_h90/h180`).
  South of the station on Parikshit Roy Lane / Beleghata Rd start, there are **plant-nursery stalls** under
  tin roofs below a 7-storey cream building with **yellow window frames** (`sealdah_south_*`, NRS hospital side).
- Underground: the Green Line Sealdah metro has a white and granite concourse with tiger and folk murals
  (seen in a Jul 2022 photosphere at 22.5668, 88.3699; I didn't keep the shots).

**Must have for recognisability**
1. Long white-and-**orange-banded** Sealdah North block with the pink "SEALDAH" lettering on its canopy.
2. Vidyapati Setu running past the station: a raised deck with blue parapets, red-white bollards and
   **tram rails in the road**.
3. Yellow taxi rank and crowd barriers in a huge open forecourt, with the red-brick Main building behind.
4. A green polycarbonate concourse roof visible through the entrances.
5. Dense hawker sheds, a footbridge over SH1, and stacked hoardings.

Images: `sealdah_a_*` (2017), `sealdah_c_*`, `sealdah_d_*`, `sealdah_e_*`, `sealdah_fore1_*`, `sealdah_fore2_h0`,
`sealdah_front_*`, `sealdah_south_*`, `sealdah_apc_n_*`, `sealdah_apc_s_*`, `sealdah_flyover_top_*`,
`sealdah_north_entry_*`, `sealdah_bbg_*`.

## 2. Ultadanga (VIP Road flyover, Ultadanga Main Rd, CIT Road)

Ultadanga More (Bidhannagar Rd × Kazi Nazrul Islam Ave / VIP Rd): 22.5914, 88.3935. Ultadanga Flyover:
22.5857–22.5954, 88.3952–88.3996, carrying the EM Bypass/VIP Road over the junction and the railway.
Railway underpass on Bidhannagar Rd: 22.5922, 88.3912. Bidhannagar Road station: 22.5913, 88.3910.

**Road cross-section.**
- **Flyover** (`ultadanga_flyover_*`): two lanes per direction on separate carriageways. The deck is about
  8 m up. The parapets carry a large **blue-and-white diamond pattern** you can see from far off. Tall
  streetlights stand on the parapet. From the deck you look down on 4–5 storey blue and white housing blocks,
  with the tall towers of Salt Lake and Kankurgachi on the skyline.
- **Kazi Nazrul Islam Ave at grade** (`ultadanga_more_*`): a canal bridge section with blue-and-white parapets and
  steel barricades. The flyover curves overhead. Huge billboards stand on the corners.
  Tall residential towers (15–20+ floors, cream/white) are visible to the south.
- **Ultadanga Main Rd / underpass mouth** (`ultadanga_underpass_*`): busy and narrow-feeling. There's a blue
  railing median, crowds at the corner and a cluster of autos. Private buses go to Baghbazar and Garia.
- **CIT Road at Ultadanga** (`ultadanga_cit_*`): 2 lanes each way with a blue-railing median. WBTC buses are red
  with a white band. A wide open junction has stacked hoardings and a **Bandhan Bank**-style blue-and-red corner
  block (use a parody).

**Buildings.** Dense 4–6 storey commercial blocks covered in signboards: an LIC-style blue sign, a red store
sign, sign-board shops. There's a pink 5-storey block at the CIT corner and an "ULTADANGA" text on a shop sign.

**Must have for recognisability**
1. The **blue-white diamond parapet** on a long curving flyover over the junction.
2. A packed corner of 5–6 storey sign-covered commercial blocks at the underpass mouth.
3. Autos massed at the corner and private buses with painted floral sides.
4. Skyline of tall residential towers to the south-east.

Images: `ultadanga_more_*`, `ultadanga_flyover_*`, `ultadanga_underpass_*`, `ultadanga_cit_*` (all Dec 2025 – Jan 2026).

## 3. Phoolbagan (CIT Road × Narkeldanga Main Rd)

Junction: 22.5723, 88.3894. Phoolbagan metro (Green Line, underground) is at the junction (22.5721, 88.3902).

**Road cross-section.** CIT Road is a broad boulevard, about 2 lanes each way. It has a **planted median**
(palms and trees behind a low iron railing and blue-and-white kerbs, `phoolbagan_cit_n_*`). Narkeldanga Main Rd
is narrower: 2 lanes, undivided, with stalls on both footpaths. The junction has zebra crossings and signals.

**Junction features** (`phoolbagan_x_*`):
- A **round raised traffic island**, a dark-tiled plinth planted with shrubs and festooned with flags and banners.
  Street-name signs stand on it.
- A **white statue on a pedestal** at one corner.
- A **pandal-style welcome arch** across one arm of the road (temporary, but there's usually one).
- A cream 4-storey corner building with a big **pink-red hotel sign** (parody e.g. "Bothra"-style guest house).
  Large hoardings stand on rooftops (saree and jewellery ads).
- Cycle-rickshaws and autos wait at the corners.

**Narkeldanga Main Rd west of the junction** (`phoolbagan_ndr_w_*`): a blue-and-white single-storey building
behind a gate, roadside tea and food stalls under trees, speed breakers, and 6–7 storey cream apartment blocks.

**Must have for recognisability**
1. The round flag-and-banner island in the middle of a 4-arm junction.
2. The tree-lined CIT Road median with blue-white kerbs.
3. A rooftop hoarding cluster and a pink hotel sign on the corner block.
4. A white statue on a corner pedestal.

Images: `phoolbagan_x_*`, `phoolbagan_cit_n_*`, `phoolbagan_ndr_w_*` (Dec 2025).

## 4. Narkeldanga (Narkeldanga Main Rd)

Point: 22.5745, 88.3810 (Narkeldanga Main Rd, between the canal and Phoolbagan). The road is 2 lanes,
undivided and busy (`narkeldanga_*`). It's lined with **shuttered ground-floor shops** (grey roller shutters)
under 2–4 storey old houses with balconies. Gunny sacks and goods are piled on the footpath, along with hand carts and
a small yellow-and-green **club building** with a Bengali signboard. Dense overhead wires, autos and parked cars.
It's an "old north Kolkata" street, with no single landmark.

**Must have:** roller-shutter shopfronts, sacks on the pavement, a club-house sign, a tangle of wires, and autos.

Images: `narkeldanga_*` (Dec 2025).

## 5. Beliaghata (canal bridge, CIT Rd Scheme 6M, Hem Chandra Naskar Rd crossing)

- **Beleghata Canal Bridge / Khalpar**: 22.5657, 88.3822 (`beliaghata_khalpar_*`). An old bridge with
  **ornate cast-iron railings** (rusty brown-orange looped rings between blue posts) and squat masonry piers.
  The canal is hidden by dense trees and creepers. 2 lanes. Blue private buses.
- **Beleghata Main Rd** at 22.5645, 88.3880 (`beliaghata_main_*`): 2 lanes, undivided. A blue-railing footpath,
  tarpaulin-roofed stalls, 4–6 storey apartment blocks (pink, cream) and trees.
- **CIT Rd Scheme 6M** at 22.5640, 88.3946 (`beliaghata_x1_*`): a quiet boulevard with a **thickly planted
  median** (young trees behind a blue railing). Old 4–5 storey houses with curved balconies and a white
  Art-Deco-ish corner block. Gas-cylinder carts.
- **Hem Chandra Naskar Rd × Beleghata Main Rd** at 22.5631, 88.3963 (`beliaghata_x2_*`), the recognisable one:
  - A small landscaped island with a white sculpture plinth and **bronze/golden group statues** on pedestals.
  - A big **"I ♥ KOLKATA" letter sign** in front of a mural wall, with a large **bust/head sculpture** beside it.
  - A **Kolkata Traffic Police kiosk** (white and blue box, police crest).
  - Blue-and-white kerbs, a railing-lined median, a zebra crossing and tall pole lamps with clusters of lights.
  - Buildings: 4–5 storey pink and cream blocks with shop signs. A government building (Beleghata police station
    and post office per OSM) is nearby.
- **Sealdah side approach** (`beliaghata_flyover_land_*`, S Sealdah Rd, 22.5633, 88.3750): a raised road with
  low railings over a belt of **shanty roofs** (tiles and tin) and dense trees. A decaying 3-storey colonial
  mansion stands on the north side.

**Must have for recognisability**
1. The statue island with an "I ♥ KOLKATA" sign at the HCN Rd crossing.
2. Ornate rusty cast-iron railings on the canal bridge.
3. Leafy roads with blue railings and mid-rise pink and cream blocks.

Images: `beliaghata_khalpar_*`, `beliaghata_main_*`, `beliaghata_x1_*`, `beliaghata_x2_*`,
`beliaghata_flyover_land_*` (Dec 2025).

## 6. EM Bypass: Salt Lake Stadium, Beleghata crossing, Chingrighata

- **Salt Lake Stadium metro** (22.5731, 88.4031, `stadium_metro_*`): the Green Line station box sits over the
  Bypass service road. Underneath it's a dark concrete undercroft with **round piers clad in multicolour
  mosaic** and a geometric mural (orange, grey, cream triangles). There are blue railings, parked bikes and
  stalls. The underside has a waffle-beam grid.
- **Stadium frontage on the Bypass** (22.5700, 88.4058, `stadium_bypass_*`): a long **white vertical-bar
  fence** around a pink paver plaza, and a big **concrete portal gate**: two square pillars and a lintel with a
  circular emblem on top and "VYBK"-style letters. Floodlight masts behind. A beige 4–5 storey admin building
  with a curved glass front stands to the NE. The Bypass is 3 lanes each way with a blue-railing median and
  blue-white kerbs. **The bowl itself is not visible from the road**: it's set back behind the plaza and trees.
  For the game, show floodlight towers and the top of the bowl rim behind the gate.
- **Salt Lake Stadium Rd / Hyatt** (22.5712, 88.4045, `stadium_gate_*`): a quiet road with a black iron hotel
  fence, palms, a red-and-grey paver footpath and a **purple-and-white "Hyatt Bus Stop" shelter**
  (rename it in the game).
- **Broadway Rd** (22.5641, 88.4100, `stadium_broadway_*`): a planted median. A long white compound wall with a
  "SAI" logo (Sports Authority) on one side, and a red-brick-clad office block on the other.
- **Beleghata × Bypass crossing** (22.5618, 88.4083, `beleghata_bypass_*`): a huge open signalised junction.
  **Orange Line Beleghata metro Gate 1** is a black glass box with a swooping single-pitch dark roof. Blue
  railings, a gantry hoarding, and Salt Lake towers on the horizon.
- **Chingrighata** (22.5590, 88.4108, `chingrighata_*`): the Bypass is about 3 lanes each way, with newer
  **blue-and-white panel railings**, a colourful footbridge to the north, and a long blue-and-white 4-storey
  government block. The Chingrighata flyover (OSM 22.5575, 88.4127) is just south of this point.

**Must have for recognisability**
1. Stadium: the white-fenced plaza and concrete gate with a round emblem, floodlights, and the metro station box
   with mosaic piers nearby.
2. Bypass: a wide multi-lane road with a blue-railing median and very few buildings at the edge (trees, walls).
3. Beleghata crossing: the dark-roofed glass metro entrance box.

Images: `stadium_metro_*`, `stadium_bypass_*`, `stadium_gate_*`, `stadium_broadway_*`, `beleghata_bypass_*`,
`chingrighata_*` (Dec 2025 – Jan 2026).

## 7. Salt Lake: Karunamoyee, Central Park, City Centre, Bengal Chemical (3rd Ave metro corridor)

- **Karunamoyee crossing** (3rd Ave × 7th Cross Rd, 22.5858, 88.4222, `karunamoyee_clock_*`, Feb 2026):
  the Green Line viaduct crosses overhead on tall single piers. One pier rises from a **round island with a
  blue-and-white painted base**. **Karunamoyee station** has a bulging **blue metal-clad shell** with a curved
  roof. Bunting is strung across the road. Private buses, autos, a busy pedestrian corner and red shop signs.
  A 5–6 storey glass-and-blue office block stands to the NE.
- **Karunamoyee bus terminus** (22.5853, 88.4210, `karunamoyee_bus_*`, Jun 2024): a wide open asphalt yard with
  angled bus bays split by grass islands. Long-distance AC coaches (blue/white), yellow private buses and green
  WBTC buses. There are single-storey white terminal sheds with blue trim and a **blue-and-white gate arch**.
  A **tall brick-red clock tower** with a square shaft and a clock face near the top is the landmark here
  (`karunamoyee_bus_h90`). The station's blue curved roof shows above the trees.
- **Under the viaduct at Karunamoyee/3rd Ave** (`karunamoyee_metro_*`): a wide deck with a waffle soffit and round
  piers. The footpath kerb is blue-and-white. Police vans park underneath.
- **Central Park** (22.5902, 88.4152, `centralpark_*`): the same deck. Station piers have **colourful painted
  murals** (red, orange and blue folk motifs). Taxis park and there are hawker bundles under the deck. Central
  Park's trees and gate are on the south side.
- **City Centre** (22.5870–22.5895, 88.4068–88.4092, `citycentre_metro_*`, `citycentre_mall_*`, `citycentre_w_*`):
  the viaduct runs along 3rd Ave past DC Block. Underneath are blue hoarding walls and parked cars. Elsewhere it's
  leafy Salt Lake: **2nd Avenue is a tree tunnel** with a wide grass median, and 3–4 storey villas with palms.
  A Bidhannagar traffic police kiosk sits by the station. **I didn't get the mall facade in shot**. Survey it
  before modelling the mall.
- **Bengal Chemical** (22.5803, 88.4012, `bengalchem_h0`, `bengalchem_h270`, Dec 2022): a dark undercroft below
  the Bypass flyover and station, with mosaic piers and tin shacks.

**Must have for recognisability**
1. The **viaduct over 3rd Ave** (waffle soffit, round piers, blue-white plinths) all the way from Karunamoyee to
   City Centre.
2. **Karunamoyee station's blue curved shell** and the brick clock tower in the bus yard.
3. Long-distance coaches and private buses in an open yard.
4. Green, quiet Salt Lake avenues with grass medians, which contrast with the dense old city west of the canal.

Images: `karunamoyee_bus_*`, `karunamoyee_metro_*`, `karunamoyee_clock_*`, `centralpark_*`, `citycentre_metro_*`,
`citycentre_mall_*`, `citycentre_w_*`, `bengalchem_h0`, `bengalchem_h270`.

---

## Character gradient along the route (for the generator)

| Stretch | Building height | Density | Greenery | Signature |
|---|---|---|---|---|
| Salt Lake (Karunamoyee to City Centre) | 3–5 floors, some glass offices | low | high (tree avenues, grass medians) | metro viaduct over 3rd Ave |
| EM Bypass (Stadium to Chingrighata) | sparse, set back | very low | high, with walls | wide road, blue railings, metro boxes |
| Ultadanga / Phoolbagan / CIT Rd | 4–7 floors | medium-high | medium (planted CIT median) | flyover diamond parapet; flag island |
| Narkeldanga / Beliaghata | 2–5 floors, old | high | medium | shutters, wires, statue island, canal bridge |
| Sealdah | 3–7 floors, old colonial plus the station | very high | low | orange-banded station, flyover with tram rails |
