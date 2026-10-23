# 00 — Executive summary

**Conclusion.** The codebase is healthy. It has strict TypeScript, broad tests, CI with e2e, axe and
gitleaks, no third-party origins, no secrets in history, and a sound CSP and header set. Two things need fixing now:
**the /character chat is broken in production by the site's own CSP (SEC-01)**, and **Next 16.4.0 has
critical advisories and hard-stops its first build in a fresh environment (DEP-01)**, which may be blocking
Cloudflare deploys. Each fix is small. After those, the main gains are in the constellation sky (scroll lag in the dim
pass, mobile reshuffle, draw-call count) and in removing the analysis core from the home-page bundle.

Findings: **Critical 0 · High 2 · Medium 8 · Low 10 · Info 4** (full register: `01-FINDINGS.md`).

Scope: repo `Demonad112/upgraded-disco-companion`, branch `ui/glass-refresh` @ `0769d39` plus three uncommitted
files, and live `https://upgraded-disco-companion.pages.dev/`. The repo is an npm-workspaces monorepo (Next.js static export, MCP
server, shared core, Vercel ninja proxy), not a standalone landing page. All of it was audited, with the deployed web app as the focus.

## Health by area (1 = poor, 5 = excellent)

| Area | Score | Why |
|---|---|---|
| Architecture & structure | 4 | Clean core/app split, single analysis implementation. Tokens and component CSS share one file (ARCH-03). |
| Performance | 3 | Fonts and caching are good. Home ships 223 KB br JS including all of core (PERF-01). Oversized canvases (FX-01). |
| Constellation sky | 3 | DPR cap, reduced motion and cleanup are correct. Dim lag (SKY-01), mobile reseed (SKY-02), ~1,000 fills/frame (SKY-03). |
| Glass blocks | 4 | `backdrop-filter` already removed, so no blur cost. Text-over-sky contrast is unmeasured (GLASS-01). |
| Security | 4 | Strict headers, no sinks, no secrets. CSP breaks the chat (SEC-01). Next advisories not reachable in a static export. |
| Cloudflare Pages | 4 | Correct immutable caching, 404, trailing-slash redirects, preview `noindex`. First-build gate risk (DEP-01). |
| Accessibility | 4 | Skip link, focus ring, reduced motion, labelled toggle. Chip contrast (A11Y-01), landmarks (A11Y-03). |
| Mobile / responsive | 4 | `viewport-fit=cover`, safe-area gutters, width-based lighter sky. Toolbar reseed (SKY-02). |
| SEO & sharing | 3 | Full OG/Twitter and icons. No canonical, `og:url` or sitemap. Theme-colour mismatch. |
| Code quality | 5 | Strict TS, lint clean, 802 tests pass, core coverage floor in CI. |
| Maintainability & DX | 3 | Good README and CI. No dependency automation (DX-01). Local server differs from Pages (DX-02). |
| Privacy | 5 | No trackers, cookies or analytics. External calls only on user action. API key in `sessionStorage`. |

## Top 10 findings

| # | ID | Sev | Finding | Fix task |
|---|---|---|---|---|
| 1 | SEC-01 | High | CSP `connect-src` blocks all three chat providers on /character | T02 |
| 2 | DEP-01 | High | Next 16.4.0: 2 critical + 1 high advisory; first build stops with `SecurityFatalError` | T01 |
| 3 | PERF-01 | Med | All of `@poe2/core` (39 KB br) on every route via `lib/storage.ts:1` | T03 |
| 4 | SKY-01 | Med | Dim rectangles drawn at 30 fps lag scrolling blocks; layout read per block per frame | T05 ⛔ |
| 5 | SW-01 | Med | Shell cache never evicted on code-only deploys | T04 |
| 6 | SKY-02 | Med | Sky reshuffles when the mobile toolbar changes viewport height | T06 |
| 7 | FX-01 | Med | Full-height canvases (6.1 MP each on phone /checklist/) reallocated on every DOM change | T09 |
| 8 | SKY-03 | Med | ~1,000 individual fill calls per frame | T07 ⛔ |
| 9 | A11Y-01 | Med | Mechanic chips 3.87–4.47 contrast (13 nodes) | T10 |
| 10 | DX-01 | Med | No Dependabot/Renovate or audit gate | T12 |

## Quick wins (under 30 minutes each)

1. T01: bump `next`/`eslint-config-next` to 16.4.2 and run a clean build.
2. T02: add three origins to `connect-src`, plus a test that keeps it in sync with `provider.ts`.
3. T03: `"sideEffects": false` in `packages/core/package.json`, then measure.
4. T08: stop the sky's rAF loop in compact mode.
5. T10: lighten the mechanic-chip text.
6. T16 + T18: theme colour, delete the dead webp and `.nojekyll`.

## Already good

Self-hosted fonts with swap, preload and size-adjust; `immutable` on hashed assets; `no-cache` on `sw.js`; a real 404; preview
`noindex`; strict CSP otherwise (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`); HSTS; COOP; no third-party
origins; seeded deterministic sky with DPR cap and a still frame for reduced motion; native-checkbox sky toggle persisted in
`localStorage`; width-based (not UA) lighter sky on phones; `backdrop-filter` already removed from cards; a careful service worker
that never caches the proxy; strict TS + `noUncheckedIndexedAccess`; CI with gitleaks, coverage floor, e2e and axe; README
deployment table matches reality.

## Coverage and gaps

| Step | Status |
|---|---|
| Repo map, history, large blobs, secrets scan | Done |
| Build, lint, typecheck, tests | Done. All pass (build passes on the second try, see DEP-01) |
| `npm audit` / `npm outdated` | Done (root). ninja-proxy has no lockfile or dependencies, so audit isn't applicable |
| Live headers, caching, redirects, 404, preview `noindex` | Done (`curl -sI`) |
| Headless Chromium measurement (canvas sizes, idle/scroll CPU, axe, requests) | Done. Software GL inflates CPU figures |
| Lighthouse mobile/desktop | **Not run.** Not installed, and I didn't download it. Run `npx lighthouse@12 https://upgraded-disco-companion.pages.dev/ --preset=desktop` and the default mobile preset |
| Cloudflare dashboard build settings and logs | **Not verifiable** from the repo. Check the latest build log for `SecurityFatalError` |
| Real-device phone performance, Safari, Firefox | **Not run** |
| Text contrast over the animated sky | **Not machine-verifiable** with axe. Method in GLASS-01 |

Files: `01-FINDINGS.md` register · `02-FIX-PLAN.md` tasks · `03-CLOUDFLARE-PAGES.md` · `04-PERFORMANCE-BASELINE.md` ·
`05-DEPENDENCIES.md` · `06-VARIANT-STRATEGY.md` · `07-SONNET-HANDOFF.md` · `08-PROGRESS.md` · `09-OWNER-DECISIONS.md`.
