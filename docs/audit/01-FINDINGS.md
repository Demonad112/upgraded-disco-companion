# 01 — Findings register

Audit date: 2026-10-22. Branch `ui/glass-refresh` at `0769d39` plus three uncommitted files
(`apps/web/src/app/globals.css`, `apps/web/src/app/page.tsx`, `apps/web/src/components/DefensePanel.tsx`).
Live site: `https://upgraded-disco-companion.pages.dev/`, probed 2026-10-23 03:38 UTC.

Schema per finding: **Severity · Confidence · Effort · Regression risk**, then Facts (evidence),
Interpretation, Fix (one best, at most one alternative).

Counts: **Critical 0 · High 2 · Medium 8 · Low 10 · Info 4** (24 findings).

> **Correction made during the audit.** The plan I showed before writing counted 9 Medium and
> 8 Low. On review, A11Y-02 (checklist target size) is mostly an axe false positive: the toggles
> already carry the `hit-area` utility, which widens the tap area to 24 px through `::after`, and axe
> does not see it. It is now **Low**. I also split the variant-workflow friction into its own Low
> finding (ARCH-03). Final: 8 Medium, 10 Low.

## Contents

- [Security](#security): SEC-01 (High), SEC-02, SEC-03, SEC-04
- [Dependencies](#dependencies): DEP-01 (High)
- [Performance](#performance): PERF-01
- [Constellation sky and canvases](#constellation-sky-and-canvases): SKY-01, SKY-02, SKY-03, SKY-04, FX-01
- [Glass blocks](#glass-blocks): GLASS-01
- [Service worker](#service-worker): SW-01
- [Accessibility](#accessibility): A11Y-01, A11Y-02, A11Y-03
- [Cloudflare Pages](#cloudflare-pages): CF-01
- [SEO and sharing](#seo-and-sharing): SEO-01, SEO-02
- [Architecture, DX, maintainability](#architecture-dx-maintainability): DX-01, DX-02, ARCH-01, ARCH-02, ARCH-03
- [Checked and fine](#checked-and-fine)

---

## Security

### SEC-01 — Chat cannot reach any LLM provider in production (CSP blocks it)
**High · Confirmed · Effort S · Risk Low**

Facts
- `apps/web/src/components/Chat.tsx` is rendered on `/character/` (`apps/web/src/app/character/page.tsx:266`, `:399`).
- With no `NEXT_PUBLIC_CHAT_PROXY_BASE` (`Chat.tsx:44`), the browser calls providers directly:
  `packages/core/src/chat/provider.ts:172` (`https://generativelanguage.googleapis.com`),
  `:199` (`https://api.openai.com`), `:222` (`https://api.anthropic.com`).
- `apps/web/public/_headers:8` sets `connect-src 'self' https://poe2-v3-ninja-proxy.vercel.app`, and the live
  response for `/` and `/character/` carries exactly that header (`curl -sI`).
- `apps/web/test/headers.test.ts` asserts only the ninja-proxy origin.

Interpretation: every direct-mode chat request fails with a CSP violation, so users see an error. The
README and HANDOFF don't mention this. The API key is kept in `sessionStorage`
(`apps/web/src/lib/chatSettings.ts:30-41`), which is a reasonable BYOK choice.

Fix: add the three provider origins to `connect-src` in `_headers`, and extend `headers.test.ts` to assert each
origin that `provider.ts` uses (parse the `https://` literals from the source so the two can't drift).
Alternative: hide direct mode unless `NEXT_PUBLIC_CHAT_PROXY_BASE` is set. That keeps the CSP tight
but removes the feature for everyone. See `09-OWNER-DECISIONS.md` D1.

### SEC-02 — ninja-proxy is an open CORS relay with no rate limit
**Low · Confirmed · Effort M · Risk Low**

Facts: `services/ninja-proxy/api/character.js:31`, `api/ladder.js:252` send `Access-Control-Allow-Origin: *`.
Inputs are length-checked and `encodeURIComponent`-escaped (`character.js:87-96`, `ladder.js:262-267`).
There is no per-IP limit. `vercel.json` allows `maxDuration: 30`.

Interpretation: the data is public poe.ninja data, so the exposure is Vercel usage cost and poe.ninja
rate-limiting the shared User-Agent, not data leakage.

Fix: restrict `Access-Control-Allow-Origin` to the production origin plus `*.upgraded-disco-companion.pages.dev`
and `http://localhost:3000` (echo the origin if it matches). Alternative: Vercel Firewall rate-limit rule
(dashboard only, no code). D8.

### SEC-03 — CSP needs `'unsafe-inline'` for scripts
**Info · Confirmed · Effort — · Risk —**

Facts: `_headers:8` `script-src 'self' 'unsafe-inline'`. The static export emits inline `self.__next_f.push(...)`
RSC scripts on every page (seen in the live HTML), plus two bootstraps (`layout.tsx:65-66`).

Interpretation: a static export has no per-request nonce, and the RSC inline payloads change every build,
so hashes aren't practical. There are no user-controlled HTML sinks: the only
`dangerouslySetInnerHTML` calls are the two constant bootstraps, there's no `innerHTML`/`eval`, and both
`target="_blank"` links have `rel="noopener noreferrer"` (`Chat.tsx:175`, `SourceFlag.tsx:35`). The
residual risk is low. Accept it.

### SEC-04 — HSTS without `preload`; `includeSubDomains` matters once a custom domain exists
**Info · Confirmed · Effort S · Risk Medium (on custom domain)**

Facts: live header `Strict-Transport-Security: max-age=31536000; includeSubDomains` (from `_headers:7`).
Interpretation: harmless on `pages.dev`. On a custom apex domain, `includeSubDomains` forces HTTPS on
every subdomain. Decide that before attaching a domain (D9). No change now.

---

## Dependencies

### DEP-01 — Next 16.4.0 has 2 critical and 1 high advisory, and its build hard-stops on first run
**High · Confirmed locally / Likely on Cloudflare · Effort S · Risk Low**

Facts
- `npm audit`: `next` 16.4.0 is in range for GHSA-2464-fhr4-w9xw (critical, image optimizer + SVG),
  GHSA-673q-mjm6-r5xr (critical, `use cache` typed arrays) and GHSA-p3m5-59mp-jv5r (high, Server Actions DoS).
  The fix is `next@16.4.2` (not semver-major).
- The first `npm run build` (42 s) failed with `Error [SecurityFatalError]: Your version of Next.js is affected
  by a known security vulnerability ... Retry the same command to continue`. An immediate retry
  succeeded (18 s) with a warning. Log excerpt is in `04-PERFORMANCE-BASELINE.md`.
- `apps/web/package.json` pins `next` and `eslint-config-next` exactly to `16.4.0`.

Interpretation: none of the three vulnerable code paths exists in a static export (`output: 'export'`,
`images.unoptimized`, no Server Actions, no `use cache`), so the deployed site isn't exploitable.
The operational risk is real, though. Cloudflare Pages builds in a fresh container, so a first-run
hard stop would fail every deploy. That's unconfirmed because the Pages build log isn't visible from
the repo. To check: open the latest deployment in the Cloudflare dashboard → Build log, and look for
`SecurityFatalError`.

Fix: bump `next` and `eslint-config-next` to `16.4.2` (and `react`/`react-dom` to `19.3.1`), regenerate the
lockfile, then run the full gate including a clean build (`rm -rf apps/web/.next apps/web/out`).

Related transitive advisories (dev/tooling only, see `05-DEPENDENCIES.md`): `braces`/`micromatch`/`fast-glob`
under `eslint-config-next` (audit's "fix" is a downgrade to 14.x, so ignore it), and `ip-address` (moderate) under
`@modelcontextprotocol/sdk` → `express-rate-limit`, which `npm audit fix` resolves.

---

## Performance

### PERF-01 — The whole `@poe2/core` bundle ships on every route
**Medium · Likely (chunk contents confirmed, root cause inferred) · Effort S · Risk Low**

Facts
- `apps/web/src/lib/storage.ts:1` `import { migrateSnapshots } from "@poe2/core"`. `storage.ts` is used by
  `hooks/usePersistedState.tsx:16`, whose provider wraps every page (`app/layout.tsx:81`).
- `packages/core/package.json` has no `"sideEffects": false` and exports only the `.` barrel (`exports` at line 9).
- In the build, home `/` loads 11 chunks totalling 855 KB raw / 223 KB brotli. Chunk `2eeu_owv62ad5.js`
  (131.6 KB raw / 39.3 KB br) is on `/` and contains about 106 core-specific strings (PoB, baseline gate,
  keystone, Energy Shield and so on). The home page performs no analysis.

Interpretation: the bundler can't prove the barrel has no side effects, so it keeps all of core. That's
about 39 KB br of parse/compile on first load of every page, which matters most on phones.

Fix: add `"sideEffects": false` to `packages/core/package.json`. First check that no core module has
top-level side effects (`grep -n "^[a-z].*(" packages/core/src/**/*.ts` for top-level calls). Rebuild and
confirm the home route's JS drops by 25 KB br or more (measurement script in `04-PERFORMANCE-BASELINE.md`).
Alternative: add a subpath export `@poe2/core/progress` and import `migrateSnapshots` from it.

---

## Constellation sky and canvases

File: `apps/web/src/components/fx/ConstellationSky.tsx` unless noted.

### SKY-01 — The dim pass is drawn on the canvas, so the dim rectangles lag behind scrolling blocks
**Medium · Confirmed (mechanism) / Likely (visibility) · Effort M · Risk Medium (design look)**

Facts
- `:319-331` erases 65% of the sky behind each block with `destination-out`, using
  `getBoundingClientRect()` for every block, every frame.
- Frames are capped at about 30 fps (`:335-342`). Content scrolls on the compositor at the display rate
  (60–120 Hz). With reduced motion, the dim only repaints on the next rAF after a `scroll` event (`:377-379`).
- The block set comes from `DIM_SELECTOR` (`:19`) and is refreshed by a `MutationObserver` on the whole body
  subtree (`:381-385`).

Interpretation: while scrolling, each block's dim rectangle trails its block by up to
(scroll speed × 33 ms), which is tens of pixels on a fling. That shows as a bright sliver at a block's
leading edge and a dark sliver past its trailing edge. It also costs a layout read per block per frame.

Fix (keeps the look): drop the canvas pass and give the outermost blocks a CSS fill of `--page` at 65%.
The two give the same pixels. With page colour P, sky-over-page K and scrim alpha s, the
canvas result is `s·P + (1−s)(0.35K + 0.65P)`, and the CSS result is `0.65P + 0.35(s·P + (1−s)K)`. Both
expand to `P(0.65 + 0.35s) + 0.35(1−s)K`. The toggle sets an attribute on `<html>`, applied before paint
by a bootstrap like `COMPACT_BOOTSTRAP`. Exact CSS and steps are in `02-FIX-PLAN.md` T05. **Needs owner
sign-off (D2)** because it touches the decided "dim behind blocks" implementation. The pixels should be
identical, so verify with screenshot comparison.
Alternative: keep the canvas pass but run it every display frame, and only while scrolling. That halves
the lag but doesn't remove it.

### SKY-02 — The star field reseeds whenever the viewport height changes (mobile toolbar)
**Medium · Likely · Effort S · Risk Low**

Facts: `onResize` (`:369-376`) calls `rebuild()` → `buildField(w, h)` (`:171-180`). `buildField` derives pivot
(`:72`), radius `rm` (`:73`), star count (`:84`) and constellation count (`:103`) from `h`. The seeded RNG is
consumed in a count-dependent order, so a different `h` produces a different sky. On iOS and Android,
`innerHeight` changes when the URL bar collapses or expands during scroll.

Interpretation: on phones the sky visibly re-lays out (stars jump) whenever the toolbar toggles. That's
120 ms after the resize settles, because of the debounce.

Fix: rebuild the field only when the width changes or the height grows beyond the built field. On a
height-only shrink, keep the field and the canvas. Size the canvas to the largest height seen, and set
CSS `height: 100lvh` (with `100vh` before it as fallback) in `globals.css:799-802`.

### SKY-03 — Per-frame draw issues about 1,000 separate fill calls
**Medium · Likely (cost) / Speculative (magnitude on real phones) · Effort M · Risk Medium (subtle look)**

Facts: the star count caps at `560 × 1.8 = 1008` (`:84`). Each field star is its own
`beginPath/arc/fill` with its own `globalAlpha` (`:290-301`). Constellation stars add a `drawImage` and an arc
each (`:273-287`). Three `Path2D` objects are allocated per frame (`:219-220`). Headless Chromium
(software GL) showed 18–34% main-thread task time while idle, but the script portion was only 0.8–2.2%,
so most of the cost is rasterisation, and software GL exaggerates that. Real-device numbers weren't measured.

Interpretation: the sky is the only continuous animation, and thermal/battery cost on phones scales with
fill calls and overdraw.

Fix: batch field stars into 8 alpha buckets per colour. Quantise each star's twinkled alpha to a bucket,
build one path per bucket, and issue one `fill()` per bucket (at most 24 fills instead of about 1,000). Use
`rect` instead of `arc` for stars with `size < 0.8`. Hoist the `Path2D` objects out of the frame. Twinkle
quantisation should be invisible at 8 levels, but it touches the look (D3).
Alternative: pre-render the static field once to an offscreen canvas and rotate it with one
`drawImage`. That's the fewest draw calls, but costs about 47 MB of memory at a 1440×900 DPR-2 viewport.

### SKY-04 — The rAF loop keeps running when the sky is hidden (compact mode, light theme)
**Low · Confirmed · Effort S · Risk Low**

Facts: `hidden()` (`:169`) makes `draw` return early (`:191`), but `frame` (`:335-336`) re-arms rAF regardless.
Compact mode is the "second monitor" mode, a window that stays visible for hours. CSS hides the canvas
there (`globals.css:678`).
Fix: in `frame`, if `hidden()`, stop the loop. Watch `data-compact`/`data-theme` on `<html>` with the
`MutationObserver` pattern from `useCanvas.ts:60-61` and call `run()` when they change.

### FX-01 — Decorative canvases are full-document height and reallocated on every DOM change
**Medium · Confirmed · Effort S · Risk Low**

Facts
- `useCanvas.ts:39-53` sets `canvas.width/height` on every paint, which reallocates the backing store
  even when the size is unchanged. Size = `#fx-root` height × DPR (capped at 2).
- Measured on phone 390×844 DPR 3 (capped to 2): `/checklist/` atlas-web and card-links are each
  780×7884 = 6.1 MP (about 24 MB each); `/atlas/` 5.7 MP each.
- `AtlasWebCanvas` only paints the top part: rings stop at `MAX_RING = 1500` (`AtlasWebCanvas.tsx:17`), and the
  CSS mask fades to transparent by 1400 px (`:146`).
- `CardLinksCanvas.tsx:90` repaints on any `class`/`style`/`hidden`/`open` change in `main`'s subtree.
  Each paint reads every card's rect, runs an O(n²) pair search, and reallocates the full-height canvas.

Interpretation: ticking a checklist step or opening a disclosure reallocates about 24 MB and forces layout.
On long pages, iOS Safari's canvas memory budget is the limit to watch.

Fix: (1) in `useCanvas`, only assign `width`/`height` when they differ, and otherwise `clearRect`;
(2) add an optional `maxHeight` to `useCanvas` and pass `1500` from `AtlasWebCanvas`;
(3) drop `'class'` and `'style'` from `CardLinksCanvas`'s `attributeFilter` only if e2e still passes (tabs may
toggle by class). Otherwise keep it, because (1) removes most of the cost.

---

## Glass blocks

### GLASS-01 — Text sits directly on the moving sky; contrast can't be machine-verified
**Info · Speculative · Effort S (to measure) · Risk —**

Facts: `--glass-fill: 0%`, `--glass-blur: 0px` (`globals.css:105-106`). Cards have no fill
(`globals.css:318`) and rely on `--halo` text-shadow (`:107`) plus the 35% dim. `backdrop-filter` has been
removed from cards (`:319` comment), and the only remaining blur is `dialog.confirm::backdrop` (`:627`), which is fine.
axe reports no contrast failures on the glass text, but axe ignores canvas pixels.

Interpretation: the worst case is the brightest sky pixel (`#fff3cf` star core at 0.95 alpha × 0.35 dim)
under `--ink-dim` text. A single star under a glyph is brief and the halo darkens it, so the real risk is
low. Not verified.

Measure: screenshot a page at 1366 and 390 with the sky frozen (reduced motion), then again with text
hidden (`* { color: transparent !important; text-shadow: none !important }`). Sample the background
behind each text box and compute WCAG contrast. Record the result in `04-PERFORMANCE-BASELINE.md`.

---

## Service worker

### SW-01 — The shell cache is never evicted across deploys when the data files don't change
**Medium · Confirmed · Effort S · Risk Low**

Facts: `apps/web/public/sw.js:30-32` names both caches after `?v=` = `NEXT_PUBLIC_DATA_VERSION`, a hash of the
six data JSONs only (`next.config.ts:42-48`, `:56`). `networkFirst` (`sw.js:92-96`) `cache.put`s every
same-origin GET, including every hashed `/_next/static/*` chunk and RSC `.txt` payload. `activate` (`:51-60`)
deletes only caches whose name doesn't end in the current version.

Interpretation: code-only deploys keep the cache name, so old chunk files pile up indefinitely in
`poe2-shell-<v>` on returning visitors' devices. Each deploy adds about 1.5 MB of JS plus HTML. Browser quota
eviction is the only cleanup.

Fix: add a build id. In `next.config.ts`, set `NEXT_PUBLIC_BUILD_ID` =
`process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())` (sliced to 12). Register with
`sw.js?v=<data>&b=<build>`. In `sw.js`, name the shell cache `poe2-shell-<b>` and keep the data cache as
`poe2-data-<v>`. In `activate`, delete any `poe2-` cache that isn't one of the two current names. Update
`apps/web/test/serviceWorker.test.ts`.

---

## Accessibility

### A11Y-01 — Mechanic chips fail AA contrast on the dashboard
**Medium · Confirmed (axe) · Effort S · Risk Low**

Facts: axe `color-contrast` (serious) on `/dashboard/`, 13 nodes. Ratios: cold 3.87 (`#3987e5` on `#1c2c42`),
physical 4.13, chaos 4.35, lightning 4.47, all 12 px text. Source: `apps/web/src/lib/constants.ts:30-36`
(`MECHANIC_COLORS`), rendered by `components/shared/Tag.tsx:12`.

Fix: keep the hue but lighten the text, for example `text-[color-mix(in_srgb,var(--dmg-cold)_70%,white)]`
per entry, or lower the chip fill from `/20` to `/10`. Re-run axe until it reports 0 `color-contrast` nodes.
Note that `--dmg-*` are "validated dark steps" (`globals.css:89`) for charts; don't change the tokens, only the chip text.

### A11Y-02 — Checklist step toggles are 17.6 px (axe `target-size`)
**Low · Confirmed (size) / mostly false positive · Effort S · Risk Low**

Facts: axe `target-size` (serious) on `/checklist/`, 4 nodes at 17.6×17.6. The element is `CircleToggle`, which
already has `hit-area` (`components/shared/CircleToggle.tsx:30`), and that utility enlarges the tap area to at
least 24×24 through `::after` (`globals.css:635-646`). axe measures the element box, not the pseudo-element.
Fix: add an e2e that clicks a toggle 3 px outside its visible box and expects the state to flip. Then
exclude this selector from the axe `target-size` rule in `e2e/a11y.spec.ts`, with a comment explaining why.

### A11Y-03 — No banner landmark on most routes; heading levels skip
**Low · Confirmed · Effort S · Risk Low**

Facts (rendered DOM): `header` count is 0 on `/`, `/checklist/`, `/atlas/`, `/dashboard/`. The site nav is a
bare `<nav className="site-nav">` (`components/layout/NavBar.tsx:88`). Heading sequences: `/atlas/` H1→H4→H2,
`/checklist/` H2→H4.
Fix: wrap the nav in `<header>` (check that no bare `header {}` rule in `globals.css` changes its look:
`.card header` at `:781` is scoped, but `DIM_SELECTOR` includes `header`). Find the out-of-order headings
with axe rule `heading-order` and fix their levels without changing their visual classes.

---

## Cloudflare Pages

### CF-01 — Unhashed static assets get `max-age=0`
**Low · Confirmed · Effort S · Risk Low**

Facts (live): `/images/atlas-constant.webp`, `/manifest.webmanifest`, `/passive-tree.json` →
`Cache-Control: public, max-age=0, must-revalidate`. `/_next/static/*` → `max-age=31536000, immutable` (correct).
Interpretation: every visit revalidates icons and images (a cheap 304 each). Data JSON is covered by the SW.
Fix: add `/images/*`, `/icon*`, `/apple-touch-icon.png`, `/favicon.ico` → `max-age=86400`. Leave data JSON and
the manifest at revalidate. The full file is in `03-CLOUDFLARE-PAGES.md`.

---

## SEO and sharing

### SEO-01 — No canonical URL, no `og:url`, no sitemap; robots.txt comes from Cloudflare
**Low · Confirmed · Effort S · Risk Low**

Facts: the live `/` head has title, description, OG/Twitter with absolute image, manifest and icons, but no
`<link rel="canonical">` and no `og:url`. `/sitemap.xml` → 404. `/robots.txt` → 200 with Cloudflare's managed
"content signals" text. No `robots` file exists in the repo, so this comes from the Cloudflare zone/project setting.
Fix: in `layout.tsx` metadata add `alternates: { canonical: './' }` and `openGraph.url`. Add `app/sitemap.ts`
listing the five routes (static export emits `sitemap.xml`). Leave robots to the owner (D6).

### SEO-02 — `theme-color` disagrees between meta and manifest
**Low · Confirmed · Effort S · Risk Low**
Facts: `layout.tsx:54` `#08080a` (= `--page`). `manifest.webmanifest:8-9` `background_color`/`theme_color` `#0d0d10`.
Fix: set both manifest values to `#08080a`.

---

## Architecture, DX, maintainability

### DX-01 — No automated dependency updates or audit gate
**Medium · Confirmed · Effort S · Risk Low**
Facts: no `.github/dependabot.yml` or Renovate config. `ci.yml` runs no `npm audit`. DEP-01 surfaced only
through Next's own build gate. `HANDOFF.md:19` already lists "npm audit advisories open".
Fix: add `.github/dependabot.yml` (npm weekly with groups for `next`+`eslint-config-next`, `react`+`react-dom`,
and dev tooling; github-actions monthly), plus a CI step `npm audit --omit=dev --audit-level=high`. Do this only
after T01, or CI goes red immediately. The owner's rule applies: no merging bump PRs without a full local build
and type-check (D4).

### DX-02 — The local e2e server doesn't resolve paths the way Cloudflare Pages does
**Low · Confirmed · Effort S · Risk Low**
Facts: on every page, Next's client requests `/<route>/__next.<route>.__PAGE__.txt?_rsc=…`. The local server
`apps/web/e2e/serve.mjs` returns 404 for these (4 console errors per page), because the file is
`out/<route>/__next.<route>/__PAGE__.txt`. Live Cloudflare returns 200 (`/checklist/__next.checklist.__PAGE__.txt`,
137 KB). Local Node is v24.18.0, while `.nvmrc` and CI use 22.
Interpretation: local runs see console noise that production doesn't, and local prefetch differs from production.
Fix: map `__next.<seg>.__PAGE__.txt` → `__next.<seg>/__PAGE__.txt` in `serve.mjs`, and document
`npx wrangler@4 pages dev apps/web/out` for exact parity (no new dependency). There is no nvm on this machine (Node 24 locally): rely on CI for Node 22 behaviour. (Correction 2026-10-22: an earlier version said to run `nvm use`.)

### ARCH-01 — Dead asset and large screenshots in git
**Low · Confirmed · Effort S · Risk Low**
Facts: `apps/web/public/images/atlas-constant.webp` (73 KB) isn't referenced anywhere in the source (grep:
only `.git/index`), but it deploys. `docs/constellation-sky/*.png` and `docs/design/*.png` are 11 PNGs at about
600 KB each. The pack is 6.94 MiB.
Fix: delete the webp. Going forward, keep verification screenshots out of git (D5). Don't rewrite history.

### ARCH-02 — Leftovers from GitHub Pages hosting
**Info · Confirmed · Effort S · Risk Low**
Facts: `apps/web/public/.nojekyll` (GitHub Pages only). The `basePath` derivation in `next.config.ts:27-29`
only applies under GitHub Actions. No workflow deploys to GitHub Pages, but CI's e2e runs under that base
path, so it still tests base-path correctness.
Fix: delete `.nojekyll`. Keep the `basePath` logic, because it keeps client code base-path-safe for the variant
previews (`06-VARIANT-STRATEGY.md`).

### ARCH-03 — Design tokens and component CSS share one 926-line file; sky colours are hard-coded
**Low · Confirmed · Effort M · Risk Low**
Facts: tokens sit in `globals.css:61-160`, mixed with component rules up to line 926. `ConstellationSky.tsx:7-9`
hard-codes `GOLD`, `PALE_GOLD`, `CORE`, while `AtlasWebCanvas`/`CardLinksCanvas` read CSS variables through
`cssColor()` (`useCanvas.ts:13-15`). The two approaches are inconsistent.
Interpretation: a design variant has to fork `globals.css` and edit TS for the sky palette, which makes
variant copies diverge in places that aren't tokens.
Fix: move `:root` tokens into `src/app/tokens.css` (imported first by `globals.css`), add `--sky-gold`,
`--sky-pale`, `--sky-core`, and read them once at mount in `ConstellationSky`. See `06-VARIANT-STRATEGY.md`.

---

## Checked and fine

- **Fonts:** `next/font` self-hosts EB Garamond 500/600/700, Inter 400/500/600 and Geist Mono 400/500, Latin
  subset, `display: swap`, size-adjust fallback, three preloads (`layout.tsx:20-22`, live head). There are
  21 woff2 files (550 KB) in `out/`, but only the preloaded Latin files load. `font-src 'self'` holds.
- **Immutable caching** for `/_next/static/*` and fonts (live). `/sw.js` gets `no-cache`. HTTP→HTTPS returns 301,
  `/checklist` → `/checklist/` returns 308, unknown paths return a real 404 (`404.html`) with `no-store`.
- **Preview deploys** send `x-robots-tag: noindex` (checked `ui-glass-refresh.upgraded-disco-companion.pages.dev`).
- **No third-party origins** load on any route (Playwright request log). There's no analytics or beacon and no cookies.
  The proxy and LLM origins are contacted only on explicit user action.
- **Secrets:** `git log --all -p -S` for `sk-ant-`, `sk-proj-`, `AIza`, `ghp_`, `BEGIN PRIVATE`, `CF_API_TOKEN`,
  `CLOUDFLARE_API` all return 0 hits. CI runs gitleaks on the full history.
- **Reduced motion:** the sky paints one still frame (`:344-362`) and responds to `change`.
- **DPR is capped at 2** on all canvases. Resize is debounced (120 ms). Listeners and observers are cleaned up on unmount.
- **Sky toggle:** native labelled checkbox (`SkySettings.tsx:9-13`), persisted under `poe2-sky-dim`
  (`lib/skyDim.ts:6`). "Lighter sky on phones" is width-based (`w < 700`, `ConstellationSky.tsx:74`), not UA sniffing.
- **Viewport:** `viewport-fit=cover`, and `--gutter` uses `env(safe-area-inset-*)` (`globals.css:134`).
- **Quality gates:** `npm run lint`, `npm run typecheck`, `npm test` (core 704 passed / 7 skipped / 3 todo; web 98 passed)
  all exit 0. TS is `strict` + `noUncheckedIndexedAccess`. CI runs typecheck, lint, tests, a coverage floor, the
  proxy tests, the build, Playwright smoke + axe, an MCP stdio check, and gitleaks.
- **README** deployment table (`README.md:157-181`) matches the repo (build command, output dir, Node 22, proxy env).
