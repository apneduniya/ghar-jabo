# Route audit: every corridor, both modes (2026-11-12)

Survey of `main` at d2f7bc7 (the private preview at 100.95.71.119:4173 serves the same build), done after the owner's
play test on 2026-11-12: "lighting bad further down the road", "obstacles in the middle of the road, divider and all",
"the camera handling on the Wipro More bridge isn't there on other bridges or roadways". This is the check only. No game
code was changed.

## Summary

31 issues: **5 lighting, 13 obstacles in the road, 5 camera, 5 gaps, 3 other**. The evidence is 96 timed and 178
free live stops (1,092 screenshots) and the code checks. 21 timed stops and 12 free stops show the camera inside
geometry. The other problems were confirmed by eye on contact sheets and located with the code checks.

The biggest causes, roughly in order of how much they would fix:

1. **The two carriageways of divided roads overlap (6).** Widths are double real lane width, but OSM spacing is real,
   and in timed the warp shrinks the spacing a further ~3x. As a result:
   - the Bypass median railing runs down the other carriageway's lanes (7);
   - Green Line piers stand in lanes (8: 91 lane hits in timed, 16 in free);
   - footpaths and kerbs cross the road;
   - bridge parapets cross lanes (16).
   This is most of "divider and all in the middle of the road".
2. **The camera knows about Sector V structures only (19, 23).** `roofs(map.roads)` is the only overhead source, and
   the pull-in check asks only the Sector V building grid. Under every streamed elevated station, viaduct, flyover
   and rail bridge the camera stays at y 8, inside or on top of the structure (20-22), and on streamed streets it
   ends up behind buildings. The Wipro More / Nabadiganta behaviour the owner likes is the `roofs()` clamp, which
   the streamed world never feeds.
3. **Fog and lamps thin out beyond Sector V (1-3).** Fog far drops from 340 to 230-290, and to 146-187 when the
   adaptive draw distance is at its floor, which happens at the Sector V edge. Night fog is flat purple. Lamps are
   one-sided and sparse on wide roads (timed has 1-4 per 200 u on long stretches), and the lamp pools are small
   asphalt discs. That is "lighting bad further down the road".
4. **Flyover data is broken (9, 10, 15).**
   - The Ultadanga Flyover ramp feet are solid walls across VIP Rd.
   - Bidhan Nagar Rd over the Beliaghata Canal is a "flyover" made of stepped slabs.
   - The Sealdah–Beliaghata Flyover is a 25 u stub.
   - Vidyapati Setu is a stand-in deck on the wrong heading.
5. **In timed, true-size landmark models land on squeezed roads (11).** 21 of them, and they have no collision (29).

Every corridor can be walked end to end in both modes, but only by going round these obstacles (24). Driving can't
reach the forecourt on A, D and F (25), C and D leave Sector V along a road the traffic graph doesn't have (26), and
E detours 2.7 km at the Bidhan Nagar Rd canal bridge (27). Performance is fine: 59-62 fps and at most 51 draw calls
(30).

| Kind | Issues | Corridors | Modes |
|---|---|---|---|
| Lighting | 1-5 | all | both |
| Obstacles in the road | 6-18 | all (worst: A Salt Lake arterial and Bypass, C/D Salt Lake Bypass, E/F Ultadanga, B/C Sealdah) | both; 6, 8 and 11 much worse in timed |
| Camera | 19-23 | all streamed stretches; every elevated station, viaduct, flyover and rail bridge | both |
| Gaps | 24-28 | A, D, F (forecourt by road); C, D (Sector V exit); E (Bidhan Nagar Rd) | both |
| Other | 29-31 | all | both |

**How this was checked**

- **Live, Mac GPU.** Headless Chromium 156 with `--use-angle=metal`, 390x844 portrait, touch, DPR 2, driven over CDP.
  For every corridor (A-F) in both modes the player was placed on foot along the corridor line: every 80 u in timed and
  every 100 u in free, plus a stop at every crossing, flyover end and middle, metro station, portal and named landmark
  near the line. Shared stretches were shot once. Phone calls, metro entry and arrival were switched off. At each stop
  there are four shots (forward and back, at 7:00 PM dusk and 9:00 PM night), with fps, draw calls, triangles, fog and
  camera position recorded. In total there were 96 timed stops (384 shots) and 178 free stops
  (708 shots; one screenshot timed out).
  The camera pass walked the player through every streamed bridge, flyover, elevated station and rail bridge, and
  through the Sector V references (Wipro More canal bridge, Nabadiganta flyover).
- **Code.** Throwaway vitest scripts (since deleted) built `World` with the real `sectorv.json` and `world.json` in
  both modes and streamed every chunk along every corridor. They then sampled the sim's own collision
  (`World.walkBlocked`, chunk blockers, structure solids, water) at the lane centres of every net road, compared every
  pair of carriageways, ran a breadth-first walk along each corridor and routed the traffic graph in 150 u legs.
  They also listed every elevated structure against `roofs()`, and compared lights, fog and materials.
- **Screenshot paths** below are relative to `research/routes/img/audit/` (gitignored by `research/routes/img/`).
  `timed/<stop>-<fwd|back>-<dusk|night>.jpg`, `free/...`, and `cam-<mode>/<item>-t<offset>.jpg` for the camera pass.
  A stop name is `<corridor>-<distance along it>-<what>`.
- **Coordinates** are game units (x east, z south). Lat/lon come from the game-to-real fit in ROUTES.md (TIU gate and
  Sealdah), so they're accurate to about 10 m. In timed, positions are warped, so the lat/lon given is the real place
  (`warp.toReal`).
- **"Inside geometry"** means the screenshot is at least 60% one flat colour, with the camera inside a box. This was
  checked by eye on a sample of shots.

---

## A. Lighting (why it looks worse further down the road)

The sky, hemisphere light and sun/moon are one global set (`render/sky.ts`), so they are the same everywhere and not
the cause. Nothing in the game uses point lights, so "lighting" is fog, lamp pools and emissive windows and signs.
Beyond Sector V all three are thinner. Measured brightness is about the same (the mean scene luminance of the night
shots is 34 in Sector V and 40 beyond it, because the purple fog brightens far things). The difference is flatness:
the far half of the view is fog-coloured and the carriageway has no pools of light.

**1. The fog closes in as soon as you leave Sector V, and closes in further when the draw-call count is high.**
Applies to all corridors in both modes.
- Measured fog (near/far, game units):
  - 122/340 at the TIU gate.
  - 67/187 from A-00120 to A-00520 in timed and from A-00240 to A-00440 in free. That is still inside or at the edge
    of Sector V, where the map and the chunks are both drawn, the frame reaches 47-51 draw calls, and
    `StreamedWorld.reach` drops to its 0.55 floor.
  - Salt Lake 104-115/290-320, Bypass 94/260, old city (Phoolbagan, Narkeldanga, Beliaghata, Sealdah) 83/230.
  - Under the A rail underbridge at Salt Lake Stadium (timed A-01557/A-01560): 52/146.
  - 182 of the 384 timed shots have fog 83/230.
- At night the fog colour is `#231f33`, so from about 80 u everything fades to flat dark purple. Compare
  `timed/A-00280-road-fwd-night.jpg` (Sector V, lamp pools, far towers still lit) with
  `timed/C-01000-road-fwd-night.jpg`, `timed/E-01720-road-fwd-night.jpg` and `free/A-03740-road-fwd-night.jpg`.
- Causes:
  - `CHUNK_VIEW.fogFar` sets 340 inside Sector V and 290/260/230 beyond it (`content/tuning.ts`), and `areaFogFar`
    blends to these within 200 u of the square (`render/world/streamed.ts`).
  - `CHUNK_VIEW.adapt` multiplies by `reach` (minimum 0.55) whenever the last frame had more than 50 calls
    (`StreamedWorld.update`).
  - The whole Sector V group stays drawn until 600 u from the origin (`hideSectorV`), which keeps the call count high
    exactly where the player leaves the map.
