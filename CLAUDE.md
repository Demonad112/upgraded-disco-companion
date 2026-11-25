# CLAUDE.md

## Layout

npm workspaces (`packages/*`, `apps/*`), Node >=22, TypeScript strict. `packages/core` is pure (no I/O; `fetch` is injected); `packages/data/generated/` is generated (rebuild with `npm run build:<name> -w @poe2/data`, see `packages/data/PROVENANCE.md`); `services/ninja-proxy` is **not a workspace** (own `package.json`, tested separately). `vendor/pob2/` is a byte-identical copy of the PoB2 fork's calc files (written only by `npm run pob2:sync`, verified by `npm run pob2:verify`; never edit it, prefer Grep for its `src/Data` and `src/TreeData`; see `docs/POB2-SYNC.md`). `tools/pob2/` holds our own Lua (headless snapshot runner, busted specs, data exporters in `tools/pob2/export/`; `npm run build:pob -w @poe2/data` rebuilds the generated data from them, no `POB2_DIR`).

## Commands

- `npm run typecheck` builds `@poe2/core` first. The web app resolves core to its built `dist/`, so on a fresh checkout build core before running `tsc` in an app.
- `npm run gate` runs only the checks the changed paths need (use this, not `check:all`, before a PR). `npm run check:all` = typecheck + lint + test + script tests + ninja-proxy tests (every CI suite except build, e2e and Lighthouse).
- `npm run test:coverage -w @poe2/core` enforces 90% statements / 75% branches. `npm run e2e -w @poe2/web` runs against `apps/web/out` (build first); `E2E_BASE_URL=<preview>` runs it against a deployed site.
- PoB2 headless (CI guard only): `npm run pob2:oracle` regenerates `oracle.json` and `groups.oracle.json` next to each `packages/core/test/reference/<name>/code.txt` (`-- --check` fails on a diff, CI job `pob2-oracle`); the oracle must reproduce every PlayerStat the code carries; `npm run pob2:spec` runs the busted specs; `npm run pob2:run -- <code-file>` prints one snapshot; `node scripts/pob2/run.mjs --groups <code-file|->` prints every skill group's PoB output (CI-only ground truth, never shown on the site). Needs `scripts/pob2/install-luajit.sh` (session-only) or Docker, plus a built core. See `docs/POB2-SYNC.md`.
- Core goldens (`packages/core/test/golden/`): review the diff, then `npx vitest run -u` in `packages/core` and commit the changed `*.expected.json` with the cause. This is the "golden diff" HG1-1 asks for.
- Screenshot check (390 px + 1440 px, real character): `node scripts/screenshot.mjs [baseUrl] [outDir]`; write to the scratchpad, never git. Import path without network: `node scripts/mock-proxy.mjs [port]` serves the committed fixture.
- Commit and push with the `commit-commands` plugin (enabled in `.claude/settings.json`): `/commit-commands:commit`, `/commit-commands:commit-push-pr`.

## Architecture

