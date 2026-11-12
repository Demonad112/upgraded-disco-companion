# PERF-PLAN (PP1) · 2026-11-12 · PARTIAL

Status: **partial**. Items 1–3 measured; items 4–8 not measured (session stopped early by the owner). PX9 is written
from measurements; PX10 and PX11 are drafts that the continuation run (prompt in `docs/carry/PP1.md`) must finish
after measuring items 4–8. No number in this file is a guess; unmeasured rows say so and give the command.

## Method

- Build: `npm ci && npm run build -w @poe2/core && npm run build` on `main` @ 471a32a.
- Phone profile: Playwright Chromium, 390x844, DPR 3, mobile + touch, CDP `Emulation.setCPUThrottlingRate 4`,
  CDP Fast 4G (latency 165 ms, 1,012,500 B/s down, 168,750 B/s up), service worker blocked (first visit).
- Static files: scratch server = `apps/web/e2e/serve.mjs` logic **plus brotli** (Appendix A). serve.mjs sends raw
  bytes, which under throttling overstates transfer 4–8x (mod-tiers is 1,218 KB raw, 115 KB br).
- Proxy: the request to `poe2-v3-ninja-proxy.vercel.app` is intercepted and answered with the fixture after 410 ms
  (= live warm TTFB ~200 ms + 165 ms latency + 46 KB br at Fast 4G). Live proxy, `curl -w` from the sandbox, Yykiuy:
  TTFB 174 / 174 / 218 / 242 ms warm, 1,436 ms cold; body 492,939 B raw, 46,225 B br.
- Ladder answers 404 (as in `apps/web/e2e/fixtures.ts`), so the grade is a range. Live ladder timing: not measured.
- t0 = click on **Analyse** (`/character/`, URL typed in). "Painted" = second rAF after the node is in the DOM.
- Harness: Appendix A (`srv.cjs`, `imp.cjs`, `chunks.mjs`, `diff.mjs`). PX11 should land these as `scripts/perf-*.`

## 1. Import timeline (measured: Yykiuy, 3 runs; Athrynas: see table)

Reference character Yykiuy (`yykiuy-v51.json`, 494 KB raw), ms after the tap:

| Step | Run 1 | Run 2 | Run 3 | Note |
|---|---|---|---|---|
| Proxy response headers | 508 | 476 | 483 | 410 ms of this is the simulated proxy |
| Character JSON parsed (`res.json()`) | 541 | 509 | 514 | ~33 ms |
| mod-tiers / passive-tree / pob-skills fetch start | 570 | 555 | 547 | all three start on `raw !== null` |
| `CharacterResults` lazy chunks requested | 750 | 885 | 722 | only after the first `setAnalysis`; 3 JS + 1 CSS, 55.9 KB br |
| Lazy chunks arrived | 1,067 | 1,126 | 1,048 | |
| mod-tiers `json()` resolved | 1,591 | 1,221 | 1,294 | 1,218 KB to parse on the main thread |
| Build card + Top 3 in the DOM | 1,436 | 1,756 | 1,730 | one commit holds both |
| **Build card + Top 3 painted** | **1,915** | **1,954** | **1,994** | median **1,954 ms** |
| Top 3 text rewritten (2nd time) | 2,188 | 2,096 | 2,200 | detail lines grow 365 → 681 chars |
| Top 3 text rewritten (3rd time) | 2,977 | 2,944 | 3,061 | after `trade-map.json` |
| Last long task ends | 3,149 | 2,870 | 2,986 | |
| TBT after tap | 880 | 844 | 820 | 9–11 long tasks; largest 293–402 ms (first render of 2,091 nodes) |
| Layout shifts after tap | 0 | 0 | 0 | CLS 0.000 |

- **Dominant step: main-thread work between the proxy answering and the first paint, ~1,440 of 1,954 ms (74 %).**
  The proxy is ~25 %. Core analysis is not the cost: `analyzeCharacter` in Node takes 3–29 ms per call
  (`node diff.mjs`), i.e. roughly 12–120 ms at 4x.
- What fills the 1,440 ms: (a) a request waterfall — the `CharacterResults` chunks (`next/dynamic`,
  `apps/web/src/app/character/page.tsx:25`) are not requested until the first analysis commits, 210–380 ms after the
  JSON is parsed, then take ~240–330 ms; (b) three large `json()` parses competing with it (mod-tiers 1,218 KB,
  passive-tree 616 KB, pob-skills 351 KB decoded); (c) one 293–402 ms long task rendering the whole 2,091-node,
  11,833 px page to show a card and three rows.
