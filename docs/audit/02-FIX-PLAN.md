# 02 — Fix plan (for the implementing session)

Each task can be committed on its own: one commit per task, on a branch off `main` (not the live
`ui/glass-refresh` design branch unless the owner says so). IDs refer to `01-FINDINGS.md`.
Tasks marked **⛔ owner decision** must stop and wait. See `09-OWNER-DECISIONS.md`.

## Standard gate (run after every task; Bash syntax; on PowerShell 5.1 run each line separately)

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e -w @poe2/web
```

`npm run build` may print Next's vulnerability reminder until T01 lands. If it stops with
`SecurityFatalError`, re-run it once (see DEP-01).

Route-size measurement used by several tasks: run `node scripts/route-weight.mjs` if T03 created it,
otherwise the snippet in `04-PERFORMANCE-BASELINE.md` §Measure.

## Dependency graph

```
T01 ──► T12 (audit gate needs a clean audit)
T02 (independent)
T03 ──► T19 (budget numbers)
T05 ⛔ ─┐
T06 ────┼─► all edit ConstellationSky.tsx: do them in order T06, T08, T07, T05 to keep diffs small
T07 ⛔ ─┤
T08 ────┘
T19 ⛔ ──► uses tokens; do after T05/T07 if those are approved
```

---

## P0 — security and correctness

### T01 — Bump Next and React to patched versions (DEP-01)
- Files: `apps/web/package.json`, `package-lock.json`.
- Change: `next` `16.4.0` → `16.4.2`, `eslint-config-next` `16.4.0` → `16.4.2`, `react` and `react-dom` → `19.3.1`,
  `@playwright/test` → `^1.64.1`. Run `npm install`, then `npm audit fix` (non-breaking only; never `--force`,
  because its "fix" downgrades eslint-config-next to 14).
- Acceptance: `npm audit --omit=dev` reports 0 critical and 0 high. A clean build passes on the first try:
  ```bash
  rm -rf apps/web/.next apps/web/out
  npm run build
  ```
  The log contains no `SecurityFatalError` and no "affected by a known security vulnerability" line.
- Verify: standard gate, plus `npm audit --omit=dev --audit-level=high` (exit 0).
- Owner rule: dependency bumps need the full build and type-check locally before merge. This task does both.

### T02 — Let the chat reach its providers through the CSP (SEC-01)
- Default is D1 option A. If the owner chose B, implement B instead.
- Files: `apps/web/public/_headers`, `apps/web/test/headers.test.ts`.
- Change: append `https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com` to
  `connect-src` on line 8. In `headers.test.ts`, add a test that reads `packages/core/src/chat/provider.ts`,
  extracts every `https://<host>` passed to `doFetch`/`url` (regex `/https:\/\/[a-z0-9.-]+(?=\/)/g`
  on the lines containing `doFetch(` or `const url =`), and expects each origin to be in `connect-src`.
  Exclude the `keyUrl` lines, which are links, not fetches.
- Acceptance: the test fails on the old `_headers` and passes on the new one. After deploy,
  `curl -sI https://upgraded-disco-companion.pages.dev/character/ | grep -i content-security` shows the three origins.
- Verify: `npm test -w @poe2/web -- test/headers.test.ts`, then the standard gate.

---

## P1 — performance, accessibility, robustness

### T03 — Stop shipping all of core on every route (PERF-01)
- Files: `packages/core/package.json`, possibly `scripts/route-weight.mjs` (new; the snippet from `04` §Measure).
- Change: first check for top-level side effects:
  `grep -nE "^(export )?(const|let) [A-Za-z_]+ = [a-zA-Z_.]+\(" -r packages/core/src` and review any hit that
  mutates globals (registrations, polyfills). If there are none, add `"sideEffects": false`.
- Acceptance: home `/` JS brotli total drops by **≥ 25 KB** from the 223,126 B baseline, and chunk `2eeu…`-equivalent
  core code no longer appears on `/` (grep the home chunks for `baseline gate`: 0 hits).
- Fallback, if the drop is under 25 KB: add an `exports` subpath `"./progress": { "types": "./dist/progress/index.d.ts", "default": "./dist/progress/index.js" }`
  and change `apps/web/src/lib/storage.ts:1` to `import { migrateSnapshots } from "@poe2/core/progress"`. Check that
  `migrateSnapshots` is exported from `packages/core/src/progress/migrate.ts` and re-exported by `progress/index.ts`.
- Verify: standard gate, then the measure script.

