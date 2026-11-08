# Backlog

Order matters: foundation first (lead, serial), then features (builders, max 2 in parallel).

## Foundation (lead)
- [x] 000 Scaffold: folders, ESLint boundaries, Vitest, Playwright smoke + draw-call budget, size-limit, pre-push check, AGENTS.md.
- [x] 001 Extract sim: player movement, traffic on the road graph, bus hop/hang/fall, Rapi-Nah captain plans, metro doors
      into `src/sim/` with unit tests; fixed 60 Hz step and seeded runs (`?seed=`). Done for the real map; the road
      and metro stages are still legacy code and move into sim with tasks 007 and 004.
- [x] 002 Render foundation: instanced/pooled actors (people, cars, buses), camera rig, adaptive pixel ratio,
      WebGL context-loss handling, pause when hidden, share capture without `preserveDrawingBuffer`.

## Features (builders)
- [x] 003 Buses on the real map: Kolkata buses running Street 13 (College More → PWH junction → Wipro More → north-west),
      slowing at real stops; hop on at the left rear door; leaving the map on a bus continues the ride to Sealdah.
- [x] 004 Metro on the real map: entrance stairs at Salt Lake Sector V station, into the station stage.
- [x] 005 Minimap: GTA-style circular minimap built from the real roads, rotating with the camera. Markers: you,
      Sector V metro, bus stops, nearby buses (blue/red), the Rapi-Nah captain, an edge arrow towards Sealdah.
      Tap to open a full map. One small 2D canvas: roads drawn once, markers per frame. Better than the
      vertical strip in Bhaiya Bandra and the pointer-only HUD in Baper Rasta.
- [x] 006 Rapi-Nah on real roads: captain rides the road graph to you (wrong side, obviously), wrong-place arrivals.
- [x] 007 The ride to Sealdah: condensed real sequence (Karunamoyee → … → Sealdah) for bus and bike; metro via the
      Green Line stations; home at Sealdah.
- [x] 008 Sound: licensed clips (horns, rain, shankh, hawkers, crows), synthesised tram bell and metro beep,
      Adarsh's recorded conductor and announcement lines when ready.
- [x] 009 Street life: trees, shop fronts on the café strip (parody names), people on footpaths, puddles near Webel More.
- [x] 010 Newspaper ending on the new base, with the run's real photo and the seed for "beat my run".

## Next (from playtests and known gaps)
- [ ] 011 Move the long-ride and metro-station stages onto sim/ (they're still legacy stage code; city.ts is over 400 lines).
- [ ] 012 Start framing: the opening camera sits tight against the TIU wall; open on a wider shot of the gate and junction.
- [x] 013 Pedestrians react (sim/crowd.ts), footpath stalls, side-lane depth in culled cells.
- [ ] 014 Adarsh's recorded voice lines (conductor, Green Line announcement parody), when recorded.
- [ ] 015 Publish: gharjabo.boogles.dev (Cloudflare Pages) once Adarsh says go.
