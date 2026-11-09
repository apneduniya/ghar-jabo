# Sector V to Sealdah: every realistic route (Ghar Jabo world research)

Date: 2026-11-09. Start: Techno India University gate, Street 2 (22.57604, 88.42844, game (-46.8, 53.1)). End: Sealdah station forecourt (22.56705, 88.37030, game (-3034.8, 549.9)). As the crow flies, Sealdah is 6.2 km west and slightly south of the start. By road it is 8.2 to 12.3 km, depending on the corridor.

Data files are in this folder. Map data (c) OpenStreetMap contributors, ODbL.

| File | What |
|---|---|
| `corridors.json` | The deliverable: 6 road corridors plus the Green Line. Each has an ordered polyline (lat/lon, game coordinates, metres along), segments with OSM road attributes, crossings, "alongside" stretches (under a metro viaduct, over a tunnel, along tram tracks), and ordered landmarks with distance along. It also holds `network` (hubs and shared stretches) and `areas` (side-street character stats). |
| `osm-roads.json` | Every motorway to tertiary road (+ links) in bbox 22.552–22.602, 88.360–88.442. 1,582 ways. |
| `osm-minor-roads.json` | Residential, unclassified, living_street and service roads (no parking aisles or driveways), same bbox. 7,369 ways. |
| `osm-rail-water.json` | Rail, metro, tram, canals, drains, named water, rail bridges. |
| `osm-water-polygons.json` | Canal and river polygons, including unnamed ones. The Beliaghata Canal is mapped only this way through Narkeldanga. |
| `osm-landmarks.json` | Stations, hospitals, markets, malls, stadium, parks, bus stops/termini, named junctions, places, worship, sights. |
| `osm-sealdah-forecourt.json` | Every highway, platform, entrance, parking area and building within 300 m of Sealdah station. |
| `scripts/` | `fetch.sh` (6 Overpass queries, UA `ghar-jabo-map/1.0 (+https://boogles.dev)`), `build_corridors.py` (router and export), `corridor_defs.py` (waypoints), `tables.py` (generates the tables in section 7). |

The OSM base is 2026-11-09 07:26 UTC, from overpass-api.de. To rebuild, run `sh research/routes/scripts/fetch.sh && python3 -I research/routes/scripts/build_corridors.py && python3 -I research/routes/scripts/tables.py`.

**How the corridors were made.** I picked real junctions as waypoints. A Dijkstra router over the OSM road graph fills in the road between them. It respects one-way tags and prefers higher road classes and the road names commuters use. I then checked each path against the two OSM bus relations already in `research/map/routes2-clean.json`. Bus S-12 confirms corridor C road by road: Salt Lake Bypass, Chingrighata, Beleghata Main Road, the Sealdah–Beliaghata flyover, then Parikshit Roy Lane. Bus 215A confirms the Salt Lake avenues to Ultadanga, via 7th Cross Road and 1st Avenue, then Bidhannagar Road to Khanna. Distances are along OSM centrelines, so they are within a few percent of what a vehicle drives.

**Tags used below.** *Unverified* means plausible local knowledge with no source found. *Uncertain* means sources conflict or are old. Everything else is either OSM data or cited in section 9.

---

## 1. Summary of corridors

| ID | Route (real order) | Length | What it is like | Who uses it |
|---|---|---|---|---|
| **A** | Street 13 north → Wipro / Sector V metro → Keshtopur Canal bridge → EE/DL block → **Karunamoyee** → **Central Park** → **City Centre** → 2nd Cross Rd / 2nd Avenue → EM Bypass at **Bengal Chemical / Mani Square** → **Salt Lake Stadium** → Kadapara road → **Phoolbagan** → Narkeldanga Main Rd (rail underbridges, Beliaghata Canal bridge) → **Rajabazar** → APC Rd → Sealdah (Vidyapati Setu foot) | 11.2 km (10.6 drive + 0.6 walk) | Follows the Green Line almost exactly. The metro is overhead from Sector V to the Stadium and underneath from Phoolbagan on. Salt Lake avenues give way to the Bypass, then old north-east Kolkata. | The bus spine for Salt Lake–Sealdah, and the road shadow of the metro. Taxis and app cabs use it too. |
| **B** | as A to **Salt Lake Stadium** → EM Bypass south → **Beleghata Main Rd** (Joramandir, ID Hospital) → **CIT More** → Beliaghata bazars (Rashmoni, Deshbandhu, Alochhaya) → Beliaghata Canal bridge (Khalpar) → **Sealdah–Beliaghata flyover** over the south-section tracks → Parikshit Roy Lane → Sealdah south side | 12.1 km | Salt Lake, then the Bypass, then a dense bazaar main road with no divider. The most "para" of all the routes. | Buses via Beliaghata (14A, AC-17 and S59 in old listings; *uncertain*). |
| **C** | Street 2 south → Swasthya Bhawan → **Nalban / Nicco Park** → **Salt Lake Bypass** under the Orange Line viaduct → Sukanta Nagar → **Chingrighata** (EM Bypass, under the Chingrighata flyover) → Beleghata Main Rd → CIT More → … as B | **8.2 km, the shortest** | Fast and wide out of Sector V, then a choke at Chingrighata, then Beliaghata. | Bus S-12 (OSM relation) and app cabs. The Nicco Parks site lists 239B and 215A/1 as Sector V–Howrah via Nicco Park, Beleghata and Sealdah. |
| **D** | as C to **Chingrighata** → EM Bypass **north** (Swabhumi, Hyatt, Apollo) → **Salt Lake Stadium** → Kadapara → Phoolbagan → Narkeldanga Main Rd → Rajabazar → APC Rd → Sealdah | 10.6 km (10.0 + 0.6 walk) | Mostly Bypass. Avoids Salt Lake's internal signals. | Cars and cabs dodging Beliaghata. *Unverified* as a bus route. |
| **E** | as A to **City Centre** → **PNB Island** → 1st Avenue → Krishnapur Canal → VIP Rd → **Hudco More / Ultadanga** → Ultadanga underpass under the Sealdah–Dum Dum line (Bidhannagar Road station) → Bidhannagar Rd (bridge over the Beliaghata Canal) → **Khanna** → APC Rd south: **Maniktala** → Bose Institute → **Rajabazar** → Sealdah | 11.4 km (10.8 + 0.6 walk) | Salt Lake, then the Ultadanga hub, then old north Kolkata's straight APC Road over disused tram tracks. | Buses to Howrah via Ultadanga (215A to BDN station and Khanna; S-44, S-16 and AC-44 via Maniktala and Rajabazar to Sealdah, from 2017 listings; *uncertain*). |
| **F** | as E to **Hudco** → **CIT Road** south → **Kankurgachi** (Satin Sen Sarani) → VIP Market / Pantaloons → **Phoolbagan** → Narkeldanga Main Rd → Rajabazar → Sealdah | 12.3 km (11.8 + 0.6 walk) | CIT Road residential-commercial strip, with the metro tunnel under the last stretch. | Ultadanga autos and buses (S-16 via Kankurgachi; *uncertain*). |
| **M** | Green Line metro: Sector V → Karunamoyee → Central Park → City Centre → Bengal Chemical → Salt Lake Stadium → (portal at Subhas Sarobar) → Phoolbagan → Sealdah | 8.74 km of track | Elevated for 5.6 km, then underground. | The default for most office-goers. About ₹15–20 and about 15–23 min (*uncertain*, see 3.1). |

Corridor A is the canonical "main road home" for the game. It keeps the metro in view and passes the most recognisable landmarks in the right order. C is the speed-runner's route. B and E/F give the most street character.

---

## 2. Road corridors in detail

The per-stretch tables, crossings and full landmark lists are in section 7, generated from `corridors.json`. This section gives what the street is like. Lane counts come from OSM where tagged; only 22–63% of each corridor has `lanes`. The other figures are *unverified* estimates from road class.

### 2.1 Leaving Sector V (shared by all)
- **North exit (A, B, E, F).** Street 2 runs north to the Street 13 junction. Street 13 (OSM `secondary`, `lanes=2` each way, divided) goes NW past Wipro and the Sector V metro (Japani Gate mini-bus terminus, 201 Nimta–Nicco Park terminus, Salt Lake bus depot).
  - It passes under the **Orange Line viaduct** (OSM still tags it `construction`; trial runs Beleghata–IT Centre began 10 Oct 2026, with service *targeted* for Dec 2026).
  - It then crosses the **Keshtopur Canal bridge** (0.51 km, 44 m bridge) into Salt Lake Sector II (Rabindra Bharati Univ., Matri Sadan, EE block, Anandalok Hospital) and reaches **Karunamoyee** at 1.39 km.
  - The corridor leaves the existing ±360 u game square at 1.31 km, so the first 1.3 km is already built.
- **South exit (C, D).** Street 2 runs south past Swasthya Bhawan, then west along an unnamed 2-lane divided road to **Nalban** (Orange Line station, Nicco Park; 1.16 km). There the **Salt Lake Bypass** begins (OSM `primary`, 3 lanes where tagged), running under the Orange Line viaduct for about 1.5 km.
- **Webel More, SDF More and College More** are the eastern Sector V junctions. They are on the bus S-12 path from New Town but **not** on the fastest TIU → Sealdah path; going through them adds 1–2 km. They belong to the existing map.

### 2.2 Salt Lake interior (A, B, E, F; 1.3–5.0 km)
- **Karunamoyee → Central Park → City Centre** runs along an unnamed 2-lane divided arterial (OSM `secondary`) directly under the Green Line viaduct (alongside from 0.53 to 3.71 km).
  - Karunamoyee: metro station, **Karunamoyee International Coach Terminus**, bus stops "Karunamoyee 1–4", the Bikash Bhavan / Purta Bhavan government offices (*unverified* names).
  - Central Park (metro, the big park with a lake), Salt Lake City Medical Centre, ILS Hospitals, City Centre metro, **City Centre 1 mall** (INOX).
- **City Centre → Bypass (A, B):** 2nd Cross Road and 2nd Avenue (tertiary, oneway pairs) through Sector I blocks to the EM Bypass at **Bengal Chemical** metro, opposite **Mani Square** mall and PVR.
- **City Centre → PNB (E, F):** 2nd Cross Road to 3 Number Island and 1st Avenue (secondary, 2 lanes) to **PNB Island**, then AA/AB "khaal paar" (canal-side) to the **Krishnapur Canal** bridge and VIP Road (Kazi Nazrul Islam Avenue, 174 m bridge).
- **Feel.** A planned 1970s township: wide quiet avenues, numbered islands (roundabouts), lettered blocks (AA … JD), two-storey bungalows with gardens, trees, hardly any hawkers off the main nodes. Crowds bunch at Karunamoyee and City Centre (malls, bus stand). *(Character from local knowledge; layout figures in section 5.)*