- Fix:
  - Keep fog far at about 300+ at night everywhere, and raise fog near (0.36 makes the haze start very close).
  - Hide Sector V by distance from the player and the view direction (or by its own chunks), not by distance from the
    origin.
  - Don't let `reach` go below about 0.8 at night, and cut draw calls instead (see 31).
  - Consider a lighter night fog colour near the horizon so far roads read as city glow, not a wall.

**2. Far fewer street lamps beyond Sector V, and none on one side of every wide road.** Applies to all corridors in
both modes.
- Sector V has the 107 OSM lamps, trident posts both sides, tall single-arm median lights and the PwC high mast
  (`render/world/lamps.ts`).
- The streamed world only gets a `lamp` prop every `GEN.lampEvery` = 28 u (`sim/gen/props.ts` `put('lamp', kerb)`),
  and only:
  - on real primary, secondary or tertiary roads;
  - on one side when the road is wider than 8 u (`sides = s.real && s.w > 8 ? [1] : [1, -1]`): every Bypass, APC Rd,
    CIT Rd and Bidhan Nagar Rd carriageway;
  - in a slot that `freeSpot` doesn't reject.
- There are no median lights and no high masts at the big junctions (Hudco, Chingrighata, Phoolbagan, Rajabazar, CIT
  More).
- Lamps within 14 u of the corridor line, per 200 u:
  - free: A 21-26 in Salt Lake, falling to 6-14 on the Bypass and 11-15 in the old city;
  - timed: A 3, 9, 1, 2, 4, 2, 4; C 3, 7, 8, 12, 8; E 3, 9, 1, 5, 4, 7, 11. The squeeze leaves long dark stretches.
- Fix:
  - Place lamps on both kerbs of every real road, and add median lights on divided roads (Bypass, Salt Lake Bypass,
    APC Rd, CIT Rd).
  - Add a high mast at named junction landmarks.
  - In timed, space lamps by game length after warping.

**3. Lamp pools beyond Sector V are small, only on the carriageway, and often missing.** Applies to all corridors in
both modes.
- Sector V pools are additive, soft planes 2.2 x r across (r 2.8-3.4, 14 under the high mast), fading in to 0.55
  opacity (`lamps.ts`).
- A streamed pool is an asphalt disc with an emissive centre (`render/world/chunkground.ts` `lampPool`):
  - its radius is at most min(2.8, 0.45 x road width);
  - it is dropped entirely when the point 2 u in front of the lamp isn't on a road;
  - it never lights the footpath or the frontage.
- In the night shots of APC Rd, the Bypass and Beleghata Main Rd the carriageway is uniformly dark
  (`timed/E-01720-road-fwd-night.jpg`, `timed/C-01000-road-fwd-night.jpg`, `free/A-02540-road-fwd-night.jpg`).
- Fix: use the Sector V pool (additive, larger, footpath included) for chunk lamps. It can stay in the chunk mesh as
  a second, additive material, or be one instanced mesh for all chunks (one draw call).

**4. Streamed windows glow in the wall's tint, not warm light.** Applies to all corridors in both modes; minor.
- `chunkmat.ts` adds `diffuseColor.rgb * glowTexel * vGlow * uNight * 1.6`, where `diffuseColor` already includes the
  wall's vertex tint and the facade texel.
- Sector V buildings use `emissive 0xffd49a` times `litMask` (`buildings.ts`).
- So streamed windows come out pink, green or grey and dimmer on tinted walls.
- Fix: emit `vec3(1.0, 0.83, 0.6) * glowTexel.rgb` for facade tiles instead of `diffuseColor * glowTexel`.

**5. Streamed flyovers in the "band" style have no lamps.** Applies to every flyover that isn't Ultadanga or Vidyapati
(`decks.ts` `if (d.style !== 'band')`). This matters little today because most of those decks are stubs (see 15),
but it should be fixed with them.

## B. Obstacles in the road

This is what the owner called "divider and all in the middle of the road". Most of it has one root cause (6): the two
carriageways of a divided road are drawn on top of each other, so whatever belongs in the median (the Bypass railing,
the Green Line piers, flyover ramps) ends up in a lane.

**6. The two carriageways of divided roads overlap (root cause of 7, 8, 9 and 16).** Applies to every divided road
in both modes; much worse in timed.
- `tools/build-world.py` (line 183) sets a carriageway width of `lanes * 3.3` u for one-way roads, which is 6.6 m per
  lane, about twice real. The OSM centrelines keep their real spacing, so wide carriageways overlap.
- Free: EM Bypass r25 (w 9.9) and r48 (w 13.2) have centres 6 u apart over 511 u from (-1290, 356) to (-1090, 819),
  about 22.5706, 88.4043. Their surfaces overlap by 5.5 u.
- Timed: the warp squeezes positions radially (`sim/gen/warp.ts`). A road heading toward Sector V has its two
  carriageways side by side across the radius, so their spacing shrinks by r'/r (about a third) while their widths
  stay true. They end up 0.7-1.5 u apart, effectively one road with two of everything: the Salt Lake arterial under
  the Green Line, 1st/2nd Avenue, both Bypasses, CIT Rd, APC Rd, KNI Avenue and Bidhan Nagar Rd.
- What you see: a footpath, blue-and-white kerb and dashes of one carriageway running down the lanes of the other,
  doubled tram rails (APC Rd, `timed/E-01800-road-fwd-dusk.jpg`, `timed/E-01703-flyroad_r124-fwd-dusk.jpg`), and
  everything in 7 and 8.
- Fix:
  - Build divided roads as pairs. Push each one-way carriageway outward so that the gap between their inner edges
    equals a real median (about 1-3 u). In timed, keep the spacing between paired carriageways true, not warped,
    just as sizes are kept true.
  - Or merge a pair into one two-way road with an explicit median. In `build-world.py`, pair anti-parallel one-way
    ways with the same name within 20 m of each other.
  - Add a test: no two net carriageways running in parallel may overlap by more than 0.5 u, in either mode.

#### Overlapping carriageways, timed (27 pairs, runs of 10 u or more)

