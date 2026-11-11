# Street View survey: north and west (Wipro More, Sector V metro, canal)

Surveyed 2026-11-09 from Google Street View (headed Chromium on the Mac). Most imagery is
**Jan–Feb 2026** (Google car). Exceptions are noted: one 2016 photosphere, and 2020/2022 user photospheres
inside the station and the IIHM campus. Screenshots are in `img/north/` (gitignored, reference only).
`img/north/log.txt` lists every shot with the coordinate Google snapped to.
File names are `<point>_h<heading>.jpg`. Heading 0 = north, 90 = east.

**3D tilt view: not available.** Tilted or globe mode rendered black every time. Kolkata appears to have no
3D mesh, or it doesn't render here. Heights below are counted from floors in Street View. Footprints and
the canal come from flat satellite (`t3d_b.jpg`, `t3d_c.jpg`) and the OSM extract.

Offsets are in metres from the game origin, PwC More (22.57700, 88.42935): **E** = east, **N** = north.
(Game units are 2 m per the audit, so halve these.)

## Big-picture layout (read this first)

A single SW–NE corridor dominates the north edge. From SE to NW across it:

1. **Nabadiganta flyover** (OSM calls it the "Salt Lake Bypass" viaduct). It is two separate decks
   (one per direction), each about 2 lanes. Deck soffit about 6–7 m over Street 13. The NE-bound deck ramps
   down to grade just before the metro station and lands on Biswa Bangla Sarani.
2. **"Canal Side Road"**: a ground-level one-way service road (1 lane plus a kerbside parking or auto
   lane) from Wipro More to the station. It runs between the flyover and the metro.
3. A **landscaped strip** with frangipani, palms and lawns behind a white decorative railing.
   The **Green Line metro viaduct** stands in this strip on single round piers with hammerhead caps.
4. The **Keshtopur canal** (about 15 m wide), hidden by trees on both banks.
5. **Chavipatty Road** on the north bank: a quiet 2-lane residential street. Its canal side has a brick
   plinth wall with a blue iron railing. On the other side are 3–5 storey Salt Lake EE/CL Block houses.

At the NE end of this corridor, **two elevated stations stand side by side** on Biswa Bangla Sarani, joined by
an enclosed steel-truss skywalk:
- **Salt Lake Sector V** (Green Line, Line 2 terminus), on the canal side.
- **IT Centre** (Orange Line, Line 6, New Garia–Airport). It spans the road. Its signage is up. I didn't
  verify whether it is in service.

At **Wipro More** the Street 13 / 3rd Avenue axis crosses under the flyover. North of the flyover it crosses
the canal on a **short, flat, almost invisible bridge** (about 40 m). Just NW of that, the Green Line viaduct
**curves overhead** and turns west toward Nalban.

---

## 1. Street 13: PwC More → Wipro More (about 370 m, NW-bound)

Bearing about 309° (NW). The road bends slightly. Street View has a **gap in 2026 coverage** at about
130–250 m from PwC More (`s13_03`, `s13_04` returned nothing or a 2016 photosphere).

**Road (whole stretch):** 2 lanes each way. **Raised planted median** about 1.5–2 m wide: a low hedge, small
trees and shrubs, with kerbs painted **blue-and-white** (the Kolkata standard; every kerb in the area has it).
Footpaths are 1.5–2.5 m, broken paving or packed earth, with blue/white kerb paint. Ornamental 2–3-lantern
lamp posts sit on the footpaths. Tall single-arm lights stand in the median. Overhead wires and junction boxes
are on the east side near Wipro More. Traffic: WBTC blue/yellow buses and gaudy private buses (Maa Chandi,
Manashi), green-yellow CNG autos, totos, cycle-rickshaws with decorated canopies, cycle vans.