### 2.3 EM Bypass (A, B, D)
- Six to eight lanes, opened 1982, part of SH 3 (Wikipedia). OSM tags 2–4 lanes per carriageway where tagged; it is divided all the way.
- Junctions from north to south:
  - Ultadanga flyover (to VIP Rd)
  - Maniktala Main Rd / Kankurgachi (Bengal Chemical, Mani Square)
  - Narkeldanga / Kadapara (Salt Lake Stadium, Swabhumi)
  - Beleghata Road (ID Hospital, Subhas Sarobar)
  - **Chingrighata** (flyover to Salt Lake / New Town), then Science City
- Landmarks on our stretch: Bengal Chemical and Salt Lake Stadium metro (elevated, over the Bypass), Yuva Bharati Krirangan (Salt Lake Stadium), Hyatt Regency, Raajkutir, Inox Swabhumi, Apollo Gleneagles, Subhas Sarobar.
- **Feel:** fast, wide, few pedestrians. The metro viaduct runs down the middle from Bengal Chemical to the Stadium. Hawker rows and cycle-vans cluster only at the junctions (*unverified*).

### 2.4 Chingrighata (C, D)
- The Salt Lake Bypass meets the EM Bypass here, under the Chingrighata flyover. The Orange Line viaduct crosses the junction too (OSM: 3.34 km, viaduct above) beside the "Chingrighata Fishing Lake" bheri. An unnamed canal (OSM w153793808) passes under the Bypass (3.36 km, road bridge).
- **Notorious jam.** RVNL's 2026 work on the 366 m Orange Line gap here brought weekend closures. On 15 May 2026, roughly 60-hour restrictions hit northbound Bypass traffic under the flyover, with diversions near NX Hotel (Swarajya). The gap is now closed (Square Yards). The everyday evening choke here is *unverified* but widely known locally.
- D turns north on the EM Bypass. C crosses west onto Beleghata Main Road via an unnamed secondary link (S-12 uses the same link).

### 2.5 Beliaghata (B, C)
- **Beleghata Main Road** (OSM `secondary`, `lanes=2`, **not divided**) "connects EM Bypass to Central Kolkata" (Wikipedia). OSM bus stops in order:
  - Beleghata, 35 Bus Stand, Joramandir Bazar, **ID Hospital** (ID & BG Hospital, 57 Beliaghata Main Rd, beside Subhas Sarobar)
  - **CIT More** (CIT Road branches north towards Phoolbagan and Ultadanga)
  - Kalimuddin, Rashmoni Bazar, Deshbandhu, Alochhaya (cinema stop), Uriyabagan, Sarkar Bazar, **Beleghata Khalpar** (the canal bridge), Sales Tax, Barafkal, Sealdah Station, Sealdah Court
- Crossings in order:
  1. The rail chord: OSM name "Kolkata Circular Railway"; it is the Bidhannagar Rd–Park Circus link (*uncertain* which line). It **passes over the road** at C 6.24 km / B 10.09 km.
  2. The **Beliaghata Canal** (Khalpool bridge; Wikipedia names Khalpool as the bridge over the canal; road bridge 62 m).
  3. The **Sealdah–Beliaghata Flyover**, a road bridge over the Sealdah South (Namkhana) tracks, 154 m.
  4. Down onto Parikshit Roy Lane, next to NRS Medical College and B R Singh (railway) Hospital, to the station's south side.
- **Feel:** the densest para character of any corridor. Bazar after bazar on both kerbs, Jora Mandir, old two- to four-storey houses with balconies, shops spilling into the road, a canal-side lane (Canal Side Rd / Chaulpatty Rd). "Traffic jam being the main problem here" (Wikipedia, Beliaghata).

### 2.6 Kadapara → Phoolbagan → Narkeldanga Main Road → Rajabazar (A, D, F)
- From the Stadium, an unnamed road runs west through Kadapara, past Swabhumi and the "Orient" stop. The metro dives underground near **Subhas Sarobar** (portal in OSM at 22.57074, 88.39897).
- **Phoolbagan** is the CIT Road (Hem Chandra Naskar Rd) × Narkeldanga Main Road crossing: underground metro station, Gurudas College, Greek Orthodox cemetery, Phoolbagan PS.
- **Narkeldanga Main Road** (Maulana Abul Kalam Azad Sarani; OSM `secondary`, undivided) heads WSW:
  - Sir Gurudas Banerjee Halt (Circular/chord railway)
  - **two rail overbridges** carry tracks over the road (8.60 and 8.87 km in A)
  - an unnamed drain culvert
  - the **Beliaghata Canal bridge** (9.42 km)
  - Narkeldanga's old mixed neighbourhood (*unverified* character: dense, mosques and temples, small workshops)
  - **Rajabazar crossing** on APC Road (9.86 km; Rajabazar Tram Depot, now a bus depot)
- **APC Road south to Sealdah** (OSM `primary`, oneway pair, with disused **tram tracks** still in the carriageway): ESI Hospital Sealdah, then the north foot of **Vidyapati Setu** (the Sealdah flyover, 10.63 km).

### 2.7 Ultadanga → Khanna → APC Road (E) and CIT Road (F)
- **Hudco More** is "one of the busiest crossings in Kolkata" (Wikipedia, Ultadanga). Ultadanga Main Rd / Bidhannagar Rd, VIP Rd, CIT Rd and the Salt Lake approach all meet here.
- Nearby: **Bidhannagar Road** railway station (Sealdah–Dum Dum line, formerly Ultadanga Road), the Bidhannagar Road bus terminus, 15 No Bus Stand (S-30), the clock tower and the old Bidhannagar tram depot tracks.
  - The **Ultadanga flyover** (2011; a girder collapsed in 2013) links the EM Bypass to VIP Rd overhead.
  - E goes under the railway through the **Ultadanga Underpass** (6.46 km), then over the **Beliaghata Canal** (Bidhannagar Rd bridge, about 390 m of tagged bridge) to **Khanna** (APC Rd × Aurobindo Sarani).
  - South on **APC Road**: Maniktala crossing, Police Museum, Bose Institute, Rajabazar, Sealdah. Old north Kolkata frontage: colonnaded three- to four-storey buildings, sweet shops, colleges. Tram tracks are alongside for 2.6 km (8.10–10.72 km); trams have not run there since 2020.
- **F** turns south at Hudco onto **CIT Road**:
  - The first 1.36 km is OSM `tertiary`, undivided, 2 lanes, with tram tracks alongside at first: residential CIT housing, the Uttarapan complex, Eye Foundation.
  - **Kankurgachi** (Satin Sen Sarani / Maniktala Main Rd; S-3B bus terminus).
  - Kathgola, **VIP Market / Pantaloons**, Phoolbagan, then joins A.
- **Waterlogging:** Ultadanga is repeatedly named. It was knee-deep with Sector V on 8 Jul 2025, flooded again in mid-Aug 2026 (Millennium Post), and ankle-deep with Kankurgachi and Sealdah on 22 Jun 2026. The underpass is the obvious low point (*unverified* that it floods; a different underpass, Patipukur, did in Aug 2026).

### 2.8 Sealdah arrival
- **From the north (A, D, E, F):** APC Road becomes the Vidyapati Setu ramp at 22.57014, 88.37090.
  - **OSM gap:** there is no mapped at-grade carriageway beside the flyover to the station front. OSM shows only `pedestrian` ways under and beside it. `corridors.json` bridges this with a 7 m synthetic link (`highway: gap`, way id -1) and a 583 m walk tail along those pedestrian ways and BB Ganguly Street to the forecourt.
  - In reality vehicles do reach the station front (taxi stand, drop-off, parking per OSM) (*needs a Street View check of the ground road*).
- **From the south (B, C):** the Sealdah–Beliaghata flyover lands on Parikshit Roy Lane by NRS. A service road leads into the forecourt (drivable in OSM).
- **Forecourt:** a big paved open area in front of the **Sealdah North** building, signed "শিয়ালদহ (উত্তর)", with steps up to the concourse. There are garden beds with railings, steel crowd barricades, cycle-vans and handcarts, and billboards (Street View, May 2022: `img/sealdah_d_h0.jpg`, `img/sealdah_d_h180.jpg`, captured by the parallel survey in `img/`).
  - The Main (6–14) and South (15–21) sections are further south and east. The OSM parking area (`amenity=parking` w1453657661) and driveways sit between the flyover and the station.
- **Metro:** Sealdah metro is underground on the station's east side. Entrance C is at 22.56641, 88.37143 in OSM. A pedestrian subway connects it to the railway station (Wikipedia).
- **Hawkers:** about 1,000 stalls under and around the flyover for roughly 40 years.
  - In 2026 the KMC eviction notice was stayed by the High Court, then paused until Durga Puja. About 500 hawkers were evicted from inside the stations in May 2026 (The Week).
  - Status after October 2026: *uncertain*. For the game, a hawker zone under the flyover is a safe, recognisable choice.
- **Markets:** Koley Market (24/7 wholesale vegetables, busiest 2–6 AM), Baithakkhana bazar (and its paper market), the Chhagalkata fish market on BB Ganguly St, NRS Medical College (1,890 beds), Sealdah Court.

---

## 3. Public transport

