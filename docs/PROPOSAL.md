# Ghar Jabo: stack, structure and agent workflow (proposal)

Based on `research/stack/STACK.md` (frameworks, iPhone performance) and `research/stack/GITHUB-GAMES.md`
(20 open-source game repos read). Status: accepted 8 Nov 2026. Day-to-day process: `docs/WORKFLOW.md`; backlog: `docs/tasks/BACKLOG.md`.

## Stack

Keep **Vite + TypeScript + plain three.js** (WebGLRenderer). The comparable games (Benglooru, Fightkaro,
Delhi Metro, Bhaiya Bandra, Baper Rasta) are all plain three.js; every engine alternative is bigger
(Babylon 343 KB, PlayCanvas 532 KB, r3f 320 KB gzipped, vs our 198 KB for the whole game).

Add: Vitest, Playwright, ESLint (with an import-boundary rule), size-limit, stats-gl (dev only),
gltf-transform later if we ship `.glb` models. Skip: physics engines, ECS libraries, React, howler, nipplejs.

## Folder structure

```
src/
  app/       main loop (fixed 60 Hz step), stage switching, test hooks (window.__gj), context-loss handling
  sim/       ALL game logic. Pure TS: no three.js, no DOM, no Math.random, no timers. Seeded RNG. Tested in Node.
             run.ts (clock, money, dignity, stats), player.ts, traffic.ts (road graph), bus.ts (hop/hang/fall),
             rapinah.ts (captain plans), metro.ts (gates, crowd, doors), events.ts (jokes/ticker triggers)
  content/   data only: tuning.ts (every number), text.ts (jokes, headlines), map JSON, sound manifest
  render/    three.js only. Reads sim state, never writes it. citymap.ts, actors (instanced/pooled),
             camera rig, quality tiers (adaptive pixel ratio), share-image capture
  ui/        DOM: HUD, notifications, newspaper
  input/     keys + touch -> one Intent object per tick
  audio/     WebAudio synth + licensed clips
tools/       build-map.py (OSM -> JSON), perf-budget, mac-run.sh (GPU screenshots/fps on Adarsh's Mac)
tests/e2e/   Playwright: smoke, stage reachability, perf budget, screenshots
```

## Principles

1. `sim/` never imports three.js or touches the DOM (ESLint enforces it). Rendering is a view of the sim.
2. Deterministic: seeded RNG + fixed timestep, so a seed replays the same run (also enables "beat my run").
3. Every tuning number lives in `content/tuning.ts`; every joke line in `content/text.ts`.
4. Files under 400 lines (warn at 300). Tests sit next to the code (`traffic.test.ts`).
5. Performance budgets are tests: ≤ 60 draw calls per frame, ≤ 250 KB gzipped JS, 60 fps target on iPhone
   (30 fps tolerated under Low Power Mode). Moving actors use instancing/pools, never one mesh per body part.
6. Every bug fixed gets a test that would have caught it.

## Tests

- **Unit (Vitest, Node):** clock and jam curves, fares and surge, bus boarding rules, balance and falls,
  captain plans, metro door timing, headline selection.
- **Simulation bots:** seeded scripted runs that must reach Sealdah by bus, by metro and by bike, and must
  hit each named ending. Proves the game stays winnable as tuning changes.
- **E2E (Playwright):** boots with no errors, canvas not blank, every stage reachable via test hooks,
  draw-call and triangle budget per stage, newspaper renders and share image exports.
- **Visual (Mac GPU):** fixed seed + frozen clock screenshots per stage, judged by a reviewer agent.
- **Feel (Adarsh, iPhone):** a short checklist per playtest build; findings become tasks.

`npm run check` = typecheck + lint + unit + sim bots + build + size-limit + Playwright smoke.

## Agent workflow

- **Lead (main thread):** keeps the plan, writes task specs, reviews, merges, deploys the preview.
- **Task spec** (`docs/tasks/NNN-name.md`): goal, acceptance criteria, files it may touch, tests to add.
- **Builder agents:** one task → one branch → one git worktree. At most 2–3 in parallel, on separate areas
  (e.g. `sim/traffic` vs `render/actors` vs `ui/`), so they don't conflict.
- **Definition of done:** `npm run check` green; for visual tasks, Mac GPU screenshots attached; no budget regressions.
- **Reviewer agent:** fresh context; reads the diff and spec, and judges screenshots without seeing the builder's claims.
- **Playtest:** Adarsh tries the preview on iPhone; feedback becomes the next task specs.
- **AGENTS.md:** short (under ~80 lines): commands, boundaries, budgets, definition of done.

## Migration plan

1. **Scaffold:** tooling (Vitest, Playwright, ESLint, size-limit), folders, AGENTS.md, `npm run check`.
2. **Extract sim:** move run/player/traffic/bus/rapinah/metro logic out of the scenes into `sim/`, with tests.
3. **Render layer:** real map renderer, instanced and pooled actors, camera rig, adaptive quality, context loss,
   share capture without `preserveDrawingBuffer`.
4. **Features on the new base:** buses along Street 13, metro entrance at Sector V station, Rapi-Nah on real
   roads, the condensed ride to Sealdah, licensed sounds and Adarsh's recorded voice lines.
