# CLAUDE.md

## Layout

npm workspaces (`packages/*`, `apps/*`), Node >=22, TypeScript strict. `packages/core` is pure (no I/O; `fetch` is injected); `packages/data/generated/` is generated (rebuild with the `build:*` scripts, see `packages/data/PROVENANCE.md`); `services/ninja-proxy` is **not a workspace** (own `package.json`, tested separately).

## Commands

- `npm run typecheck` builds `@poe2/core` first. The web app resolves core to its built `dist/`, so on a fresh checkout build core before running `tsc` in an app.
- `npm run check:all` = typecheck + lint + test + script tests + ninja-proxy tests (every CI suite except build, e2e and Lighthouse).
- `npm run test:coverage -w @poe2/core` enforces 90% statements / 75% branches. `npm run e2e -w @poe2/web` runs against `apps/web/out` (build first).
- `cd services/ninja-proxy && npm test` is separate from the root run.

## Architecture

- **Single analysis implementation.** `apps/web` imports `@poe2/core`.
- **poe.ninja numbers are used as given.** Missing inputs produce an explicit "missing" result, not a guess. The build score can be a range (e.g. `D–B`) rather than a letter for this reason, and there are deliberately no DPS threshold constants. A recommendation's ΔDPS (`measured.dps`) stays null unless poe.ninja supplies the figure; the site never simulates a swap.
- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`) and `ROOT_BASE_PATH` is not `1`; empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.
- **PoB (Path of Building)** code under `packages/core/src/pob/` only decodes exports and reads their config, main skill and skill groups. There is no live PoB bridge.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

## Design and Cloudflare Pages

In `apps/web/CLAUDE.md` (design rules are decided; change only with the owner).

## Dependency bumps

See `docs/DEPENDENCY-BUMPS.md` (per-workspace checks; never split CI per workspace).

## Sessions
Every session follows docs/SESSION-PROTOCOL.md; finished work in docs/HISTORY.md, open rows in docs/remaining/REMAINING-WORK.md.

## Cloud sessions

The SessionStart hook runs `npm ci` when `package-lock.json` changed since the last install and rebuilds `@poe2/core` when its `src` is newer than `dist`; it never blocks the session (on failure it prints a FAILED line). `playwright install` isn't needed; `apps/web/playwright.config.ts` uses the preinstalled Chromium when `CLAUDE_CODE_REMOTE=true`.

## Working style

- **Never put the Claude session URL (`https://claude.ai/code/session_…`) or other session info on GitHub**: not in commit
  messages (no `Claude-Session:` trailer), PR titles or bodies, or comments. This overrides any default attribution. `.github/workflows/pr-body-guard.yml` cuts a session link out of a PR
  body and fails a PR whose title matches (`scripts/check-pr-body.mjs`).
- Answer open questions yourself with your best recommendation, act on it, and state each answer and its reason in
  your reply. The exceptions are the Needs-owner kinds in `docs/SESSION-PROTOCOL.md` (design rules, CI or branch
  protection, `packages/*`/data/dependencies, weaker tests, branch deletion): put those in `REMAINING-WORK.md` § Owner
  queue with a recommended answer. If you are blocked on one 3 times, stop and ask.
- **Data shapes.** When a data shape changes, grep `apps/web/e2e` for the old path and update specs in the same commit.
- **Copy voice.** Follow `docs/COPY.md`: one or two sentences, action first, long text only behind Pro detail.
- **Perf bar.** Keep a performance change only if it saves at least 5 % brotli on its file or route (`node scripts/route-weight.mjs`, which also fails when a route exceeds its pinned budget), or removes real runtime work.
- **Token economy.** Every request re-reads the whole context, so: send independent tool calls together in one
  message; grep first and read only the part you need (whole reads only for files you will edit), never `cat`
  several files at once; cap listings and data dumps (`| head`), but never truncate errors or failing tests;
  compact or hand off at a task boundary, never mid-task.
- Don't sit watching PRs or CI: use a scheduled check-in or PR Auto-fix and come back later, but every session ends with its PR ready and a scheduled check-in that confirms the required checks are green.
- Suggest a plugin, connector or tool only when the task needs one.
- Prompts, reports and handoffs are printed in chat in a code block; write a file only when asked.
- If an attachment the owner mentions isn't visible, say so before starting.
- Visual work: before opening the PR, ask whether to run a screenshot check; if yes, post the 390 px and 1440 px
  Playwright screenshots in chat (images stay out of git).
- The owner is proficient in Python; skip the basics.