### 3.1 Green Line metro (corridor M)
| Station | Track km (OSM) | Gap (Wikipedia) | Level |
|---|---|---|---|
| Salt Lake Sector V (terminus; exits A Wipro side, B CL Block; foot-overbridge to the Orange Line's IT Centre) | 0.00 | – | elevated |
| Karunamoyee (beside the bus terminal) | 1.21 | 1.227 km | elevated |
| Central Park | 2.02 | 0.803 | elevated |
| City Centre (EC Block; City Centre mall) | 2.92 | 0.933 | elevated |
| Bengal Chemical (over the Bypass, opposite Mani Square) | 4.08 | 1.127 | elevated |
| Salt Lake Stadium (last elevated station) | 4.87 | 0.795 | elevated |
| *portal: the line bends almost 90° and enters the tunnel beside Subhas Sarobar* | 5.61 | | ramp |
| Phoolbagan (181 Narkeldanga Main Rd, island platform) | 6.53 | 1.695 | underground |
| Sealdah (16 m deep, "Spanish solution" platforms) | 8.74 | 2.305 | underground |

- **Openings:** Sector V–Stadium Feb 2020; Phoolbagan Oct 2020; Sealdah Jul 2022; Sealdah–Esplanade 22 Aug 2025. The line now runs through to Howrah Maidan.
- **Hours** from 27 Jul 2026: 6:00 am to 10:30 pm on weekdays and Saturdays, 9:00 am to 10:30 pm on Sundays; 236 weekday services (Construction World).
- **Peak headway:** "6 min" (Wikipedia). TrackMyMetro's "2.5 min" is inconsistent with 236 trips a day (*uncertain*).
- **Fare and time to Sealdah:** ₹15–20 and 13–23 min across aggregators (*uncertain*; no official KMRC fare table found).
- **Sector V station crowding** at 6–9 PM: no source. Queues at the token counter and app QR tickets are documented generally (*unverified* for this station).

### 3.2 Buses
Route numbers are for our notes only, since the game won't show them. Every listing except the two OSM relations is old or unofficial (*uncertain*); check against WBTC's Pathadisha app before relying on one.

| Corridor | Routes found | Stops named |
|---|---|---|
| C (Salt Lake Bypass–Chingrighata–Beliaghata–Sealdah) | **S-12** New Town–Howrah (OSM relation 15395997), **239B, 215A/1** Sector V–Howrah (Nicco Parks site), S-12E, 3A/2 (2017) | Nicco Park, Sukanta Nagar, Chingrighata, ID Hospital, CIT More, Beleghata Khalpar, Sealdah |
| A/B (Salt Lake–Beliaghata/Phoolbagan) | AC-17, 14A, S59 (2017/2018 blogs); 260 IBM–ESI Hospital Sealdah (rome2rio) | Karunamoyee, Central Park, City Centre, Labony, Falguni, GB Island, AMRI, Building More, Beleghata |
| E (Ultadanga–Maniktala–APC) | **215A** Howrah–Sector V (OSM relation 15092749; goes via Khanna to Howrah, **not** Sealdah), S-44, S-16, AC-44 (2017) | College More, Karunamoyee, PNB, Hudco, Ultadanga, Khanna, Maniktala, Raja Bazar |
| Decoys (don't reach Sealdah) | 201 (Sector V–Nimta via Ultadanga), S-30/AC-30S (Ultadanga–Ecospace), AC-9B (to Jadavpur) | – |

**Office-hour crowding.** No source ranks the stops. The likely worst (*unverified*, local knowledge):
- Sector V boarding points: Wipro / Sector V metro (Japani Gate terminus), College More, Webel More, RS Software. Several have OSM shelters.
- Karunamoyee.
- City Centre.
- Hudco/Ultadanga, where people change to trains at Bidhannagar Road, which "remains packed … especially on weekdays" (Wikipedia).
- Sealdah itself.

### 3.3 Shared autos
- An Ultadanga–Karunamoyee shared auto exists (forum post, about 13 years old). Kolkata autos run fixed permit routes of about 5 km with 3–4 co-passengers.
- No source found for: Sector V–Karunamoyee, Ultadanga–Sector V, Ultadanga–Sealdah, Sealdah–Beliaghata/Phoolbagan autos, any stand location or any fare (*all unverified*).
- Plausible stands for the game (*unverified*): Karunamoyee (by the bus terminus), Ultadanga/Hudco, Kankurgachi, Phoolbagan, Beliaghata CIT More, and the Sealdah approach roads. Generic auto shared fares of ₹10–20 per person (YoMetro) are not route-specific.

### 3.4 Bike taxis, app cabs, yellow taxis, totos
- **Bike taxis:** allowed in West Bengal under the 20 Sep 2024 guidelines, with conditions:
  - transport registration only (no private bikes)
  - helmets for both, one passenger, luggage capped at 10 kg
  - the luggage cap was a response to station passengers at Howrah and Sealdah
- **App cabs:** state rules cap surge at 50% over the notified taxi fare (Deccan Herald); central rules cap it at 2x.
  - Claims of 2–4x surge and frequent peak cancellations in Sector V come only from competing cab firms (*uncertain*), but "Rapi-Nah surge + cancel" is the game's existing joke and matches commuter experience.
- **Yellow taxis:** scarce. About 2,500 Ambassadors were left in 2025, down from 7,000, with the rest due off the road by end 2027.
- **Totos (e-rickshaws):**
  - A 7 Aug 2026 directive bans them from national and state highways and major roads, and they are barred from bus routes. They may run on internal roads that local authorities mark.
  - EM Bypass is SH 3, so totos are off it by inference. No order specific to Salt Lake, VIP Rd or APC Rd was found.
  - **Game rule:** totos only inside Salt Lake blocks and old-city lanes, never on the Bypass, Salt Lake Bypass, APC Rd or VIP Rd.

### 3.5 Last mile at Sealdah
See 2.8. In short:
- Arriving from the north means coming off APC Road at the flyover foot and walking through the under-flyover hawker zone to the North section forecourt.
- From the south, the Beliaghata flyover lands by NRS and the Main/South sections.
- From the metro, it's an underground subway to the station.

### 3.6 Evening rush, 6–9 PM
- **Documented:**
  - Sector V has more than 2 lakh workers on 17 km of road. A College More flyover is "planned" (status *unverified*).
  - Sealdah handles 1.5–2 million passengers a day, with about 12 lakh daily suburban commuters on 917 local trains.
- **Not found:** any hour-by-hour data or measured car times for Sector V → Sealdah. Aggregators suggest the metro saves about 9 min at peak, which is likely an underestimate (*uncertain*).
- **Game assumption** (*unverified*, clearly a design choice): peak build-up is 6:00–7:30 PM, worst at Sector V exits, Chingrighata, Hudco/Ultadanga, Beliaghata bazars and the Sealdah approaches. It eases after 8:30 PM, and rain makes everything worse (see 2.7 and section 9 for flood dates).

---

## 4. The network: where you can switch

Hubs from `corridors.json` → `network.hubs` (distance along each corridor):

| Hub | Corridors (km) | Switch options |
|---|---|---|
| TIU gate | all (0) | North exit (A, B, E, F) or south exit (C, D) |
| Karunamoyee | A, B, E, F (1.39) | Metro (Karunamoyee station); Ultadanga autos |
| Central Park | A, B, E, F (2.22) | Metro |
| City Centre | A, B, E, F (3.51) | **Split:** 2nd Avenue to the Bypass (A, B) or 1st Avenue / PNB to Ultadanga (E, F). Metro. |
| Nalban | C, D (1.16) | Orange Line (once open, Dec 2026 target; goes to Beleghata, not Sealdah) |
| Chingrighata | C, D (3.31) | **Split:** west to Beliaghata (C) or north on the Bypass (D) |
| Salt Lake Stadium (Bypass) | A, B (6.34), D (5.24) | **Split:** west to Phoolbagan (A, D) or south to Beliaghata (B). Metro (last elevated stop). |
| CIT More | B (8.97), C (5.12) | CIT Road north to Phoolbagan, Kankurgachi and Hudco links B/C ↔ A/F (not in a corridor; route it on demand) |
| PNB Island | E, F (5.23) | – |
| Hudco More | E, F (6.42) | **Split:** Khanna / APC (E) or CIT Road / Kankurgachi (F). Rail at Bidhannagar Road station (one stop to Sealdah on the Dum Dum line, *unverified* stop count). |
| Phoolbagan | A (8.05), D (7.41), F (9.06) | Metro (underground) |
| Rajabazar | A, D, E, F (9.2–11.0) | All northern corridors merge on APC Road |
| Sealdah flyover foot | A, D, E, F | Walk-in from the north |
| Sealdah forecourt | all | Finish |

Shared stretches (`network.pairs`): A/B share 6.6 km and split at the Stadium. E/F share 7.8 km and split at Hudco. C/D share 3.9 km and split at Chingrighata. A/F share 7.1 km, the Salt Lake section plus Phoolbagan onward. Corridor graph:

```
            ┌─ 2nd Ave ─ Bypass ─ Stadium ─┬─ Kadapara ─ Phoolbagan ─┬─ Narkeldanga Main Rd ─ Rajabazar ─ APC ─ Sealdah(N)
TIU ─ Karunamoyee ─ Central Park ─ City Centre                       │                          │                ▲
            └─ PNB ─ Hudco ─┬─ CIT Rd ─ Kankurgachi ────────────────┘ (F)                      │                │
                            └─ Khanna ─ APC Rd ─ Maniktala ──────────────────────────────────── Rajabazar (E) ──┘
TIU ─ Nalban ─ Salt Lake Bypass ─ Chingrighata ─┬─ Bypass north ─ Stadium (D, joins A)
                                                └─ Beleghata Main Rd ─ CIT More ─ Khalpar ─ Beliaghata flyover ─ Sealdah(S)
                              Stadium ─ Bypass south ─ Beleghata Main Rd (B, joins C)
```

### 4.1 Side-street character by area
Computed from OSM within 450 m of each area centre (`corridors.json → areas`). Grid score is the share of street length on the two dominant perpendicular bearings: 1.0 is a perfect grid. Below 0.35 is organic.

| Area | Road km/km² | Junctions/km² | One-way share | Named share | Grid score | What to generate |
|---|---|---|---|---|---|---|
| Sector V | 28 | 72 | 0.41 | 0.07 | **0.66** | Superblocks; campus service roads (service roads are 9.5 of 18 km); few junctions |
| Salt Lake II (Karunamoyee) | 29 | 148 | 0.37 | 0.24 | 0.52 | Lettered blocks (BJ, CK, DL…), numbered cross roads and avenues, islands (roundabouts); grid at 30°/120° |
| Salt Lake I (Central Park/City Centre) | 24 | 162 | 0.40 | 0.17 | 0.56 | Same grid; residential plots with gardens; parks every block |
| Salt Lake III (Stadium side) | 30 | 207 | 0.32 | 0.05 | 0.62 | Tightest Salt Lake grid (70°/160°) |
| Ultadanga / Hudco | 33 | 236 | 0.10 | 0.17 | 0.34 | Organic lanes, many living streets, rail and canal edges |
| Kankurgachi | 36 | 143 | 0.14 | 0.21 | 0.21 | Housing-estate service roads (CIT schemes), irregular |
| Phoolbagan / Kadapara | 23 | 148 | 0.02 | 0.05 | 0.23 | Unnamed organic lanes, two-way |
| Beliaghata | 20 | 154 | 0.09 | 0.17 | 0.29 | Lanes off a bazaar spine, canal-side road |
| Narkeldanga / Rajabazar | 16 | 55 | 0.03 | 0.48 | 0.29 | Big rail and canal land; sparse but named streets |
| Maniktala | 27 | 165 | 0.16 | 0.43 | 0.29 | Old north Kolkata: named lanes, living streets |
| Sealdah / Baithakkhana | 24 | **244** | 0.23 | 0.42 | 0.24 | The densest junctions; named old lanes ("Lane", "Row", "Street"), markets, one-ways |
| Chingrighata (Bypass edge) | 27 | 167 | 0.36 | 0.27 | 0.28 | Colony lanes (Sukanta Nagar, Milan Nagar) off the Bypass; bheris |

**Generator guidance:**
- **Salt Lake:** a strict rotated grid, blocks of about 100–150 m, roundabout "islands" at avenue crossings, 2–3-storey houses set back behind gates, pocket parks. Street names are "Nth Avenue" and "Nth Cross Road"; sign block names like "BJ Block".
- **East of the Bypass and the old city:** no grid. Use 3–6 m lanes branching at irregular angles off main roads every 40–80 m. Buildings are 3–5 storeys, built to the plot edge, shopfronts at ground level, balconies above, wires and signs overhead.
- **Near Sealdah:** the densest network. Lanes named "Lane", "Row" or "Street", wholesale markets, handcarts.

---

## 5. Compression proposal for the timed mode

**The budget.** A timed run is 4 real minutes (240 s); at 1 game minute per real second, the in-game clock covers 4 hours. Current tuning gives run 6.5 u/s, bus 11–14 u/s, auto 7–9 u/s, bike 12–15 u/s (`src/content/tuning.ts`; 1 u = 2 m). Allowing about 60 s for Sector V (walk, stop, choice cards) and about 30 s for the Sealdah walk-in leaves about 150 s of riding. At an average of about 10 u/s with stop-and-go, that is **about 1,300–1,500 u of corridor beyond the Sector V square**.

At the true map scale (0.5 u/m), corridor A beyond the square is 9.9 km, or 4,960 u. So the timed corridor needs about **3.5x further squeeze on average**. The squeeze should be uneven: crush the monotonous stretches and keep the recognisable places near true scale.

Proposal for corridor A (the canonical route). The same classes apply to the others.

| Stretch (A km) | Real m | True-scale u | Character | Squeeze | Timed u |
|---|---|---|---|---|---|
| Sector V square (0–1.31) | 1,310 | 655 | already built | 1x | 655 (existing) |
| Karunamoyee node (1.31–1.60): bus terminus, metro, autos | 290 | 145 | **keep** | 1.5x | 100 |
| Karunamoyee → Central Park → City Centre (1.6–3.6): avenue under the viaduct | 2,000 | 1,000 | repetitive | 6x (keep 2 station beats ~40 u each) | 170 |
| City Centre → 2nd Ave → Bypass (3.6–5.05) | 1,450 | 725 | repetitive grid | 5x | 145 |
| EM Bypass, Bengal Chemical → Stadium (5.05–6.6): wide, fast | 1,550 | 775 | monotone | 5x | 155 |
| Stadium → Kadapara → Phoolbagan (6.6–8.2): metro dives at Subhas Sarobar | 1,570 | 785 | **one moment** (portal) | 3.5x | 225 |
| Narkeldanga Main Rd (8.2–9.86): two rail underbridges, canal bridge, halt | 1,690 | 845 | **must keep character** | 2.5x (bridges at true length) | 340 |
| Rajabazar → APC Rd → flyover foot (9.86–10.63): tram tracks, ESI | 770 | 385 | dense old city | 2x | 190 |
| Walk-in to forecourt (10.63–11.22): hawker zone under the flyover | 590 | 295 | **finale** | 1.2x | 245 |
| **Total beyond the square** | 9,910 | 4,955 | | ~3.0x | **1,570** (1,325 ride + 245 walk) |

**Rules:**
- **Never squeeze:**
  - bridges and underbridges (Keshtopur Canal 44 m, Beliaghata Canal, the rail underbridges on Narkeldanga Main Rd, the Sealdah–Beliaghata flyover 154 m), so canals and rail lines read at real width
  - junction nodes (keep about 40–60 u of approach on each side)
  - the Sealdah forecourt
- **Squeeze hardest:** Salt Lake avenues and the Bypass, where repetition is the point. A 5–6x squeeze loses nothing a local would miss as long as the metro viaduct, the island roundabouts and the station beats stay.
- **Landmark order is fixed:** use the `landmarks[].d_m` order from `corridors.json`. Map each `d_m` through the piecewise-linear squeeze table above. Do not reorder or swap sides (`side` is left or right of travel; Kolkata keeps left).
- **Other corridors:**
  - **C** (8.2 km) squeezes least, about 2.5x, because its Beliaghata bazaar stretch is all character.
  - **B** ≈ A's Salt Lake part plus C's Beliaghata part.
  - **E/F:** Salt Lake 5–6x, Hudco node 1.5x, APC Rd / CIT Rd 2–2.5x.
- **Metro mode:** 8.74 km of track. Show stations as beats and squeeze the inter-station track 8–10x, since the player sees the city flash past. Keep the dive into the tunnel after Salt Lake Stadium as a cinematic moment.

**True scale for free roam:**
- The corridors are 4,100–6,200 u long. The streamed world (Sector V to Sealdah, the bbox of all corridors) is about 3,100 × 1,900 u.
- OSM holds 1,143 km of road in the fetched bbox, of which 395 km lie within 300 m of a corridor. A 300 m streamed band would therefore need on the order of 120 km of primary to tertiary road and 270 km of minor and service road. Generated buildings will need aggressive LOD and instancing to stay inside the 60-draw-call budget.
- At true scale, a non-stop bus on A takes about 470 s (12 u/s) and walking takes about 14 min. At 1 game minute per second the clock would show 8–14 hours, so free roam needs the clock decoupled (for example real time, or 1 game minute per 5–10 s). The timed-mode clock rate only works with the compressed corridor.

---

## 6. Gaps and things to verify

1. **The Sealdah north ground road is missing in OSM.** Corridors A, D, E and F end with a synthetic 7 m `gap` link and a pedestrian walk-in. Survey the ground road beside Vidyapati Setu with Street View before building the station approach.
2. **Unnamed OSM roads:** the Karunamoyee–Central Park–City Centre arterial (2.4 km), the Kadapara road from the Stadium to Phoolbagan (1.5 km) and the Sector V–Nalban link are unnamed. Local names are *unverified*: don't invent signs.
3. **Lanes:** only 22–63% of each corridor has a `lanes` tag. The Bypass's 6–8 lanes come from Wikipedia; the rest is inferred from road class.
4. **Rail line identity:** two lines cross Narkeldanga Main Road and one crosses Beleghata Main Road. OSM calls one "Kolkata Circular Railway" and leaves the other unnamed. They are the Sealdah North section's chord lines (*uncertain* which is which). OSM geometry and bridge tags are reliable for placement.
5. **Canal names:** the canal crossed at Narkeldanga, Beleghata Khalpar and Bidhannagar Rd is the Beliaghata Canal (named in OSM only near Ultadanga; elsewhere an unnamed polygon, w218969690). The crossing at Chingrighata (w153793808) is unnamed.
6. **The Orange Line** is tagged `construction` in OSM. Trials began Oct 2026 with service targeted for Dec 2026. Update the tag when it opens.
7. **Bus routes:** apart from S-12 and 215A (OSM), all route listings are 2017–2018 blogs or aggregators. Exact stop crowding is not sourced.
8. **Shared autos:** routes, stands and fares are not sourced. Treat all auto content as *unverified*.
9. **Waterlogging:** dated reports exist for Ultadanga, Sector V, Salt Lake, Kankurgachi, Sealdah and Maniktala. None names Phoolbagan, Beliaghata or Narkeldanga. No source names the Ultadanga underpass specifically.
10. **Evening car travel time:** not found. Metro time: 13–23 min, sources conflict.
11. **Sealdah hawkers:** the eviction status after October 2026 is unknown.
12. **Trams:** the tracks are physically present in OSM along APC Rd, CIT Rd (Ultadanga) and near Rajabazar. Service ended in 2020 (Rajabazar–Bidhannagar) and in 2019 over Vidyapati Setu. A May 2026 "revival" announcement is *uncertain*. Draw rails in the road and no trams.
13. The kumi-mirror lag noted in `research/map/OSM-AUDIT.md` does not apply here: every extract in this folder came from overpass-api.de on 2026-11-09.

---

## 7. Corridor tables (generated by `scripts/tables.py`)

Columns: OSM name ("(unnamed)" means OSM has no name), highway class, `lanes` tag where present, whether the way is one-way (a divided carriageway), and tagged bridge length. In the crossing lists, "rail on bridge/viaduct above" means the road goes **under** the railway. Landmark side is relative to travel direction (left = the kerb you'd walk on, keeping left).

#### A_saltlake_phoolbagan: Salt Lake interior -> Stadium -> Phoolbagan -> Narkeldanga Main Rd -> Rajabazar -> Sealdah

Total 11.22 km (drive 10.63 km, walk to forecourt 583 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 0.09 | (unnamed) | secondary | - | yes |  |
| 0.09 | 1.31 | Street Number 13 | secondary | 2 | yes | 44 |
| 1.31 | 3.71 | (unnamed) | secondary/secondary_link | 2 | yes |  |
| 3.71 | 3.93 | 2nd Cross Road | tertiary | - | yes |  |
| 3.93 | 5.05 | 2nd Avenue | tertiary | - | yes |  |
| 5.05 | 6.61 | Eastern Metropolitan Bypass | primary | - | yes |  |
| 6.61 | 8.17 | (unnamed) | secondary/tertiary | - | yes |  |
| 8.17 | 8.84 | Narkeldanga Main Road | secondary | - | no |  |
| 8.84 | 8.93 | (unnamed) | secondary | - | no |  |
| 8.93 | 9.39 | Narkeldanga Main Road | secondary | - | no |  |
| 9.39 | 9.46 | (unnamed) | secondary | - | no | 50 |
| 9.46 | 9.86 | Narkeldanga Main Road | secondary | - | no |  |
| 9.86 | 10.63 | Acharya Prafulla Chandra Road | primary | - | yes |  |
| 10.63 | 10.65 | walk: OSM gap: at-grade road/footpath beside Vidyapati Setu (not mapped) | gap/residential | - | no |  |
| 10.65 | 11.06 | walk: pedestrian | pedestrian | - | no |  |
| 11.06 | 11.22 | walk: Bepin Behari Ganguly Street | service/tertiary | - | no |  |

Crossings and alongside features:

- 0.53-3.71 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 5.37-6.46 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 7.17-8.16 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 9.84-10.53 km: runs along tram (surface)
- 11.05-11.16 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 0.46 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Street Number 13
- 0.51 km: crosses Keshtopur Canal (water:polygon): road bridge; road = Street Number 13
- 6.69 km: crosses East-West Metro Corridor (Line-2) (rail:subway): rail on bridge/viaduct above; road = tertiary
- 8.60 km: crosses Kolkata Circular Railway (rail:rail): rail on bridge/viaduct above; road = Narkeldanga Main Road
- 8.74 km: crosses unnamed drain (water:drain): culvert or untagged bridge (OSM road has no bridge tag); road = Narkeldanga Main Road
- 8.87 km: crosses rail (rail:rail): rail on bridge/viaduct above; road = secondary
- 9.42 km: crosses Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel) (water:polygon): road bridge; road = secondary

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, left, 33); 0.00 Techno India College (college, left, 71); 0.00 Techno India University gate (Street 2) (key_junction, left, 33); 0.66 Rabindra Bharati University (college, left, 29); 1.19 Anandalok Hospital, Salt Lake City (hospital, right, 59); 1.38 Karunamoyee International Coach Terminus (bus_terminus, left, 77); 1.39 Karunamoyee (key_junction, left, 4); 1.43 Karunamoyee (metro_station, right, 13); 2.22 Central Park (key_junction, left, 28); 2.23 Central Park (metro_station, right, 13); 2.55 Salt Lake City Medical Centre (hospital, right, 48); 2.74 ILS Hospitals (hospital, right, 50); 3.41 City Centre Adjoined Park (park, left, 79); 3.50 City Centre (metro_station, right, 5); 3.51 City Centre (key_junction, left, 28); 3.61 City Centre 1, Salt Lake (mall, left, 68); 3.88 Vasan Eye Care Hospital, Kolkata (hospital, right, 32); 4.01 INOX (cinema, left, 95); 4.63 FabIndia (mall, right, 29); 5.55 Bengal Chemical (metro_station, right, 9); 5.77 Mani Square Mall (mall, right, 145); 5.78 PVR Cinemas (cinema, right, 95); 6.34 Salt Lake Stadium (metro_station, right, 11); 6.34 Salt Lake Stadium (Bypass) (key_junction, right, 11); 6.61 Hyatt Regency (hotel, left, 109); 6.83 Raajkutir Kolkata (hotel, right, 103); 6.92 Inox Swabhumi (cinema, right, 17); 8.03 GURUDAS COLLEGE (college, left, 100); 8.05 Phoolbagan (metro_station, right, 13); 8.05 Phoolbagan (key_junction, right, 13); 8.65 Sir Gurudas Banerjee Halt (rail_station, right, 82); 9.86 Rajabazar (Narkeldanga Main Rd x APC Rd) (key_junction, left, 0); 10.10 Rajabazar Tram Depot (bus_terminus, left, 90); 10.27 ESI HOSPITAL, SEALDAH (hospital, left, 74); 10.63 Sealdah: APC Rd at north foot of Vidyapati Setu (key_junction, right, 0); 11.05 Kole Market (market, right, 119); 11.13 Sealdah (metro_station, right, 6); 11.22 Sealdah (rail_station, right, 132); 11.22 Sealdah station forecourt (key_junction, right, 2)

Named bus stops on the line (OSM): Wipro 0.45, 201 Nimta PO - Nicco Park Bus Terminus 0.47, Japani Gate Salt Lake Mini Bus Terminus 0.49, Matri Sadan Bus Stop 0.86, Saltlake EE Block Bus Stop 0.89, Karunamoyee 4 1.28, Karunamoyee 1 1.30, Karunamoyee 2 1.32, Karunamoyee 3 1.34, City Centre 3.92, EM Bypass 6.57, Swabhumi 6.92, Orient 7.03, Phoolbagan 8.03, Phoolbagan 8.14, Rajabazaar Crossing 9.99.

#### B_saltlake_beliaghata: Salt Lake interior -> Stadium -> EM Bypass -> Beliaghata Main Rd -> CIT More -> Sealdah

Total 12.08 km (drive 12.08 km, walk to forecourt 0 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 0.09 | (unnamed) | secondary | - | yes |  |
| 0.09 | 1.31 | Street Number 13 | secondary | 2 | yes | 44 |
| 1.31 | 3.71 | (unnamed) | secondary/secondary_link | 2 | yes |  |
| 3.71 | 3.93 | 2nd Cross Road | tertiary | - | yes |  |
| 3.93 | 5.05 | 2nd Avenue | tertiary | - | yes |  |
| 5.05 | 7.74 | Eastern Metropolitan Bypass | primary/secondary | - | yes |  |
| 7.74 | 10.43 | Beleghata Main Road | secondary | 2 | no |  |
| 10.43 | 10.49 | Beliaghata Main Road | secondary | - | no | 62 |
| 10.49 | 11.40 | Beleghata Road | secondary | - | no |  |
| 11.40 | 11.59 | Sealdah Beliaghata Flyover | secondary | - | yes | 154 |
| 11.59 | 11.93 | Parikshit Roy Lane | secondary | - | yes |  |
| 11.93 | 12.08 | (unnamed) | service | - | yes |  |

Crossings and alongside features:

- 0.53-3.71 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 5.37-6.46 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 0.46 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Street Number 13
- 0.51 km: crosses Keshtopur Canal (water:polygon): road bridge; road = Street Number 13
- 10.09 km: crosses Kolkata Circular Railway (rail:rail): rail on bridge/viaduct above; road = Beleghata Main Road
- 10.45 km: crosses Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel) (water:polygon): road bridge; road = Beliaghata Main Road
- 11.46 km: crosses Sealdah-Namkhana (rail:rail): road bridge; road = Sealdah Beliaghata Flyover
- 12.04 km: crosses East-West Metro Corridor (Line-2) (rail:subway): rail in tunnel below; road = service

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, left, 33); 0.00 Techno India College (college, left, 71); 0.00 Techno India University gate (Street 2) (key_junction, left, 33); 0.66 Rabindra Bharati University (college, left, 29); 1.19 Anandalok Hospital, Salt Lake City (hospital, right, 59); 1.38 Karunamoyee International Coach Terminus (bus_terminus, left, 77); 1.39 Karunamoyee (key_junction, left, 4); 1.43 Karunamoyee (metro_station, right, 13); 2.22 Central Park (key_junction, left, 28); 2.23 Central Park (metro_station, right, 13); 2.55 Salt Lake City Medical Centre (hospital, right, 48); 2.74 ILS Hospitals (hospital, right, 50); 3.41 City Centre Adjoined Park (park, left, 79); 3.50 City Centre (metro_station, right, 5); 3.51 City Centre (key_junction, left, 28); 3.61 City Centre 1, Salt Lake (mall, left, 68); 3.88 Vasan Eye Care Hospital, Kolkata (hospital, right, 32); 4.01 INOX (cinema, left, 95); 4.63 FabIndia (mall, right, 29); 5.55 Bengal Chemical (metro_station, right, 9); 5.77 Mani Square Mall (mall, right, 145); 5.78 PVR Cinemas (cinema, right, 95); 6.34 Salt Lake Stadium (metro_station, right, 11); 6.34 Salt Lake Stadium (Bypass) (key_junction, right, 11); 6.45 Raajkutir Kolkata (hotel, right, 147); 6.68 Hyatt Regency (hotel, left, 84); 7.01 Vivekananda Yuba Bharati Krirangan (stadium, left, 367); 7.74 Vivekananda Park (park, left, 29); 8.97 CIT More (Beliaghata Main Rd x CIT Rd) (key_junction, right, 1); 9.10 Vivekananda Eye Care Centre (hospital, left, 19); 11.81 B R Singh Hospital (hospital, right, 49); 11.93 UNB building, NRS medical college (hospital, left, 67); 11.93 NRS Medical college & Hospital (hospital, left, 74); 12.05 Sealdah (metro_station, left, 32); 12.08 Sealdah (rail_station, right, 165); 12.08 Sealdah station forecourt (key_junction, right, 36)

Named bus stops on the line (OSM): Wipro 0.45, 201 Nimta PO - Nicco Park Bus Terminus 0.47, Japani Gate Salt Lake Mini Bus Terminus 0.49, Matri Sadan Bus Stop 0.86, Saltlake EE Block Bus Stop 0.89, Karunamoyee 4 1.28, Karunamoyee 1 1.30, Karunamoyee 2 1.32, Karunamoyee 3 1.34, City Centre 3.92, EM Bypass 6.57, Beleghata 7.65, 35 Bus Stand 8.07, Joramandir Bazar 8.30, ID Hospital 8.73, CIT More 8.98, Kalimuddin 9.20, Rashmoni Bazar 9.41, Deshbandhu 9.63, Alochaya 9.76, Uriyabagan 10.04, Sarkar Bazar 10.12, Beleghata Khalpar 10.42, Sales Tax 10.69, Barafkal 10.96, Sealdah Station 11.89, Sealdah Court 11.94.

#### C_bypass_chingrighata_beliaghata: Street 2 -> Nalban/Nicco Park -> Salt Lake Bypass -> Chingrighata -> EM Bypass -> Beliaghata Main Rd -> CIT More -> Sealdah

Total 8.23 km (drive 8.23 km, walk to forecourt 0 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 1.16 | (unnamed) | secondary | 2 | yes |  |
| 1.16 | 3.14 | Salt Lake Bypass | primary | - | yes |  |
| 3.14 | 3.33 | (unnamed) | primary/residential | - | no |  |
| 3.33 | 3.89 | Eastern Metropolitan Bypass | primary/secondary | 2/3 | yes | 43 |
| 3.89 | 6.58 | Beleghata Main Road | secondary | 2 | no |  |
| 6.58 | 6.64 | Beliaghata Main Road | secondary | - | no | 62 |
| 6.64 | 7.55 | Beleghata Road | secondary | - | no |  |
| 7.55 | 7.74 | Sealdah Beliaghata Flyover | secondary | - | yes | 154 |
| 7.74 | 8.08 | Parikshit Roy Lane | secondary | - | yes |  |
| 8.08 | 8.23 | (unnamed) | service | - | yes |  |

Crossings and alongside features:

- 1.17-2.42 km: runs along New Garia - Airport (Line 6) (viaduct)
- 2.56-2.71 km: runs along New Garia - Airport (Line 6) (viaduct)
- 3.34 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Eastern Metropolitan Bypass
- 3.36 km: crosses unnamed canal (OSM w153793808) (water:polygon): road bridge; road = Eastern Metropolitan Bypass
- 6.24 km: crosses Kolkata Circular Railway (rail:rail): rail on bridge/viaduct above; road = Beleghata Main Road
- 6.60 km: crosses Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel) (water:polygon): road bridge; road = Beliaghata Main Road
- 7.61 km: crosses Sealdah-Namkhana (rail:rail): road bridge; road = Sealdah Beliaghata Flyover
- 8.19 km: crosses East-West Metro Corridor (Line-2) (rail:subway): rail in tunnel below; road = service

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, right, 42); 0.00 Techno India University gate (Street 2) (key_junction, right, 43); 0.03 Techno India College (college, right, 38); 1.16 Nalban Metro Station (metro_station, right, 34); 1.16 Nalban (start of Salt Lake Bypass, by Nicco Park) (key_junction, right, 12); 1.33 Nicco Park (theme_park, left, 164); 3.31 Chingrighata (Salt Lake Bypass x EM Bypass) (key_junction, left, 14); 3.87 Vivekananda Park (park, left, 25); 5.12 CIT More (Beliaghata Main Rd x CIT Rd) (key_junction, right, 1); 5.25 Vivekananda Eye Care Centre (hospital, left, 19); 7.96 B R Singh Hospital (hospital, right, 49); 8.08 UNB building, NRS medical college (hospital, left, 67); 8.08 NRS Medical college & Hospital (hospital, left, 74); 8.20 Sealdah (metro_station, left, 32); 8.23 Sealdah (rail_station, right, 165); 8.23 Sealdah station forecourt (key_junction, right, 36)

