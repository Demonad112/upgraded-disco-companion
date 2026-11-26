# CLAUDE.md

npm workspaces (`packages/*`, `apps/*`), Node >=22, TS strict. `packages/core` is pure (no I/O, `fetch` injected). `packages/data/generated/` is generated (`npm run build:<name> -w @poe2/data`, `packages/data/PROVENANCE.md`). `services/ninja-proxy` is not a workspace (own `package.json`, tested separately). Never edit `vendor/pob2/`; `tools/pob2/`: skill `pob2-oracle`.

## Commands

- `npm run gate` before a PR (runs only the checks the changed paths need). `npm run check:all` = every CI suite except build, e2e, Lighthouse.
- `npm run typecheck` builds `@poe2/core` first; the web app resolves core to built `dist/`, so build core before `tsc` in an app on a fresh checkout.
- Core coverage: `npm run test:coverage -w @poe2/core` (90% statements / 75% branches). e2e: `npm run e2e -w @poe2/web` against `apps/web/out` (build first), or `E2E_BASE_URL=<preview>`.
- Core goldens (`packages/core/test/golden/`): review the diff, `npx vitest run -u` in `packages/core`, commit the `*.expected.json` with the cause (the "golden diff", HG1-1).
- Screenshots (UI work or when asked): `node scripts/screenshot.mjs [baseUrl] [outDir]` to the scratchpad, never git; offline: `node scripts/mock-proxy.mjs [port]`.

## Architecture

- One analysis implementation: `apps/web` imports `@poe2/core`. Web state is client-side (`localStorage`); reference content is hand-edited in `apps/web/src/data/`.
- **The PoB2 code is the source of truth.** Numbers decoded from a pasted code are correct and shown as read (provenance `pob-export`). Numbers it doesn't carry are computed by the text mini-calc and labelled "≈ est." (`estimate`), or shown as missing with a reason. Computed values only measure error and calibrate. Never call a code "stale" because another number differs.
- Headless PoB2 (`vendor/pob2`, `docs/POB2-SYNC.md`) is a CI guard that must reproduce the reference code (`packages/core/test/reference/`); it never feeds the site. No PoB in the browser or server, no `pob-sim` provenance.
- Two import boxes: poe.ninja code (baseline `docs/POB-NINJA-CONFIG.md`) and PoB2 code (same baseline by default, toggle for own/no config). poe.ninja import stays dormant (`NINJA_IMPORT_BLOCKED`). `PobSnapshot` is the core model; `buildCharacterOutline` (`packages/core/src/outline/`) sorts it into poe.ninja's sections. Intent `docs/intent/simple-code-analysis.md`; V1 plan done (`docs/HISTORY.md`).

## Pointers (read only when the task needs them)

- Reference build: `packages/core/test/reference/{ninja-default,pob2-own}/decoded.md`, never decode a code again (skill `reference-build`).
- Web app, data flow, proxy, `basePath`, design rules (owner only), Cloudflare Pages: `apps/web/CLAUDE.md`.
- Session steps, Needs-owner kinds, owner queue, handoff prompts: `docs/SESSION-PROTOCOL.md`. Copy voice: `docs/COPY.md`. Perf budgets: skill `perf-budget`. Dependency bumps: `docs/DEPENDENCY-BUMPS.md`. Handoff overrides: `.claude/handoff.md`.
- Cloud sessions: the SessionStart hook installs and builds core (a FAILED line means it didn't); don't run `playwright install`. Hooks deny edits to generated files and ask before edits to thresholds and budgets.

## Rules

- "Plan" means stop after the plan. "Fix"/"remove" means do it now. Record owner decisions in their words ("not yet" is deferred, not never).
- Never lower a threshold, raise a budget, skip a test or amend a pushed commit to get green without the owner's OK. Red-then-green; no weaker tests.
- Open questions: answer them yourself, act, state answer and reason. Exceptions are Needs-owner kinds (design rules, CI/branch protection, data/dependencies, `packages/*` policy, weaker tests, branch deletion): add an Owner queue row with a recommended answer (`docs/SESSION-PROTOCOL.md`). Blocked on one 3 times: stop and ask.
- Attribution: use the tooling's commit trailers and PR footer, but never a Claude session URL (`claude.ai/code/session_…`) in trailers, PR bodies, comments, code or docs.
- Data shape change: grep `apps/web/e2e` for the old path and update specs in the same commit.
- Context: batch independent tool calls; grep before reading; read whole files only to edit them; query `packages/data/generated/**` and big fixtures with `node -e`; cap listings, never errors or failing tests. Hand off at a task boundary.
- End with a closeout: each item done, partial or not done, with evidence, and what is pending (CI, browser, real data).