| m from PwC More | East / NE side | West / SW side | Image |
|---|---|---|---|
| 0 (PwC More, 22.57687, 88.42932) | **PwC compound**: white boundary wall with a gate and a security post. Behind it an older 3–4 storey concrete block. A small "pwc" sign sits on the wall. IEM Public School hoardings. Lantern lamp posts. | A **blue-and-white chequered building** (police; OSM has Sector V Police Station at 22.57678, 88.42987, SE corner). A tall glass curtain-wall tower (about 15+ floors) beyond the SW corner. **Auto stand with tarp-roofed shacks** at the corner. High-mast light. | `s13_00_h39`, `_h129`, `_h219` |
| ~50 (22.57706, 88.42888) | **Shanty stalls**: tin and tarp lean-tos against a corrugated-sheet fence, blue/white railing, a parked carrier truck | 12–14 floor **glass tower with brown/pink spandrels** behind palms | `s13_01_h39`, `_h309` |
| ~90 (22.57723, 88.42853) | **Tea / food stall row**: about 5–6 stalls under one long rusty tarp shed against the compound wall. Benches, red/orange banners, an auto parked in front. | Same brown-glass tower (about 12+ floors), car parking in front. A **white concrete lotus sculpture in the median.** | `s13_02_h39`, `_h309` |
| ~180 (22.57771, 88.42778) | **Long thatched/tarp "lunch hotel" shed** with blue tarpaulin walls, benches and a small flag. A decorated cycle-rickshaw and an auto. Behind it **IIHM Global Campus** (white, blue logo, about 6–8 floors). | **AltAir Capella–type brown-glass office tower** (about 10–12 floors, glass with salmon spandrels), gate with crowd, surface parking, royal palms | `g2_h39`, `_h129`, `_h219`, `_h309`; IIHM courtyard `g1_*` (2022) |
| ~280 (22.57839, 88.42712) | **Construction site**: paired raw concrete columns (about 15–20 m, rebar sticking out), steel scaffolding, a "GO SLOW … M.P. Construction" hoarding. A white 8–10 storey block with brown balcony bands behind a black iron gate. | Tall pinkish-beige slab towers (about 14–16 floors) further SW | `s13_06_*` |
| ~320 (22.57870, 88.42691) | **Cream/white tower (about 14+ floors) with a rounded drum-shaped base** behind a black iron railing (possibly Hotel Monotel; unverified). On the footpath against the railing: **plastic-chair tea stall**, then **3–4 tarp-roofed kiosks** (paan/cigarette with hanging packets, white-counter tea stall, snacks, clothes) and a cycle van. | Low walled compound with big trees. A **red-brick-and-cream 5–6 storey block with a crowned parapet** (likely the Regional Training Centre, Ministry of Defence, per Google label). Planted median. | `s13_07_*`, `wm_1_*` |
| ~370 (Wipro More) | See section 2 | | |

A yellow **"Sreebhumi Gold Marathon 2026" banner arch** spans the road about 50 m before Wipro More. It's temporary.

## 2. Wipro More junction (22.5790, 88.4266; E −283, N +222)

`s13_08_*`, `wm_0_*`, `wm2_*` (deck), `test_wipro_h0.jpg`, `c1_*`, `w2_*`

- **Flyover:** two separate decks pass over the junction diagonally (SW–NE). Concrete box girders on single
  oval columns with **hammerhead pier caps**. The underside fascia is painted in **black-and-white (some
  yellow) chevron bands**. Deck parapets on top are **blue-and-white painted concrete crash barriers with a
  steel railing**. One deck has a **grey corrugated noise-barrier panel** facing the other (`wm2_*`, `fly_01_*`).
  The deck soffit is about 6–7 m above the road.
- **Gantry:** a big **blue overhead sign, "← NEWTOWN · WELCOME TO NABADIGANTA"**, is mounted on the flyover
  side facing Street 13 (`wm_0_h90`, `wm_0_h180`).
- **Under the deck:** a wide open asphalt junction. **Bidhannagar City Police** barricades (red-white with
  blue panels). A **yellow traffic police booth / kiosk covered in ads** at the SW corner. Zebra crossings.
  Parked buses.
- **Corners:** SE has a **glass and red-balcony tower** (blue glass curtain wall with a red-framed residential
  section, about 12+ floors). SW has the red-brick-and-cream crowned block (section 1). NE has traffic islands
  with hedges, rows of parked cars, and a **WBTC bus layover** (blue/yellow buses). NW is the canal bridge.