Named bus stops on the line (OSM): Swasthya Bhawan 0.59, Nicco Park 1.27, Sukanta Nagar/Loha Pul 2.47, Sukanta Nagar 2.90, Chingrighata 3.36, Paribesh Bhavan 3.82, 35 Bus Stand 4.22, Joramandir Bazar 4.45, ID Hospital 4.88, CIT More 5.12, Kalimuddin 5.34, Rashmoni Bazar 5.55, Deshbandhu 5.78, Alochaya 5.91, Uriyabagan 6.19, Sarkar Bazar 6.27, Beleghata Khalpar 6.57, Sales Tax 6.84, Barafkal 7.11, Sealdah Station 8.04, Sealdah Court 8.09.

#### D_bypass_chingrighata_phoolbagan: Street 2 -> Nalban -> Salt Lake Bypass -> Chingrighata -> EM Bypass north -> Stadium/Kadapara -> Phoolbagan -> Rajabazar -> Sealdah

Total 10.57 km (drive 9.99 km, walk to forecourt 583 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 1.16 | (unnamed) | secondary | 2 | yes |  |
| 1.16 | 3.14 | Salt Lake Bypass | primary | - | yes |  |
| 3.14 | 3.33 | (unnamed) | primary/residential | - | no |  |
| 3.33 | 5.97 | Eastern Metropolitan Bypass | primary/primary_link | 2/3/4 | yes | 43 |
| 5.97 | 7.52 | (unnamed) | secondary/tertiary | - | yes |  |
| 7.52 | 8.19 | Narkeldanga Main Road | secondary | - | no |  |
| 8.19 | 8.29 | (unnamed) | secondary | - | no |  |
| 8.29 | 8.75 | Narkeldanga Main Road | secondary | - | no |  |
| 8.75 | 8.82 | (unnamed) | secondary | - | no | 50 |
| 8.82 | 9.22 | Narkeldanga Main Road | secondary | - | no |  |
| 9.22 | 9.99 | Acharya Prafulla Chandra Road | primary | - | yes |  |
| 9.99 | 10.00 | walk: OSM gap: at-grade road/footpath beside Vidyapati Setu (not mapped) | gap/residential | - | no |  |
| 10.00 | 10.41 | walk: pedestrian | pedestrian | - | no |  |
| 10.41 | 10.57 | walk: Bepin Behari Ganguly Street | service/tertiary | - | no |  |

Crossings and alongside features:

- 1.17-2.42 km: runs along New Garia - Airport (Line 6) (viaduct)
- 2.56-2.71 km: runs along New Garia - Airport (Line 6) (viaduct)
- 5.04-5.82 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 6.53-7.51 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 9.20-9.88 km: runs along tram (surface)
- 10.41-10.52 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 3.34 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Eastern Metropolitan Bypass
- 3.36 km: crosses unnamed canal (OSM w153793808) (water:polygon): road bridge; road = Eastern Metropolitan Bypass
- 6.05 km: crosses East-West Metro Corridor (Line-2) (rail:subway): rail on bridge/viaduct above; road = tertiary
- 7.96 km: crosses Kolkata Circular Railway (rail:rail): rail on bridge/viaduct above; road = Narkeldanga Main Road
- 8.09 km: crosses unnamed drain (water:drain): culvert or untagged bridge (OSM road has no bridge tag); road = Narkeldanga Main Road
- 8.23 km: crosses rail (rail:rail): rail on bridge/viaduct above; road = secondary
- 8.77 km: crosses Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel) (water:polygon): road bridge; road = secondary

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, right, 42); 0.00 Techno India University gate (Street 2) (key_junction, right, 43); 0.03 Techno India College (college, right, 38); 1.16 Nalban Metro Station (metro_station, right, 34); 1.16 Nalban (start of Salt Lake Bypass, by Nicco Park) (key_junction, right, 12); 1.33 Nicco Park (theme_park, left, 164); 3.31 Chingrighata (Salt Lake Bypass x EM Bypass) (key_junction, left, 14); 3.85 Vivekananda Park (park, left, 32); 4.58 Vivekananda Yuba Bharati Krirangan (stadium, right, 385); 4.90 Hyatt Regency (hotel, right, 99); 5.24 Salt Lake Stadium (metro_station, right, 8); 5.24 Salt Lake Stadium (Bypass) (key_junction, right, 8); 5.40 Apollo Gleneagles Hospitals (hospital, left, 114); 6.18 Raajkutir Kolkata (hotel, right, 103); 6.28 Inox Swabhumi (cinema, right, 17); 7.39 GURUDAS COLLEGE (college, left, 100); 7.41 Phoolbagan (metro_station, right, 13); 7.41 Phoolbagan (key_junction, right, 13); 8.01 Sir Gurudas Banerjee Halt (rail_station, right, 82); 9.22 Rajabazar (Narkeldanga Main Rd x APC Rd) (key_junction, left, 0); 9.46 Rajabazar Tram Depot (bus_terminus, left, 90); 9.63 ESI HOSPITAL, SEALDAH (hospital, left, 74); 9.99 Sealdah: APC Rd at north foot of Vidyapati Setu (key_junction, right, 0); 10.41 Kole Market (market, right, 119); 10.48 Sealdah (metro_station, right, 6); 10.57 Sealdah (rail_station, right, 132); 10.57 Sealdah station forecourt (key_junction, right, 2)

