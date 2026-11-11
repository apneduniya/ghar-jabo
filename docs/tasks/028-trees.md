# 028: Trees that look like Kolkata trees

Goal: owner playtest (2026-11-12): "the trees don't look real." Today: Sector V greenery (`src/render/world/
greenery.ts` canopy/crown) and streamed-world trees and palms (`src/render/world/chunkprops.ts` tree/palm/
treeShapes/fronds) are faceted low-poly blobs on a cylinder.

Do (look at real references first: Street View along Sector V's Street 13/Street 18/Biswa Bangla Sarani, Salt Lake
avenues, the Bypass and old Kolkata lanes; write what you saw in a Notes section here):
- The common street trees: rain tree / shirish (wide umbrella crown, dark green, spreading branches), neem
  and mahogany (dense rounded crowns), gulmohar/radhachura (flat crown, red/yellow flowers in season), banyan
  and peepal (huge, aerial roots, often with a shrine and a painted base), Ashoka/debdaru (tall narrow columnar
  ones lining Salt Lake roads), coconut and royal/areca palms, plus kerbside shrubs. Pick the 5-6 that matter.
- Make them read as trees at phone size: branching trunks that split into limbs, crowns built from several
  overlapping clumps with per-vertex colour variation (darker underneath, lighter top, a little ambient
  occlusion), a softened silhouette (more clumps, slight random jitter, alpha-tested leaf cards only if cheap and
  in budget), whitewashed/painted trunk bases where Kolkata has them, variation in size and tilt.
- A gentle wind sway in the vertex shader (crown more than trunk), off when the player is far.
- Keep budgets: trees are baked/merged per chunk (same draw-call count as today), triangles per tree modest;
  measure triangles on the Mac at the busiest spot (Salt Lake avenues, Sector V Street 13) before and after.
- Both Sector V and the streamed world use the same tree kit.
Acceptance:
- [ ] Mac GPU screenshots (390x844) at 3-4 spots, before and after, next to a Street View crop of the same kind.
- [ ] Draw calls unchanged, ≤ 250 KB brotli, 60 fps on the Mac on a ride through Salt Lake.
- [ ] Unit test for the tree builder (deterministic per seed, triangle cap per species).
Files you may touch: src/render/world/greenery.ts, src/render/world/chunkprops.ts (tree/palm only),
src/render/world/trees.ts (new), src/render/gfx.ts (append only), src/content/worldgen.ts (append only), tests.
Out of scope: camera/controls (027), traffic, structures.
