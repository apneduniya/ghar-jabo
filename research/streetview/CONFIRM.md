# Confirmation pass: open questions from NORTH.md and SOUTH.md

Checked 2026-11-09 against Google Street View (Jan–Feb 2026 car imagery unless noted), Google Maps place pins
and labels, satellite, and web listings. I used Chromium on the Mac. The display was asleep, so headed capture
stalled and I switched to headless with a normal user agent. Screenshots are in `img/confirm/` (gitignored), and
`img/confirm/log.txt` lists each shot with the point Google snapped to. Game coordinates are (x east, z south)
at 0.5 units per metre from PwC More.

## Verdicts

| # | Question | Verdict | One-line answer |
|---|---|---|---|
| 1a | Which side of BBS each station is on | **Confirmed, with a correction** | Sector V (Green) is on the canal (NW) side. IT Centre (Orange) is on the SE side, over the SE carriageway. IT Centre is a white box with a blue curved roof, not beige; only its underside is beige. |
| 1b | Where the skywalk runs | **Confirmed** | One enclosed steel-truss bridge crosses the NW carriageway between the two stations, about 28, −238 in game units. |
| 1c | Where the Orange Line goes SW of IT Centre | **Corrected** | It runs SW alongside the Nabadiganta flyover on its SE (Wipro) side, on its own single-pier concrete viaduct, towards Nalban/Nicco Park. It does not follow 3rd Ave or the canal. |
| 1d | Is the Orange Line running? | **Still unknown (not yet)** | Trial runs to IT Centre started on 10 Oct 2026, with passenger service targeted for late Dec 2026. Google's transit layer shows only the Green Line here. |
| 2 | Wipro More auto queue | **Confirmed, located precisely** | Autos stand nose to tail on the NE carriageway of 3rd Ave, from the canal bridge to the Green Line pier: about (−154, −138) to (−171, −160). |
| 3a | Brown/pink glass tower vs AltAir/Capella tower | **Corrected: one building** | Both are Ecocentre (Ambuja Neotia), a single 21-storey slab (B+G+20) that runs about 50–200 m along the SW side. AltAir/Capella is the hotel and sky bar on its top floors. |
| 3b | IIHM | **Corrected** | A white 4-storey block at about 140–160 m on the NE side. It was not the footprint the overrides had; that footprint is the hotel. |
| 3c | Cream drum-base tower (Monotel?) | **Corrected** | It isn't Monotel. It's a cream tower of about 12 storeys with red spandrels at about 300–320 m, with Wipro Gate 4 at its SE corner, so probably part of the Wipro campus. Monotel is a 10-storey sandstone tower at about 205 m. |
| 3d | Red-brick crowned block (MoD RTC?) | **Confirmed** | It's the Regional Training Centre, Ministry of Defence. The gate pillar reads "Govt of India, Ministry of Defence". |
| 3e | Pink slab towers | **Corrected: not there** | These were Ecocentre seen from 280 m. The two footprints that the overrides set to 14–15 floors are low blocks. |
| 3f | SE-corner Wipro More tower | **Confirmed, floors corrected** | A Wipro tower (logo on the crown) with a rounded blue-glass corner and red balcony bays, about 10 floors rather than 12+. |
| 3g | Raw columns at about 280 m | **Corrected** | They are a stalled foot overbridge: a tall stair column and a raking stair frame on the NE footpath beside Wipro Gate 4. It is not a building site. |
| 3h | 2026 gap at 130–250 m | **Filled** | Jan 2026 car imagery exists all along (`g13a`–`g13d`). The earlier capture had just missed the snap points. |
| 4a | PwC More NW corner | **Confirmed: no building** | A walled, treed compound with a red-brown fence and tin-roof tea stalls on the footpath. No OSM footprint, none seen. |
| 4b | SE chequered building name | **Still unknown (likely police)** | It has police livery and a Nabadiganta Traffic Guard bus board beside it, but no readable name. It is probably the post OSM calls "Sector-V Police Station" (OSM puts that node about 60 m east). |
| 4c | SW-corner peach tower name and floors | **Corrected: no such tower** | The corner plot is still vacant behind the blue hoarding, as the satellite shows. The tower seen from Street 2 is Ecocentre, 21 storeys. |
| 5a | College More NE-corner tower | **Partly corrected** | The corner itself is the WBSEDCL 33/11 kV substation. A newly built tower of about 20 floors stands just behind it, with a crane beside it in Jan 2026. Name unknown. |
| 5b | Starbucks tower | **Corrected** | It is Saltee Tech Park (DN-18), 15 storeys (B+G+14), not 18–20. |
| 5c | Webel More towers | **Partly confirmed** | On the east side of Street 18 are the showroom block (Philips, MG, Schneider), Rashmi Tower, and the Concentrix building to its north. I didn't count floors again. |
| 5d | Primarc block | **Confirmed and located** | Primarc Tower (DN-36) is a grey-beige tower of about 15 floors set back behind the white 3–4 storey P.N. Mukherjee building at about 340 m. |
| 6 | Street 2 stalls south of TIU entrance | **Confirmed, end found** | The row continues about 55 m past the TIU portico to about 22.5750 (game −49, 110). South of that is the Govt of India employment-office compound (orange fence), with no stalls down to Street 17. |

## Notes