- **Single analysis implementation.** `apps/web` imports `@poe2/core`.
- **The code is the source of truth.** Every number decoded from a pasted PoB2 code is correct and shown as read (provenance `pob-export`). Where the code carries a figure, that figure is shown; anything computed for it is used only to measure error and calibrate. Numbers the code does not carry are either computed by the text mini-calc and labelled "≈ est." (provenance `estimate`), or shown as missing with a reason. Never call a code "stale" because another number differs.
- **The oracle is a CI guard.** Headless PoB2 (`vendor/pob2`, pinned to the release the codes were written by, `docs/POB2-SYNC.md`) must reproduce the reference code (`packages/core/test/reference/`). It never feeds the site. There is no PoB in the browser or on a server, and no `pob-sim` provenance.
- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`) and `ROOT_BASE_PATH` is not `1`; empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.
- **PoB is the import.** Two boxes: a poe.ninja code (poe.ninja's config baseline, `docs/POB-NINJA-CONFIG.md`) and a PoB2 code (same baseline by default, toggle for own/no config). poe.ninja import stays dormant (`NINJA_IMPORT_BLOCKED`). `PobSnapshot` is the core model; `buildCharacterOutline` (`packages/core/src/outline/`) sorts it into poe.ninja's character-page sections. Intent: `docs/intent/simple-code-analysis.md`; plan: `docs/plans/simple-code-analysis.md`.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

## Reference build (read first)

`packages/core/test/reference/{ninja-default,pob2-own}/decoded.md` is the decoded reference build (items, mods, skills, tree, config, gear score, swaps, what the code lacks). Read it instead of decoding a code; skill `reference-build`. Regenerate with `npm run build -w @poe2/core && npm run decode:reference` only when `npm run decode:reference -- --check` fails; never edit by hand.

## Design and Cloudflare Pages

In `apps/web/CLAUDE.md` (design rules are decided; change only with the owner).

## Dependency bumps

See `docs/DEPENDENCY-BUMPS.md` (per-workspace checks; never split CI per workspace).

## Sessions
Sessions follow docs/SESSION-PROTOCOL.md (no required reading). Run the gate with `npm run gate`; it tests only the changed areas, once.

## Cloud sessions

The SessionStart hook runs `npm ci` when `package-lock.json` changed since the last install and rebuilds `@poe2/core` when its `src` is newer than `dist`; it never blocks the session (on failure it prints a FAILED line). `playwright install` isn't needed; `apps/web/playwright.config.ts` uses the preinstalled Chromium when `CLAUDE_CODE_REMOTE=true`.

PreToolUse hook: `block-generated-edits.mjs` denies Edit/Write on generated data, its `apps/web/public` copies, `vendor/pob2/` and `package-lock.json` (regenerate with the scripts or npm instead). `predev`/`prebuild` in `apps/web` already build core and run `sync-data`.

## Working style

- **Attribution.** Use the commit trailers and PR footer the tooling supplies, except never a Claude session URL (`claude.ai/code/session_…`): no `Claude-Session:` trailer, no session link in PR bodies, comments, code or docs.
- Answer open questions yourself with your best recommendation, act on it, and state each answer and its reason in
  your reply. The exceptions are the Needs-owner kinds in `docs/SESSION-PROTOCOL.md` (design rules, CI or branch
  protection, data/dependencies, `packages/*` policy, weaker tests, branch deletion; other core changes need only a
  red-then-green test and golden diff): put those in `REMAINING-WORK.md` § Owner
  queue with a recommended answer. If you are blocked on one 3 times, stop and ask.
- **Data shapes.** When a data shape changes, grep `apps/web/e2e` for the old path and update specs in the same commit.
- **Copy voice.** Follow `docs/COPY.md`: one or two sentences, action first, long text only behind Pro detail.
- **Perf bar.** Keep a performance change only if it saves at least 5 % brotli on its file or route (`node scripts/route-weight.mjs`, which also fails when a route exceeds its pinned budget), or removes real runtime work.
- **Route over budget.** Trace first, then fix: follow `grep -n "^import"` from the page's core imports down to see
  which new modules are static dependencies. Never lazy-load with `import('@poe2/core')` on a page that also imports
  core statically: it copies core into a lazy chunk (PB-3: +800 B on the route, lazy budget went over). A real split
  needs a core subpath export (`packages/*` policy, owner). If the growth is the feature itself, raise the budget in
  `scripts/route-weight.mjs` to the measured size rounded up to the next 2,000 B, cause in a comment and the PR.
- **Context.** Keep it for what matters: batch independent tool calls; grep before reading and read whole files only
  when editing them; query `packages/data/generated/**` and the large fixtures with `node -e` when you
  need only part of them; cap listings, never errors or failing tests. Hand off at a task boundary.
- Don't sit watching PRs or CI: use a scheduled check-in or PR Auto-fix and come back later, but every session ends with its PR ready and a scheduled check-in that confirms the required checks are green.
- Visual work: before opening the PR, ask whether to run a screenshot check; if yes, post the 390 px and 1440 px
  Playwright screenshots in chat (images stay out of git).
