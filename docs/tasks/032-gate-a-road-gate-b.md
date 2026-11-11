# 032: Gate A's road at its real width; Gate B in the right place

Goal: finish what 026 left open (owner, 2026-11-12: "do the open ones"). See research/streetview/NORTH.md §3
"Gate A re-shoot, 2026-11-11" and /tmp/gjmetro/ (or research/streetview/img/metro/) photos.
- **Gate A service road:** the road under Sector V station past Gate A is 9 u (18 m) in `public/data/sectorv.json`;
  the real one is one lane plus an auto kerb lane, ~7-8 m (≈ 3.5-4 u). Set its width through the map pipeline
  (`tools/build-map.py` + its overrides file, `npm run map`), not by editing the JSON by hand. Then move Gate A's
  door, forecourt, pillar and autos (src/content/sectorv.ts `north.gateA`, `svGateA()` in src/sim/structures.ts,
  stations.ts) to the real kerb line (door at about (-36, -204.3)), and check traffic lanes, piers, medians,
  stalls and walls still fit (structures tests, traffic tests).
- **Gate B (Chavipatty Rd):** door at 22.58124, 88.42890 → (-23.1, -234.3) (OSM node is ~12 m east). Model it: a
  doorway in the station's NW face reached up a steel-railed ramp, a drop-off sign (text in content/text.ts), a sloped
  stair enclosure with blue-trimmed glazing and an orange-yellow hand-gesture mosaic (`gbz_h195.jpg`, `g_gb.jpg`).
  Gate B is an entrance too: walking into it opens the metro like Gate A.
Acceptance: unit tests (road width, Gate A door on the kerb, Gate B trigger reachable from Chavipatty Rd); Mac GPU
shots matching `a0z_h40.jpg` and `gbz_h195.jpg`; budgets; `npm run check` green.
Files you may touch: tools/build-map.py, its overrides json, public/data/sectorv.json (regenerated), src/content/sectorv.ts,
src/content/text.ts, src/sim/structures.ts, src/sim/elevated.ts, src/sim/world.ts (metro entrances only),
src/render/world/stations.ts, src/ui/minimap.ts (marker), research/streetview/*, tests.
Out of scope: everything in 029-031.