| Road A (id, w) | Road B (id, w) | Overlap run (u) | Closest centres (u) | At (game) | Lat, lon |
|---|---|---|---|---|---|
| Salt Lake Bypass (r38, 9.9) | Salt Lake Bypass (r97, 9.9) | 254 | 2.6 | -412, 230 | 22.57268, 88.42101 |
| r83 (r83, 7) | r1 (r1, 7) | 227 | 0.9 | -494, -323 | 22.58853, 88.41030 |
| Eastern Metropolitan Bypass (r25, 9.9) | Eastern Metropolitan Bypass (r48, 13.2) | 220 | 0.8 | -538, 158 | 22.57021, 88.40439 |
| Eastern Metropolitan Bypass (r49, 9.9) | Eastern Metropolitan Bypass (r12, 9.9) | 188 | 0.9 | -543, 127 | 22.57144, 88.40370 |
| Acharya Prafulla Chandra Bose Road (r72, 9.9) | Acharya Prafulla Chandra Bose Road (r125, 9.9) | 105 | 1.1 | -759, -243 | 22.59302, 88.37533 |
| r86 (r86, 7) | r3 (r3, 7) | 103 | 1.5 | -501, -292 | 22.58774, 88.40945 |
| CIT Road (r79, 9) | CIT Road (r128, 9) | 101 | 0.7 | -620, -36 | 22.57909, 88.39047 |
| 2nd Avenue (r6, 6.6) | 2nd Avenue (r87, 6.6) | 91 | 1 | -513, -318 | 22.58941, 88.40773 |
| Eastern Metropolitan Bypass (r103, 9.9) | Eastern Metropolitan Bypass (r45, 9.9) | 88 | 1 | -498, 407 | 22.56146, 88.40883 |
| 1st Avenue (r54, 7) | 1st Avenue (r106, 7) | 85 | 0.7 | -534, -396 | 22.59413, 88.40441 |
| r57 (r57, 6) | Kazi Nazrul Islam Avenue (r61, 9) | 81 | 5.4 | -584, -301 | 22.59254, 88.39680 |
| Acharya Jagadish Chandra Bose Road (r91, 9.9) | Acharya Prafulla Chandra Road (r23, 9.9) | 75 | 1.4 | -813, 89 | 22.57111, 88.37129 |
| Eastern Metropolitan Bypass (r89, 9.9) | Eastern Metropolitan Bypass (r11, 9.9) | 68 | 0.8 | -562, -91 | 22.58129, 88.40073 |
| Kazi Nazrul Islam Avenue (r61, 9) | Kazi Nazrul Islam Avenue (r111, 9) | 60 | 0.8 | -571, -361 | 22.59482, 88.39892 |
| r57 (r57, 6) | Kazi Nazrul Islam Avenue (r111, 9) | 56 | 6.3 | -584, -301 | 22.59254, 88.39680 |
| Bidhan Nagar Road (r68, 9.9) | Bidhan Nagar Road (r119, 9.9) | 39 | 0.8 | -639, -273 | 22.59337, 88.38799 |
| Acharya Jagadish Chandra Bose Road (r127, 9.9) | Acharya Prafulla Chandra Road (r75, 9.9) | 37 | 1.7 | -781, -10 | 22.57766, 88.37355 |
| Acharya Prafulla Chandra Bose Road (r74, 9.9) | Acharya Prafulla Chandra Bose Road (r126, 9.9) | 35 | 1.1 | -768, -106 | 22.58400, 88.37460 |
| 2nd Cross Road (r104, 6.6) | 2nd Cross Road (r52, 6.6) | 30 | 1.3 | -520, -392 | 22.59311, 88.40628 |
| r96 (r96, 7) | r37 (r37, 7) | 28 | 3.9 | -399, 219 | 22.57300, 88.42150 |
| Kazi Nazrul Islam Avenue (r61, 9) | Ultadanga Flyover (r108, 9.9) | 22 | 0.9 | -571, -361 | 22.59482, 88.39892 |
| 2nd Avenue (r8, 6.6) | Eastern Metropolitan Bypass (r89, 9.9) | 20 | 4 | -565, -166 | 22.58493, 88.40020 |
| Eastern Metropolitan Bypass (r12, 9.9) | r90 (r90, 6.6) | 19 | 1.5 | -549, 55 | 22.57454, 88.40286 |
| Eastern Metropolitan Bypass (r49, 9.9) | r90 (r90, 6.6) | 19 | 0 | -549, 73 | 22.57373, 88.40286 |
| 2nd Cross Road (r104, 6.6) | r51 (r51, 6.6) | 17 | 1.4 | -515, -372 | 22.59186, 88.40715 |

…and 2 shorter pairs (`/tmp/gj_audit/timed-2.json` `overlap`).

#### Overlapping carriageways, free (41 pairs, runs of 10 u or more)

| Road A (id, w) | Road B (id, w) | Overlap run (u) | Closest centres (u) | At (game) | Lat, lon |
|---|---|---|---|---|---|
| Eastern Metropolitan Bypass (r25, 9.9) | Eastern Metropolitan Bypass (r48, 13.2) | 511 | 6 | -1290, 356 | 22.57058, 88.40425 |
| Acharya Prafulla Chandra Bose Road (r72, 9.9) | Acharya Prafulla Chandra Bose Road (r125, 9.9) | 464 | 4.5 | -2775, -930 | 22.59376, 88.37536 |
| Bidhan Nagar Road (r119, 9.9) | Bidhan Nagar Road (r68, 9.9) | 386 | 2.7 | -2413, -963 | 22.59436, 88.38240 |
| Acharya Jagadish Chandra Bose Road (r91, 9.9) | Acharya Prafulla Chandra Road (r23, 9.9) | 326 | 4.6 | -2991, 339 | 22.57089, 88.37115 |
| 1st Avenue (r54, 7) | 1st Avenue (r106, 7) | 286 | 5.5 | -1262, -964 | 22.59437, 88.40480 |
| Kazi Nazrul Islam Avenue (r61, 9) | Kazi Nazrul Islam Avenue (r111, 9) | 216 | 5 | -1570, -990 | 22.59484, 88.39880 |
| Eastern Metropolitan Bypass (r103, 9.9) | Eastern Metropolitan Bypass (r45, 9.9) | 215 | 7.2 | -1066, 850 | 22.56167, 88.40861 |
| Eastern Metropolitan Bypass (r89, 9.9) | Eastern Metropolitan Bypass (r11, 9.9) | 213 | 5.5 | -1456, -211 | 22.58080, 88.40102 |
| Acharya Jagadish Chandra Bose Road (r127, 9.9) | Acharya Prafulla Chandra Road (r75, 9.9) | 211 | 6.5 | -2873, 3 | 22.57694, 88.37345 |
| Acharya Prafulla Chandra Bose Road (r74, 9.9) | Acharya Prafulla Chandra Bose Road (r126, 9.9) | 208 | 4.7 | -2807, -431 | 22.58477, 88.37473 |
| CIT Road (r79, 9) | CIT Road (r128, 9) | 183 | 6.3 | -1995, -153 | 22.57976, 88.39053 |
| Salt Lake Bypass (r39, 9.9) | Salt Lake Bypass (r101, 9.9) | 140 | 6 | -791, 966 | 22.55958, 88.41396 |
| Bidhan Nagar Road (r121, 9.9) | r70 (r70, 9.9) | 138 | 3.5 | -2610, -958 | 22.59427, 88.37857 |
| Bidhan Nagar Road (r122, 9.9) | Shri Aurobindo Sarani (r71, 9.9) | 123 | 3.3 | -2765, -950 | 22.59412, 88.37555 |
| Salt Lake Bypass (r38, 9.9) | Salt Lake Bypass (r39, 9.9) | 100 | 3.9 | -775, 951 | 22.55985, 88.41427 |
| 2nd Cross Road (r104, 6.6) | r53 (r53, 6.6) | 94 | 5 | -1227, -960 | 22.59430, 88.40548 |
| Bidhan Nagar Road (r121, 9.9) | r120 (r120, 6.6) | 68 | 2.1 | -2512, -961 | 22.59432, 88.38047 |
| 2nd Cross Road (r104, 6.6) | 2nd Cross Road (r52, 6.6) | 67 | 5.1 | -1178, -883 | 22.59291, 88.40643 |
| Eastern Metropolitan Bypass (r12, 9.9) | Eastern Metropolitan Bypass (r49, 9.9) | 59 | 7.1 | -1441, -182 | 22.58028, 88.40131 |
| Kazi Nazrul Islam Avenue (r62, 9) | r113 (r113, 9) | 54 | 4 | -1774, -847 | 22.59227, 88.39483 |
| Canal Circular Road (r112, 6.6) | r113 (r113, 9) | 45 | 4.2 | -1839, -811 | 22.59162, 88.39357 |
| Acharya Jagadish Chandra Bose Road (r91, 9.9) | Acharya Prafulla Chandra Road (r24, 9.9) | 39 | 3.4 | -3000, 363 | 22.57045, 88.37098 |
| r96 (r96, 7) | r37 (r37, 7) | 36 | 5.4 | -408, 219 | 22.57305, 88.42141 |
| r80 (r80, 6.6) | r14 (r14, 6.6) | 32 | 4.8 | -2029, 269 | 22.57215, 88.38987 |
| Kazi Nazrul Islam Avenue (r111, 9) | Ultadanga Flyover (r108, 9.9) | 32 | 5.7 | -1617, -966 | 22.59441, 88.39789 |

…and 16 shorter pairs (`/tmp/gj_audit/free-2.json` `overlap`).

**7. The EM Bypass and Salt Lake Bypass median railing is drawn inside the other carriageway.** Corridors A, B, C, D;
both modes.
- `buildMedians` (`render/world/landmarks/decks.ts`) draws the blue-and-white kerb blocks and the spear-top railing
  at `w/2 + 0.6` to the right of a one-way Bypass carriageway. Because of 6, that line falls 0-4 u from the centre of
  the opposite carriageway, for hundreds of units.
- The railing has no collision, so traffic and the player pass through it.
- Seen in:
  - `free/A-02540-road-fwd-night.jpg`, `free/A-03040-road-fwd-night.jpg` (EM Bypass at Apollo);
  - `free/B-03832-statue_statue-island-fwd-night.jpg`;
  - `timed/A-01240-road-fwd-night.jpg`, `timed/C-00575-metro-station_nalban-metro-station-fwd-dusk.jpg`,
    `timed/B-01626-stadium-gate_vivekananda-yuba-bharati-kr-fwd-dusk.jpg`.
