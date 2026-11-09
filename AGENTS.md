# AGENTS.md

Ghar Jabo: phone-first 3D browser game (Vite + TypeScript + three.js). Read `docs/PROPOSAL.md` for the why.

## Commands
- `npm run dev`: dev server. `npm run map`: rebuild `public/data/sectorv.json` from OSM extracts; `npm run world`: rebuild `public/data/world.json` (the streamed world's network) from `research/routes/`. Both are fetched at boot, not bundled.
- `npm run check`: typecheck, lint, unit tests, build, size limit, Playwright smoke. **Must pass before you finish.**
- The pre-push hook runs `npm run check` (local CI; there is no GitHub Actions run).

## Layout and boundaries
- `src/sim/`: game rules. Pure TS: no three.js, no DOM, no timers, no `Math.random` (use `sim/rng.ts`). Lint enforces it.
- `src/content/`: data only: tuning numbers, joke text, maps. Same purity rules as sim.
- `src/render/`: three.js. Reads sim state, never changes it.
- `src/ui/`, `src/input/`, `src/audio/`, `src/app/` (loop, stage switching, test hooks `window.gj`, `window.gjr`).
- `src/stages/`: per-stage glue being migrated into the folders above. New logic goes in `sim/`, not here.

## Rules
- Tests next to code (`foo.test.ts`). Every bug fix adds a test that would have caught it.
- Files ≤ 400 lines. Every tuning number in `content/`, every joke line in `content/text.ts`.
- Budgets (tested): ≤ 60 draw calls per frame per stage, ≤ 250 KB brotli JS. Moving actors share meshes
  (merge with `bake()` or instance); never one mesh per body part.
- Keep left: Kolkata traffic drives on the left; bus doors are on the left.
- Parody brands only (Rapi-Nah, PWH Tower). No real logos, no real politicians, jokes about situations not communities.
- Map data © OpenStreetMap contributors (ODbL). Sounds: only files in `research/sounds/shippable/`, credited in README.

## Tasks
- Work from a spec in `docs/tasks/NNN-name.md` (goal, acceptance, files you may touch, tests to add).
- One task = one branch (`feat/NNN-name`) = one git worktree. Don't edit files outside your spec's list.
- Shared hot files (`content/tuning.ts`, `app/game.ts`, `AGENTS.md`): append only; restructuring is the lead's job.
- Visual changes: attach screenshots from the Mac GPU run (see `docs/WORKFLOW.md`). Headless Chromium here is
  SwiftShader at ~2 fps: use it for correctness and draw-call counts, never for feel or frame rate.
- Finish with: what changed, `npm run check` output summary, screenshots if visual, anything left undone.
