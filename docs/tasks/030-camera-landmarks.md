# 030: The Wipro More camera everywhere; landmarks and props off the road

Goal: owner playtest (2026-11-12): "when crossing the bridge at Wipro More the camera is good, but the same
camera handling isn't there on other bridges or roadways, we need to fix that", and obstacles in the road.
Evidence: `research/routes/AUDIT.md` issues 11-14, 19-23, 29 (screenshots in
/home/adarsh/projects/ghar-jabo/research/routes/img/audit/).

Do:
- **19-22 Overhead:** a streamed `roofsAt(x, z)` built per chunk from the same layout the solids use (deck
  undersides from `netDeckY - slab`, viaduct soffits, elevated station concourses, rail underbridge girders, stand-in
  decks), cached per chunk, combined with Sector V's `roofs()` in the camera code (`src/stages/sectorv.ts`; task 027
  rewrote the camera: keep its swipe-to-look). The camera must stay under every structure the player is under,
  like at Nabadiganta/Wipro More, and ease in/out smoothly. Test: a camera rig walked through every streamed
  structure stays below it.
- **23 Occlusion:** the camera pull-in asks a `world.camBlocked(x, z, pad)` that covers Sector V buildings, chunk
  buildings, landmark boxes and structure solids (not the timed off-band rule).
- **29 Landmark collision:** each landmark model's solid boxes become collision (`landmarkSolids`), from the same
  frame and sizes the renderer uses.
- **11 Landmarks on squeezed roads (timed):** when placing a landmark, test its footprint against every net
  carriageway; slide it back from the road (or turn/shrink a little) until it fits. Test: no landmark footprint
  overlaps a carriageway in either mode.
- **12 Junction kiosks/statues:** a small raised island with kerb and collision where real (the lane plan routes round
  it like a pier), else move to the corner footpath.
- **13** Drop Salt Lake lattice islands within reach of a net road.
- **14** Reject props (parked cars/bikes, bus stops, palms) whose footprint overlaps a net carriageway other than
  their own street's kerb.
Coordinate with task 029 (another builder, same time): it re-pairs divided roads and rebuilds flyover decks in
`tools/build-world.py`, `sim/gen/layout.ts`, decks.ts, bridges.ts. Build your roof source on the layout functions
(`netDecks`, `metroLayout`, `crossingSite`, `underbridge`) so it follows their changes; don't edit those files
beyond adding exports you need.
Acceptance: unit tests above; Mac GPU before/after shots under Ultadanga flyover, a streamed metro station
(City Centre), a rail underbridge (Narkeldanga), City Centre mall in timed, a junction kiosk; budgets; `npm run check`.
Files you may touch: src/stages/sectorv.ts (camera code), src/sim/world.ts (camBlocked/walkBlocked only),
src/sim/gen/roofs.ts (new), src/sim/gen/solids.ts (landmarkSolids only), src/sim/gen/landmarks*.ts or the placement
code in net.ts/chunks.ts for landmarks, src/sim/gen/props.ts (except lamp placement), src/sim/gen/streets.ts
(islands), src/sim/streamed.ts, src/render/world/landmarks/index.ts (frame/size exports), tests.
Out of scope: road data and decks (029), lighting and lamps (031).
