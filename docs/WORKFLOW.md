# Workflow (for now: simple on purpose)

We looked at heavier setups (Claude-of-Tanks: 200+ line AGENTS.md, per-folder SKILL.md files, a verification
matrix, many parallel agents; threejs-game-skills: evidence manifests, at most two workers with file ownership).
For a small, fast-changing codebase that's too much process. What we use now:

## Roles
- **Lead** (the main Claude session): keeps `docs/tasks/BACKLOG.md`, writes specs, reviews diffs, merges, pushes,
  updates the private preview, and talks to Adarsh.
- **Builder agent**: one spec, one branch (`feat/NNN-name`), one git worktree. Runs `npm run check` before finishing.
- **Reviewer agent** (only for big or visual tasks): fresh context; reads the spec and diff, looks at the Mac
  screenshots, and reports problems. It does not see the builder's summary.
- **Adarsh**: plays the preview on iPhone; feel and humour feedback becomes new specs.

## Rules of thumb
- Foundation work that touches every file (restructures, sim extraction) is done by the lead, serially.
  Parallel agents on shared foundations just produce merge conflicts.
- Feature work: at most **2 builders at once**, on separate folders (e.g. one on `sim/` + `render/` for buses,
  one on `ui/` for the minimap).
- Done means: `npm run check` green, budgets not regressed, Mac screenshots for anything visual.

## Local CI
GitHub Actions minutes are used up, so `.githooks/pre-push` runs `npm run check` on every push
(`git config core.hooksPath .githooks` once per clone).

## Device checks
- **Server** (no GPU): unit tests, Playwright smoke and draw-call budgets.
- **Mac** (`ssh mac`, real GPU): frame rate and screenshots at iPhone size, via headed Chromium.
- **iPhone** (Adarsh): the real test for touch, feel and Safari performance.

## Task spec template (`docs/tasks/NNN-name.md`)

```md
# NNN: <name>
Goal: one paragraph, player-facing.
Acceptance:
- [ ] observable behaviour 1
- [ ] tests: what new unit/e2e tests prove it
- [ ] budgets: draw calls / bundle size unchanged or within limits
Files you may touch: src/sim/..., src/render/...
Out of scope: ...
```
