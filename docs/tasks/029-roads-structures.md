# 029: Divided roads, flyovers and the structures on them, end to end

Goal: owner playtest (2026-11-12): "many obstacles in the middle of the road, divider and all in the middle of the
road; check all the routes and fix them end to end." Evidence: `research/routes/AUDIT.md` (issues 6-10, 15-18,
24-28; screenshots in /home/adarsh/projects/ghar-jabo/research/routes/img/audit/, raw data /tmp/gj_audit/).

Fix, in this order (root cause first):
- **6 Divided roads overlap.** Pair the one-way carriageways of divided roads (anti-parallel, same name or
  continuation, within ~25 m) in `tools/build-world.py` and give each carriageway a realistic width; place them
  so the gap between inner edges is a real median (look at the real widths: Bypass, Salt Lake Bypass, CIT Rd,
  APC Rd, KNI Ave, Bidhan Nagar Rd, Salt Lake arterial, 1st/2nd Ave). In timed, the warp must keep a pair's
  spacing true (like sizes), not squeeze it (`src/sim/gen/warp.ts` / net loading). Test: no two parallel net
  carriageways overlap by > 0.5 u in either mode.
- **7** Bypass median railing drawn once per pair, in the median, with a thin collision solid.
- **8** Metro piers must stand in the median gap or outside every carriageway (`sim/gen/layout.ts` pierAt /
  pierPassable), not merely clear of a bus lane pushed over the kerb.
- **9** Ramp feet: never solid across an at-grade carriageway; ramps get their own carriageway beside the at-grade
  road where reality has it; include `isFoot` pieces in `structureConflicts` so tests see them.
- **10** Short OSM bridges over water are `canal`, not `flyover` (same 80 u rule as Sector V, measured on the real road).
- **15** Export whole flyover ways (OSM bridge chains), not corridor-clipped stubs: Sealdah–Beliaghata Flyover
  (~154 m over Sealdah South tracks) and Vidyapati Setu along APC Rd; route corridors under/over them as reality
  does; retire the stand-in deck where the real one exists.
- **16** Bridge parapets per carriageway pair; never across another carriageway.
- **17** Timed dead-end caps only on roads leaving the corridor band, ≥ 30 u from the corridor road; never on the
  opposite carriageway of the road you travel.
- **18** Vehicles on deck edges drawn at deck height (`netDeckY`), or keep deck edges out of spawning/wandering.
- **25** A drivable link from the APC Rd / Vidyapati Setu foot to the Sealdah forecourt (check satellite/Street View
  on the Mac: the at-grade road beside/under the setu).
- **26** C/D Sector V exit: the two-lane road west to Nalban (≈ 22.5720, 88.4235) as a traffic road continuing into the
  Salt Lake Bypass; check OSM.
- **27/28** Detours disappear after 9/10; re-run the 150 u leg routing and fix what remains.
- **24** Extend `src/sim/walkable.test.ts` to every corridor in both modes, plus a drive test (graph route per leg
  ≤ 1.6x straight distance except named exceptions).
Acceptance: the audit's code checks (lane blockage, overlaps, piers in lanes, drive legs) re-run as unit tests,
zero hits except allow-listed ones with a reason; Mac GPU before/after shots at the audit's worst spots (Bypass at
Apollo, Salt Lake arterial under the Green Line, Ultadanga feet, Bidhan Nagar Rd canal, Sealdah–Beliaghata, APC Rd
foot) in both modes; budgets (≤ 60 calls, ≤ 250 KB); `npm run check` green.
Files you may touch: tools/build-world.py, tools/world_snap.py, public/data/world.json (regenerated), research/routes/*,
src/sim/gen/* except props.ts and streets.ts island code, src/sim/roadgraph.ts, src/sim/traffic.ts (deck height only),
src/render/world/landmarks/decks.ts, bridges.ts, src/render/world/viaduct.ts, src/render/actors.ts (y only),
src/content/worldgen.ts and landmarks.ts (append only), tests.
Out of scope: camera (030), landmark collision/placement, kiosks, props (030), lighting (031).
