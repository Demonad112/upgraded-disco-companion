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
npm run lint             # eslint (web)
npm test                 # core + web vitest
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
- **poe.ninja numbers are used as given.** Missing inputs produce an explicit "missing" result, not a guess. The build score can be a range (e.g. `D–B`) rather than a letter for this reason, and there are deliberately no DPS threshold constants.
- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`); empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.
- **PoB (Path of Building) probes** under `packages/core/src/pob/` are interfaces only; nothing implements them. Results must pass the baseline gate before use.
- Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.

## Design (decided; change only with the owner)

Dark palette; bold uppercase EB Garamond headings; square corners everywhere, no script fonts, no rounded shapes; gold constellation sky rotating slowly; clear-glass blocks; Threads-style tool cards; sky dimmed behind blocks with a footer toggle (`poe2-sky-dim`); lighter sky on phones (width-based); "Up next" block kept. Light theme and cursor effects are deferred.

- Never restyle the live site directly. Design variants go on `variant/<yyyymmdd>-<slug>` branches and are reviewed on their Cloudflare Pages preview URL (`docs/audit/06-VARIANT-STRATEGY.md`).
- Prefer the `:root` tokens in `apps/web/src/app/globals.css` over hex values in components.

## Cloudflare Pages

- Build `npm run build`, output `apps/web/out`, Node 22. No Functions or wrangler config; headers live in `apps/web/public/_headers`.
- Local parity check: `npx wrangler@4 pages dev apps/web/out`.
- Audit and fix tracker: `docs/audit/` (`08-PROGRESS.md`).

## Cloud sessions

Run `npm ci`, then `npm run build -w @poe2/core`, before `npm run typecheck` or anything that resolves `@poe2/core`. `playwright install` isn't needed; `apps/web/playwright.config.ts` uses the preinstalled Chromium when `CLAUDE_CODE_REMOTE=true`.
