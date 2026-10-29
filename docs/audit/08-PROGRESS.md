# 08 — Fix progress

Update one row per task as it lands. Status: `todo` · `in progress` · `done` · `blocked (D#)` · `skipped (reason)`.
Tasks and acceptance criteria: `02-FIX-PLAN.md`. Decisions: `09-OWNER-DECISIONS.md` (all D1–D10 accepted 2026-10-22; fix branches per D10: `fix/audit-p0` … `fix/audit-p3` off `main`).

| ✓ | Task | Phase | Findings | Needs decision | Status | Commit SHA | Notes |
|---|---|---|---|---|---|---|---|
| [x] | T01 Bump Next/React to patched versions | P0 | DEP-01 | — | done | see commit | next 16.4.2, react 19.3.1; `npm audit fix` cleared 4 transitive (body-parser high, hono/fast-uri/qs moderate). Clean build passed first try, no SecurityFatalError. `--omit=dev` audit: next 2 crit + 1 high → 0; **1 high left: zod 3.25.76 (apps/mcp, GHSA-mrhx-c7xc-m3w5, needs zod 4 → owner)**, so `--audit-level=high` still exits 1 |
| [x] | T02 Chat origins in CSP + sync test | P0 | SEC-01 | D1 (A accepted) | done | see commit | connect-src + openai, anthropic, generativelanguage.googleapis. New test fails on old `_headers`, passes on new (web tests 98 → 99). Post-deploy `curl -sI` check pending |
| [ ] | T03 Core `sideEffects: false` / subpath import | P1 | PERF-01 | — | todo | | |
| [ ] | T04 Build-keyed SW shell cache | P1 | SW-01 | — | todo | | |
| [ ] | T05 Sky dim via CSS | P1 | SKY-01 | ⛔ D2 | todo | | D2 accepted 2026-10-22 |
| [ ] | T06 No reseed on height-only shrink | P1 | SKY-02 | — | todo | | |
| [ ] | T07 Batch star draws | P1 | SKY-03 | ⛔ D3 | todo | | D3 accepted 2026-10-22 |
| [ ] | T08 Stop rAF while sky hidden | P1 | SKY-04 | — | todo | | |
| [ ] | T09 Bound decorative canvases | P1 | FX-01 | — | todo | | |
| [ ] | T10 Mechanic chip contrast | P1 | A11Y-01 | — | todo | | |
| [ ] | T11 Hit-area test + axe exclusion | P1 | A11Y-02 | — | todo | | |
| [ ] | T12 Audit CI step (+ Dependabot if D4) | P2 | DX-01 | ⛔ D4 (Dependabot part) | todo | | after T01; D4 accepted 2026-10-22 |
| [ ] | T13 serve.mjs RSC path parity + README | P2 | DX-02 | — | todo | | |
| [ ] | T14 Cache headers for images/icons | P2 | CF-01 | — | todo | | |
| [ ] | T15 Canonical, og:url, sitemap | P2 | SEO-01 | — | todo | | |
| [ ] | T16 Unify theme colour | P2 | SEO-02 | — | todo | | |
| [ ] | T17 Banner landmark, heading order | P2 | A11Y-03 | — | todo | | |
| [ ] | T18 Delete dead webp and .nojekyll | P2 | ARCH-01, ARCH-02 | — | todo | | |
| [ ] | T19 tokens.css + sky palette tokens | P2 | ARCH-03 | ⛔ D5 | todo | | D5 accepted 2026-10-22 |
| [ ] | T20 Restrict ninja-proxy CORS | P3 | SEC-02 | ⛔ D8 | todo | | D8 accepted 2026-10-22 |
| [x] | T21 Repo CLAUDE.md additions | P3 | — | ⛔ D7 | done | (this PR) | D7 accepted 2026-10-22; also notes `npm run build -w @poe2/mcp` before `tools`/`verify-mcp` |
