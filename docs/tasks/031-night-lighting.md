# 031: Lighting that doesn't fall apart beyond Sector V

Goal: owner playtest (2026-11-12): "I can see lighting bad further down the road." Evidence:
`research/routes/AUDIT.md` issues 1-5, 30-31 (night shots: compare `timed/A-00280-road-fwd-night.jpg` with
`timed/C-01000-…`, `timed/E-01720-…`, `free/A-03740-…`, under research/routes/img/audit/).

Do:
- **1/31 Fog and draw distance:** fog far ~300+ at night everywhere; fog near later; a lighter city-glow colour
  near the horizon at night. Cull the Sector V group by distance from the player (hide it once the player is ~150 u
  outside the square) so the draw-call peak at the edge goes away and `reach` doesn't hit its 0.55 floor; floor
  `reach` at ~0.8 at night.
- **2 Lamps:** lamps on both kerbs of every real road, median lights on divided roads, high masts at named
  junctions (Hudco, Chingrighata, Phoolbagan, Rajabazar, CIT More, Ultadanga); in timed space lamps by game length.
  Lamp placement is in `src/sim/gen/props.ts` (`put('lamp', …)`): another builder edits other parts of props.ts,
  so keep your change to lamp placement (a helper in a new file is better).
- **3 Lamp pools:** use Sector V's additive soft pools (lamps.ts) for chunk lamps, covering footpath and frontage;
  one instanced mesh or one extra material, within the draw-call budget.
- **4 Windows:** streamed windows glow warm (`vec3(1.0, 0.83, 0.6) * glowTexel`), not the wall tint (chunkmat.ts).
- **5** Lamps on band-style flyover decks (decks.ts lamp code only; another builder rebuilds decks: coordinate by
  keeping your change to the lamp loop).
- Streamed trees sway: task 028 left `addWind` for chunkmat.ts (foliage marker glow < 0); add it.
Acceptance: Mac GPU night shots before/after at A-00280, Salt Lake avenue, Bypass at Apollo, APC Rd, CIT Rd,
Sealdah, both modes; draw calls ≤ 60 everywhere on a full timed ride and a free ride sample; 60 fps; unit test for
lamp spacing per road (both kerbs, ≤ N u gaps); `npm run check` green.
Files you may touch: src/render/sky.ts, src/render/world/streamed.ts, src/render/world/chunkmat.ts,
src/render/world/chunkground.ts, src/render/world/lamps.ts, src/render/world/chunkprops.ts (lamp only),
src/render/world/landmarks/decks.ts (lamp loop only), src/sim/gen/props.ts (lamp placement only), new
src/sim/gen/lamps.ts, src/stages/sectorv.ts (Sector V culling only), src/content/tuning.ts (CHUNK_VIEW) and
worldgen.ts (append), tests.
Out of scope: road data (029), camera/landmarks (030).