Named bus stops on the line (OSM): Swasthya Bhawan 0.59, Nicco Park 1.27, Sukanta Nagar/Loha Pul 2.47, Sukanta Nagar 2.90, Chingrighata 3.36, Paribesh Bhavan 3.82, Beleghata 3.93, EM Bypass 5.92, Swabhumi 6.28, Orient 6.39, Phoolbagan 7.38, Phoolbagan 7.50, Rajabazaar Crossing 9.34.

#### E_ultadanga_maniktala_apc: Salt Lake -> PNB -> Hudco/Ultadanga -> Khanna -> APC Road via Maniktala and Rajabazar -> Sealdah

Total 11.42 km (drive 10.84 km, walk to forecourt 583 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 0.09 | (unnamed) | secondary | - | yes |  |
| 0.09 | 1.31 | Street Number 13 | secondary | 2 | yes | 44 |
| 1.31 | 3.71 | (unnamed) | secondary/secondary_link | 2 | yes |  |
| 3.71 | 3.91 | 2nd Cross Road | tertiary | - | yes |  |
| 3.91 | 4.18 | (unnamed) | tertiary | - | yes |  |
| 4.18 | 4.33 | 2nd Cross Road | tertiary | - | yes |  |
| 4.33 | 4.57 | (unnamed) | secondary/tertiary | 2 | yes |  |
| 4.57 | 5.20 | 1st Avenue | secondary | 2 | yes |  |
| 5.20 | 5.79 | (unnamed) | secondary/tertiary | 2 | yes | 46 |
| 5.79 | 6.10 | Kazi Nazrul Islam Avenue | primary | 2 | yes | 174 |
| 6.10 | 6.19 | (unnamed) | primary | 2 | yes |  |
| 6.19 | 6.41 | Bidhannagar Road | primary | 2 | yes |  |
| 6.41 | 6.50 | Ultadanga Underpass | primary | 2 | yes |  |
| 6.50 | 6.60 | Bidhannagar Road | primary | 2 | yes |  |
| 6.60 | 7.53 | Bidhan Nagar Road | primary | - | yes | 104 |
| 7.53 | 7.82 | (unnamed) | primary | - | yes | 286 |
| 7.82 | 8.12 | Shri Aurobindo Sarani | primary | - | yes |  |
| 8.12 | 9.62 | Acharya Prafulla Chandra Bose Road | primary | - | yes | 7 |
| 9.62 | 10.84 | Acharya Prafulla Chandra Road | primary | - | yes |  |
| 10.84 | 10.85 | walk: OSM gap: at-grade road/footpath beside Vidyapati Setu (not mapped) | gap/residential | - | no |  |
| 10.85 | 11.26 | walk: pedestrian | pedestrian | - | no |  |
| 11.26 | 11.42 | walk: Bepin Behari Ganguly Street | service/tertiary | - | no |  |

Crossings and alongside features:

- 0.53-3.71 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 6.17-6.43 km: runs along tram (surface)
- 8.10-10.72 km: runs along tram (surface)
- 11.25-11.37 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 0.46 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Street Number 13
- 0.51 km: crosses Keshtopur Canal (water:polygon): road bridge; road = Street Number 13
- 5.74 km: crosses Krishnapur Canal (water:canal): road bridge; road = tertiary
- 5.95 km: crosses Krishnapur Canal (water:canal): road bridge; road = Kazi Nazrul Islam Avenue
- 6.46 km: crosses rail (rail:rail): road tunnel/underpass; road = Ultadanga Underpass
- 7.62 km: crosses Beliāghāta Canal (water:canal): road bridge; road = primary

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, left, 33); 0.00 Techno India College (college, left, 71); 0.00 Techno India University gate (Street 2) (key_junction, left, 33); 0.66 Rabindra Bharati University (college, left, 29); 1.19 Anandalok Hospital, Salt Lake City (hospital, right, 59); 1.38 Karunamoyee International Coach Terminus (bus_terminus, left, 77); 1.39 Karunamoyee (key_junction, left, 4); 1.43 Karunamoyee (metro_station, right, 13); 2.22 Central Park (key_junction, left, 28); 2.23 Central Park (metro_station, right, 13); 2.55 Salt Lake City Medical Centre (hospital, right, 48); 2.74 ILS Hospitals (hospital, right, 50); 3.41 City Centre Adjoined Park (park, left, 79); 3.50 City Centre (metro_station, right, 5); 3.51 City Centre (key_junction, left, 28); 3.61 City Centre 1, Salt Lake (mall, left, 68); 3.83 INOX (cinema, left, 98); 3.88 Vasan Eye Care Hospital, Kolkata (hospital, right, 32); 4.55 3 Number Island (park, right, 18); 5.23 PNB Island (Salt Lake) (key_junction, right, 16); 5.24 PNB Island (park, right, 16); 5.52 AA-AB Khaal Paar (park, right, 26); 6.19 Rameswara Nursing Home Pvt Ltd (hospital, left, 115); 6.42 Hudco More (Ultadanga) (key_junction, right, 0); 6.45 Bidhannagar Road (rail_station, left, 113); 6.46 Bidhannagar Road (bus_terminus, left, 32); 6.70 15 No Bus Stand (S30) (bus_terminus, left, 54); 8.12 Khanna (APC Rd x Aurobindo Sarani) (key_junction, right, 9); 9.10 Maniktala crossing (APC Rd) (key_junction, right, 4); 9.31 The Leprosy Mission Permananda Memorial Leprosy Ho (hospital, left, 29); 9.73 Bose Institute (college, right, 15); 9.89 Dr. M. N. Chatterjee Memorial Eye Hospital (hospital, left, 37); 10.06 Rajabazar (Narkeldanga Main Rd x APC Rd) (key_junction, left, 0); 10.30 Rajabazar Tram Depot (bus_terminus, left, 90); 10.47 ESI HOSPITAL, SEALDAH (hospital, left, 74); 10.84 Sealdah: APC Rd at north foot of Vidyapati Setu (key_junction, right, 0); 11.26 Kole Market (market, right, 119); 11.33 Sealdah (metro_station, right, 6); 11.42 Sealdah (rail_station, right, 132); 11.42 Sealdah station forecourt (key_junction, right, 2)