- Fix: draw the median once per carriageway pair, midway between their inner edges, after 6. Give it a thin collision
  solid so it reads as a real divider; the lanes already keep off the median.

#### EM/Salt Lake Bypass median railing inside another carriageway, free (28 runs of 12 u or more)

| Median of | Lies on | Length (u) | Closest to that road's centre (u) | From (game) | To (game) | Lat, lon (start) |
|---|---|---|---|---|---|---|
| r25 | Eastern Metropolitan Bypass (w 13.2) | ~588 | 0.4 | -1302.3, 342.8 | -1078.6, 837.9 | 22.57082, 88.40401 |
| r48 | Eastern Metropolitan Bypass (w 9.9) | ~568 | 0 | -1076.4, 830.3 | -1296.7, 344.2 | 22.56203, 88.40841 |
| r103 | Eastern Metropolitan Bypass (w 9.9) | ~320 | 1.4 | -1078.3, 838.4 | -928.7, 1034.5 | 22.56188, 88.40837 |
| r49 | Eastern Metropolitan Bypass (w 9.9) | ~312 | 2.8 | -1299.7, 341.8 | -1384.3, 66.7 | 22.57084, 88.40406 |
| r12 | Eastern Metropolitan Bypass (w 9.9) | ~308 | 3 | -1385.6, 66.4 | -1303.6, 339.5 | 22.57580, 88.40239 |
| r45 | Eastern Metropolitan Bypass (w 9.9) | ~264 | 1.7 | -931.2, 1027.1 | -1067.1, 850.2 | 22.55848, 88.41123 |
| r89 | Eastern Metropolitan Bypass (w 9.9) | ~260 | 0.1 | -1446.3, -197.8 | -1537, -405 | 22.58056, 88.40121 |
| r11 | Eastern Metropolitan Bypass (w 9.9) | ~248 | 0 | -1539.6, -400.5 | -1450.5, -197 | 22.58422, 88.39939 |
| r101 | Salt Lake Bypass (w 9.9) | ~200 | 0.5 | -888.4, 1053.3 | -787, 955.5 | 22.55801, 88.41206 |
| r39 | Salt Lake Bypass (w 9.9) | ~176 | 0.5 | -789.1, 949.8 | -888.8, 1052.1 | 22.55988, 88.41400 |
| r49 | Eastern Metropolitan Bypass (w 9.9) | ~164 | 1.3 | -1414.6, -60.6 | -1445.9, -196.2 | 22.57809, 88.40183 |
| r12 | Eastern Metropolitan Bypass (w 9.9) | ~160 | 1.3 | -1450.1, -195.5 | -1415.6, -60.2 | 22.58052, 88.40114 |
| r38 | Salt Lake Bypass (w 9.9) | ~144 | 0 | -782.1, 951.8 | -837.1, 1037.3 | 22.55984, 88.41413 |
| r12 | Eastern Metropolitan Bypass (w 9.9) | ~60 | 3.7 | -1404.5, -12.6 | -1393.5, 33.4 | 22.57722, 88.40202 |
| r101 | r42 (w 9.9) | ~56 | 0 | -913, 1052.9 | -869.3, 1050.9 | 22.55802, 88.41159 |
| r49 | Eastern Metropolitan Bypass (w 9.9) | ~52 | 3.8 | -1392.7, 31.8 | -1403.9, -14.9 | 22.57642, 88.40225 |
| r47 | Eastern Metropolitan Bypass (w 9.9) | ~36 | 1.4 | -1068.1, 848.4 | -1076.2, 833.8 | 22.56170, 88.40857 |
| r39 | r98 (w 9.9) | ~28 | 1.2 | -789.1, 949.8 | -798.9, 970 | 22.55988, 88.41400 |
| r99 | Eastern Metropolitan Bypass (w 9.9) | ~28 | 1 | -919.1, 1047.5 | -910.7, 1057.1 | 22.55811, 88.41147 |
| r43 | Eastern Metropolitan Bypass (w 9.9) | ~24 | 1.1 | -909.9, 1052.1 | -916.1, 1044.2 | 22.55803, 88.41165 |

#### EM/Salt Lake Bypass median railing inside another carriageway, timed (19 runs of 12 u or more)

| Median of | Lies on | Length (u) | Closest to that road's centre (u) | From (game) | To (game) | Lat, lon (start) |
|---|---|---|---|---|---|---|
| r38 | Salt Lake Bypass (w 9.9) | ~520 | 0.1 | -413.7, 212.1 | -396.7, 492.1 | 22.57298, 88.42090 |
| r25 | Eastern Metropolitan Bypass (w 13.2) | ~384 | 4.3 | -545.5, 142.6 | -508.5, 392.8 | 22.57070, 88.40335 |
| r97 | Salt Lake Bypass (w 9.9) | ~384 | 0 | -397.4, 474.7 | -407.8, 211.9 | 22.56079, 88.41471 |
| r49 | Eastern Metropolitan Bypass (w 9.9) | ~240 | 4.1 | -535.6, 141.9 | -548.8, 7.2 | 22.57095, 88.40473 |
| r12 | Eastern Metropolitan Bypass (w 9.9) | ~208 | 4.1 | -558.8, 8.1 | -545.9, 139.5 | 22.57662, 88.40130 |
| r101 | Salt Lake Bypass (w 9.9) | ~104 | 0.2 | -418.1, 500.5 | -395.5, 482.9 | 22.55749, 88.41176 |
| r39 | Salt Lake Bypass (w 9.9) | ~76 | 0.4 | -403.4, 484.3 | -422.3, 496.8 | 22.55960, 88.41371 |
| r38 | r98 (w 9.9) | ~44 | 0.8 | -402.9, 472.5 | -399.1, 488.3 | 22.56091, 88.41454 |
| r45 | Eastern Metropolitan Bypass (w 9.9) | ~40 | 4.4 | -438.1, 481.5 | -456.3, 467.2 | 22.55898, 88.41165 |
| r49 | Eastern Metropolitan Bypass (w 9.9) | ~40 | 4.3 | -549.7, -6.7 | -550.9, -24.8 | 22.57730, 88.40276 |
| r12 | Eastern Metropolitan Bypass (w 9.9) | ~36 | 4.3 | -560.8, -23.4 | -559.6, -4.1 | 22.57810, 88.40094 |
| r103 | Eastern Metropolitan Bypass (w 9.9) | ~36 | 4.4 | -462.3, 475.2 | -443.3, 490.1 | 22.55868, 88.41012 |
| r89 | 2nd Avenue (w 6.6) | ~28 | 0.2 | -565.1, -155.1 | -567.4, -171.1 | 22.58441, 88.40019 |
| r101 | r40 (w 6) | ~24 | 0.3 | -410.9, 501.4 | -396, 499.2 | 22.55754, 88.41214 |
| r39 | r98 (w 9.9) | ~20 | 0.6 | -403.4, 484.3 | -402.1, 490.8 | 22.55960, 88.41371 |
| r101 | Eastern Metropolitan Bypass (w 9.9) | ~20 | 0.9 | -425.8, 499.1 | -410.9, 501.4 | 22.55748, 88.41137 |
| r25 | Beleghata Main Road (w 7) | ~16 | 0.1 | -510.7, 384.4 | -508.5, 392.8 | 22.56182, 88.40758 |
| r39 | Eastern Metropolitan Bypass (w 9.9) | ~12 | 0.7 | -422.3, 496.8 | -421, 501 | 22.55781, 88.41175 |
| r97 | r96 (w 7) | ~12 | 0.8 | -407.8, 211.9 | -407.1, 207.9 | 22.57308, 88.42122 |

**8. Green Line piers stand in the lanes.** Mostly timed; a few in free.
- The lane check below sampled lane centres against the structure solids:
  - timed: 91 pier hits on corridor roads;
  - free: 16.