### T04 — Key the service-worker shell cache on the build, not only the data (SW-01)
- Files: `apps/web/next.config.ts`, `apps/web/src/components/ServiceWorker.tsx`, `apps/web/public/sw.js`,
  `apps/web/test/serviceWorker.test.ts`.
- Change:
  1. `next.config.ts`: `const buildId = (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())).slice(0, 12)`,
     and add `NEXT_PUBLIC_BUILD_ID: buildId` to `env` (line 56).
  2. `ServiceWorker.tsx`: register `` `${BASE}/sw.js?v=${DATA_VERSION}&b=${BUILD_ID}` ``.
  3. `sw.js`: `const BUILD = params.get('b') || 'b0'`; `SHELL_CACHE = poe2-shell-${BUILD}`; `DATA_CACHE` unchanged.
     In `activate`, delete every key that starts with `poe2-` and is neither `SHELL_CACHE` nor `DATA_CACHE`.
  4. Tests: a new build id must delete the old shell cache and keep the data cache; a new data version must
     delete the old data cache.
- Acceptance: the new tests pass. The existing SW tests are unchanged in intent.
- Verify: `npm test -w @poe2/web -- test/serviceWorker.test.ts`, then the standard gate.

### T05 — ⛔ Dim behind blocks with CSS instead of a canvas pass (SKY-01, D2)
- Files: `apps/web/src/components/fx/ConstellationSky.tsx`, `apps/web/src/app/globals.css`,
  `apps/web/src/lib/skyDim.ts`, `apps/web/src/app/layout.tsx`.
- Change:
  1. Pre-change baseline: write a temporary Playwright spec `e2e/tmp-dim.spec.ts` that uses
     `page.emulateMedia({ reducedMotion: 'reduce' })` and takes `toHaveScreenshot` of `/`, `/character/` and `/checklist/`
     at 1366×900 and 390×844, with dim on and with dim off (set `localStorage['poe2-sky-dim']` before load). Run
     `npx playwright test e2e/tmp-dim.spec.ts --update-snapshots` on the pre-change code.
  2. Find each DIM target's computed background: in the same spec, log
     `getComputedStyle(el).backgroundColor` for every outermost match of
     `[data-sky-dim], .card, header, footer, .site-nav`.
  3. CSS (add near `globals.css:790`):
     ```css
     :root { --sky-dim-fill: color-mix(in srgb, var(--page) 65%, transparent); }
     :root:not([data-sky-dim-off]) :is([data-sky-dim], .card, header, footer, .site-nav):not(:is([data-sky-dim], .card, header, footer, .site-nav) *) {
       background-color: var(--sky-dim-fill);
     }
     ```
     For targets whose own background (step 2) isn't transparent, keep their colour on top by moving it to an image
     layer in that rule, `background-image: linear-gradient(<their colour>, <their colour>)`, so the dim stays underneath.
  4. `skyDim.ts`: on change, toggle `data-sky-dim-off` on `<html>`. Add a bootstrap string (pattern:
     `lib/compactMode.ts` `COMPACT_BOOTSTRAP`) that reads `localStorage['poe2-sky-dim']` and sets the attribute before
     paint. Inject it in `layout.tsx` next to line 66.
  5. `ConstellationSky.tsx`: delete the dim pass (`:319-331`), `refreshBlocks`, `blocks`, `dirtyRef`, the body
     `MutationObserver`, the `skyDimStore` subscription and the `DIM_SELECTOR` constant. Keep `kickRef` and the reduced-motion
     repaint on route change.
- Acceptance: the temp screenshots match the baseline with `maxDiffPixelRatio: 0.002` (dim on and off). No
  `getBoundingClientRect` in `ConstellationSky.tsx`. Toggling the footer checkbox flips the look without reload,
  and a reload keeps the state without a flash.
- Verify: temp spec, then **delete `e2e/tmp-dim.spec.ts` and its snapshots before committing**, then the standard gate.

### T06 — Don't reseed the sky on height-only shrinks (SKY-02)
- Files: `ConstellationSky.tsx`, `globals.css:799-802`.
- Change: in `rebuild`, keep `builtW` and `builtH`. Rebuild the field only if `innerWidth !== builtW` or
  `innerHeight > builtH`. On other resizes, do nothing. Canvas pixel height = `builtH * dpr`. CSS: `.sky-canvas { height: 100vh; height: 100lvh; }`,
  and remove the inline `canvas.style.height` (keep the width).
- Acceptance: a Playwright test at 390×844 that captures canvas pixel data, resizes to 390×780, waits 300 ms and
  captures again, with reduced motion so the frame is deterministic, gets identical data. Resizing to 500×844 does
  rebuild.