- **Bus stop "Wipro":** no proper shelter was visible on Street 13. Buses stop in the open under the flyover.
  There is a covered shed beside a large banyan on the SW side of 3rd Ave, just north of the flyover (`c1_h225`).
  I can't confirm it is the named stop.
- **Auto stand:** autos queue on the NW side (3rd Ave) next to the parking area under the metro (`c1_h45`).
  Another stand is at PwC More.
- **Canal bridge (Street 13 / 3rd Ave, 22.5793–22.5797, 88.4261–88.4264):** twin carriageways with a planted
  median. Flat, with no hump. The only sign of a bridge is a **low faded blue-and-white concrete balustrade**
  covered in posters and banners on the SW side (`c1_h225`, `w2_h200`, `w2_h250`). **No water is visible from
  the road** because shrubs and trees fill both banks. About 40 m long, about 60 m NW of the flyover centreline.
- **NW of the bridge (22.5800, 88.4258, `c2_*`):** the **Green Line viaduct curves overhead** on a massive
  single column in a sandy median island. BMC blue railings. A **Bharat Petroleum pump** (yellow/blue canopy)
  on the SW side. 4–5 storey pink/cream Salt Lake residential blocks. Google names the road "3rd Ave" here.

## 3. Wipro More → metro station along the flyover (about 300 m NE)

The main ground route is the one-way **Canal Side Road** service road (`fly_03_*`, `fly_04_*`, `fly_05_*`).
The flyover deck itself is in `fly_01_*`, `fly_02_*`, `w1_*`.

- **SE side:** the NE-bound flyover deck, its side fascia painted in **broad blue-and-white bands**. Underneath
  are blue tin sheeting and blue/white railings. About 150 m from Wipro More the deck ramps down. The ramp
  becomes a **reinforced-earth wall of blue-grey interlocking concrete panels** (`fly_04_h136`), painted
  blue/white at the top.
- **Road:** 1 traffic lane plus a kerb lane. Smooth asphalt, blue/white kerbs.
- **NW side:** a **white decorative railing with coloured square-frame motifs** (green/yellow/blue squares;
  the same railing runs all along Biswa Bangla Sarani). Behind it a **landscaped park strip** with frangipani,
  palms, hedges and paths. The **Green Line viaduct** (concrete, railing on top) stands in the strip on round
  piers about 30 m apart. Beyond it the tree belt hides the canal.
- **From the flyover deck looking NW** (`w1_p316`, `w1_p340`): metro piers, then shrubs, then a glimpse of
  dark green water, then the far bank's blue railing and Chavipatty houses.
- **At the station end** (`fly_05_*`, 22.58061, 88.42874): the station box sits over the service road.
  It has a peach/beige concrete underside, white cladding, and a **large colourful mural on the ground-floor
  wall**. A **peach entrance block with a "Bandhan Bank · Salt Lake Sector V" sign** in three scripts.
  **About 8 CNG autos queue nose to tail along the kerb** (auto stand). White railings and people under
  the station.

### Gate A re-shoot, 2026-11-11

Owner playtest: "the metro entry is very bad and at wrong place". Street View (Jan–Feb 2026) and satellite;
images in `img/metro/` (gitignored: `a0z_h40`, `a0z_h15`, `p1z_h310`, `g_a0`, `gbz_h195`, `g_gb`,
`annotated_sat`, `dir_walk`). Game coords (x east, z south, 0.5 u/m), about ±3-5 m.

- **Wrong side before task 026.** The entrance came from OSM's Gate A node (`gateSpot`), 2 u SE of the service
  road's centre line, pushed outward on that side: about (-33.5, -194.6), across the road against the barrier by
  the Nabadiganta flyover ramp, where there is no footpath.
- **Real Gate A door:** 22.58070, 88.42865 = (-36.0, -204.3); Sector V station frame s -22.3, t 0.2. On the NW
  (station) side of the service road, just past the kerb: a recessed doorway in a ground-level block under the
  station's overhang at its SW (Wipro More) end, a black plate with a white "A" over it, a stair rising inside
  (`a0z_h40`, `a0z_h15`).