- Where:
  - Timed, Salt Lake arterial r1/r83/r3/r86 (A, B, E, F) from (-346, -451) to (-535, -195), about 22.5896, 88.4189
    to 22.5853, 88.4048, two of three lane samples, one pier every 14 u.
  - Timed, EM Bypass r12/r49/r89/r11 (A, B, D) from (-563, -100) to (-542, 136).
  - Timed, Salt Lake Bypass r38/r97 (C, D) from (-409, 217) to (-405, 468).
  - Free, Street No. 13 at (-301, -363); r1 at (-774, -754) (22.5906, 88.4143); EM Bypass r11/r89 at (-1449..-1460,
    -207..-231) (22.5810, 88.4010); Salt Lake Bypass r98/r101 at (-783..-807, 935..974) (22.5598, 88.4139), under the
    Orange Line.
- The pier is solid (`sim/gen/solids.ts` `metroSolids`), so walking along the lane stops you and traffic weaves
  round it.
- Seen in `timed/A-00520-road-*` (the live stop itself was blocked: `walkBlocked` true).
- Cause:
  - The piers follow the metro line, which OSM puts over the median.
  - Once the carriageways overlap (6) there is no median, and `pierAt`/`pierPassable` (`sim/gen/layout.ts`) only
    check that a bus lane can still pass. That passes with the lane pushed out over the kerb (`LANE_ROOM.overKerb`).
- Fix: fix 6 first. Then require piers to sit in the median gap or outside every carriageway, not just clear of the
  bus lane.

**9. Flyover ramp feet are solid walls straight across the road at grade.** Corridors E and F.
- Ultadanga Flyover feet across Kazi Nazrul Islam Avenue (VIP Rd):
  - Timed: every lane shut, 9 u long, at (-576, -347), (-588, -306), (-591, -299) and (-579, -340), about 22.5944,
    88.3982 and 22.5930, 88.3961.
  - Free: 1-2 of 3 lanes blocked for 18-21 u at (-1632, -955) (22.5942, 88.3976) and (-1736, -880) (22.5929,
    88.3956).
- Bidhan Nagar Road deck r69 (see 10):
  - Free: every lane of Bidhan Nagar Rd r121 and r120 blocked for 17-21 u at (-2431..-2478, -962) (22.5943, 88.3815).
  - Timed: shut at (-698, -272) (22.5943, 88.3813).
- Seen in `timed/E-01305-flyroad_r109-fwd-dusk.jpg`, `timed/E-01382-flyover_ultadanga-flyover-*`,
  `free/E-03712-flyroad_r69-fwd-dusk.jpg`.
- Cause:
  - `deckSolids` (`sim/gen/solids.ts`) turns every deck piece below `RAMP_CLEAR` into a solid box the full deck
    width (2.5 x 11.1).
  - `isFoot` marks the ones near a deck end as "traffic drives onto the ramp", so the lane plan ignores them and
    `structureConflicts` never reports them.
  - But the at-grade road carries straight on under and beside the deck: in OSM, VIP Rd continues at grade and the
    flyover lands on it.
  - Traffic drives through these walls (vehicles are drawn at y 0.05 regardless) and the player is stopped.
- Fix: only make a ramp foot solid where it doesn't overlap another ground carriageway. Better, give each ramp its own
  carriageway beside the at-grade road, as the real ones have. Add `isFoot` pieces to the conflict list so a test can
  catch this.

**10. Bidhan Nagar Road over the Beliaghata Canal is built as a flyover: a staircase of slabs on the road.**
Corridor E; both modes.
- OSM tags 390 m of Bidhan Nagar Rd as a bridge. `world.json` road r69 (52 u in free, 9 u in timed) has
  `bridge: 'flyover'`, so `netDecks` gives it the Ultadanga "diamond" style at Y 8.
- With free ends 52 u apart, it rises in 2.5 u steps that never reach deck height and sit across the road: the stepped
  slabs in `free/E-03712-flyroad_r69-fwd-dusk.jpg` and the wall in `timed/E-01498-flyroad_r69-fwd-dusk.jpg`.
- The live stop `timed/E-01498-flyroad_r69` was blocked.
- Fix: in `build-world.py`, classify short OSM `bridge=yes` ways over water as `canal`, not `flyover`. `isFlyover`
  in Sector V uses an 80 u minimum (`FLYOVER_MIN_LEN`); use the same rule, measured along the real road. The canal
  crossing at (-2521.8, -958.8) already draws the right bridge.

**11. Landmark models stand on the carriageway.** 21 in timed, 2 in free.
- The models are true size (malls 40 x 56 u, hospitals 34 x 48 u, the Bidhannagar Road station 77 u of track bed) but
  placed at warped positions. In timed, the roads around them are squeezed closer, so the boxes land on the road.
- They have no collision (nothing in `chunkSolids`), so traffic and the player pass through mall walls, and the
  camera ends up inside them.
- Timed screenshots:
  - City Centre arterial: `timed/A-00600-road-*`, `timed/A-00680-road-*`, `timed/A-00920-road-*`;
  - Mani Square on the Bypass: `timed/A-01400-road-fwd-*` (HUD "PVR CINEMAS");
  - Bidhannagar Road station on Ultadanga: `timed/F-01434-rail-station_bidhannagar-road-fwd-dusk.jpg`, rails across
    the road;
  - VIP Market on CIT Rd: `timed/F-01740-market_v-i-p-market-fwd-night.jpg`;
  - Uttarapan: `timed/F-01486-mall_uttarapan-shopping-complex-back-*`.
- Free: the Eye Foundation hospital over Satin Sen Sarani at (-2120, -209) (22.5808, 88.3881) and the Fabindia
  corner over r88.
- Fix:
  - In timed, shrink or turn the model so it fits between the warped roads. Check the footprint against every net
  carriageway when placing it (as `framed()` already does for bridges), or slide the landmark back from the road
  until it fits.
  - Give the solid landmark boxes collision (add them to `chunkSolids`).
  - Add a test: no landmark footprint overlaps a carriageway, in either mode.

#### Landmark models over carriageways, timed (21)

| Landmark | Kind | Corridor | At (game) | Real lat, lon | Roads under it (samples, closest to centre) |
|---|---|---|---|---|---|
| Salt Lake City Medical Centre | hospital | A | -469.3, -396.5 | 22.59017, 88.41252 | r1 (39, 0); r83 (42, 0.1) |
| ILS Hospitals | hospital | A | -487.8, -350.6 | 22.58925, 88.41094 | 2nd Cross Road (81, 0); r53 (1, 2); r83 (57, 0.1); r1 (52, 0.1); r51 (23, 0.8) |
| City Centre 1, Salt Lake | mall | A | -508.4, -293 | 22.58816, 88.40843 | r1 (43, 0.4); r83 (34, 0.1); r85 (29, 0.1); 2nd Cross Road (33, 1); 2nd Avenue (99, 0); r3 (23, 0); r86 (20, 0) |
| Vasan Eye Care Hospital, Kolkata | hospital | A | -503.7, -335.3 | 22.58959, 88.40893 | r1 (63, 0); r83 (42, 0.8); 2nd Cross Road (70, 0.1); r51 (41, 0); r5 (4, 1.1) |
| FabIndia | mall | A | -551.9, -212.4 | 22.58659, 88.40245 | 2nd Avenue (98, 0.2); r3 (8, 0.2); r88 (9, 0.2); r7 (9, 0.2); r86 (4, 0.2) |
| Mani Square Mall | mall | A | -563, -16.5 | 22.57778, 88.40055 | Eastern Metropolitan Bypass (84, 0.1) |
| Vivekananda Yuba Bharati Krirangan | stadium-gate | B | -504.7, 212.5 | 22.56907, 88.40902 | Eastern Metropolitan Bypass (16, 0) |
| Vivekananda Eye Care Centre | hospital | B | -594, 262.4 | 22.56296, 88.39505 | Beleghata Main Road (51, 0) |
| B R Singh Hospital | hospital | B | -815.8, 175.4 | 22.56540, 88.37113 | r36 (38, 0.1); r130 (3, 0.4) |
| Apollo Gleneagles Hospitals | hospital | D | -557.3, 58.8 | 22.57428, 88.40156 | Eastern Metropolitan Bypass (7, 1.8) |
| Rameswara Nursing Home Pvt Ltd | hospital | E | -605.9, -233 | 22.58997, 88.39296 | CIT Road (42, 0.4) |
| Bidhan Nagar Road | rail-station | E | -618, -249.2 | 22.59139, 88.39081 | CIT Road (68, 0.2); Ultadanga Underpass (61, 0.2); Bidhannagar Road (85, 0); Bidhan Nagar Road (68, 0.1) |
| 15 No Bus Stand (S30) | bus-terminus | E | -632.4, -262.2 | 22.59259, 88.38875 | CIT Road (37, 0.3) |
| Dr. M. N. Chatterjee Memorial Eye Hospital | hospital | E | -773.8, -17.3 | 22.57814, 88.37413 | Narkeldanga Main Road (7, 1.3) |
| Uttarapan Shopping Complex | mall | F | -612.2, -196.5 | 22.58815, 88.39186 | Eastern Metropolitan Bypass (12, 0.5) |
| Eye Foundation And Research Centre | hospital | F | -638.1, -63 | 22.58077, 88.38810 | CIT Road (147, 0); Satin Sen Sarani (81, 0) |
| S-3B Bus Terminus | bus-terminus | F | -615.9, -69.3 | 22.58097, 88.39119 | CIT Road (34, 0.3) |
| V.I.P. Market | market | F | -620.7, 32.4 | 22.57511, 88.39034 | CIT Road (170, 0) |
| Pantaloons | mall | F | -627.1, 32.5 | 22.57508, 88.38936 | CIT Road (56, 0) |
| I Love Kolkata sign | kolkata-sign | - | -588.1, 262.5 | 22.56325, 88.39610 | Beleghata Main Road (21, 0) |
| St John's Church | church | - | -821.2, 112.2 | 22.56959, 88.37082 | Acharya Prafulla Chandra Road (11, 2.2); Acharya Jagadish Chandra Bose Road (6, 3.4); Vidyapati Flyover (3, 4.1); r130 (6, 0.3) |