- Verify: that test (keep it as `e2e/sky.spec.ts`), then the standard gate.

### T07 — ⛔ Batch star draws (SKY-03, D3)
- Files: `ConstellationSky.tsx`.
- Change: quantise each star's per-frame alpha to 8 buckets (`Math.round(a * 8) / 8`). Per colour list, build one
  `Path2D` per bucket (`rect` when `size < 0.8`, otherwise `arc` after `moveTo(x + size, y)`), then `fill` once per bucket.
  Do the same for sparkles (one `stroke` per bucket). Move the ring-tick `Path2D` construction out of the per-frame loop:
  ticks rotate, so rebuild them with the rotation applied via `ctx.rotate` around the pivot instead of
  recomputing the endpoints.
- Acceptance: `fill`+`stroke` calls per frame ≤ 60. Measure by wrapping `CanvasRenderingContext2D.prototype.fill/stroke`
  in a counter in a Playwright `addInitScript`. A screenshot at t=0 under reduced motion matches the pre-change one with
  `maxDiffPixelRatio: 0.01`. In CDP `Performance.getMetrics`, idle `TaskDuration` over 4 s on `/` at 1366 is ≤ the T06 value.
- Verify: those checks, then the standard gate.

### T08 — Stop the rAF loop while the sky is hidden (SKY-04)
- Files: `ConstellationSky.tsx`.
- Change: in `frame`, `if (hidden()) { raf = 0; return }` before re-arming. Add a `MutationObserver` on
  `document.documentElement` with `attributeFilter: ['data-compact', 'data-theme']` that calls `run()`. Disconnect it in cleanup.
- Acceptance: with `data-compact` set, a rAF counter (patched `requestAnimationFrame` in `addInitScript`) stays flat for
  2 s. Removing the attribute resumes drawing.
- Verify: the standard gate.

### T09 — Bound the decorative canvases (FX-01)
- Files: `apps/web/src/components/fx/useCanvas.ts`, `AtlasWebCanvas.tsx`.
- Change: `useCanvas(draw, extraEvent?, maxHeight?)`; `h = Math.min(root.clientHeight, maxHeight ?? Infinity)`. Assign
  `canvas.width/height/style.*` only when they differ from the current values. `AtlasWebCanvas` passes `1500`.
- Acceptance: on `/checklist/` at 390×844 DPR 3, the `atlas-web` canvas is ≤ 780×3000. Toggling a checklist step leaves
  `card-links` `canvas.width/height` unchanged (identity check that no realloc happened: same `width` value, and an
  `addInitScript` setter spy on `HTMLCanvasElement.prototype.width` records 0 sets after load).
- Verify: the standard gate (e2e `layout.spec.ts`/`polish.spec.ts` cover the canvases visually).

### T10 — Fix mechanic chip contrast (A11Y-01)
- Files: `apps/web/src/lib/constants.ts:30-36`.
- Change: per entry, keep `bg-<x>/20 border-<x>/40` and replace `text-<x>` with
  `text-[color-mix(in_srgb,var(--dmg-<x>)_72%,white)]`. Tune the percentage per hue until the contrast is ≥ 4.6.
  Use the existing `--dmg-*` variables, not new hex values.
- Acceptance: axe `color-contrast` on `/dashboard/` reports 0 nodes.
- Verify: add `/dashboard/` to the routes in `e2e/a11y.spec.ts` if it isn't there, then the standard gate.

### T11 — Prove the toggle hit area; quiet the axe false positive (A11Y-02)
- Files: `apps/web/e2e/a11y.spec.ts` (or `interactions.spec.ts`).
- Change: a test clicks `button[aria-label^="Done:"]` at `{ position: { x: -3, y: 8 } }` relative to the box (inside the
  `::after` area) and expects `aria-pressed`/checked to flip. Then exclude that selector from axe `target-size` with a comment
  pointing to `globals.css` `@utility hit-area`.
- Acceptance: the new test passes. axe on `/checklist/` reports 0 `target-size` nodes.
- Verify: `npm run e2e -w @poe2/web`.

---

## P2 — structure and DX

### T12 — Dependency automation and an audit gate (DX-01, after T01; ⛔ D4 for Dependabot)
- Files: `.github/dependabot.yml` (new), `.github/workflows/ci.yml`.
- Change: add the CI step `- name: Audit runtime deps` with `run: npm audit --omit=dev --audit-level=high`, after
  `npm ci`. If D4 is approved, add Dependabot: `npm` at `/` weekly with groups `next` (`next`, `eslint-config-next`,
  `@next/*`), `react` (`react`, `react-dom`, `@types/react*`) and `dev-tooling` (everything else, dev only), `open-pull-requests-limit: 5`;
  `github-actions` monthly.
