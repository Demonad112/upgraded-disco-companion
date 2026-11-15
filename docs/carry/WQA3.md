# WQA3 carry-over · 2026-11-14
PR: draft (docs only) · Branch: ccr-2f118c02-5s5q95 · Preview: n/a (no site change)

Web quality + scroll-smoothness audit. Report only; nothing in the site changed. Base: `main` 1b9a806 (#173).

## Checked (previous wave)
- `main` gate before this batch: `npm run typecheck` ok, `npm test` ok, `npm run build` ok.
- WQA1 (#173): merged. Spot-check on live: all routes 200, `/nope/` returns 404, CSP / COOP / HSTS / frame headers present, `/_next/static/*` immutable + br. Zero CSP violations and zero console errors in 108 scripted live/local runs (only warnings, see WQA3-12).
- WQA2 (2026-11-14, report not in repo): Lighthouse numbers not re-run (spot-check rule). Its open items are carried into the ranking below as WQA3-5 to WQA3-8, WQA3-17 to WQA3-20.

## 1. Verdict
- **Measured cause of the scroll lag: `ConstellationSky.tsx:162-163`.** The resize handler removes the sky's "pause while scrolling" listener and clears its timer, and never restores either. Phones fire `resize` constantly (URL bar, keyboard, rotation).
  - Resize while idle → the sky repaints *during* every later scroll: 34–188 sky paints per scroll pass instead of 0. Janky frames go from 0–1.2 % to **16.7–34.4 %** and p95 frame time from 16.8 to **33.4 ms**, on every route (phone, 4× CPU).
  - Resize mid-scroll → the sky freezes for the rest of the visit (40 paints/2 s before, 0 after).
- **Sky cost per frame.** On the throttled phone the visible sky costs ~13.5 ms of main thread per frame (about 11 ms canvas commit, 2.3 ms script). At idle that is 30 % of the main thread, against 3.4 % with reduced motion. The lab renders without a GPU, so these milliseconds are high; the ratios hold.
- **Second contributor: the Astrolabe.** Its scroll-linked rotation is set on an SVG `<g>`, so it can't run on the compositor. It accounts for 70–100 % of main-thread Paint during scroll (`/` 92 → 0 ms, `/atlas` 141 → 11 ms) but caused no measurable frame drops in the lab.
- **Ruled out:** glass blur (no `backdrop-filter` on any scrolling surface), film grain, shadows, sky dim, scroll handlers (no passive-listener or long-handler violations), script long frames (no LoAF > 50 ms with script attribution during scroll, except 2 local one-offs at 51–60 ms in React's scheduler).

## 2. Evidence table
Chromium 153 headless (software rendering), scripted scroll top → bottom → top. Phone = iPhone 13 emulation + 4× CPU, finger drags (CDP touch, 400 px per drag). Desktop = 1440×900, `mouse.wheel` 100 px steps. Cells: rAF frame **p50/p95 ms · % frames > 16.7 ms**. "After resize" = one viewport resize (as a URL bar does) before scrolling; the number in brackets is sky paints while scrolling. "Sky hidden" = sky canvas and scrim `display:none`. RM = `prefers-reduced-motion: reduce` (still sky, no CSS motion). Live site unless marked local. LoAF = worst Long Animation Frame across the row. br = KB brotli (`route-weight.mjs`).

| Route | Phone sky | Phone after resize | Phone sky hidden | Phone RM | Desktop sky | Desktop RM | Local phone sky | Worst LoAF | DOM | br |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 16.7/16.7 · 0.2% | 16.7/33.4 · 17.7% (50) | 16.7/16.7 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 0% | 16.7/16.8 · 0% | 16.7/16.8 · 1.3% | none | 416 | 157.8 |
| `/character` | 16.7/16.8 · 0.2% | 16.7/33.4 · 25.9% (34) | 16.7/16.7 · 0% | 16.7/16.8 · 0% | 16.7/16.7 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 1.3% | none | 286 | 208.1 |
| `/character` + import | 16.7/16.8 · 1.1% | 16.7/33.4 · 27.6% (60) | 16.7/16.7 · 0.2% | 16.7/16.8 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 0% | 16.7/16.8 · 1.4% | none | 487 | 208.1 |
| `/dashboard` | 16.7/16.7 · 0.3% | 16.7/33.4 · 25.2% (91) | 16.7/16.8 · 0.3% | 16.7/16.7 · 0% | 16.7/16.8 · 4.7% | 16.7/16.7 · 0% | 16.7/16.8 · 1.2% | 51 ms local, React scheduler | 1218 | 187.4 |
| `/atlas` | 16.7/16.8 · 1.2% | 16.7/33.4 · 33.5% (74) | 16.7/16.8 · 0.3% | 16.7/16.7 · 0% | 16.7/16.8 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 0.9% | none | 1046 | 176.5 |
| `/checklist` | 16.7/16.8 · 0.9% | 16.7/33.4 · 30.5% (86) | 16.7/16.8 · 0.7% | 16.7/16.8 · 0.3% | 16.7/16.8 · 3.9% | 16.7/16.8 · 0% | 16.7/16.8 · 0.9% | none | 2213 | 165.9 |
| `/trade` | 16.7/16.8 · 1.2% | 16.7/33.4 · 16.7% (39) | 16.7/16.8 · 0% | 16.7/16.8 · 0% | 16.7/16.7 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 1.9% | none | 296 | 160.8 |
| `/methodology` | 16.7/16.8 · 0.8% | 16.7/33.4 · 34.4% (188) | 16.7/16.8 · 0.1% | 16.7/16.7 · 0.2% | 16.7/16.8 · 0.6% | 16.7/16.7 · 0% | 16.7/16.7 · 0.5% | 59 ms render, no script | 443 | 154.8 |
| `/whats-new` | 16.7/16.7 · 0% | 16.7/33.4 · 24% (39) | 16.7/16.8 · 0% | 16.7/16.7 · 0% | 16.7/16.7 · 0% | 16.7/16.8 · 0% | 16.7/16.7 · 0.4% | 60 ms local, React scheduler | 307 | 153.3 |

Isolation (live, phone touch unless noted; main-thread ms over the whole scroll):

| Probe | Result |
|---|---|
| Idle 5 s on `/`, phone: sky / sky hidden / RM | main thread in canvas commit + rAF: 1626 / 490 / 183 ms → sky ≈ 13.5 ms per sky frame (107 frames) |
| Idle 5 s on `/`, desktop: sky / RM | 549 / 42 ms (10 % vs 0.8 % of main thread) |
| Astrolabe hidden, Paint during scroll | `/` 92 → 0 · `/checklist` 196 → 58 · `/atlas` 141 → 11 ms; frame % unchanged (0–1.9 %) |
| Sky dim off · grain off · shadows off (`/`, `/checklist`, `/character` + import) | frames unchanged (0–1.5 %); commit within run noise |
| Sky + scrim + grain + shadows + masks off ("bare") | commit `/character` + import 1450 → 290 ms; drawing layer area 3.38 → 2.62 Mpx |
| Sky rebuild on a viewport grow (3 grows, phone 4×) | no long animation frame ≥ 50 ms: the rebuild is cheap; the lost scroll pause is the cost |
| Resize during a finger drag, then idle | sky paints 40 per 2 s before, 0 after: frozen |
| Layer tree | phone 13–38 layers, 2.3–7.2 Mpx painted; desktop 11–20 layers, 4.5–14 Mpx. Largest: two document-height layers + 3 full-viewport fixed layers (sky, scrim, grain) |
| Scroll / passive-listener violations | none in 108 runs; one `requestAnimationFrame handler took 17ms` on `/trade` after resize (the sky) |
| bfcache | Playwright's command line disables it; no page-attributable blocker reported (no `unload`, no `no-store`) |

## 3. Ranked findings
Sorted by (impact × confidence) ÷ effort. Evidence: **Measured** (numbers above) · **Observed** (seen in config/output, not timed) · **Hypothesis** (code reading only).

| Rank | ID | Sev | Cat | Finding · where · evidence | Fix · gain · risk · effort | Owner? |
|---|---|---|---|---|---|---|
| 1 | WQA3-1 | Critical | Scroll | **Measured.** `apps/web/src/components/fx/ConstellationSky.tsx:162-163`: `onResize` clears `scrollTimer` and removes the scroll listener for good. Resize while idle → sky paints mid-scroll, 16.7–34.4 % janky frames, p95 33.4 ms on all 9 cases. Resize mid-scroll → `scrolling` stuck `true`, sky frozen. Cleanup (`:197-211`) also never removes the scroll listener or clears `scrollTimer`. | Delete both lines from `onResize`; add `removeEventListener('scroll', onScroll, { capture: true })` and `clearTimeout(scrollTimer)` to cleanup. Add an e2e test: resize, then scroll, then assert 0 sky paints while scrolling and > 0 after. Gain: back to the 0–1.2 % baseline (~13 ms per frame on throttled phone). Risk: low. **S** | no |
| 2 | WQA3-4 | High | Load (CLS) | **Measured.** `/checklist` CLS **0.251** at desktop with reduced motion (0.558 on phone, there flagged as after-input). Source: the `[data-links]` canvas (`CardLinksCanvas` via `useCanvas.ts:60-61`), whose `style.left/top` move after first paint. Not seen with motion on. Lighthouse doesn't emulate reduced motion, so CI can't see it. | Place the canvas with `transform: translate(x, y)` instead of `left/top` (transforms are not layout shifts). Add a Playwright CLS check under `reducedMotion: 'reduce'` on `/checklist`. Gain: CLS 0.25 → ~0. Risk: low. **S** | no |
| 3 | WQA3-5 | High | CI | **Observed.** Ruleset "main: required checks" (`guard`, `test`, `secrets`) has bypass actor RepositoryRole 5 (Admin) in `pull_request` mode, so an admin can merge red. That is how #173 merged with a red `test`. `lighthouse` is not a required check. | Repo settings: remove the bypass, or set it to "Never"; add `lighthouse` to required checks. Makes the gate real. Risk: none. **S** | declined by owner (WQA4) |
| 4 | WQA3-6 | High | CI | **Observed.** Visual tests check nothing: 0 committed baselines, `playwright.config.ts:52` `updateSnapshots: 'missing'` writes new ones and passes. | In CI: `updateSnapshots: process.env.CI ? 'none' : 'missing'`. Commit the Linux baselines from the `visual-baselines` artifact of a green `main` run. Makes the check real. Risk: first run fails until baselines land. **S** | declined by owner (WQA4) |
| 5 | WQA3-2 | High | Scroll | **Measured.** Sky is ~13.5 ms main thread per frame on throttled phone at 24 fps: 30 % of idle main thread, and it shares the 150 ms after every flick with scroll. `ConstellationSky.tsx:51` (`interval`). Rotation is 1°/s, ≈ 0.2 px per frame at r = 300 px. | (a) Coarse-pointer cadence 24 → 15 fps (the existing `lite` cadence): −37 % sky cost, motion visually the same. **S.** (b) Later: move drawing to `OffscreenCanvas` in a worker (`transferControlToOffscreen`, Safari 16.4+): sky script leaves the main thread. **L.** Risk: (a) low; (b) medium (sprites, lantern, living layer). | (a) no: same look, check on preview; (b) no |
| 6 | WQA3-3 | Medium | Scroll | **Measured.** Astrolabe `.astro-dial` (`styles/motion.css:142-160`) runs `rotate` on an SVG `<g>` with `animation-timeline: scroll(root)`. SVG transforms aren't composited, so every scroll frame repaints it on the main thread: 70–100 % of scroll Paint. | Render the dial as its own `<svg>` inside an HTML `<div class="astro-dial">` and animate the div; the ring stays put. Scroll-driven `rotate` on an HTML element runs on the compositor. Same look. Gain: ~90–190 ms main-thread Paint per scroll pass on phone. Risk: low (section squares stay on the ring). **S–M** | no |
| 7 | WQA3-7 | Medium | CI | **Observed** (carried). `apps/web/e2e/interactions.spec.ts:5` flaky at the 5 s default `expect` timeout. Not reproduced here. | Wait for the tree's ready state (the `PassiveTreeView` / Atlas map `data-ready` or first node) before clicking; per-assertion `{ timeout: 15_000 }`. **S** | no |
| 8 | WQA3-8 | Medium | CI | **Observed.** `lighthouserc.json` asserts only LCP and CLS (perf preset, mobile); no TBT, no byte weight, no a11y/SEO/BP (WQA1-2). | Add `total-blocking-time` ≤ 300 ms and `total-byte-weight` (warn first), plus a second collect with `categories:accessibility/seo/best-practices` `minScore: 1` (all 100 today). **S** | no |
| 9 | WQA3-9 | Medium | CI | **Observed.** No scroll-performance guard exists; WQA3-1 shipped unseen. | Commit the WQA3 harness as `scripts/scroll-audit.cjs`. Gate on the *functional* signal only (sky paints while scrolling after a resize = 0; still sky after reduced motion), not on timing. **S** | no |
| 10 | WQA3-10 | Medium | Code bulk | **Measured** (chunk) / **Hypothesis** (modules). Two shared-floor chunks ship route data to all 8 routes: `3q9tuiprb14ai.js` 10.6 KB br (tagged sky + checklist + atlas data) and `28jbya-wb264y.js` 9.9 KB br (tagged PoB + farm + atlas data). Likely sources: `fx/sky/progressData.ts:1-2` imports `@/data/atlasTree` and `roadmapOrder` into the sky's eager path; `layout/NavMenu.tsx:6` imports the full `CHANGELOG`. `perf-chunks.mjs` tags are regex guesses (`/atlas/i`). | Confirm with a source-map breakdown; then load `progressData` only from the lazy `living` chunk, and give `NavMenu` a pre-sliced "latest entry" constant. Gain if confirmed: 5–15 KB br per route (3–9 %; keep only parts ≥ 5 %). Risk: low. **M** | no |
| 11 | WQA3-11 | Medium | Load | **Measured.** One global CSS file, 119 KB raw / 19.3 KB br, render-blocking on every route. It holds every route's styles (`styles/farm.css`, `atlas.css`, `gear.css`, `quick-picks.css`, …). | Import route-only sheets from their route's components so Next emits per-route CSS. Gain: ~5–9 KB br off non-matching routes, earlier FCP. Check the ≥ 5 % bar per route. Risk: cascade order. **M** | no |
| 12 | WQA3-14 | Medium | Scroll | **Hypothesis** (lab has no GPU). Three always-on full-viewport fixed layers: sky canvas, `.sky-scrim` (two radial gradients), grain `body::after` at z 60 over everything, plus the Astrolabe. At DPR 3 that is heavy overdraw for a mobile GPU. Lab: removing sky + scrim + grain + shadows cut commit by 80 %; grain or shadows alone made no difference. | Paint the scrim's two gradients into the sky canvas (already redrawn each frame), dropping one full-screen layer. Same look. Validate on a real phone first (see §7). **M** | no |
| 13 | WQA3-17 | Medium | Security | **Observed** (carried WQA1-1). `script-src 'unsafe-inline'`; 6 inline scripts per page, 2 of them per-route Next page data. | Hash per route at build and write per-route `_headers` rules; remove the CSP from `/*`. **M** | **yes** (WQA1-1) |
| 14 | WQA3-15 | Low | Scroll | **Measured** (size) / **Hypothesis** (gain). `/checklist`: 2213 DOM nodes, 359 KB raw HTML (35 KB br); style recalc 122–377 ms per phone scroll pass. No `content-visibility` anywhere. Scroll is already smooth (0.9 %). | `content-visibility: auto; contain-intrinsic-size: auto 600px` on closed checklist phases. Must keep `CardLinksCanvas` measurement and find-in-page working. Gain: style/layout on load and scroll. **M** | no |
| 15 | WQA3-13 | Low | Load | **Observed.** 3 font preloads on every route (Garamond 44 KB, Inter 48 KB, Geist Mono 23 KB). Garamond is declared as 3 `@font-face` rules on one file (`layout.tsx:29-35`). | `preload: false` on Geist Mono (not LCP text); one Garamond face with `weight: '500 800'`. Gain: 23 KB off the critical path. **S** | no |
| 16 | WQA3-12 | Low | Load | **Observed.** Console warning on `/`, `/character`: farm CSS `3wj5btnau9tmv.css` (5.8 KB) "preloaded but not used", from Next prefetching `/dashboard`. | Harmless; leave it, or `prefetch={false}` on the Farm tab link if the warning matters. **S** | no |
| 17 | WQA3-21 | Low | Scroll | **Measured** / cause **Hypothesis**. Desktop `/dashboard` 4.7 % and `/checklist` 3.9 % frames > 16.7 ms, unchanged with sky or Astrolabe hidden, 0 % with reduced motion. p95 stays 16.8 ms. Likely the one-shot bar entry animations (`useFirstView`, `styles/bars.css`). | Check with a trace; animate `transform`/`opacity` only. **S** | no |
| 18 | WQA3-18 | Low | SEO | **Observed** (carried). 404 page: duplicate `noindex` meta, canonical to `/_not-found/` (`app/not-found.tsx:5`). Page titles mix title case and sentence case. | `alternates: { canonical: null }` on not-found and drop the second robots tag. Titles to sentence case per `docs/COPY.md`. **S** | no |
| 19 | WQA3-19 | Low | Code bulk | **Measured.** Route budgets have almost no headroom: `/` 225 B, `/atlas` 508 B, `/dashboard` 556 B, `/whats-new` 732 B, `/character` 914 B. `REMAINING-WORK.md` §5 still lists 2026-11-08 numbers from another method (WQA1-4). | Rewrite §5 from `route-weight.mjs` and name the script as the source of truth. WQA3-10/11 create the room. **S** (docs) | no |
| 20 | WQA3-20 | Low | Load | **Observed** (carried). Unused JS 28 KiB of 70 KiB in the home chunk; `legacy-javascript` in the framework chunk. | Fold into WQA3-10 (same chunks). **M** | no |

## 4. Settings and headers review
| Setting | Current | Problem | Recommended |
|---|---|---|---|
| `_headers` `/*` CSP | `script-src 'self' 'unsafe-inline'` | Inline allowed (WQA3-17) | Per-route hashes; CSP off `/*` |
| `_headers` `/*` other | nosniff, DENY, HSTS 1 y + subdomains, COOP same-origin, Permissions-Policy | No COEP, so not cross-origin isolated (WQA2 overstated this). None needed | Keep |
| `_headers` `/_next/static/*` | `max-age=31536000, immutable` (live, br) | — | Keep |
| `_headers` `/*.json` | immutable 1 y | Safe only because data URLs carry `?v=<hash>` (`lib/basePath.ts:14`) | Keep; note it in the file |
| `_headers` `/character/*` | preconnect to proxy | — | Keep |
| HTML caching | Pages default `max-age=0, must-revalidate` | — | Keep |
| bfcache | No page blocker found | Not provable headless | Check in real Chrome (§7) |
| `sw.js` | Data cache-first keyed on data hash; hashed assets cache-first; rest network-first with navigation preload | Sound. No size cap on the shell cache, but it is pruned per build | Keep |
| `next.config.ts` | export, `trailingSlash`, `images.unoptimized`, data hash + build id env | — | Keep |
| `globals.css` motion | Reduced-motion rules cover shimmer, foil, Astrolabe, reveals, view transitions | Sky handled in JS (still frame) | Keep |
| `globals.css` `.card` | `text-shadow: var(--halo)` + 2 box-shadows on every card | Isolation shows no scroll cost | Keep |
| `globals.css` `body::after` grain | Fixed, z 60, SVG turbulence | No measured cost alone; one of 3 full-viewport layers (WQA3-14) | Keep for now |
| `lighthouserc.json` | perf preset, LCP + CLS only, 2 runs on PRs | Misses TBT, weight, a11y/SEO/BP, reduced motion (WQA3-8, WQA3-4) | Add asserts |
| `playwright.config.ts:52` | `updateSnapshots: 'missing'` | Visual tests vacuous (WQA3-6) | keep (owner: informational) |
| `ci.yml` `heavy` | e2e + Lighthouse skipped on drafts; run on `ready_for_review` | — | Keep |
| Ruleset "main: required checks" | guard, test, secrets; Admin bypass in PR mode | Red merges possible; `lighthouse` not required (WQA3-5) | keep (owner declined) |
| `layout.tsx` inline bootstraps | 3 tiny sync scripts (banner, compact, sky dim) | No measurable blocking cost | Keep (hash them, WQA3-17) |
| Fonts | 3 preloads, `display: swap` | Mono preload not needed (WQA3-13) | `preload: false` on mono |
| `manifest.webmanifest`, `robots.ts`, `sitemap.ts`, `pageMeta.ts` | Valid (Lighthouse SEO 100) | 404 canonical/noindex dup (WQA3-18) | Fix not-found metadata |

## 5. Quick wins (≤ 30 min each, in order)
1. WQA3-1: fix `ConstellationSky` resize/cleanup and add the resize-then-scroll e2e test.
2. WQA3-4: canvas offset via `transform` in `useCanvas.ts` and a reduced-motion CLS check.
3. WQA3-2a: coarse-pointer cadence 15 fps.
4. WQA3-13: mono `preload: false`, one Garamond face.
5. WQA3-18: not-found metadata.

## 6. Batches
| Batch | Items | Done when | Gate |
|---|---|---|---|
| **A. Scroll fix** | WQA3-1, WQA3-2a, WQA3-3, WQA3-9 | Harness on preview, phone after resize: sky paints while scrolling = 0, % > 16.7 ms within 1.5 pts of no-resize. Sky still animates after a mid-scroll resize. Astrolabe Paint during scroll < 10 ms per pass. Look unchanged at 390 and 1440. | Full Finish gate + harness on all 9 cases |
| **B. LHCI asserts** | WQA3-8, WQA3-4 test (WQA3-5/6 declined, WQA3-7 done in WQA4) | LHCI asserts TBT and a11y/SEO/BP; reduced-motion CLS check in e2e | Full gate; one deliberate-failure check per new assert |
| **C. CLS + metadata** | WQA3-4 fix, WQA3-18, WQA3-13 | `/checklist` CLS < 0.01 with reduced motion on both profiles; 404 has one noindex and no canonical | Full gate |
| **D. Bundle diet** | WQA3-10, WQA3-11, WQA3-20 (WQA3-19 done in WQA4) | Each kept change ≥ 5 % br on its route (`route-weight.mjs` before/after); budgets lowered to new size + 2 KB; §5 current | Full gate + `perf-chunks.mjs` diff |
| **E. Layer diet** (after §7 device check) | WQA3-14, WQA3-15, WQA3-2b | Device trace shows fewer GPU ms per frame; look identical in side-by-side screenshots | Full gate + device trace; a variant branch if anything visible changes |
| **F. CSP** (owner) | WQA3-17 | No `'unsafe-inline'` in `script-src`; 0 CSP violations across the 8 routes + import | Full gate + live console sweep |

## 7. Not measured / needs a real device
- **iOS Safari scroll:** WebKit's resize timing during URL-bar collapse decides which WQA3-1 failure a user hits (painting vs frozen). Needs a Safari Web Inspector timeline on an iPhone.
- **GPU cost:** headless Chromium renders canvas and layers in software, so commit and raster milliseconds are inflated, and GPU fill rate (WQA3-14) is invisible. Needs a Chrome remote-debugging trace on a mid-range Android with `--enable-gpu`.
- **Compositor frames:** frame % here is main-thread rAF cadence. Compositor-thread scroll can stay smooth when rAF drops. Chrome's `PipelineReporter` frame states weren't parsed in this harness.
- **Real-user data:** no CrUX or RUM for the site (too little traffic for CrUX).
- **bfcache** in a real browser profile.
- **Lighthouse** not re-run (WQA2 numbers stand).

## Resolved from earlier carry files
- WQA1-4: answered: `route-weight.mjs` is the source of truth; §5 rewrite queued as WQA3-19 (batch D).
- WQA1-2: folded into WQA3-8 (batch B).
- WQA1-3: folded into WQA3-10 / WQA3-20 (batch D).
- WQA4 (2026-11-14): owner declined WQA3-5 (ruleset bypass, = PRO1-1) and WQA3-6 (visual baselines, = PXC-1 / PRO1-2; screenshot tests stay informational). WQA4 fixed WQA3-7 (Atlas Map click waits for hydration) and WQA3-19 (budget text points at `route-weight.mjs`).

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | next-A | WQA3-1 sky scroll pause lost on resize | Batch A |
| 2 | bug | next-A | WQA3-4 `/checklist` CLS 0.25 under reduced motion | Batch C |
| 3 | follow-up | next-A | WQA3-8 LHCI asserts; WQA3-9 scroll guard | Batch B; WQA3-9 in batch A |
| 4 | recommendation | next-A | WQA3-2, WQA3-3 sky cadence and Astrolabe compositing | Batch A |
| 5 | recommendation | next-A | WQA3-10/11/20 shared-floor data and global CSS | Batch D |
| 6 | recommendation | owner | WQA3-14/15 layer and DOM diet after a device trace | Batch E |

## Needs owner
- WQA3-17 (= WQA1-1): per-route CSP hashes. Recommended: do it as batch F after A–D, because it touches every route's headers.
- WQA3-2b / WQA3-14: OffscreenCanvas sky and merging the scrim into the canvas. Recommended: wait for a real-device trace (§7) before spending effort.