#### Landmark models over carriageways, free (2)

| Landmark | Kind | Corridor | At (game) | Real lat, lon | Roads under it (samples, closest to centre) |
|---|---|---|---|---|---|
| FabIndia | mall | A | -1382.4, -532.1 | 22.58659, 88.40245 | r88 (2, 2.9) |
| Eye Foundation And Research Centre | hospital | F | -2120.2, -209.3 | 22.58077, 88.38810 | Satin Sen Sarani (59, 0) |

**12. Junction police kiosks and statues stand in the middle of the carriageway with no island, kerb or collision.**
All corridors; both modes.
- 14 junction landmarks sit inside a carriageway, from the OSM junction-node position. With the edge distance in
  units (negative means inside):

  | Landmark | Position (game) | Lat, lon | Edge distance (u) | Road |
  |---|---|---|---|---|
  | APC Rd north-foot kiosk | (-3004, 379) | 22.5702, 88.3709 | -4.7 | APC Rd |
  | Rajabazar kiosk | (-2869, 20) | 22.5766, 88.3735 | -4.9 | APC Rd |
  | Khanna kiosk | (-2777, -950) | 22.5941, 88.3753 | -4.9 | Bidhan Nagar Rd |
  | Hudco More kiosk | (-1945, -840) | 22.5921, 88.3915 | -4.4 | Ultadanga Underpass |
  | Chingrighata kiosk | (-902, 1061) | 22.5579, 88.4118 | -4.2 | EM Bypass |
  | Phoolbagan island | (-2053, 260) | 22.5723, 88.3894 | -4.5 | CIT Rd |
  | CIT More kiosk | (-1699, 782) | 22.5629, 88.3963 | -3.2 | Beleghata Main Rd |
  | Maniktala kiosk | (-2806, -459) | 22.5853, 88.3748 | -3.0 | APC Rd |
  | Sealdah forecourt statue | (-3027, 544) | 22.5672, 88.3705 | -2.3 | r36 |
  | Phoolbagan kiosk | (-2010, 269) | 22.5721, 88.3902 | -2.1 | r80 |
  | Karunamoyee island | (-398, -497) | 22.5860, 88.4216 | -1.5 | r1 |
  | Kankurgachi kiosk | (-1994, -171) | 22.5801, 88.3906 | -1.1 | Satin Sen Sarani |
  | Stadium kiosk | (-1350, 215) | 22.5731, 88.4031 | -0.8 | EM Bypass |
  | Nalban kiosk | (-424, 216) | 22.5731, 88.4211 | +0.6 | Salt Lake Bypass |
- Real kiosks do stand on small islands, but here traffic drives straight through them.
- Seen in `timed/E-01703-flyroad_r124-fwd-dusk.jpg` (kiosk on the APC Rd tram tracks),
  `timed/B-01795-statue_statue-island-fwd-night.jpg` (statue plinth in the lane), and the Nalban kiosk in
  `timed/C-00575-*`.
- Fix:
  - Give each a small raised island with a kerb and a collision circle, and let the lane plan route round it, as for
    piers.
  - Or move kiosks to the nearest corner footpath when the junction has no island.

**13. A generated roundabout island blocks a real road.** Corridors E and F, free.
- A Salt Lake lattice island (`sim/gen/streets.ts` line 232, `GEN.islandR`, made solid as a blocker ring in
  `chunks.ts`) sits on real roads r53 and 2nd Cross Road at (-1195, -901), about 22.5932, 88.4061.
- It shuts every lane for 9-10 u, with a palm in the middle. The breadth-first walk goes round it, but traffic drives
  through it.
- Fix: drop lattice islands that fall within (road width / 2 + island radius) of any net road.

**14. Parked cars, bikes and bus stops stand in the carriageway of corridor roads.** Free: 17 parked cars, 15 bikes,
4 bus stops and 1 palm; timed: 3 bus stops and 1 bike.
- They are visual only (no collision), so traffic drives through them.
- Parked vehicles come from generated side streets, placed at `w/2 - 0.9` with `onRoad = true`
  (`sim/gen/props.ts`), where the slot lands inside a real road at a junction.
- Bus stops:
  - free: CIT Rd (-2018, 16.5) and (-1994, -162); APC Rd (-2884, 81); r80 at Phoolbagan (-1997, 272);
  - timed: r5 (-504, -337), r80 (-619, 82), APC Rd (-789, 22).
- Examples of parked vehicles: r1 (-797, -745) 0.1 u from the centre line; r13 (-1686, 325); 2nd Cross Rd (-1160,
  -845); CIT Rd (-2011, -28); Beleghata Main Rd (-2307, 652).
- Full list: `/tmp/gj_audit/free.json` `propsOnRoad`.
- Fix: reject any prop whose footprint overlaps a net carriageway other than its own street (and its own street's
  junction mouth). Do the same for bus stops.

**15. The Sealdah–Beliaghata Flyover and Vidyapati Setu are missing or stubs.** Corridors B and C (and every corridor's
end at Sealdah).
- `world.json` has the Sealdah–Beliaghata Flyover as r33, 25 u long in free and 7 u in timed. The real one is 154 m
  (77 u) over the Sealdah South tracks.
- With free ends 25 u apart it never rises above 3 u. There is no deck, only ramp solids:
  - free: shut across B and C at (-2890, 754) (22.5634, 88.3731);
  - timed: shut at (-787, 204).
- The road crosses the tracks at grade between parapets (crossing at (-2866, 758)).
- Seen in `free/B-05780-flyroad_r33-fwd-dusk.jpg` (no flyover at all) and `timed/B-02200-road-fwd-dusk.jpg`,
  `timed/B-02205-over-rail-*` (low walls slanting across the road).
- Vidyapati Setu:
  - APC Rd "flyovers" r73 and r124 are 4 u long (free) and 1 u (timed).
  - The landmark falls back to `fallbackFlyover`, a straight 140 u stand-in deck on the landmark's heading at
    (-3066, 497), not along APC Rd. Its ramp pieces are solid (`landmarkSolids` "stand-in flyover ramp").
  - Live: `timed/D-01880-road-*` (camera inside geometry at the APC Rd foot).
