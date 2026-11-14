# WQA1 carry-over · 2026-11-14
PR: #TBD · Branch: claude/web-quality-audit-s68j53 · Preview: Cloudflare branch alias (confirm on the PR)

Web quality audit (Lighthouse 13.6.0, local brotli static server, headless Chromium, mobile profile). Local server has no `_headers`, so the live CSP, HSTS and cache headers were **not** measured.

## Checked (previous wave)
- UXS2 (#171) and CMP1 (#172) are merged into `main`. Branch cut from `origin/main` at 23a285a.
- `npm run typecheck` and `npm test` pass on this branch.

## Evidence (lab, single session, not field data; CrUX is unavailable for localhost)
| Route | Perf | A11y | BP | SEO | Agentic | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | 99 | 100 | 100 | 100 | 100 | 0.97 s | 0.001 | 126 ms |
| `/character/` (no import) | 100 | 100 | 100 | 100 | 100 | 0.90 s | 0 | 87 ms |
| `/checklist/` | 97 | 100 | 100 | 100 | 100 | 0.90 s | 0 | 183 ms |
| `/atlas/` | 99 | 100 | 100 | 100 | 100 | 0.90 s | 0 | 125 ms |
| `/dashboard/` | 100 | 100 | 100 | 100 | 100 | 1.05 s | 0 | 85 ms |
| `/trade/` | 97 | 100 | 100 | 100 | 100 | 0.90 s | 0 | 183 ms |
| `/methodology/` | 98 | 100 | 100 | 100 | 100 | 0.90 s | 0.001 | 178 ms |
| `/whats-new/` | 99 | 100 | 100 | 100 | 100 | 0.90 s | 0 | 121 ms |

Single run per route for the table. After the fixes, 3 runs each: `/` perf 99–100, LCP 0.90–0.94 s, TBT 57–120 ms; `/atlas/` perf 97–99, LCP 0.90–0.91 s, TBT 96–185 ms. No regression (the changes are metadata and attributes, no runtime code).
Not measured: the imported-character view (the import needs the live poe.ninja proxy; axe covers it in e2e), real-device VoiceOver, field CrUX.

## Resolved
- **Measured, fixed:** `label-content-name-mismatch` on `/atlas/` (WCAG 2.5.3). The "Map" buttons had an accessible name that did not contain "Map". Now "Map, show X on the Atlas tree" (`AtlasMapContext.tsx`, `AtlasSequenceTracker.tsx`). Existing e2e name matchers still match (substring).
- **Source finding, fixed:** `NEXT_PUBLIC_DATA_VERSION` did not hash `packages/data/trade2-stats.json`, which feeds `trade2-stats.json` and `trade-map.json`. Both are served cache-first by `sw.js` and `immutable` by `_headers`, so a snapshot-only refresh left returning visitors on old data. It is now in the fingerprint (`next.config.ts`). The next deploy invalidates the data cache once.
- **SEO, fixed:** no `robots.txt` (Lighthouse passes a 404 there, so it was invisible). Added `app/robots.ts` (allow all, absolute sitemap URL) plus `test/robots.test.ts`.
- **SEO, fixed:** checklist, atlas, dashboard and character shared the root description, and every route's `og:title` was the site name. New `lib/pageMeta.ts` gives each route its title, description (reusing the `PageHeader` copy) and matching Open Graph / Twitter fields; `test/pageMeta.test.ts`. Titles are unchanged.
- **A11y, hardened (not browser-verified):** `<main id="main">` now has `tabIndex={-1}` (skip-link target focus in Safari/older browsers) with `focus:outline-none`.
- **Dismissed:** `/*.json` `immutable` for a year is fine, because `dataUrl()` appends `?v=<data hash>`. Font preloads are 3 (one per family), not duplicated. NavBar `aria-label` equals its visible text. Contrast: axe (Lighthouse and the e2e a11y spec) reports no failures on the audited states.
- **Not a site defect:** Lighthouse `bf-cache` fails with `Cache-Control: no-store`; that header comes from `scripts/perf-serve.cjs`, not from `_headers`.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | recommendation | owner | CSP `script-src 'unsafe-inline'` (3 inline bootstrap scripts in `layout.tsx`). Live headers not measured | Emit sha256 hashes for the three scripts at build and drop `'unsafe-inline'` from `script-src`. Needs a build step and a `headers.test.ts` change; do it as its own batch. |
| 2 | follow-up | next-A | Lighthouse CI uses the `perf` preset and asserts only LCP and CLS. Accessibility, SEO and best-practices are not gated in CI | After a few runs on `main`, add a second collect with the default preset and `categories:accessibility` / `seo` / `best-practices` `minScore` asserts. Don't set thresholds from one local run. Today all three score 100 on all 8 routes. |
| 3 | follow-up | next-A | Perf headroom, all lab: `unused-javascript` ~49 KiB on most routes (one chunk is 99.6 % unused on `/`), render-blocking CSS 20 KiB (120–300 ms est.), TBT 180 ms on `/checklist/` and `/trade/`, `legacy-javascript` 12 KiB (framework chunk) | Identify the 24 KB near-unused chunk on `/` (`39k23z46rmox0.js`; its first entry is a `functional-mapper` strategy list, so it looks like static content data) and check whether it can load on demand. Keep only if it saves ≥ 5 % br (`route-weight.mjs`). TBT and CSS inlining are PXA/PXC territory. |
| 4 | bug | next-A | `route-weight.mjs` BUDGET (154–209 KB br) is stricter than the standing rule in `REMAINING-WORK.md` (`/` ≤ 192 KB, others ≤ 250 KB); both are in use | Pick one source of truth. The script is the enforced one, so update the register text. |
| 5 | follow-up | owner | HSTS has no `preload`; no `Cross-Origin-Resource-Policy`; manifest has no `lang` or `screenshots` | Low value. Add `lang: "en"` to the manifest if touched; skip the rest. |
| 6 | follow-up | owner | No JSON-LD `WebApplication` | Optional; adds bytes to every page for no measured benefit on a tool site. Skip unless the owner wants rich results. |

## Needs owner
- WQA1-1: drop `'unsafe-inline'` from `script-src` by hashing the three bootstrap scripts. Recommended: yes, as a separate batch, because it is a security header change that can break the page if a hash goes stale and I could not test it against live Cloudflare headers.
