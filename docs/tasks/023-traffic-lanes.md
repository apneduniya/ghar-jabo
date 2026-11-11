# 023: Traffic that keeps its lane, and better-looking vehicles

Goal: owner playtest (2026-11-11): "the buses are going wrong way, they aren't following the lane, each element
like bikes, taxis or cars can be heavily improved, our current version is very bad", and "near the college the
buses aren't following the divider (or any car)". Every vehicle must drive on the left half of its own
carriageway, respect dividers (never cross a median except at a gap/junction), turn smoothly at junctions, and
look like a real Kolkata vehicle with a driver/rider.

Known causes (lead's read of the code):
- **Buses:** `Traffic.busRoute` is a single `Polyline` (`map.busPath`, then `busRoute()` in
  `src/sim/gen/busroute.ts`). Buses with `routeDir = -1` drive the same line backwards, offset "left", so on a
  divided road (OSM: two one-way ways) the return bus runs in the opposite carriageway, against traffic, and
  across the median. Fix: build each direction's path separately on the directed `RoadGraph` (Dijkstra over
  directed edges, so one-ways and divided roads are respected), already shifted into its lane; keep `s`/stops
  per direction. Hop-on, depot, stops, the Sealdah arrival and the "wrong way back to College More" joke must keep
  working (`src/sim/world.ts` hop/ride code reads `busRoute`, `routeDir`, `s`).
- **Graph vehicles:** the lane offset is applied per edge, so at every node the vehicle jumps sideways and its
  heading snaps. Turn through junctions on a smooth curve (e.g. a short Bezier from the incoming lane to the
  outgoing lane), with the heading following the curve, and slow down for sharp turns.
  Check `RoadGraph.next`: no U-turns across a median, no turning the wrong way into a one-way.
- Check that lane offsets on one-way carriageways (`width * laneOffset` left of the way's centre line) actually
  sit inside the carriageway on the real map near College More (Street 13 / Street 18) and TIU (Street 2).
- Follow logic: bikes currently ignore everyone; let bikes filter but not drive through cars. Keep gridlock fixes
  (follow same-direction only, `maxPerDir`, honk propagation).

Looks (`src/render/models.ts` vehicles, `src/render/actors.ts`): better proportions and detail for the Ambassador
taxi, cars, auto, toto, bike (with a rider, helmet), bus (driver, conductor at the door, hangers); wheels that
turn (cheap: a texture/shader trick or a few pooled wheel meshes per model are fine only if draw calls stay in
budget; prefer baked + vertex-shader), brake lights, a slight body lean on bikes in turns. Keep one baked mesh
per vehicle (plus the bus's textured mesh) and pooled models.

Acceptance:
- [ ] No vehicle ever drives on the right-hand carriageway of a divided road; buses both ways stay in their own
  carriageway (test: sample every bus position along both directions and assert it is on a road whose direction
  matches, or on the left of a two-way road's centre line).
- [ ] No sideways jump at nodes (test: consecutive positions of a vehicle across a node differ by ≤ speed·dt + ε,
  heading change per step bounded).
- [ ] Hop on/off, stops, depot and arrival tests still pass; new tests for the two-direction bus route.
- [ ] Mac GPU screenshots near College More and TIU showing both directions of traffic, before and after.
- [ ] Budgets: ≤ 60 draw calls, ≤ 250 KB brotli; 60 fps on the Mac GPU on a ride.
Files you may touch: src/sim/traffic.ts, src/sim/roadgraph.ts, src/sim/polyline.ts, src/sim/gen/busroute.ts,
src/sim/vehicles.ts, src/sim/world.ts (bus/ride code only), src/render/models.ts (vehicle functions only, not
`person`), src/render/actors.ts, src/render/gfx.ts (append only), src/content/tuning.ts (append only), tests.
Out of scope: pedestrians and the player's model (task 025), controls (024).