- Acceptance: CI is green on the PR. `actionlint` (if available) is clean.

### T13 — Local static server matches Cloudflare for RSC segment files (DX-02)
- Files: `apps/web/e2e/serve.mjs`, `README.md` (Development section).
- Change: before `statSync`, rewrite `/(__next\.[^/]+?)\.(__PAGE__\.txt)$/` → `$1/$2` when the dotted file doesn't exist.
  README: add `npx wrangler@4 pages dev apps/web/out` as the parity check, and "use Node 22 (`nvm use`)".
- Acceptance: in the Playwright run, the console 404 count per page is 0 (an assertion in `polish.spec.ts` or a new test).

### T14 — Cache headers for unhashed static assets (CF-01)
- Files: `apps/web/public/_headers`.
- Change: append the blocks from `03-CLOUDFLARE-PAGES.md` §Recommended `_headers`.
- Acceptance: `apps/web/test/headers.test.ts` gains a test that the `/images/*` rule exists. After deploy,
  `curl -sI …/images/og-cover.jpg` shows `max-age=86400`.

### T15 — Canonical, `og:url`, sitemap (SEO-01)
- Files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/sitemap.ts` (new).
- Change: metadata `alternates: { canonical: './' }`, `openGraph.url: './'` (resolved against `metadataBase`).
  `sitemap.ts` with `export const dynamic = 'force-static'` returns the five routes with `${siteUrl}${basePath}/<route>/`.
- Acceptance: `out/sitemap.xml` exists with 5 URLs. `out/index.html` contains `rel="canonical"` with an absolute URL.

### T16 — Unify theme colour (SEO-02)
- Files: `apps/web/public/manifest.webmanifest:8-9` → `#08080a`.
- Acceptance: grep shows `#0d0d10` only in `globals.css` (`--surface`).

### T17 — Banner landmark and heading order (A11Y-03)
- Files: `apps/web/src/components/layout/NavBar.tsx:88`, plus whichever components axe `heading-order` names.
- Change: wrap `<nav className="site-nav">` in `<header>` (no classes). If a bare `header` selector in `globals.css` changes the
  layout, scope it. Fix heading levels (change the tag, keep the classes).
- Acceptance: axe with `heading-order` and `landmark-one-banner`/`region` best-practice rules enabled reports 0 on all five routes.
  `layout.spec.ts` passes unchanged.

### T18 — Remove dead files (ARCH-01, ARCH-02)
- Files: delete `apps/web/public/images/atlas-constant.webp` and `apps/web/public/.nojekyll`.
- Acceptance: `grep -rn "atlas-constant\|nojekyll" apps packages scripts` → no hits. The build and e2e pass.

### T19 — ⛔ Extract design tokens to their own file; sky palette from tokens (ARCH-03, D5)
- Files: `apps/web/src/app/globals.css`, `apps/web/src/app/tokens.css` (new), `ConstellationSky.tsx`.
- Change: move the `:root { ... }` token block (`globals.css:61-160` as of this audit, through the end of the
  `:root` rule) verbatim into `tokens.css`, and `@import "./tokens.css";` right after the Tailwind import. Add
  `--sky-gold: #e3b341; --sky-pale: #f6dc92; --sky-core: #fff3cf;`. In `ConstellationSky`, read them once at mount with `cssColor()`
  from `useCanvas.ts`, falling back to the current constants.
- Acceptance: the computed styles of `:root` are identical before and after (Playwright: dump
  `getComputedStyle(document.documentElement)` custom properties and diff). Screenshots are unchanged.

---

## P3 — nice to have

### T20 — ⛔ Restrict ninja-proxy CORS (SEC-02, D8)
- Files: `services/ninja-proxy/api/_upstream.js` (shared helper), `character.js`, `ladder.js`, `health.js`, tests.
- Change: an `allowOrigin(req)` helper that echoes `Origin` if it matches
  `^https://([a-z0-9-]+\.)?upgraded-disco-companion\.pages\.dev$` or `^http://localhost:\d+$`, otherwise omits the header.
  Add `Vary: Origin`.
- Acceptance: `cd services/ninja-proxy && npm test` passes with new cases. Deploy is the owner's step on Vercel.

### T21 — Update repo CLAUDE.md (D7)
- Files: `CLAUDE.md`. Apply the diff from `09-OWNER-DECISIONS.md` D7 only if approved.
