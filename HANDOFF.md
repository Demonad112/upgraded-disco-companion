# Handoff

Updated 2026-10-29. Production host: `upgraded-disco-companion.pages.dev`
(default `siteUrl` in `apps/web/src/app/layout.tsx`).

## State

- **Merged into main:** PR #13 (audit `docs/audit/` + quieter card frame / centred hero), PR #14 (CLAUDE.md design
  rules, T21 done), and this handoff PR once merged.
- **Audit:** `docs/audit/` holds the 2026-10-22 audit. All owner decisions D1–D10 are accepted. The fix work is
  scheduled one session per sitting in `docs/audit/10-SESSION-SCHEDULE.md`; `08-PROGRESS.md` tracks tasks.
- **CI:** main is green (secrets, test, Cloudflare Pages all passed on #13 and #14).

## A3 in progress (wave 3, paused 2026-10-29)

Branch `claude/a3-bundle-sw`, pushed as a checkpoint PR so a cloud session can continue from `main` once it's merged.
T03 and T04 are committed there. Parallel session U9 owns `app/methodology/*`,
`app/whats-new/*`, `lib/searchIndex.ts`, `components/layout/NavMenu.tsx` and its new e2e spec. Don't touch those.

- **Start check done.** Wave 2 (A2 #23, U1 #22) merged and ticked. No carry items are for A3/next-A. A2-1 (owner
  follow-up) was checked live: `og-cover.jpg` returns `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
  Baseline on main: typecheck ok, core 704 / web 105 tests pass. e2e was **not** run on main before the changes.
- Local `node_modules` had a stale `next@16.4.0` (lock says 16.4.2), so the first build stopped on Next's vulnerability
  reminder. `npm ci` fixed it, and a clean build passes first try. Not a repo problem.
- **T03 committed** (`1bca41d`, row ticked in `08-PROGRESS.md`). `"sideEffects": false` in `packages/core/package.json`,
  new `scripts/route-weight.mjs`. Home `/` JS+CSS br 223,219 → 178,921 B (−44,298). The 131 KB core chunk is off `/`.
- **T04 committed** (row ticked, e2e noted as open): `apps/web/next.config.ts`, `public/sw.js`, `components/ServiceWorker.tsx`,
  `test/serviceWorker.test.ts`. SW tests 8/8 pass, and the new ones fail on the old `sw.js`.
  - Done as specified: `NEXT_PUBLIC_BUILD_ID`, register `sw.js?v=<data>&b=<build>`, `SHELL_CACHE=poe2-shell-<build>`,
    `DATA_CACHE=poe2-data-<data>`, and activate deletes every other `poe2-*` cache.
  - **Added beyond the plan** (the browser test found it). After an update, the reload is served by the *old* worker, so
    the new shell cache stays empty and an offline reload failed (`ERR_FAILED`). The old worker's in-flight writes also
    recreated the deleted cache. Fix: on install, `cacheOpenPages()` fetches the open windows' HTML plus the root (`no-cache`)
    and the `_next/static` js/css/woff2 they reference, best-effort. `pruneOldCaches()` runs on activate and again on the
    first fetch each worker start handles.
  - Browser check (Playwright, `http://sw.localhost:4329`, because registration is skipped on localhost): first load → rebuild →
    reload → offline reload all pass. The data cache is kept, the old shell pruned, the page and fonts render offline, and an
    unvisited route falls back to the root shell. The only offline failures left are Next's RSC prefetches of other routes.
    Script: `scripts/sw-update-check.cjs` (run `node scripts/sw-update-check.cjs` after `npm run build`; it rebuilds
    once itself. Set `SW_CHROMIUM` to a Chromium binary in the cloud).
- **Gate:** typecheck 0, lint 0, test 0 (core 704, web 111), build 0. **e2e: 11 failed / 92 passed / 3 skipped.**
  Failures: a11y home/checklist/character (mobile), character import records for home (desktop+mobile), workbench
  restore after reload (mobile), what-if sliders (desktop+mobile), history Progress panel (mobile), sharing ×2 (mobile).
  Not diagnosed. First, run e2e on `main` (stash or worktree) to see whether they were already failing. If they're new,
  suspect T03 (`sideEffects: false` dropping a needed module side effect) before T04 (the SW doesn't register on localhost).

### A3 remaining
1. Diagnose the 11 e2e failures: check the checkpoint PR's CI e2e result, and run e2e at the commit before T03 if needed.
   Fix them on a new branch, or record them as blocked in `08-PROGRESS.md`.
2. Run `scripts/sw-update-check.cjs` again in the cloud if Chromium is available there; otherwise cite the local result above.
3. Write `docs/carry/A3.md` with an item **For: U12** giving the exact SW update/cache design above (query params, cache
   names, prune rules, install precache, never-cached live requests, the localhost skip and the `sw.localhost` test trick).
4. Gate again, push, open one PR (protocol sections, preview URL at the top). Stop; don't merge.

## Status 2026-10-29

- Wave 1 is done (PRs #16–#20). Origin has only `main`.
- Next is wave 2: A2 and U1, run in parallel.
- Progress is tracked in `docs/ui/UI-PROGRESS.md` and carry-over in `docs/carry/`.

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. `services/ninja-proxy/api/_upstream.js` and `scripts/` still carry the old repo URL in the User-Agent. Owned by A8.
2. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) and the cloud-setup hook are not restored.
3. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
4. Owner steps not yet done: Lighthouse run, Vercel proxy deploy after T20.