- Cause: `build-world.py` keeps only the corridor's own ways, clipped to the corridor, so a long OSM flyover becomes a
  few metres where the corridor touches it.
- Fix: export full flyover ways (whole OSM `bridge=yes` + `layer>=1` chains) into `world.json`, independent of corridor
  clipping. Then route B and C over or beside the Sealdah–Beliaghata Flyover as reality does, and A, D, E and F
  under Vidyapati Setu.

**16. Bridge parapets and railings cross the lanes where carriageways overlap.** Corridors E and F; both modes.
- At the Krishnapur Canal bridges the parapet of one carriageway's bridge runs across the other carriageway's lanes:
  `free/E-02914-flyroad_r109-fwd-dusk.jpg` (blue-and-white balustrade slanting into the lane at (-1687, -876),
  22.5928, 88.3965).
- In timed, `crossingSite` frames the Krishnapur crossing at (-579, -306) over a `roadW` of 46.8 u, because KNI
  Avenue, r57 and the flyover approaches are squeezed together. Its parapets (solid, `bridgeSolids`) and the stepped
  decks of 9 and 10 stack up there (`timed/E-01336-over-canal-fwd-dusk.jpg`, a stack of blue-and-white slabs over
  the road).
- Fix: after 6, frame each bridge per carriageway pair. Cap `roadW` at the corridor road's own width plus its pair,
  and never draw a parapet over another carriageway.

**17. Dead-end walls at the end of real roads, in timed.** Corridors C, D, E and F.
- `deadEnd` barriers (solid) sit at the end of real net roads where timed caps roads that lead away from Sealdah:
  - Salt Lake Bypass r97 at (-411, 199) (22.5733, 88.4211), the return carriageway of C/D, 50 u outside Sector V;
  - KNI Avenue r61 (-567, -377) (22.5953, 88.3996);
  - r57 (-430, -530); r40 (-361, 504); r41 (-395, 509); EM Bypass (-574, -176) (22.5857, 88.3987).
- That is by design (timed goes only toward Sealdah). But r97 is the opposite carriageway of the road you arrive on,
  and the KNI cap is right at the Krishnapur bridge, so the wall reads as an obstacle across the road you're on.
- Fix: cap only roads whose far end leaves the corridor band, and put the cap at least 30 u from the corridor road.

**18. Traffic on streamed flyover decks is drawn at ground level (plausible; not seen live).** Corridors with decks;
both modes.
- Streamed flyover ways are in the traffic graph as `deck` edges (27 edges, cost x4, `roadgraph.ts`).
- `spawnNear` and wandering can put vehicles on them, and `Actors.sync` always draws vehicles at y 0.05. They would
  drive at grade under or through the deck and its ramp walls.
- Fix: either keep deck edges out of spawning and wandering until vehicles follow `netDeckY`, or set the vehicle's y
  from the deck.

## C. Camera on bridges, flyovers, viaducts and rail bridges

**What "good" is at Wipro More.**
- In Sector V the stage asks `roofs(map.roads)` (`src/sim/elevated.ts`) what is overhead: the two Nabadiganta deck
  undersides and the Sector V and IT Centre station boxes. It keeps the camera 1.4 below that
  (`src/stages/sectorv.ts` lines 120 and 348).
- Walking across the Wipro More canal bridge on Street 13 and on under the Nabadiganta deck, the camera drops from y 8
  to y 4.2 and stays under the deck. You see the lit soffit, the girder and the road ahead
  (`cam-timed/sv-canalbridge-8-StreetNumber13-t6.jpg`, `cam-timed/sv-flyover-1-SaltLakeBypass-t0.jpg`).
- Nothing like it exists beyond Sector V.

**19. The camera's overhead check covers only Sector V; every streamed structure is ignored.** All corridors; both
modes.
- `const overhead = roofs(map.roads)` is built once from the Sector V map. The streamed world provides no roof source:
  `ChunkStore` and `Streamed` expose collision only, and `netDecks`, `metroLayout`, `crossingSite`/`underbridge` and
  `fallbackDeck` are never asked.
- So the camera stays at its normal height, y = 2.6 + 5.4 x (distance / 11) = 8 in portrait, under or through:
  - the Ultadanga Flyover (deck top 8, slab underside 7.05);
  - Bidhan Nagar Rd r69 (8);
  - the Sealdah–Beliaghata Flyover and Vidyapati Setu (6.5, or the 7 stand-in);
  - the Green Line viaduct (rail level 10, soffit 7.85);
  - the five elevated stations (concourse 5.6, platform 10, roof 15.5);
  - every rail underbridge (girder 5.4-6.9, ballast to 6.65).
- Camera pass (`/tmp/gj_audit/cam-{mode}.jsonl`). The player was placed 16 and 6 u before, at, and 6 u past each
  structure on the ground road under it:
  - Sector V Nabadiganta and Wipro More: camera y 3.1-4.2 under the deck.
  - Every streamed structure, in both modes: camera y 8.0 at every offset. That covers the 5 flyover ways, the 5
    elevated stations, the 6 rail underbridges, the road-over-rail at Sealdah South, the Ultadanga, Vidyapati and
    Sealdah–Beliaghata landmarks, and the APC Rd foot.
  - Station shots are 60-80% one flat colour (inside the box). Rail-underbridge shots show the camera standing on the
    ballast and sleepers (`cam-free/rail-underbridge-t0.jpg`). `cam-timed/fly-r109-to-t-6.jpg` shows it inside the
    Ultadanga deck.
  - Note: the camera-pass files of repeated item names (`rail-underbridge-*`, `road-over-canal-*`) were overwritten by
    the last bridge of that kind. Use the live-ride shots named in 21 for each bridge.
- The result is either a view from on top of the structure with the player hidden underneath, or a camera inside it
  (flat colour). In the live pass, 21 timed stops (62 shots) and 12 free stops (40 shots) were inside geometry.
  Those under structures are listed in 20-22.
- Fix:
  - Add `roofsAt(x, z)` to the streamed world, built per chunk from the same layout the solids use:
    - deck pieces with `netDeckY(d, s) - DECK_SLAB` within `deckHalf(d)`;
    - viaduct pieces with `mp.y(s) - METRO_SOFFIT` within `LM.viaductW / 2`, and station boxes with
      `LM.station.concourse`;
    - underbridges with `LM.railClearance` over `u ∈ ±(width/2 + 1.4)`;
    - stand-in decks.
  - Cache it per chunk (like `chunkSolids`) and take the minimum with the Sector V `overhead` in `playUpdate`.
  - Add a test that walks the camera rig through each structure and asserts it stays below it.

**20. Camera inside the elevated metro stations beyond Sector V.** Corridor A (and B, E and F where they share it);
both modes.
- Every street-level shot under Karunamoyee, Central Park, City Centre, Bengal Chemical and Salt Lake Stadium is a
  flat wall: all four directions and both times of day.
  - free: `free/A-00712-metro-station_karunamoyee-2-*`, `free/A-01749-metro-station_city-centre-*`,
    `free/A-02773-metro-station_bengal-chemical-*`, `free/A-03168-metro-station_salt-lake-stadium-*`, plus the
    neighbouring stops A-00693, A-00740, A-01111, A-01140, A-02740 and A-03140;
  - timed: `timed/A-00704-metro-station_central-park-2-*`, `timed/A-00986-metro-station_city-centre-*`,
    `timed/A-01343-metro-station_bengal-chemical-*`, `timed/A-01496-metro-station_salt-lake-stadium-*`, A-01320,
    A-01480.
- The streamed station's concourse is at 5.6 (`LM.station`), much like Sector V's `stationUnderside` 5.4, so the
  Sector V rule (camera at most 4.0) would work if it were applied (19).

**21. Camera on top of rail underbridges, so the player is hidden.** Corridors A, D and F (Narkeldanga Main Rd), B
and C (Beleghata Main Rd, Circular Rly at Bypass); both modes.
- Bridges and shots:
  - A at Salt Lake Stadium: `timed/A-01557-under-rail-*` and `free/A-03346-under-rail-fwd-dusk.jpg`; the banner and
    girder fill the upper view.
  - Narkeldanga, 47.5 u wide: `free/A-04433-under-rail-*`, `free/A-04440-road-*`, `timed/A-01730-under-rail-*`,
    `timed/A-01720-road-*` (the camera stands on the ballast, and the view is a flat dark deck).
  - Beleghata: `timed/B-02061-under-rail-fwd-dusk.jpg`.
  - C on the Bypass: `timed/C-00924-under-rail-fwd-dusk.jpg`.