Named bus stops on the line (OSM): Wipro 0.45, 201 Nimta PO - Nicco Park Bus Terminus 0.47, Japani Gate Salt Lake Mini Bus Terminus 0.49, Matri Sadan Bus Stop 0.86, Saltlake EE Block Bus Stop 0.89, Karunamoyee 4 1.28, Karunamoyee 1 1.30, Karunamoyee 2 1.32, Karunamoyee 3 1.34, City Centre 3.95, 3 No 4.55, AB AC Pahri 4.87, PNB 5.17, Rajabazaar Crossing 10.19.

#### F_ultadanga_kankurgachi_phoolbagan: Salt Lake -> PNB -> Hudco -> CIT Road -> Kankurgachi -> Phoolbagan -> Narkeldanga Main Rd -> Sealdah

Total 12.34 km (drive 11.76 km, walk to forecourt 583 m).

| From km | To km | Road (OSM name; "(unnamed)" = no name in OSM) | Class | Lanes tag | Divided/oneway | Bridge m |
|---|---|---|---|---|---|---|
| 0.00 | 0.09 | (unnamed) | secondary | - | yes |  |
| 0.09 | 1.31 | Street Number 13 | secondary | 2 | yes | 44 |
| 1.31 | 3.71 | (unnamed) | secondary/secondary_link | 2 | yes |  |
| 3.71 | 3.91 | 2nd Cross Road | tertiary | - | yes |  |
| 3.91 | 4.18 | (unnamed) | tertiary | - | yes |  |
| 4.18 | 4.33 | 2nd Cross Road | tertiary | - | yes |  |
| 4.33 | 4.57 | (unnamed) | secondary/tertiary | 2 | yes |  |
| 4.57 | 5.20 | 1st Avenue | secondary | 2 | yes |  |
| 5.20 | 5.79 | (unnamed) | secondary/tertiary | 2 | yes | 46 |
| 5.79 | 6.10 | Kazi Nazrul Islam Avenue | primary | 2 | yes | 174 |
| 6.10 | 6.19 | (unnamed) | primary | 2 | yes |  |
| 6.19 | 6.41 | Bidhannagar Road | primary | 2 | yes |  |
| 6.41 | 7.78 | CIT Road | tertiary | 2 | no |  |
| 7.78 | 8.12 | Satin Sen Sarani | primary/secondary | 2 | yes |  |
| 8.12 | 8.98 | CIT Road | primary | 2 | yes |  |
| 8.98 | 9.30 | (unnamed) | secondary/tertiary | - | yes |  |
| 9.30 | 9.96 | Narkeldanga Main Road | secondary | - | no |  |
| 9.96 | 10.06 | (unnamed) | secondary | - | no |  |
| 10.06 | 10.52 | Narkeldanga Main Road | secondary | - | no |  |
| 10.52 | 10.59 | (unnamed) | secondary | - | no | 50 |
| 10.59 | 10.99 | Narkeldanga Main Road | secondary | - | no |  |
| 10.99 | 11.76 | Acharya Prafulla Chandra Road | primary | - | yes |  |
| 11.76 | 11.77 | walk: OSM gap: at-grade road/footpath beside Vidyapati Setu (not mapped) | gap/residential | - | no |  |
| 11.77 | 12.18 | walk: pedestrian | pedestrian | - | no |  |
| 12.18 | 12.34 | walk: Bepin Behari Ganguly Street | service/tertiary | - | no |  |

