# 08 — Fix progress

Update one row per task as it lands. Status: `todo` · `in progress` · `done` · `blocked (D#)` · `skipped (reason)`.
Tasks and acceptance criteria: `02-FIX-PLAN.md`. Decisions: `09-OWNER-DECISIONS.md` (all D1–D10 accepted 2026-10-22; fix branches per D10: `fix/audit-p0` … `fix/audit-p3` off `main`).

| ✓ | Task | Phase | Findings | Needs decision | Status | Commit SHA | Notes |
|---|---|---|---|---|---|---|---|
| [x] | T01 Bump Next/React to patched versions | P0 | DEP-01 | — | done | see commit | next 16.4.2, react 19.3.1; `npm audit fix` cleared 4 transitive (body-parser high, hono/fast-uri/qs moderate). Clean build passed first try, no SecurityFatalError. `--omit=dev` audit: next 2 crit + 1 high → 0; **1 high left: zod 3.25.76 (apps/mcp, GHSA-mrhx-c7xc-m3w5, needs zod 4 → owner)**. Follow-up: zod ^4.6.7 in apps/mcp, audit 0 vulnerabilities |
| [x] | T02 Chat origins in CSP + sync test | P0 | SEC-01 | D1 (A accepted) | done | see commit | connect-src + openai, anthropic, generativelanguage.googleapis. New test fails on old `_headers`, passes on new (web tests 98 → 99). Post-deploy `curl -sI` check pending |
| [x] | T03 Core `sideEffects: false` / subpath import | P1 | PERF-01 | — | done | see commit | Side-effect grep: 8 hits, all module-local constants (`Object.freeze`, `Object.keys`, `Object.fromEntries`), none mutate globals, so `"sideEffects": false` only; subpath fallback not needed. `/` JS+CSS br 223,219 → 178,921 (−44,298 B, 11 → 10 files); `/checklist/` 238,596 → 194,831; `/atlas/` 234,537 → 190,962; `/dashboard/` 231,590 → 187,292; `/character/` 262,898 → 259,620. The 131 KB core chunk is no longer referenced by `/`; the `baseline-gate` string chunk is off `/`. Measured with new `scripts/route-weight.mjs` on next 16.4.2 |
| [x] | T04 Build-keyed SW shell cache | P1 | SW-01 | — | done | see commit | `sw.js?v=<data>&b=<build>`; shell cache `poe2-shell-<build>`, data cache `poe2-data-<data>`; activate deletes other `poe2-*`. Added (browser test): install caches the open pages + their js/css/woff2 so an offline reload right after an update works, and a re-prune on first fetch drops the cache the old worker recreates. Web SW tests 2 → 8 (new ones fail on old `sw.js`). Browser check `scripts/sw-update-check.cjs`: first load → rebuild → reload → offline reload pass. e2e: 11 failed / 92 passed on the owner's Windows run only; Linux is clean (cloud 129 passed / 3 skipped, PR #25 CI e2e green), so not caused by T03/T04 (A3 carry A3-2). Cloud browser check re-run: all four steps pass |
| [ ] | T05 Sky dim via CSS | P1 | SKY-01 | ⛔ D2 | todo | | D2 accepted 2026-10-22 |
| [ ] | T06 No reseed on height-only shrink | P1 | SKY-02 | — | todo | | |
| [ ] | T07 Batch star draws | P1 | SKY-03 | ⛔ D3 | todo | | D3 accepted 2026-10-22 |
| [ ] | T08 Stop rAF while sky hidden | P1 | SKY-04 | — | todo | | |
| [ ] | T09 Bound decorative canvases | P1 | FX-01 | — | todo | | |
| [ ] | T10 Mechanic chip contrast | P1 | A11Y-01 | — | todo | | |
| [ ] | T11 Hit-area test + axe exclusion | P1 | A11Y-02 | — | todo | | |
| [ ] | T12 Audit CI step (+ Dependabot if D4) | P2 | DX-01 | ⛔ D4 (Dependabot part) | todo | | after T01; D4 accepted 2026-10-22 |
| [x] | T13 serve.mjs RSC path parity + README | P2 | DX-02 | — | done | see commit (code in merge of d75787c) | New "no 404s" e2e: 10/10 pass (5 routes × 2 projects), console 404s 0. Next 16.4.2 now exports `__next.<seg>.__PAGE__.txt` flat, so the rewrite is a fallback for the old nested layout; checked by hiding a segment file (test fails on all 5 routes) and by serving only the nested copy (passes) |
| [x] | T14 Cache headers for images/icons | P2 | CF-01 | — | done | see commit | `_headers` gains `/images/*`, `/icon-*`, `/icon.svg`, `/apple-touch-icon.png`, `/favicon.ico` → `max-age=86400, stale-while-revalidate=604800`. Web tests 99 → 105; new tests fail on old `_headers` (5 failed), pass on new. All five rules present in `out/_headers`. Post-deploy check done 2026-10-29 (A3): `curl -sI …/images/og-cover.jpg` → `cache-control: public, max-age=86400, stale-while-revalidate=604800` |
| [ ] | T15 Canonical, og:url, sitemap | P2 | SEO-01 | — | todo | | |
| [x] | T16 Unify theme colour | P2 | SEO-02 | — | done | see commit (code in merge of d75787c) | manifest background/theme `#0d0d10` → `#08080a`, matches `<meta name="theme-color">` in `out/index.html`. grep: `#0d0d10` only in `globals.css` `--surface`; manifest parses as JSON |
| [ ] | T17 Banner landmark, heading order | P2 | A11Y-03 | — | todo | | |
| [x] | T18 Delete dead webp and .nojekyll | P2 | ARCH-01, ARCH-02 | — | done | see commit | Deleted `atlas-constant.webp` (73,420 B) and `.nojekyll`; grep in apps/packages/scripts → 0 hits; neither in `out/`. Build + e2e pass |
| [ ] | T19 tokens.css + sky palette tokens | P2 | ARCH-03 | ⛔ D5 | todo | | D5 accepted 2026-10-22 |
| [ ] | T20 Restrict ninja-proxy CORS | P3 | SEC-02 | ⛔ D8 | todo | | D8 accepted 2026-10-22 |
| [x] | T21 Repo CLAUDE.md additions | P3 | — | ⛔ D7 | done | (this PR) | D7 accepted 2026-10-22; also notes `npm run build -w @poe2/mcp` before `tools`/`verify-mcp` |
