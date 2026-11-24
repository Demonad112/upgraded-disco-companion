# CLAUDE.md

## Layout

npm workspaces (`packages/*`, `apps/*`), Node >=22, TypeScript strict. `packages/core` is pure (no I/O; `fetch` is injected); `packages/data/generated/` is generated (rebuild with `npm run build:<name> -w @poe2/data`, see `packages/data/PROVENANCE.md`); `services/ninja-proxy` is **not a workspace** (own `package.json`, tested separately). `vendor/pob2/` is a byte-identical copy of the PoB2 fork's calc files (written only by `npm run pob2:sync`, verified by `npm run pob2:verify`; never edit it, never Read its `src/Data` or `src/TreeData`, use Grep; see `docs/POB2-SYNC.md`). `tools/pob2/` holds our own Lua (headless snapshot runner, busted specs, data exporters in `tools/pob2/export/`; `npm run build:pob -w @poe2/data` rebuilds the generated data from them, no `POB2_DIR`).

## Commands

- `npm run typecheck` builds `@poe2/core` first. The web app resolves core to its built `dist/`, so on a fresh checkout build core before running `tsc` in an app.
- `npm run gate` runs only the checks the changed paths need (use this, not `check:all`, before a PR). `npm run check:all` = typecheck + lint + test + script tests + ninja-proxy tests (every CI suite except build, e2e and Lighthouse).
- `npm run test:coverage -w @poe2/core` enforces 90% statements / 75% branches. `npm run e2e -w @poe2/web` runs against `apps/web/out` (build first); `E2E_BASE_URL=<preview>` runs it against a deployed site.
- PoB2 headless: `npm run pob2:oracle` regenerates `packages/core/test/pob2/<league>/*.oracle.json` and `*.groups.oracle.json`, plus `ninja-legacy/main-ninja.groups.oracle.json` (`-- --check` fails on a diff in any, CI job `pob2-oracle`); `npm run pob2:spec` runs the busted specs; `npm run pob2:run -- <code-file>` prints one snapshot; `node scripts/pob2/run.mjs --groups <code-file|->` prints every skill group's PoB output (CI-only ground truth, never shown on the site). Needs `scripts/pob2/install-luajit.sh` (session-only) or Docker, plus a built core. See `docs/POB2-SYNC.md`.
- Core goldens (`packages/core/test/golden/`): review the diff, then `npx vitest run -u` in `packages/core` and commit the changed `*.expected.json` with the cause. This is the "golden diff" HG1-1 asks for.
- Screenshot check (390 px + 1440 px, real character): `node scripts/screenshot.mjs [baseUrl] [outDir]`; write to the scratchpad, never git. Import path without network: `node scripts/mock-proxy.mjs [port]` serves the committed fixture.
- Commit and push with the `commit-commands` plugin (enabled in `.claude/settings.json`): `/commit-commands:commit`, `/commit-commands:commit-push-pr`.

## Architecture

- **Single analysis implementation.** `apps/web` imports `@poe2/core`.
- **poe.ninja numbers are used as given.** Missing inputs produce an explicit "missing" result, not a guess. The build score can be a range (e.g. `D–B`) rather than a letter for this reason, and there are deliberately no DPS threshold constants. A recommendation's ΔDPS (`measured.dps`) stays null unless poe.ninja supplies the figure; the site never simulates a swap.
- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`) and `ROOT_BASE_PATH` is not `1`; empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.
- **PoB is the import.** A pasted PoB2 code is the primary character source (poe.ninja import is dormant, `NINJA_IMPORT_BLOCKED`). `PobSnapshot` is the target core model (PoB's save schema 1:1; `CharModel` stays only as a temporary adapter). PoB2 output is ground truth, so any difference from the headless-PoB oracle is our bug. ΔDPS/ΔEHP is allowed only when PoB's engine computed it (provenance `pob-sim`, once a calc service exists; the site itself never simulates). Plan: `docs/plans/pob2-alignment.md`. Until B3, `packages/core/src/pob/` still only decodes exports and reads their config, main skill and skill groups.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

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
  when editing them; don't read `packages/data/generated/**` or the large fixtures (denied in settings; query them
  with `node -e` instead); cap listings, never errors or failing tests. Hand off at a task boundary.
- Don't sit watching PRs or CI: use a scheduled check-in or PR Auto-fix and come back later, but every session ends with its PR ready and a scheduled check-in that confirms the required checks are green.
- Visual work: before opening the PR, ask whether to run a screenshot check; if yes, post the 390 px and 1440 px
  Playwright screenshots in chat (images stay out of git).