**1. Stations.** At `b2` (22.58112, 88.42957, under the stations), looking NE (`b2_h57`), the left/NW side has
the Sector V box. It's white, with a copper-brown fascia, brick-clad piers, and car parking under it behind the
square-motif railing (`b2_h327`). The right/SE side has a long white station with windows and a **blue curved
roof** (`b2_h147`). The skywalk is ahead. At `b5` (22.58122, 88.43017) the camera is *under* a wide beige coffered
deck on the SE carriageway (labelled BBS) with granite-clad piers (`b5_h237`, `b5_h327`). At `b3`, on the NW
carriageway labelled Salt Lake Bypass, the white blue-roof station is on the SE side and the skywalk crosses this
carriageway (`b3_h237`). So the SE station straddles the SE carriageway and the skywalk spans the NW one. This
agrees with the OSM IT Centre footprint (x −1…64, z −202…−250).

SW of the stations (`o1_*`, 22.5797, 88.42763, on the Wipro side), the flyover is a blue steel plate-girder deck.
SE of it runs a separate smooth beige concrete box on single round piers with no road parapet. It ends near the
"IT Center Metro" pin (about −23, −188). Wikipedia puts Nalban (the next Orange Line stop) on the Salt Lake
Bypass branch of BBS by Nicco Park, which fits a viaduct following the flyover corridor SW. I didn't see a train
or sign on that viaduct, so its identity as the Orange Line comes from route and position. The stations
renderer is in `src/` and wasn't touched.

**2. Wipro More autos.** `wa1_h0` and `wa1_h90` are at the canal bridge and `wa2_h135` is at the pier. The other
carriageway, beyond the hedge median, is packed with autos for about 60 m, across the road from the Bharat
Petroleum pump. That was congested traffic as well as a stand, so treat the length as approximate.

**3. Street 13, PwC More → Wipro More, now continuous.** NE side, from SE to NW: shanties at the PwC compound,
then **IIHM** at about 140–160 m (`g13a_h39`, `cnt_iihm`: "IIHM Global Campus" wall sign, white, 4 storeys),
then the **business hotel** at about 205 m (`g13c_h39`: name on the forecourt wall; `cnt_monotel`: sandstone,
vertical glass strip, about 10 floors), then a white 4-storey block with a paan stall at about 230 m, then
**Wipro Gate 4** with the abandoned stair-tower columns at about 280 m (`col_h80`, `cnt_drum`), then the cream
12-storey drum tower, then the Wipro corner tower. SW side: **Ecocentre** from about 50 to 200 m (`alt_h250`,
`g13a_h219` to `g13c_h219`; "ECOCENTRE … Neotia" on the podium; the hotel name is on the crown in `cnt_wipro`),
then a long walled compound with big trees and a side gate at about 240 m (`g13d_h219`), then the MoD training
centre.

**4. PwC More.** `pw_h315` (NW) shows trees, a red-brown fence, and tea stalls, with Ecocentre on the left.
`pw_h225` (SW) shows the junction with Ecocentre at right. `pw_h160_zoom2` shows the chequered post. The yellow
board reads "All office buses go straight towards College More … Nabadiganta Traffic Guard".

**5. College More, Starbucks, Primarc, Webel.** In `cm_h45` and `cmst18_h120` the NE corner is the
substation's pale-green 4-storey office with a mast. Its Google pin is at 22.57494, 88.43425, which is at the
override footprint. Behind it is a tall brown-and-glass tower with a tower crane. Primarc is in `pri_h27`. Webel
More is in `wb_h90` and the labels in `q_webel_sat19`.

**6. Street 2.** `s2s0_h108` (22.57519) shows stalls under black and blue tarps behind the white railing.
`s2s1_h18` (22.57479) shows the row starting about 20–30 m north of the camera, and `s2s1_h108` shows the orange
fence of the employment office with no stalls. The point `s2s2` snapped to Street 17 (22.5739).

## overrides.json changes

- `new:pwc-more-sw-tower`: now Ecocentre. The footprint is the merged old `new:altair` + `new:capella` +
  `new:ecocentre` traces (2,590 m²), lv 21. I kept the key because `mapdata.test.ts` looks it up and checks that
  it is the tallest building near PwC More, which is still true. Renaming it is the lead's call.
- Removed `new:altair`, `new:capella` and `new:ecocentre`, which are now merged into the entry above.
- `193478726`: was IIHM, 7 floors. Now the business hotel, 10 floors, sandstone. Added `new:iihm`: a 40×25 m
  footprint, 4 floors, white.
- Added `193478723`: 4 floors, white.
- `158642186`: 14 → 12. Identity note fixed: it isn't the hotel, it's beside Wipro Gate 4.
- `158019906`: 12 → 10. It's a Wipro tower.
- `362948042`: identity confirmed in `src`.
- `193479375`: 15 → 4 (hs guess). `362948053`: 14 → 4. Neither is a pink slab tower.
- `238287187` (Saltee Tech Park): 20 → 15.
- Added `986997138` (Primarc Tower): 15.
- `new:college-more-ne-tower` and `new:pwc-more-se-post`: only the `src` notes changed.

## Still open

- The name of the College More tower, and an exact footprint for it (the satellite predates it).
- The name on the SE-corner police post at PwC More.
- Floor counts at Webel More, and when the Orange Line opens to passengers (the target is late Dec 2026).