Crossings and alongside features:

- 0.53-3.71 km: runs along East-West Metro Corridor (Line-2) (viaduct)
- 6.17-6.83 km: runs along tram (surface)
- 7.77-8.12 km: runs along tram (surface)
- 9.00-9.29 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 10.98-11.65 km: runs along tram (surface)
- 12.18-12.29 km: runs along East-West Metro Corridor (Line-2) (tunnel)
- 0.46 km: crosses New Garia - Airport (Line 6) (rail:construction): rail on bridge/viaduct above; road = Street Number 13
- 0.51 km: crosses Keshtopur Canal (water:polygon): road bridge; road = Street Number 13
- 5.74 km: crosses Krishnapur Canal (water:canal): road bridge; road = tertiary
- 5.95 km: crosses Krishnapur Canal (water:canal): road bridge; road = Kazi Nazrul Islam Avenue
- 9.73 km: crosses Kolkata Circular Railway (rail:rail): rail on bridge/viaduct above; road = Narkeldanga Main Road
- 9.87 km: crosses unnamed drain (water:drain): culvert or untagged bridge (OSM road has no bridge tag); road = Narkeldanga Main Road
- 10.00 km: crosses rail (rail:rail): rail on bridge/viaduct above; road = secondary
- 10.55 km: crosses Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel) (water:polygon): road bridge; road = secondary

Landmarks in order (km, side of travel, offset m):

0.00 Techno India University (college, left, 33); 0.00 Techno India College (college, left, 71); 0.00 Techno India University gate (Street 2) (key_junction, left, 33); 0.66 Rabindra Bharati University (college, left, 29); 1.19 Anandalok Hospital, Salt Lake City (hospital, right, 59); 1.38 Karunamoyee International Coach Terminus (bus_terminus, left, 77); 1.39 Karunamoyee (key_junction, left, 4); 1.43 Karunamoyee (metro_station, right, 13); 2.22 Central Park (key_junction, left, 28); 2.23 Central Park (metro_station, right, 13); 2.55 Salt Lake City Medical Centre (hospital, right, 48); 2.74 ILS Hospitals (hospital, right, 50); 3.41 City Centre Adjoined Park (park, left, 79); 3.50 City Centre (metro_station, right, 5); 3.51 City Centre (key_junction, left, 28); 3.61 City Centre 1, Salt Lake (mall, left, 68); 3.83 INOX (cinema, left, 98); 3.88 Vasan Eye Care Hospital, Kolkata (hospital, right, 32); 4.55 3 Number Island (park, right, 18); 5.23 PNB Island (Salt Lake) (key_junction, right, 16); 5.24 PNB Island (park, right, 16); 5.52 AA-AB Khaal Paar (park, right, 26); 6.19 Rameswara Nursing Home Pvt Ltd (hospital, left, 115); 6.42 Hudco More (Ultadanga) (key_junction, right, 0); 6.44 Bidhannagar Road (bus_terminus, right, 54); 6.53 Bidhannagar Road (rail_station, right, 33); 6.84 Uttarapan Shopping Complex (mall, left, 126); 7.72 Eye Foundation And Research Centre (hospital, left, 14); 8.08 S-3B Bus Terminus (bus_terminus, left, 95); 8.12 Kankurgachi (CIT Rd x Maniktala Main Rd) (key_junction, right, 8); 8.66 V.I.P. Market (market, left, 43); 8.68 Pantaloons (mall, right, 56); 9.06 Phoolbagan (metro_station, left, 2); 9.06 Phoolbagan (key_junction, left, 3); 9.16 GURUDAS COLLEGE (college, left, 100); 9.78 Sir Gurudas Banerjee Halt (rail_station, right, 82); 10.99 Rajabazar (Narkeldanga Main Rd x APC Rd) (key_junction, left, 0); 11.23 Rajabazar Tram Depot (bus_terminus, left, 90); 11.40 ESI HOSPITAL, SEALDAH (hospital, left, 74); 11.76 Sealdah: APC Rd at north foot of Vidyapati Setu (key_junction, right, 0); 12.18 Kole Market (market, right, 119); 12.26 Sealdah (metro_station, right, 6); 12.34 Sealdah (rail_station, right, 132); 12.34 Sealdah station forecourt (key_junction, right, 2)

