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

## Notes (builder, 2026-11-12)
Street View on the Mac (Dec 2025 – Jan 2026 car imagery; crops in /tmp/gj028/ref/):
- **Sector V** (Street 13 at 22.5777, 88.4278; Street 23/Ring Rd at 22.5702, 88.4335): big rain trees and
  mahogany-like trees whose grey trunks fork low into 3–4 long limbs, with the crown a wide, broken, olive-green
  umbrella (sky shows through the edges). Coconut and royal palms in the gardens and medians, hedges behind
  blue-and-white kerbs. Trunks here are mostly unpainted.
- **Salt Lake** (1st Cross Rd, HA/GD blocks, 22.5769, 88.4131; 2nd Ave, 22.5824, 88.4238): huge old rain
  trees and banyan/peepal over the footpath (a banyan with a stall, a bench and a railing under it), mango and
  neem in front gardens, saplings on the avenues' medians. Debdaru (mast trees) and areca palms by the houses.
- **Bypass / Biswa Bangla Sarani** (22.5699, 88.4047; 22.5814, 88.4543): young roadside trees (neem,
  gulmohar-like feathery crowns) behind blue railings, shrubs along the kerb, sparse cover.
- **Old city near Sealdah** (Golap Sastri Lane, 22.5652, 88.3658): few trees: a mango or neem in a compound
  leaning over the lane, everything else is buildings and wires.
- Whitewashed trunk bases (often with a red ring) are common on kerbside trees in Kolkata, less so in Sector V.

Built: `src/render/world/trees.ts` (kit: rain, neem, gulmohar, banyan, ashoka/debdaru, coconut, areca, royal).
Wind runs in Sector V's two forest meshes; the streamed chunks share chunkmat.ts's material (not in this spec's
files), so they don't sway yet: `addWind` in that material, gated on the foliage marker (glow < 0), would add it.