- Heights: girder bottom `LM.railClearance` = 5.4, top 6.9 (`bridges.ts` `railUnder`). The camera at 8 is above it.
- Fix: as 19, with the roof at 5.4 over the girder span.

**22. Camera through or above flyover decks and stand-in decks beyond Sector V.** Corridors E, F, B, C, and every
corridor's end at Sealdah.
- Ultadanga Flyover: `timed/E-01382-flyover_ultadanga-flyover-back-*` (inside the deck), `timed/E-01305-flyroad_r109-*`
  (the deck slices across the view at camera height).
- Bidhan Nagar Rd: `cam-timed/fly-r69-*`, `free/E-03712-flyroad_r69-fwd-dusk.jpg`.
- Sealdah–Beliaghata: `cam-timed/fly-r33-*`.
- Vidyapati Setu stand-in: `timed/D-01880-road-*`.
- Unlike at Nabadiganta, the camera never dips under. Even after 19, these decks need fixing first (9, 10, 15): a
  stepped stub can't be ducked under in a sensible way.

**23. Streamed buildings, landmarks and structures never pull the camera in.** All streamed roads; both modes;
camera.
- The pull-in loop is `world.grid.blocked(p.x - fx * k, p.z - fz * k, 0.6)` (`sectorv.ts` line 345). `world.grid` is
  the Sector V `BuildingGrid` only.
- Beyond the map, the camera ignores generated buildings, landmark models and structure solids.
- On a curve or a narrow street the camera sits behind or inside a building, and the view is a wall of windows:
  - `timed/A-00760-road-fwd-dusk.jpg` and `-back-dusk.jpg`, `timed/A-00840-road-fwd-dusk.jpg` (Salt Lake arterial
    by City Medical Centre);
  - `free/A-01540-road-back-dusk.jpg` (City Centre).
- Fix: use a camera-occlusion query that includes chunk buildings, landmark boxes and structure solids. Something like
  `world.walkBlocked` without the timed off-band rule, or a new `world.camBlocked(x, z, pad)` that asks `grid`,
  `solids` and `streamed.store` (buildings and structures only).

## D. Gaps: can each route be walked and driven end to end?

**24. On foot every corridor can be walked end to end in both modes, but only by going round the obstacles.** All
corridors.
- A breadth-first search over `World.walkBlocked` (radius 0.4), within 12 u of each corridor line (any ground within
  260 u of Sealdah), reaches the Sealdah forecourt from each corridor start. That holds for all 6 corridors in both
  modes.
- In free the walk lengths are 5,315, 6,011, 4,114, 4,994, 5,373 and 5,878 u. In timed they are 1,941, 2,287, 1,540,
  1,895, 1,927 and 2,090 u.
- The walk survives only by going round 8, 9, 13 and 15 on the footpaths. The existing `walkable.test.ts` covers only
  the bus route (corridor A); extend it to every corridor and both modes.

**25. Corridors A, D and F can't be driven to the Sealdah forecourt.** Both modes.
- The traffic graph has no link from the APC Rd / Vidyapati Setu foot to the station front:
  - free: the leg (-2977, 320) to (-3004, 379), 22.5702, 88.3709, has no route; also (-2986, 339) for D and
    (-2993, 353) for F;
  - timed: (-748, 17) to (-820, 104).
- This is the known OSM gap (ROUTES §2.8: a 7 m synthetic link plus a 583 m walk tail). The bus line ends at the
  flyover foot. A Rapi-Nah captain heads for `exitNode`, the graph node nearest Sealdah, which can only be reached
  through B/C (Parikshit Roy Lane).
- Fix: add the at-grade service road beside and under Vidyapati Setu to the forecourt (after a Street View check, as
  ROUTES says) as a drivable net road.

**26. Corridors C and D leave Sector V along a road the traffic graph doesn't have.** Both modes.
- The corridor line from (-167, 339) to (-300, 277), about 22.5720, 88.4235 (the unnamed two-lane road west to
  Nalban), has no traffic road within 46 u.
- Near there the Sector V map has only `service` ways 2.6 wide. The nearest `secondary` (map roads 6 and 358) is 46 u
  away.
- Graph routes for the next leg are 3.7x the straight distance (496 vs 133 u). The corridor's first leg snaps 63 u to
  the nearest node.
- Fix: check `sectorv.json` against OSM for this link and add it as a secondary road. `mapEnds` must then continue it
  into the Salt Lake Bypass (r37 and r96 at about (-400, 215)).

**27. Driving corridor E across the Beliaghata Canal on Bidhan Nagar Road takes a huge detour.** Free; timed similar.
- In free, (-2316, -964) to (-2466, -959), 22.5943, 88.3814, routes 2,719 u against 150 u straight.
- The ground carriageways there are covered by the r69 "flyover" (10). Its edges cost 4x (`roadgraph.ts`) and its
  ramp feet block the at-grade road (9).
- In timed and free, the Ultadanga/Krishnapur leg (-545, -361) to (-590, -300) routes 226 vs 75 u.
- Fix: 10 and 9.

**28. Smaller drive detours (low confidence).**
- C/D Chingrighata link, (-756, 909) to (-828, 1040), 22.5583, 88.4132 (free): 427 vs 149 u. A one-way link may
  be missing its pair.
- A/B/E/F Street 13 exit inside Sector V, (-100, -45) to (-184, -168): 1,088 vs 150 u. It's probably the corridor
  line following the other one-way carriageway, but worth a look since buses use it.

## E. Other

**29. Streamed landmark models have no collision.** Both modes. Malls, hospitals, the stadium gate, the church, the
Bidhannagar Road station, sheds, kiosks and statues are visual only (`chunkSolids` covers metro, decks, bridges and
stand-in flyovers). You can walk through the City Centre mall wall. Generated buildings do collide, so this is
inconsistent. Fix: add each model's solid boxes to `landmarkSolids`, from the same frame and size the renderer uses.

**30. Performance is within budget everywhere measured.**
- Timed: 96 stops, 60-61 fps everywhere (Mac GPU, 390x844 at DPR 2 with the game's pixel ratio 1.25), at most 51 draw
  calls, worst frame 31 ms.
- Free: 178 stops, 59-62 fps, at most 49 calls, worst frame 26 ms.
- Triangles peak at 483k at the Sector V edge, where the whole map and the chunks are both drawn. That is heavy for
  iPhone-class GPUs; it's about 100-200k elsewhere.
- One free screenshot timed out after 30 s at `A-04140` (Phoolbagan to Narkeldanga, (-2124, 249)) while chunks were
  settling. It didn't recur.

**31. The draw-call peak is at the Sector V edge, and it drives the fog in (1).**
- The frames that reached 50-51 calls (timed A-00200, A-01557, A-01560) and every stop between A-00120 and A-00520 had
  `reach` at the 0.55 floor.
- The Sector V group (map, dressing and signs) stays visible until 600 u from the origin, on top of the chunks.
- Fix:
  - Cull Sector V pieces by distance from the player (citymap `cull` already exists for parts of it), and hide the
    whole group once the player is more than about 150 u outside the square.
  - Merge chunk structure meshes with neighbouring chunks' when far.

## Appendix: data

- Raw outputs (not in the repo): `/tmp/gj_audit/{free,timed}{,-2,-3,-4,-5}.json` (collision, overlaps, drive legs, lamp
  density, buildings on roads, landmark footprints, lane blockage), `/tmp/gj_audit/live-{mode}.jsonl` (one record per
  live stop: position, fps, draw calls, triangles, fog, camera, file paths), `/tmp/gj_audit/cam-{mode}.jsonl`.
- Tables of every hit are below each issue. Lane blockage lists every 1 u run where a lane centre of a net road is
  blocked by the sim's collision. "Shut" means every lane and both kerb strips are blocked.
