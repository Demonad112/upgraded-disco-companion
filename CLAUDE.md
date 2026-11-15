# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

npm workspaces (`packages/*`, `apps/*`), Node >=22 (`.nvmrc`), TypeScript strict.

- `packages/core` (`@poe2/core`) — all analysis logic. Pure: no I/O, no framework; `fetch` and the Path of Building transport are injected.
- `packages/data` (`@poe2/data`) — generated game-data JSON in `generated/` plus the scripts that rebuild it (`build:*`). See `packages/data/PROVENANCE.md`.
- `apps/web` (`@poe2/web`) — Next.js static export (`output: 'export'`). No API routes.
- `apps/mcp` (`@poe2/mcp`) — MCP server over stdio. `TOOLS.md` is generated from the tool registry.
- `services/ninja-proxy` — serverless poe.ninja proxy (CORS workaround). **Not a workspace**: own `package.json`, installed and tested separately.

## Commands

```bash
npm ci
npm run typecheck        # builds @poe2/core first, then typechecks every workspace
npm run lint             # eslint, every workspace with a lint script (web today)
npm run check            # typecheck + lint + test, no build
npm run check:all        # check + script tests + ninja-proxy tests (every CI suite except build/e2e/MCP/Lighthouse)
npm test                 # core + mcp + web vitest
npm run build            # core -> dist, then web static export to apps/web/out
npm run dev              # Next dev server (builds core and syncs data first)

npm test -w @poe2/core -- test/<file>.test.ts      # single file
npm test -w @poe2/core -- -t "<test name>"         # single test by name
npm run test:coverage -w @poe2/core                # enforces 90% statements / 75% branches
npm run e2e -w @poe2/web                           # Playwright smoke tests against apps/web/out (build first)

npm run build -w @poe2/mcp                         # needed before the next two lines
npm run tools -w @poe2/mcp                         # regenerate apps/mcp/TOOLS.md; CI fails if stale
node scripts/verify-mcp.mjs                        # drive the built MCP binary over stdio

cd services/ninja-proxy && npm test                # node:test, separate from the root run
```

## Architecture

- **Single analysis implementation.** `apps/web` and `apps/mcp` both import `@poe2/core`. Apps resolve `@poe2/core` to its built `dist/`, so core has to be built before typechecking or building them (the root scripts and `prebuild` hooks handle this; running `tsc` in an app on a fresh checkout does not).
- **poe.ninja numbers are used as given.** Missing inputs produce an explicit "missing" result, not a guess. The build score can be a range (e.g. `D–B`) rather than a letter for this reason, and there are deliberately no DPS threshold constants. A recommendation's ΔDPS (`measured.dps`) stays null unless poe.ninja supplies the figure; the site never simulates a swap.
- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`); empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.
- **PoB (Path of Building) probes** under `packages/core/src/pob/` are interfaces only; nothing implements them. Results must pass the baseline gate before use.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

## Design (decided; change only with the owner)

Dark palette; headings in uppercase EB Garamond, metric labels in uppercase Geist Mono (finding, step and strategy titles are sentence case); square corners everywhere, no script fonts, no rounded shapes; gold constellation sky rotating slowly; clear glass on home and hero, bars and data panels are solid (`--data-fill` is opaque; no text legible through them), the sky stays in the margins, hero and home; thread connectors only on `[data-links]` sequences; phones use a bottom tab bar ordered Character, Farm, Atlas, Checklist (the `/dashboard` route is labelled "Farm"); Threads-style tool cards; sky dimmed behind blocks with a footer toggle (`poe2-sky-dim`); lighter sky on phones (width-based); "Up next" block kept; the hooded wraith companion (original art, blue eyes, square speech bubble; `docs/design/WRAITH.md`) sits top-right under the nav and bottom-right above the tab bar on phones, with a footer toggle. Light theme is deferred; cursor effects deferred except the desktop lantern.

- Never restyle the live site directly. Design variants go on `variant/<yyyymmdd>-<slug>` branches and are reviewed on their Cloudflare Pages preview URL (`docs/VARIANT-STRATEGY.md`).
- Prefer the `:root` tokens in `apps/web/src/app/tokens.css` (imported by `globals.css`) over hex values in components.

## Dependency bumps

See `docs/DEPENDENCY-BUMPS.md` (per-workspace checks; never split CI per workspace).

## Cloudflare Pages

- Build `npm run build`, output `apps/web/out`, Node 22. No Functions or wrangler config; headers live in `apps/web/public/_headers`.
- `npm run build` ends with `apps/web/scripts/csp-hashes.mjs`, which writes the inline-script hashes into `out/_headers` (`script-src` has no `'unsafe-inline'`). A new inline `<script>` needs no edit, but a page served without that step has no scripts.
- Local parity check: `npm run preview -w @poe2/web` (`wrangler@4 pages dev out`). There is no `next start`: the app is a static export.
- Open work: `docs/remaining/REMAINING-WORK.md`.

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
- The owner is proficient in Python; skip the basics.
