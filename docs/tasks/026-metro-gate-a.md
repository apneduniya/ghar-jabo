# 026: Sector V metro, Gate A in the right place and looking like it

Goal: owner playtest (2026-11-11): "the metro entry is very bad and at wrong place, check the gmap and you will
understand." Research done (Street View Jan–Feb 2026, satellite; screenshots in /tmp/gjmetro/, copy the useful
ones to research/streetview/img/metro/ which is gitignored, and write the findings into
research/streetview/NORTH.md §3 as "Gate A re-shoot, 2026-11-11").

Findings (game coords: x east, z south, 0.5 u/m; positions ±3-5 m):
- **Wrong side today.** `gateSpot(map.roads)` (src/sim/world.ts ~66 → elevated/structures) takes OSM's Gate A
  node, which sits 2 u south-east of the service road's centre line, and pushes it outward on that side, so the
  entrance lands at about (-33.5, -194.6): across the road, against the barrier by the Nabadiganta flyover ramp,
  where there is no footpath. The green floating "🚇 gate" sign (src/stages/sectorv.ts ~101) marks it.
- **Real Gate A door:** 22.58070, 88.42865 → (-36.0, -204.3), station frame s ≈ -22, t ≈ 0. On the NW
  (station) side of the service road, just past the kerb: a recessed doorway in a ground-level block under the
  station's overhang at its SW (Wipro More) end, black plate with a white "A" over it and a stair rising inside;
  a big colourful mosaic mural wall to its NE; a small paved forecourt behind white railings with coloured
  square motifs; green-and-yellow autos queue nose-to-tail along that kerb; blue-and-white kerb.
- **Gate A sign pillar:** 22.58064, 88.42860 → (-38.5, -201.2): grey free-standing pillar at the forecourt's SW
  corner with a red metro roundel, an angled navy name board (three scripts) and a route map panel.
- **The bank block** (parody bank sign in the game; keep it parody) bridging the road starts NE of the mural,
  about s -17..-10, not s -28.5..-21.5 where the game has it (on top of the real door). Weak estimate: check the
  photos `a0z_h40.jpg`, `a0z_h15.jpg`, `p1z_h310.jpg`.
- **Service road:** one lane plus an auto kerb lane, about 7-8 m (game has 9 u = 18 m). Narrow it only if it
  doesn't break traffic tests; otherwise note it.
- **Gate B** (Chavipatty Rd): door at 22.58124, 88.42890 → (-23.1, -234.3) (OSM node is ~12 m east), up a
  steel-railed ramp, "drop-off point" sign, sloped stair enclosure with blue-trimmed glazing and an
  orange-yellow hand-gesture mosaic. Optional: move it there and model it.
- A TIU student walks Street 2 → PwC More → Street 13 → Wipro More → NE along the road north of the flyover and
  arrives at the pillar and Gate A door: so Gate A is the game's metro entrance.
Do:
- Place `metroEntrance` at the real Gate A doorway (on the station side), not via the push-outward logic;
  the trigger at the doorway; the minimap marker follows.
- Model Gate A as above (door with "A" plate, stair inside, mural wall, forecourt railings, grey pillar with red
  roundel and navy board, autos on the kerb), replacing the floating green sign with the pillar's board (keep a
  clear, readable marker for players who don't know it: e.g. the roundel lit at night, and the existing hint).
- Move the bank block if the photos support it; make sure nothing (piers, stalls, walls, parked bikes) blocks
  the walk from Wipro More to the door.
Acceptance:
- [ ] Unit test: metroEntrance within 2 u of (-36, -204), on the NW side of the service road's centre line, and
  reachable on foot from the TIU start; walking into the doorway opens the metro.
- [ ] Mac GPU screenshots (390x844) from roughly the Street View spot of `a0z_h40.jpg`, side by side with it.
- [ ] Budgets: ≤ 60 draw calls there, ≤ 250 KB brotli. `npm run check` green.
Files you may touch: src/sim/world.ts (metroEntrance only), src/sim/elevated.ts, src/sim/structures.ts,
src/render/world/stations.ts, src/stages/sectorv.ts (entrance sign only), src/content/sectorv.ts,
src/content/text.ts, src/content/landmarks.ts, src/ui/minimap.ts (marker only), research/streetview/*, tests.
Out of scope: people animation (025), traffic, controls.