- Per-chunk CPU self time (one profiled run, 4x, t0 → settle; it carried ~134 ms of harness overhead, since removed):
  `2d9kw-m66pr-m.js` 637 ms (/character page chunk: ninja client, page), `2khxl0v1q4i6n.js` 310 ms (react-dom),
  `0dl57fmhw4si4.js` 251 ms (core recommendations/analysis), native "(program)" 3,288 ms (parse, style, layout, paint).
  Native part by trace category (one traced run, t0 → Top 3 painted at 2,174 ms): FunctionCall 641 ms, UpdateLayoutTree 194, Layout 110, EventDispatch 102, Paint 78, PrePaint 75, rAF 55, EvaluateScript 47, Layerize 34, GC 23.
- Athrynas (bundled fixture): card + Top 3 painted 2,156 / 2,319 / 2,442 ms (median 2,319); TBT 992 / 1,319 / 1,149 ms; CLS 0; DOM 1,943–2,231 nodes.

## 2. Lazy JSON on import (measured)

| File | br (wire) | Decoded | Fetched when | Overview needs it? |
|---|---|---|---|---|
| `mod-tiers.json` | 115,456 | 1,218,330 | on `raw` | **Top 3 only**: 2 of 3 rows change on both fixtures (gear-swap / open-affix rows replace resistance rows). Build card: no |
| `passive-tree.json` | 115,905 | 616,315 | on `raw` | **No.** Grade, life, ES, DPS, killed-by and Top 3 are identical with and without it on both fixtures |
| `pob-skills.json` | 44,696 | 351,131 | on `raw` (`useSupportCatalog`) | No (support-gem catalogue) |
| `mod-display.json` | 119,790 | 1,026,501 | after first analysis, if the character has implicit/unique mods | No |
| `monster-stats.json` | 2,074 | 4,685 | after first render | No |
| `trade-map.json` | 460 | 307 | twice (two components fetch it) | Only the Top 3 trade buttons |
| `trade2-stats.json` | — | — | **not fetched on import** | — |

- 398 KB br / 3.2 MB decoded of JSON is fetched and parsed on every import; the build card needs none of it, and
  Top 3 needs only mod-tiers.
- `node diff.mjs` output (grade / score / life / ES / DPS / killed-by are the same in all four option sets):
  Yykiuy D–B, 0.20–0.70, 1,477 / 2,922 / 225,652 / 4,399; Athrynas D–B, 0.15–0.65, 1,448 / 1,937 / 110,157 / 3,808.
- Caveat: `page.tsx` comments say the tree can correct a pool for keystone builds; neither fixture shows it. PX9 must
  keep the corrected value arriving (it may update the card in place) and must not snapshot history before the tree
  settles (existing rule at `page.tsx:107`).

## 3. Route weight (measured)

`node scripts/route-weight.mjs` covers 6 of 8 routes; all 8 via `node chunks.mjs` (B br of JS+CSS in the HTML):

| Route | Files | br (as route-weight counts) | br a modern browser downloads | HTML raw / br |
|---|---|---|---|---|
| `/` | 11 | 190,404 | 155,246 | 71,333 / 13,507 |
| `/character` | 14 | 232,925 | 197,767 (+55,876 lazy on import) | 34,047 / 6,765 |
| `/checklist` | 12 | 198,139 | 162,981 | 347,645 / 34,908 |
| `/atlas` | 12 | 204,342 | 169,184 | 116,979 / 14,203 |
| `/dashboard` | 14 | 219,201 | 184,043 | 99,813 / 12,373 |
| `/trade` | 11 | 192,953 | 157,795 | 31,746 / 6,097 |
| `/methodology` | 11 | 187,103 | 151,945 | 66,798 / 10,671 |
| `/whats-new` | 10 | 185,581 | 150,423 | 40,647 / 7,028 |

**Finding: route-weight overcounts every route by 35,158 B br.** `0cz1d0mv5g_q7.js` (112,594 raw) is Next's
`<script noModule>` polyfill; no browser that can run the app downloads it. The budgets are measuring a file nobody loads.

Shared floor (in the HTML of all 8 routes) = **185,581 B br as counted, 150,423 B br real**; it is 80–100 % of every route:

| Chunk | raw | br | Contents |
|---|---|---|---|
| `2khxl0v1q4i6n.js` | 229,820 | 61,420 | react-dom + Next app router runtime |
| `1_53dzdee2x1b.js` | 159,173 | 37,546 | react-dom / Next client |
| `0cz1d0mv5g_q7.js` | 112,594 | 35,158 | `noModule` polyfills — never downloaded |
| `0ovj3vvk56tcs.css` | 102,424 | 16,561 | global CSS (all routes' styles) |
| `2elj83cfpnowg.js` | 35,255 | 10,522 | layout shell: sky, nav |
| `2rnn6be960yle.js` | 31,651 | 9,760 | layout shell; **contains the what's-new changelog text** on all 8 routes |
| `0s2cptn1mmf6r.js` | 30,549 | 7,314 | Next runtime |
| `0-o74znen4827.js`, turbopack runtime, `18rgsy2ata-z4.js` | 24,694 | 7,300 | runtime |

- **`@poe2/core` is not in the shared floor** (audit PERF-01 no longer holds): the recommendation-id and ninja-client
  strings appear only in route chunks. Core runs on `/character` (`0dl57fmhw4si4.js` 24,091, `2hcgcm1q_tv3v.js` 12,844,
  `2d9kw-m66pr-m.js` 10,185, plus the 55,876 B lazy results chunks) and `/trade` (`3qj_ae5oesrue.js` 7,372, trade
  queries). `/atlas` and `/dashboard` chunks import core tree/atlas helpers; exact core share there: not measured
  (`npx next experimental-analyze` or a source-map pass).
- Route-only chunks: `/` 4,823 · `/checklist` 12,558 · `/atlas` 18,761 · `/dashboard` 33,620 · `/trade` 7,372 ·
  `/methodology` 1,522 · `/whats-new` 0.
- Framework (react-dom + Next) is ~113.6 KB of the 150.4 KB real floor and is not reducible without leaving Next.
  The reducible floor is the 16.6 KB CSS and the two layout-shell chunks (20.3 KB).

## 4–8. Not measured (stopped early)

| # | Item | Command / method |
|---|---|---|
| 1b | Trace split of the import (script vs style/layout vs paint vs JSON parse) | `MODE=trace node imp.cjs Yykiuy 1` |
| 1c | Live ladder timing and its effect on the grade repaint | `curl -w` the `/api/ladder?...` URL from the fetch log in `imp-Yykiuy-plain.json` |
| 4 | Per route: LCP element + time, CLS, TBT, long tasks, interaction delay (tab, accordion, tick) | Playwright, same profile; `PerformanceObserver` for `largest-contentful-paint`, `layout-shift`, `longtask`, `event`; click 2nd `[role=tab]`, first `summary`, first checkbox |
| 5 | Canvas: backing-store sizes, ms/frame idle and scrolling, rAF under hidden / off-screen / reduced motion / solid panel | wrap `requestAnimationFrame` in an init script and count per second; CDP Profiler 5 s idle and 5 s scrolling on `/`; `page.emulateMedia({ reducedMotion: 'reduce' })`. Code read so far: sky caps DPR at 1.5, runs at 24 fps (15 lite), skips paint while scrolling or `document.hidden`, paints one still frame under reduced motion, but **keeps the rAF loop spinning** in the first two cases and has no off-screen or behind-panel check (`ConstellationSky.tsx:118-132`) |
| 6 | `/checklist` and `/character` after import: share of nodes below the fold, style + layout cost | count `getBoundingClientRect().top > innerHeight`; trace `UpdateLayoutTree` + `Layout`. Known: `/character` after import = 2,091 nodes, 11,833 px |
| 7 | Fonts preloaded vs used; CSS unused share per route; backdrop-filter cost | `<link rel=preload as=font>` vs `document.fonts`; CDP `CSS.startRuleUsageTracking`; count `backdrop-filter` elements and trace `Paint` with it disabled |
| 8 | Service worker precache list and size, second-visit hits, update path | run without `serviceWorkers: 'block'`, read `caches.keys()` and entries, reload and read `transferSize`; `scripts/sw-update-check.cjs` |

## PX9 — import path (written from measurements)

Goal: build card painted first; nothing the Overview does not need is fetched, parsed or rendered before it.

- **Files:** `apps/web/src/app/character/page.tsx`, `apps/web/src/components/character/CharacterResults.tsx`,
  `apps/web/src/components/character/Showcase.tsx`, `TopFixes.tsx`, `apps/web/src/lib/useModTiers.ts`,
  `usePassiveTree.ts`, `useSupportCatalog.ts`, `apps/web/src/components/ImportBar.tsx`. No `packages/core` change.
- **Depends on:** PX3 (build card), PX4 (tabs). PX9 defers by tab; without PX4 it defers by section instead.
- **Steps (in order):**
  1. Split the results chunk: the build card + Top 3 (Overview) become their own small `dynamic()` chunk; every
     other panel moves into per-tab `dynamic()` chunks loaded when the tab opens.
  2. Kill the waterfall: start the Overview chunk import when Analyse is tapped (and on `?import=`), in parallel with
     the proxy fetch, instead of after the first `setAnalysis`. Add `<link rel="preconnect">` to the proxy origin on `/character`.
  3. Paint the card from the first analysis (no tiers, no tree): it is already correct for grade, life, ES, DPS, killed-by.
  4. Fetch `mod-tiers.json` on `raw` (Top 3 needs it) but show Top 3 only when the tiers analysis is ready, with a
     fixed-height skeleton, so the three rows are written once instead of three times. Fetch `trade-map.json` once.
  5. Defer `passive-tree.json`, `pob-skills.json`, `mod-display.json`, `monster-stats.json` to the tab that uses them,
     or to `requestIdleCallback` after the card has painted when a correction depends on them (tree pool correction;
     history snapshot still waits for the tree to settle).
  6. Wrap the post-card state updates in `startTransition` so the tiers/tree re-analysis cannot block input.
- **Tier gate:** T1 after each step; T2 after step 1 and step 5 (`character.spec.ts`, `history.spec.ts`,
  `mod-display.spec.ts`, `trade.spec.ts`, PX0 screenshots); T3 at the end.
- **Done when:** `MODE=plain node imp.cjs Yykiuy 3` median build-card paint ≤ **1,100 ms** and Top 3 paint ≤ 1,500 ms
  (from 1,954); TBT after tap ≤ 400 ms (from 844); no request for passive-tree / pob-skills / mod-display before the
  card paints; Top 3 text written once; CLS after tap stays 0; grade, numbers and Top 3 wording unchanged on both fixtures.
- **Expected saving:** ~850 ms to the build card (waterfall ~300 ms, JSON parse contention ~250 ms, render of
  off-screen panels ~300 ms; these three are estimates from the timeline, to be confirmed by item 1b) and ~280 KB br
  of JSON off the import path. `/character` first-load JS unchanged or lower.
- **Import-to-card target:** ≤ 1,100 ms on the phone profile with a warm proxy; the floor is ~510 ms (proxy + parse).
- **Model · effort:** Opus · high (touches state ordering, history and what-if invariants).
- **Prompt:**
  ```
  Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PX9 (import path) from docs/plans/PERF-PLAN.md; read only
  "Method", sections 1–2 and "PX9". Branch variant/<yyyymmdd>-px9-import-path. Use the PX-PROGRAMME batch header.
  Run the steps in order with the tier gate given. Before and after: MODE=plain node imp.cjs Yykiuy 3 and
  Athrynas 3 (harness in PERF-PLAN Appendix A); put both tables in the PR. Do not change packages/core, any number
  or any finding wording. Done when the PX9 "Done when" line holds. No session links on GitHub.
  ```

## PX10 — load and render (DRAFT; finish after items 4–8)

Candidates that already have a number; the rest need items 4–7:

| Candidate | Evidence | Expected | Status |
|---|---|---|---|
| Move the what's-new changelog out of the layout-shell chunk | text present on all 8 routes (importer: `layout/NavMenu.tsx`) | 832 B br | **Tried in PXD: shared floor +1,010 B br (lazy chunk preloaded on every route). Dropped** |
| Split global CSS per route | 16,561 B br on every route | not measured (item 7 coverage) | needs item 7 |
| `content-visibility: auto` on below-fold sections of `/checklist`, `/dashboard`, `/atlas` | 347,645 B HTML, 2,191 nodes on `/checklist` | not measured (item 6) | needs item 6 |
| Stop the sky rAF loop while scrolling, hidden, or fully covered by solid panels | code read: skipped frames are an early return | hidden and scrolling: nothing to remove (PXD). Covered-by-panel: not measured | PXC, after PX1 |
| `/character` first load: core chunks (47,120 B br) load before any import | measured | R50 "lazy core on `/character`" is in Do-not-do; the real route weight is 197,767, further under 250,000, so the answer does not change | **Not worth it / do not re-propose** |

Files likely touched: `apps/web/src/app/layout.tsx`, `globals.css`, `components/fx/ConstellationSky.tsx`,
`fx/useCanvas.ts`, `fx/CardLinksCanvas.tsx`, `app/checklist/page.tsx`, `components/layout/*`. Model: Sonnet · medium.
Steps, tier gate, done-when and prompt: to be written by the continuation run.

## PX11 — guardrails (DRAFT; finish after items 4, 8)

Measured inputs so far:
1. `scripts/route-weight.mjs`: exclude `noModule` scripts, add `/methodology` and `/whats-new`, and lower each budget
   by 35,158 so no headroom is gained (`/` 192,000 → 156,842; default 250,000 → 214,842). Add the lazy
   import chunks of `/character` as a separate budget line.
2. Land Appendix A as `scripts/perf-serve.cjs` and `scripts/perf-import.cjs`; add an e2e import-to-card test
   (`apps/web/e2e/perf-import.spec.ts`) with 4x CPU and Fast 4G through CDP, asserting card paint under the PX9
   target plus 30 % for CI noise.
3. `lighthouserc.json`: all 8 routes, 3 runs, phone profile, TBT assertion — thresholds need item 4.

Files: `scripts/route-weight.mjs`, `scripts/perf-*.cjs` (new), `apps/web/e2e/perf-import.spec.ts` (new),
`lighthouserc.json`, `.github/workflows/ci.yml`. Model: Sonnet · medium. Steps, tier gate, done-when, prompt: to be
written by the continuation run.

**Landed in PXD (`docs/carry/PXD.md`):** PX11a route-weight fix and Appendix A as `scripts/perf-*`; Lighthouse on all 8 routes.

## Run order and shared files

**PX11a (route-weight fix + import timing harness, no thresholds) → PX9 → PX10 → PX11b (thresholds, Lighthouse CI).**
The harness goes first so PX9 and PX10 are judged by a committed script; thresholds go last so they pin the improved numbers.

| File | PX9 | PX10 | PX11 |
|---|---|---|---|
| `app/character/page.tsx`, `components/character/*`, `lib/use*.ts` | ✔ | | |
| `app/layout.tsx`, `globals.css`, `components/fx/*`, `components/layout/*` | | ✔ | |
| `app/checklist/page.tsx` | | ✔ | |
| `scripts/route-weight.mjs`, `scripts/perf-*`, `lighthouserc.json`, `ci.yml`, `e2e/perf-import.spec.ts` | | | ✔ |

No file is shared between the three batches as scoped; PX9 and PX10 could run in parallel after PX11a.

## Not worth it

| Item | Number | Why |
|---|---|---|
| Speed up `analyzeCharacter` | 3–29 ms per call in Node | under 6 % of the 1,954 ms even at 4x |
| Lazy core on `/character` (R50) | 47,120 B br; route is 197,767 real | already in Do-not-do; measurement does not change it |
| Shrink react-dom / Next runtime | 113.6 KB br of the floor | not reducible inside Next |
| Minify `trade2-stats.json` | not fetched on import | already in Do-not-do |

## Open questions (answered with the recommended option)

1. Show the build card before mod-tiers lands, with Top 3 arriving ~400 ms later? **Yes** — the card is identical with
   and without tiers; a fixed-height Top 3 skeleton keeps CLS at 0.
2. Lower the route-weight budgets by 35,158 when the polyfill is excluded? **Yes** — otherwise the fix silently hands
   every route 35 KB of headroom.
3. Commit the harness as scripts? **Yes, in PX11a** — PP1 was limited to two files, so it lives in Appendix A for now.

## Appendix A — harness (copy to a scratch dir; run `node srv.cjs &` first)

### `srv.cjs`

```js
// static brotli server for apps/web/out (serve.mjs logic + br)
const fs = require('fs'), http = require('http'), path = require('path'), zlib = require('zlib')
const root = '/home/user/upgraded-disco-companion/apps/web/out'
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' }
const cache = new Map()
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let f = path.normalize(path.join(root, p))
  if (!fs.existsSync(f)) f = f.replace(/(__next\.[^/\\]+?)\.(__PAGE__\.txt)$/, '$1/$2')
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.statSync(f) } catch { res.writeHead(404); return res.end('nf') }
  const ext = path.extname(f), type = T[ext] || 'application/octet-stream'
  const comp = !['.png', '.webp', '.woff2', '.ico'].includes(ext)
  if (!cache.has(f)) { const d = fs.readFileSync(f); cache.set(f, comp ? zlib.brotliCompressSync(d, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }) : d) }
  const h = { 'content-type': type, 'cache-control': 'no-store' }
  if (comp) h['content-encoding'] = 'br'
  res.writeHead(200, h); res.end(cache.get(f))
}).listen(4400, () => console.log('up'))
```

### `imp.cjs`

```js
const { chromium } = require('playwright'); const fs = require('fs')
const FX = { Yykiuy: ['yykiuy-v51.json', 'https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy'], Athrynas: ['athrynas-v43.json', 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'] }
const MODE = process.env.MODE || 'plain'
const name = process.argv[2] || 'Yykiuy', runs = +(process.argv[3] || 3), PROXY_MS = +(process.argv[4] || 410)
const body = fs.readFileSync('/home/user/upgraded-disco-companion/packages/core/test/fixtures/' + FX[name][0])
const init = () => {
  const P = (window.__p = { fetch: [], json: [], lt: [], cls: [], marks: {}, show: [], top: [] })
  const of = window.fetch
  window.fetch = async (...a) => { const u = String(a[0] && a[0].url ? a[0].url : a[0]); const s = performance.now(); const r = await of(...a); P.fetch.push({ u: u.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), s, hdr: performance.now() }); return r }
  const oj = Response.prototype.json
  Response.prototype.json = async function () { const s = performance.now(); const v = await oj.call(this); P.json.push({ u: this.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), s, e: performance.now() }); return v }
  new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push({ s: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) P.cls.push({ s: e.startTime, v: e.value }) })).observe({ type: 'layout-shift', buffered: true })
  const paint = (k) => requestAnimationFrame(() => requestAnimationFrame(() => { if (!P.marks[k]) { P.marks[k] = performance.now(); performance.mark('pp-' + k) } }))
  let ls = '', lt = ''
  const check = () => {
    const sc = document.querySelector('[data-showcase]'), tf = document.querySelector('[data-top-fixes]')
    if (sc) { if (!P.marks.showDom) { P.marks.showDom = performance.now(); paint('showPaint') } const t = sc.textContent.replace(/\s+/g, ' '); if (t !== ls) { ls = t; P.show.push({ t: performance.now(), g: (t.match(/Grade.{0,40}/i) || [''])[0] }) } }
    if (tf) { if (!P.marks.topDom) { P.marks.topDom = performance.now(); paint('topPaint') } const t = tf.textContent.replace(/\s+/g, ' '); if (t !== lt) { lt = t; P.top.push({ t: performance.now(), n: tf.querySelectorAll('li').length, len: t.length }) } }
  }
  document.addEventListener('DOMContentLoaded', () => new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true }))
  addEventListener('click', (e) => { if (/Analyse/.test(e.target.textContent || '') && !P.marks.t0) { P.marks.t0 = performance.now(); performance.mark('pp-t0') } }, true)
}
;(async () => {
  const b = await chromium.launch(); const out = []
  for (let i = 0; i < runs; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const page = await ctx.newPage(); await page.addInitScript(init)
    await page.route(/poe2-v3-ninja-proxy\.vercel\.app/, async (r) => { await new Promise((s) => setTimeout(s, PROXY_MS)); if (r.request().url().includes('/api/character')) await r.fulfill({ status: 200, contentType: 'application/json', body }); else await r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' }) })
    const c = await ctx.newCDPSession(page)
    await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 165, downloadThroughput: 1012500, uploadThroughput: 168750 })
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto('http://localhost:4400/character/', { waitUntil: 'networkidle' })
    await page.getByLabel('poe.ninja character URL').fill(FX[name][1])
    if (MODE === 'prof') { await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start') }
    if (MODE === 'trace') await b.startTracing(page, { categories: ['devtools.timeline', 'blink.user_timing', '__metadata'] })
    await page.getByRole('button', { name: 'Analyse', exact: true }).click()
    await page.waitForSelector('[data-top-fixes]', { timeout: 60000 })
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(4000)
    let profile = { nodes: [], samples: [], timeDeltas: [], startTime: 0 }, tr = null
    if (MODE === 'prof') profile = (await c.send('Profiler.stop')).profile
    if (MODE === 'trace') {
      const ev = JSON.parse((await b.stopTracing()).toString()).traceEvents
      const mk = (n) => (ev.find((e) => e.name === n && e.cat && e.cat.includes('user_timing')) || {})
      const a = mk('pp-t0'), z = mk('pp-topPaint'); const pid = a.pid, tid = a.tid
      const win = (lo, hi) => { const m = {}; for (const e of ev) { if (e.pid !== pid || e.tid !== tid || e.ph !== 'X' || e.ts < lo || e.ts > hi) continue; m[e.name] = (m[e.name] || 0) + e.dur / 1000 } return Object.fromEntries(Object.entries(m).filter(([, v]) => v > 8).sort((x, y) => y[1] - x[1]).slice(0, 22).map(([k, v]) => [k, Math.round(v)])) }
      const end = Math.max(...ev.filter((e) => e.pid === pid && e.tid === tid && e.ts).map((e) => e.ts))
      tr = { toTop: win(a.ts, z.ts), toTopMs: Math.round((z.ts - a.ts) / 1000), toSettle: win(a.ts, end) }
    }
    const P = await page.evaluate(() => ({ ...window.__p, nodes: document.querySelectorAll('*').length, h: document.documentElement.scrollHeight, res: performance.getEntriesByType('resource').filter((e) => /\.json|chunks/.test(e.name) && e.startTime > window.__p.marks.t0).map((e) => ({ u: e.name.replace(/^https?:\/\/[^/]+/, '').slice(-50), s: e.startTime, e: e.responseEnd, tx: e.transferSize, dec: e.decodedBodySize })) }))
    const t0 = P.marks.t0, rel = (x) => Math.round(x - t0)
    const self = {}; const byId = new Map(profile.nodes.map((n) => [n.id, n])); const t0us = profile.startTime
    let t = profile.startTime
    profile.samples.forEach((id, k) => { t += profile.timeDeltas[k]; const n = byId.get(id); const key = n.callFrame.url ? n.callFrame.url.replace(/^.*\//, '').slice(0, 40) : '(' + n.callFrame.functionName + ')'; self[key] = (self[key] || 0) + profile.timeDeltas[k] / 1000 })
    const o = {
      run: i, marks: Object.fromEntries(Object.entries(P.marks).map(([k, v]) => [k, rel(v)])),
      fetch: P.fetch.filter((f) => f.s >= t0).map((f) => ({ u: f.u, start: rel(f.s), hdr: rel(f.hdr) })),
      json: P.json.filter((f) => f.s >= t0).map((f) => ({ u: f.u, start: rel(f.s), end: rel(f.e) })),
      res: P.res.map((r) => ({ u: r.u, start: rel(r.s), end: rel(r.e), tx: r.tx, dec: r.dec })),
      longtasks: P.lt.filter((l) => l.s >= t0).map((l) => ({ at: rel(l.s), ms: Math.round(l.d) })),
      cls: P.cls.filter((l) => l.s >= t0).map((l) => ({ at: rel(l.s), v: +l.v.toFixed(4) })),
      show: P.show.map((s) => ({ at: rel(s.t), g: s.g })), top: P.top.map((s) => ({ at: rel(s.t), n: s.n, len: s.len })),
      nodes: P.nodes, h: P.h, trace: tr,
      cpu: Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + '=' + Math.round(v)),
    }
    out.push(o); await ctx.close()
  }
  fs.writeFileSync(`imp-${name}-${MODE}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out[0], null, 0).replace(/\},\{/g, '},\n{'))
  console.log('SUMMARY', out.map((o) => JSON.stringify(o.marks) + ' tbt=' + o.longtasks.reduce((a, l) => a + Math.max(0, l.ms - 50), 0) + ' lastCLS=' + (o.cls.at(-1) || {}).at + ' clsSum=' + o.cls.reduce((a, l) => a + l.v, 0).toFixed(3)).join('\n'))
  await b.close()
})()
```

### `chunks.mjs`

```js
import { readFileSync, existsSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'
const out = 'apps/web/out'
const routes = ['index.html', 'character/index.html', 'checklist/index.html', 'atlas/index.html', 'dashboard/index.html', 'trade/index.html', 'methodology/index.html', 'whats-new/index.html']
const M = { 'react-dom': /react\.dev\/errors|__reactFiber/, 'next-router/runtime': /__next_f|NEXT_REDIRECT|app-router/, 'core:recommend': /one-shot-physical|res-chaos-under-cap/, 'core:ninja-client': /api\/character\?account/, 'core:trade': /trade2\/search|buildTradeUrl/, 'core:pob': /Path of Building|pobb\.in/, 'core:tree': /keystone/i, sky: /constellation/i, checklistData: /Clear the campaign|campaign/i, zod: /ZodError|invalid_type/, searchDialog: /SearchDialog|No results/, chat: /anthropic|api\.openai|messages"/, sw: /serviceWorker/, farmData: /waystone/i, atlasData: /atlas/i, turbopack: /TURBOPACK/ }
const sz = new Map(); const per = {}
for (const p of routes) {
  if (!existsSync(`${out}/${p}`)) { console.log('MISSING', p); continue }
  const html = readFileSync(`${out}/${p}`, 'utf8')
  const files = new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g)].map((m) => m[0]))
  per[p] = files
  for (const f of files) if (!sz.has(f)) { const d = readFileSync(out + f); const s = d.toString('utf8'); sz.set(f, { raw: d.length, br: brotliCompressSync(d).length, tags: Object.entries(M).filter(([, r]) => r.test(s)).map(([k]) => k).join(',') }) }
  const htmlBr = brotliCompressSync(Buffer.from(html)).length
  let br = 0; for (const f of files) br += sz.get(f).br
  console.log(p.padEnd(26), files.size, 'files', br, 'br', '| html', html.length, 'raw', htmlBr, 'br')
}
const all = Object.values(per); const floor = [...sz.keys()].filter((f) => all.every((s) => s.has(f)))
let fb = 0, fr = 0; console.log('\nSHARED FLOOR (all 8 routes):')
for (const f of floor.sort((a, b) => sz.get(b).br - sz.get(a).br)) { const s = sz.get(f); fb += s.br; fr += s.raw; console.log(' ', f.split('/').pop().padEnd(28), String(s.raw).padStart(7), String(s.br).padStart(7), s.tags) }
console.log('  floor total', floor.length, 'files', fr, 'raw', fb, 'br')
for (const p of routes) { if (!per[p]) continue; console.log('\nEXTRA on', p); for (const f of [...per[p]].filter((f) => !floor.includes(f)).sort((a, b) => sz.get(b).br - sz.get(a).br)) { const s = sz.get(f); const n = all.filter((x) => x.has(f)).length; console.log(' ', f.split('/').pop().padEnd(28), String(s.raw).padStart(7), String(s.br).padStart(7), 'routes=' + n, s.tags) } }
```

### `diff.mjs`

```js
import { readFileSync } from 'node:fs'
import * as core from '/home/user/upgraded-disco-companion/packages/core/dist/index.js'
const R = '/home/user/upgraded-disco-companion/'
const J = (p) => JSON.parse(readFileSync(R + p, 'utf8'))
const tiers = new core.ModTiers(J('apps/web/out/mod-tiers.json')), tree = new core.PassiveTree(J('apps/web/out/passive-tree.json'))
for (const fx of ['yykiuy-v51', 'athrynas-v43']) {
  const raw = J(`packages/core/test/fixtures/${fx}.json`)
  const combos = { none: {}, tiers: { tiers }, tree: { tree }, both: { tiers, tree } }
  for (const [k, o] of Object.entries(combos)) {
    const t = performance.now(); let a
    for (let i = 0; i < 5; i++) a = await core.analyzeCharacter(raw, { ...o, ladder: null })
    const ms = (performance.now() - t) / 5
    const s = core.toSnapshot(a, '')
    const as = a.assessment
    const top = a.recommendations.recommendations.filter((r) => r.category !== 'question').slice(0, 3).map((r) => r.id + ':' + r.action.slice(0, 50))
    console.log(fx, k.padEnd(5), ms.toFixed(1) + 'ms', 'grade', as.tier, JSON.stringify(as.tierRange), 'score', as.score, JSON.stringify(as.scoreRange), 'life', s.life, 'es', s.energyShield, 'dps', s.dps, 'killedBy', s.weakestHit, '\n   top3', JSON.stringify(top))
  }
}
```

