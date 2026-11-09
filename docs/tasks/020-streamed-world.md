# 020 Streamed world: Sector V to Sealdah, endless

Owner's ask (2026-11-09): keep the big recognisable real Sector V map, but beyond it the world must be endless
"like Dhaka" and lead to Sealdah. Decisions:
- **Real route, streamed:** the real corridor roads to Sealdah continue seamlessly past the Sector V map edge
  (no loading screen, no stage switch), with real landmarks in the right order. Buildings, side streets, stalls
  and traffic are generated as you move.
- **Free roam:** true scale (0.5 u/m), endless in every direction (generated city beyond the corridors).
- **Timed:** compressed beyond Sector V (about 3x overall; landmark order kept); only toward Sealdah: side streets
  dead-end (wall, flooded lane, a joke).
- Research: `research/routes/ROUTES.md` (corridors, network, area character §4.1, compression §5, gaps §6),
  `research/routes/corridors.json`, `research/routes/LANDMARKS.md` (what each junction looks like).

## Architecture

```
research/routes/corridors.json ──tools/build-world.py──▶ public/data/world.json   (fetched at boot, not bundled)
                                                          │
src/sim/gen/net.ts      loadNet(json) → WorldNet (real coords, true scale, game units)
src/sim/gen/warp.ts     makeWarp(mode): identity inside the Sector V square; timed = radial squeeze outside it
src/sim/gen/chunks.ts   generateChunk(net, warp, mode, cx, cz, seed) → Chunk   (pure, deterministic)
src/sim/gen/stream.ts   ChunkStore: keeps chunks within R of the player, collision grid per chunk
src/sim/world.ts        walking/traffic/arrival use Sector V map + ChunkStore + the warped network
src/render/world/chunks.ts      chunk meshes, built time-sliced, ≤ 2 draw calls per chunk
src/render/world/landmarks/*    one model function per landmark kind, placed from net landmarks
```

Shared types: `src/sim/gen/types.ts` (the contract between sim and render; change it only together).

### Coordinates and the warp
- Real coords: the existing game frame (x east, z south, 0.5 u per metre, origin PwC More). `corridors.json` already
  has `game` coords per polyline vertex and landmark.
- The Sector V square (|x|, |z| ≤ 360) is identity in both modes: the real map is untouched.
- Timed: positions outside the square are pulled toward it radially, `r' = R + g(r - R)` with a piecewise squeeze
  (Salt Lake/Bypass ring hardest, old city near Sealdah least), tuned so corridor A beyond the square is about
  1,500 u (ROUTES §5). Only positions are warped: building, bridge, landmark and vehicle *sizes* stay true. The
  generator works in game (warped) space; `warp.toReal()` is only used to look up area character.
- Free: identity everywhere.

### Chunks
- `CHUNK = 128` units, keyed by integer (cx, cz). The generator never emits anything inside the Sector V square
  except where nothing exists (it doesn't; the real map covers it).
- A chunk holds: road pieces (real corridor roads warped and clipped, plus generated side streets by area
  character), building footprints with storeys/style/colour, props (stalls, trees, lamps, wires, carts, parked
  vehicles, walls, dead-end blockers, puddles), landmark ids inside it, and extra collision polygons.
- Deterministic: same (seed of the world, mode, cx, cz) gives the same chunk, so streaming out and back in is stable.
- Timed: side streets are short stubs (≤ 60 u) ending in a dead end; outside the corridor band there's no walkable
  ground (buildings/walls). Free: generated streets connect across chunk borders forever.

### Budgets
≤ 60 draw calls per frame anywhere (Sector V near the edge plus chunks), ≤ 250 KB brotli JS (world.json and the
Sector V map are fetched, not bundled), generation and meshing time-sliced (≤ 4 ms per frame), no hitch when a
chunk loads. 60 fps on the Mac GPU; check iPhone-class by keeping triangles and draw calls modest.

### Gameplay hooks
- Arrival: reaching the Sealdah forecourt (net `sealdah` circle) calls `game.arrive(mode)`.
- Buses run corridor routes from Sector V to Sealdah (stopping at bus stops on the way); Rapi-Nah captains route on
  the network; hopping/hanging/falling work anywhere.
- The legacy `city` stage (fake long ride) is retired once riding off the map just continues in the same world.
  The `station` stage (metro platform) stays: metro from Sector V (and stations along the Green Line) leads to it.
- Free-roam clock rate is a single tuning value (`T.clock.free`, default 1 game minute per real second).
