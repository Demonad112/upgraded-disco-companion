# CLAUDE.md

## Layout

npm workspaces (`packages/*`, `apps/*`), Node >=22, TypeScript strict. `packages/core` is pure (no I/O; `fetch` is injected); `packages/data/generated/` is generated (rebuild with `npm run build:<name> -w @poe2/data`, see `packages/data/PROVENANCE.md`); `services/ninja-proxy` is **not a workspace** (own `package.json`, tested separately). `vendor/pob2/` (never edit) and `tools/pob2/`: skill `pob2-oracle`.

## Commands

- `npm run typecheck` builds `@poe2/core` first. The web app resolves core to its built `dist/`, so on a fresh checkout build core before running `tsc` in an app.
- `npm run gate` runs only the checks the changed paths need (use this, not `check:all`, before a PR). `npm run check:all` = typecheck + lint + test + script tests + ninja-proxy tests (every CI suite except build, e2e and Lighthouse).
- `npm run test:coverage -w @poe2/core` enforces 90% statements / 75% branches. `npm run e2e -w @poe2/web` runs against `apps/web/out` (build first); `E2E_BASE_URL=<preview>` runs it against a deployed site.
- PoB2 headless oracle commands (`pob2:oracle`, `pob2:spec`, `pob2:run`): skill `pob2-oracle`.
- Core goldens (`packages/core/test/golden/`): review the diff, then `npx vitest run -u` in `packages/core` and commit the changed `*.expected.json` with the cause. This is the "golden diff" HG1-1 asks for.
- Screenshot check (390 px + 1440 px, real character): `node scripts/screenshot.mjs [baseUrl] [outDir]`; write to the scratchpad, never git. Import path without network: `node scripts/mock-proxy.mjs [port]` serves the committed fixture.

## Architecture

- **Single analysis implementation.** `apps/web` imports `@poe2/core`.
- **The code is the source of truth.** Every number decoded from a pasted PoB2 code is correct and shown as read (provenance `pob-export`). Where the code carries a figure, that figure is shown; anything computed for it is used only to measure error and calibrate. Numbers the code does not carry are either computed by the text mini-calc and labelled "≈ est." (provenance `estimate`), or shown as missing with a reason. Never call a code "stale" because another number differs.
- **The oracle is a CI guard.** Headless PoB2 (`vendor/pob2`, pinned to the release the codes were written by, `docs/POB2-SYNC.md`) must reproduce the reference code (`packages/core/test/reference/`). It never feeds the site. There is no PoB in the browser or on a server, and no `pob-sim` provenance.
- **PoB is the import.** Two boxes: a poe.ninja code (poe.ninja's config baseline, `docs/POB-NINJA-CONFIG.md`) and a PoB2 code (same baseline by default, toggle for own/no config). poe.ninja import stays dormant (`NINJA_IMPORT_BLOCKED`). `PobSnapshot` is the core model; `buildCharacterOutline` (`packages/core/src/outline/`) sorts it into poe.ninja's character-page sections. Intent: `docs/intent/simple-code-analysis.md`; plan: `docs/plans/simple-code-analysis.md`.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

## Pointers

- Reference build: read `packages/core/test/reference/{ninja-default,pob2-own}/decoded.md`, never decode a code again (skill `reference-build`).
- Web app, data flow, proxy, `basePath`, design rules (decided; owner only) and Cloudflare Pages: `apps/web/CLAUDE.md`.
- Dependency bumps: `docs/DEPENDENCY-BUMPS.md`. Session steps: `docs/SESSION-PROTOCOL.md` (no required reading).
- Handoff: per-repo overrides in `.claude/handoff.md`; `.claude/hooks/handoff_watch.py` injects the time/context triggers.

## Cloud sessions

The SessionStart hook installs and builds core when needed (a FAILED line means it didn't); don't run `playwright install`. Hooks deny edits to generated files and ask before edits to thresholds and budgets; they say why when they fire.

## Scope and closeout

- "Plan" means stop after the plan. "Fix" or "remove" means do it in this session; write a prompt for another chat only when asked.
- Record the owner's decisions in their words: "not yet" is deferred, not never.
- Never lower a threshold, raise a budget, skip a test or amend a pushed commit to get green without the owner's OK.
- End with a closeout: each item done, partial or not done, with evidence, and what is pending (CI, browser, real data). Handoff prompts go in chat as one code block.

## Working style

- **Attribution.** Use the commit trailers and PR footer the tooling supplies, except never a Claude session URL (`claude.ai/code/session_…`): no `Claude-Session:` trailer, no session link in PR bodies, comments, code or docs.
- Answer open questions yourself with your best recommendation, act on it, and state each answer and its reason in
  your reply. The exceptions are the Needs-owner kinds in `docs/SESSION-PROTOCOL.md` (design rules, CI or branch
  protection, data/dependencies, `packages/*` policy, weaker tests, branch deletion; other core changes need only a
  red-then-green test and golden diff): put those in `REMAINING-WORK.md` § Owner
  queue with a recommended answer. If you are blocked on one 3 times, stop and ask.
- **Data shapes.** When a data shape changes, grep `apps/web/e2e` for the old path and update specs in the same commit.
- **Copy voice.** Follow `docs/COPY.md`: one or two sentences, action first, long text only behind Pro detail.
- **Perf and route budgets.** Skill `perf-budget` (5 % brotli bar, tracing an over-budget route).
- **Context.** Keep it for what matters: batch independent tool calls; grep before reading and read whole files only
  when editing them; query `packages/data/generated/**` and the large fixtures with `node -e` when you
  need only part of them; cap listings, never errors or failing tests. Hand off at a task boundary.
- **No watching.** Don't schedule check-ins, subscribe to PR events or poll CI unless the owner asks: each wake is a full paid turn. End with the branch pushed (PR only when asked) and CI status in the closeout; the owner asks for status later.
- Visual work: before opening the PR, ask whether to run a screenshot check; if yes, post the 390 px and 1440 px
  Playwright screenshots in chat (images stay out of git).