- **Mosaic mural** (big swirls: orange, ochre, teal, grey) immediately NE of the door, with a barred window; a
  "drop-off point" sign at its foot (`p1z_h310`).
- **Forecourt:** a small paved area SW of the door behind white railings with coloured square motifs; the railing
  runs along the kerb from the pillar past the mural. Blue-and-white kerb.
- **Sign pillar:** 22.58064, 88.42860 = (-38.5, -201.2), s -26, t -1.1: grey, free-standing, at the forecourt's
  SW corner; red metro roundel on top, an angled navy name board (Bengali, Hindi, English) over the footpath, a
  route map panel facing the road.
- **Autos:** green-and-yellow CNG autos queue nose to tail along that kerb, NE of the door, facing NE.
- **Bank block** (parody sign in the game): the peach block bridging the road starts NE of the mural, about
  s -17..-10 (weak estimate from `a0z_h40`).
- **Service road:** one lane plus an auto kerb lane, about 7-8 m. The map has OSM's way here as a 9 u (18 m)
  one-way with its NW kerb at t 0.9; not narrowed (map data), so the game's Gate A stands 1-2 u further NW.
- **Gate B** (Chavipatty Rd): door at 22.58124, 88.42890 = (-23.1, -234.3) (OSM's node is ~12 m east), up a
  steel-railed ramp, "drop-off point" sign, a sloped stair enclosure with blue-trimmed glazing and an
  orange-yellow hand-gesture mosaic (`gbz_h195`, `g_gb`). Not moved in 026.
- **How a TIU student gets there** (`dir_walk`): Street 2 → PwC More → Street 13 → Wipro More → NE along the
  service road north of the flyover → the pillar and the Gate A door. So Gate A is the game's metro entrance.

## 4. Metro stations on Biswa Bangla Sarani (22.5806–22.5816, 88.4287–88.4304)

`st2_*`, `st3_*`, `st4_*`, platform `st1_*` (2022), `fly_06_*` (2020), satellite `t3d_c.jpg`

- **Salt Lake Sector V (Green Line):** the OSM footprint is about 126 × 85 m, centred near 22.58091, 88.42902
  (E −34, N +434). A long elevated box about 4 levels high, clad in **grey and copper-brown aluminium panels**
  with a **blue roof**. The platform level has a **curved steel-truss roof with polycarbonate skylight strips**
  (`st1_h145`, `st1_h325`). The trains are **white with a purple stripe**. The ground level under the station
  is open, with **parking** (cars, bikes, autos, totos) behind low walls and railings. Its north face reaches
  **Chavipatty Rd**, with a stair tower and a bilingual "Salt Lake Sector V" sign there (`c4_h60`, `c4_h150`).
  So the station spans the canal. The **yellow Bandhan Bank tower** carries the station name on the BBS side
  (`st2_h235`).
- **IT Centre (Orange Line), about 22.5808, 88.4294 (E +5, N +422):** a beige concrete station
  **straddling Biswa Bangla Sarani**. The road runs under it between its piers. A big **"IT Centre" sign in
  Bengali, Hindi and English** with a roundel logo hangs over the road (`st3_h55`). A street-level entrance
  stair with red/orange signage is on the north side (`st4_h235`). Its viaduct continues along BBS on large
  hammerhead piers.
- **Skywalk:** an **enclosed steel-truss footbridge** links the two stations over the road (`st2_h55`,
  `st3_h235`).
- **BBS here:** 2–3 lanes each way under and between the stations. Past the stations to the NE (`st4_*`),
  there is a wide median with **royal palms (trunks painted blue/white), frangipani and 3-lantern lamp posts**.
  The same white square-motif railing. The two viaducts run in parallel.
- Salt Lake Bus Depot (OSM 22.58008, 88.42958) is directly south of the stations. Street View has no coverage
  inside it (`d1`, `d2` blank).

## 5. Keshtopur canal: what the edge looks like

OSM puts the canal at about 13–19 m wide, running SW → NE: Nalban → Wipro More (bridge) → north of the stations.
**In Street View the water is almost never visible.** You see a **tree-and-palm belt** on both banks:

- **North bank (Chavipatty Rd)** (`c6_*` at 22.58011, 88.42682; `c3_*` at 22.58043, 88.42743; `c4_*`):
  continuous **red-brick plinth wall about 0.6 m high topped with a blue iron railing (about 1.2–1.5 m)**,
  with brick pillars every few metres. Behind it is a 5–15 m strip of coconut palms, shrubs and trees, then the
  water. You can see the metro viaduct and flyover parapet over the trees. Narrow broken footpath. The road is
  2 lanes, undivided, no median, very quiet (autos only).
- **South bank:** the landscaped strip under the Green Line (section 3), behind the white decorative railing.
  Metro piers stand on this bank.
- **Bridge at Wipro More:** a low concrete balustrade only (section 2). There is no other crossing in the area
  apart from the station, which spans the canal at roof level.
- **West of Wipro More** (`c5_*`, `w3_*`, `w4_*`, `n1_*`): the points snapped into **EE Block residential
  lanes**: 4–5 storey colourful apartment blocks with gates, transformer boxes and blue/white kerbs, plus a
  walled playground with an IEM Public School banner. No canal-side road with Street View coverage.
- No slope or embankment is visible anywhere. The banks are fully vegetated, and the water level is unknown
  from the ground.

## 6. Nalban (lower priority)

Not reached: the point at 22.5812, 88.4232 snapped into an EE Block lane (`n1_*`). The Green Line viaduct
heads west from Wipro More along about 22.5800–22.5818 (OSM).

---

## What the game gets wrong / must have

1. **Two stations, not one.** Sector V (Green, canal side, grey/copper, blue roof) plus **IT Centre (Orange,
   straddling BBS)**, with an **enclosed truss skywalk** between them. The current game has one box with a green
   roof. The Green Line station isn't green: the cladding is grey and copper-brown and the roof is blue.
2. **The flyover is two decks.** Each deck is about 2 lanes. Parapets are **blue-and-white concrete** with steel
   railing. Pier caps are hammerheads, and the underside fascia has black/white chevrons at Wipro More. The
   NE-bound deck ramps down to grade near the station on a **panelled retaining wall**.
3. **Green Line viaduct runs beside the flyover, on the canal bank, from Wipro More to the station**, then
   **curves west over 3rd Ave** just NW of Wipro More. It doesn't follow the road centre.
4. **Canal = green belt, not open blue water.** Model it as a 15 m channel sunk below grade, almost hidden by
   palms and trees. Edges: **brick plinth with blue railing** on the Chavipatty side, and a **white
   square-motif railing plus park strip** on the metro side. The Street 13 crossing is **flat with a low
   concrete balustrade**. It should not read as a raised bridge.
5. **Street 13 needs:** a planted median with **blue/white kerbs** throughout, a **lotus sculpture** about 90 m
   from PwC More, and **stall clusters on the east/NE footpath**: a tea/food row about 90 m from PwC More,
   a long lunch shed about 180 m (by IIHM), a paan/tea kiosk row about 320 m (just before Wipro More, against
   a tower's railing), and shacks at about 50 m. The west side is mostly big glass office towers behind
   palms and parking, with no stalls.
6. **Wipro More must have:** the **blue "Welcome to Nabadiganta / ← Newtown" gantry**, a **yellow traffic
   booth**, police barricades, a bus layover, and an auto queue.
7. **Autos:** a stand at PwC More (SW corner), a queue of about 8 at the Sector V station kerb, and more on
   3rd Ave by Wipro More.
8. Everywhere: **blue-and-white kerbs**, lantern-style ornamental lamp posts, planted medians, hanging
   wires on the older (west) side, and WBTC blue/yellow buses plus loud private buses.

## Uncertain / not verified

- Exact building identities on Street 13, other than PwC, IIHM, the Bharat Petroleum pump and the stations.
  The Monotel and RTC identifications are guesses from Google labels.
- Whether the Orange Line at IT Centre is operating. The station is built and signed.
- The purpose of the concrete columns at about 280 m on Street 13 (looks like a building under construction).
- Canal water level and bank profile: hidden by vegetation in every view.
- No Street View inside the bus depot, and a 2026 coverage gap at about 130–250 m on Street 13.