Named bus stops on the line (OSM): Wipro 0.45, 201 Nimta PO - Nicco Park Bus Terminus 0.47, Japani Gate Salt Lake Mini Bus Terminus 0.49, Matri Sadan Bus Stop 0.86, Saltlake EE Block Bus Stop 0.89, Karunamoyee 4 1.28, Karunamoyee 1 1.30, Karunamoyee 2 1.32, Karunamoyee 3 1.34, City Centre 3.95, 3 No 4.55, AB AC Pahri 4.87, PNB 5.17, Kankurgachi 8.02, Mukulbithi 8.34, Kathgola 8.48, Pantaloons/V.I.P. Market 8.69, Phoolbagan 8.97, Phoolbagan 9.15, Rajabazaar Crossing 11.12.

#### M_green_line: Green Line metro: Salt Lake Sector V -> Sealdah (track geometry from OSM)

Track length 8.74 km.

| Station | km | Level (OSM) |
|---|---|---|
| Salt Lake Sector V | 0.00 | elevated |
| Karunamoyee | 1.21 | elevated |
| Central Park | 2.02 | elevated |
| City Centre | 2.92 | elevated |
| Bengal Chemical | 4.08 | elevated |
| Salt Lake Stadium | 4.87 | elevated |
| Phoolbagan | 6.53 | underground |
| Sealdah | 8.74 | underground |

Elevated to underground at 5.61 km (22.57074, 88.398967; game [-1561.5, 346.0]).
- 0.00 km: East-West Metro Corridor Extension (Line-2): metro elevated
- 0.25 km: Keshtopur Canal: metro elevated
- 6.98 km: Kolkata Circular Railway: metro underground
- 7.75 km: Beliaghata Canal (canal polygon, unnamed in OSM; the Circular Canal-Beliaghata Canal channel): metro underground
- 8.53 km: Sealdah-Namkhana: metro underground

---

## 8. corridors.json schema (short)

```
{ start, end,
  corridors: [{ id, title, length_m, drive_m, walk_tail_m,
     via: [{key, name, lat, lon}],                      // waypoints in order
     polyline: [{lat, lon, game:[x,z], d_m}],           // simplified at 1 m tolerance
     segments: [{from_m, to_m, length_m, from_i, to_i, mode:'drive'|'walk', name?, highway, lanes?, oneway?,
                 bridge?, tunnel?, layer?, maxspeed?, ref?, osm_ways:[id]}],  // from_i/to_i index polyline
     crossings: [{d_m, kind:'rail:rail|rail:tram|rail:subway|rail:construction|water:*', name, how, lat, lon, game, road}],
     alongside: [{from_m, to_m, kind, name, level:'viaduct|tunnel|surface'}],
     landmarks: [{d_m, name, kind, offset_m, side:'left|right', lat, lon, game, osm}] }],
  metro: { stations:[{name, d_m, ...}], levels:[{level, from_m, to_m}], portal, polyline, crossings },
  network: { hubs:[{key, name, lat, lon, game, corridors:[{corridor, d_m}]}], pairs:[{a, b, shared_m, split_at}] },
  areas: { <area>: {road_km_per_km2, junctions_per_km2, oneway_share, named_share, grid_score, dominant_bearings_deg, by_class_km} } }
```

Landmark kinds: `metro_station, rail_station, rail_station_building, bus_terminus, bus_stop, key_junction, junction, hospital, mall, market, stadium, park, college, cinema, police, hotel, theme_park, sight, temple_mosque_church, fuel, area, salt_lake_block`. `key_junction` entries are the router waypoints (coordinates taken from OSM road intersections). Bus stops come from OSM `highway=bus_stop` and bus platforms.

---

## 9. Sources

Web facts were gathered 2026-11-09. Ages are as shown on the pages.

- Green Line stations, gaps, levels and openings; peak headway: https://en.wikipedia.org/wiki/Green_Line_(Kolkata_Metro)
- Sector V station exits and the IT Centre link: https://en.wikipedia.org/wiki/Salt_Lake_Sector-V_and_IT_Centre_metro_stations
- Karunamoyee station (beside the bus terminal): https://en.wikipedia.org/wiki/Karunamoyee_metro_station
- City Center station (bus list): https://en.wikipedia.org/wiki/City_Center_metro_station
- Bengal Chemical station (Mani Square): https://en.wikipedia.org/wiki/Bengal_Chemical_metro_station
- Salt Lake Stadium station (tunnel beside Subhas Sarobar): https://en.wikipedia.org/wiki/Salt_Lake_Stadium_metro_station
- Phoolbagan station: https://en.wikipedia.org/wiki/Phoolbagan_metro_station
- Sealdah metro station: https://en.wikipedia.org/wiki/Sealdah_metro_station
- Metro hours from 27 Jul 2026: https://www.constructionworld.in/transport-infrastructure/metro-rail-and-railways-infrastructure/kolkata-metro-extends-blue-and-green-line-timings/95107
- Fares and times (conflicting):
  - https://www.metrofare.in/en/india/kolkata-metro/route/salt-lake-sector-v-to-sealdah/
  - https://trackmymetro.com/kolkata-metro/route/salt-lake-sector-v-to-sealdah
  - https://www.rome2rio.com/s/Salt-Lake-Sector-V-Station/Sealdah-Station
- Orange Line trials, Chingrighata gap: https://www.squareyards.com/blog/kolkata-metro-orange-line-project-advances-as-beleghata-to-sector-v-trials-begin
- Chingrighata closures, May 2026: https://swarajyamag.com/news-brief/kolkata-metro-orange-line-work-at-chingrighata-to-trigger-major-em-bypass-traffic-diversions-across-two-weekends
- EM Bypass (lanes, SH 3, junctions): https://en.wikipedia.org/wiki/Eastern_Metropolitan_Bypass
- Beliaghata (Main Road, CIT More, Khalpool, jams): https://en.wikipedia.org/wiki/Beliaghata
- Phoolbagan: https://en.wikipedia.org/wiki/Phoolbagan
- Ultadanga (Hudco More, flyover, bus routes): https://en.wikipedia.org/wiki/Ultadanga
- Ultadanga flyover: https://www.millenniumpost.in/kolkata/ultadanga-flyover-flank-gets-nod-for-traffic-movement-362913
- Bidhannagar Road station: https://en.wikipedia.org/wiki/Bidhannagar_Road_railway_station
- Sealdah area, Vidyapati Setu, markets, NRS: https://en.wikipedia.org/wiki/Sealdah
- Sealdah railway station: https://en.wikipedia.org/wiki/Sealdah_railway_station
- B B Ganguly Street: https://en.wikipedia.org/wiki/Bepin_Behari_Ganguly_Street
- Koley Market: https://sealdah.in/shopping
- Sealdah hawkers, 2026: https://www.theweek.in/news/india/2026/07/09/we-voted-for-change-not-this-kolkatas-hawkers-fight-for-survival-amid-bjp-govts-eviction-drive.html
- Trams: https://en.wikipedia.org/wiki/Trams_in_Kolkata and https://www.millenniumpost.in/bengal/rti-raises-hopes-of-tramrevival-on-key-routes-659645
- Salt Lake Sector V (workers, road km, College More flyover): https://en.wikipedia.org/wiki/Salt_Lake_Sector-V and https://en.wikipedia.org/wiki/East_Kolkata
- Bus listings:
  - https://www.niccoparks.com/transportation/
  - https://kolkatay.blogspot.com/2017/05/bus-service-route-no.html
  - http://kbscstc.blogspot.com/
  - https://www.calcuttayellowpages.com/busroute.html
  - https://www.rome2rio.com/s/Sealdah/Salt-Lake-Sector-V-Station
  - https://www.rome2rio.com/s/Ultadanga/Salt-Lake-Sector-V-Station
- Shared autos:
  - https://www.tripadvisor.in/ShowTopic-g304558-i7263-k6868993-Auto_Rickshaw_Routes-Kolkata_Calcutta_Kolkata_District_West_Bengal.html
  - https://www.shareautos.in/2022/07/popular-share-auto-routes-kolkata.html
  - https://yometro.com/from-karunamoyee-metro-station-kolkata-to-salt-lake-sector-v-metro-station-kolkata
- Bike taxi rules, WB 2024:
  - https://www.teamleaseregtech.com/updates/article/35673/west-bengal-govt-issued-additional-guidelines-in-continuation-with-the/
  - https://www.millenniumpost.in/bengal/state-imposes-luggage-limit-for-passengers-on-bike-taxis-581362
- App-cab surge rules:
  - https://www.deccanherald.com/india/west-bengal-notifies-guidelines-on-fares-surge-pricing-penalty-on-inapt-cancellation-of-cab-rides-1088094.html
  - https://entrackr.com/news/govt-revises-ride-hailing-rules-2x-surge-cap-cancellation-fee-and-push-for-bike-taxis-9455586
- Yellow taxis:
  - https://gulfnews.com/world/asia/india/end-of-the-road-for-kolkatas-beloved-yellow-taxis-1.500038637
  - https://www.siasat.com/over-64-pc-of-kolkatas-iconic-yellow-taxis-to-disappear-by-march-2025-3152921/
- Toto bans:
  - https://www.thestatesman.com/cities/kolkata/bengal-toto-owners-to-abide-by-restrictions-but-proposes-minimum-fare-hike-1503627214.html
  - https://www.durantbarta.com/west-bengal/transport-department-directive-toto-vehicles-banned-from-gt-road-and-bus-routes
  - https://kolkatatvonline.in/west-bengal/toto-e-rickshaw-restriction-west-bengal-roads-transport-department-kolkatatv-online-kolkata-news/
- Waterlogging:
  - https://www.theweek.in/wire-updates/national/2025/07/08/cal2-wb-rain.html (8 Jul 2025)
  - https://en.wikipedia.org/wiki/September_2025_Kolkata_cloudburst (23 Sep 2025)
  - https://bengalinfo.com/newsdetail.php?newsid=499106 (22 Jun 2026)
  - https://www.millenniumpost.in/bengal/city-braces-for-more-rain-amid-waterlogging-671962 (Aug 2026)
- ID & BG Hospital: https://idbghospital.in/contact-us/
- Street View, Sealdah North forecourt (May 2022): `img/sealdah_d_h0.jpg`, `img/sealdah_d_h180.jpg` (see `img/log.txt` for the panorama links)
