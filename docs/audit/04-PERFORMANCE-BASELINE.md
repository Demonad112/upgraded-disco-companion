# 04 — Performance baseline

Measured 2026-10-22 on Windows 11, Node 24.18.0 (CI and Pages use 22), branch `ui/glass-refresh` working tree.

## Build

| Run | Result | Time |
|---|---|---|
| `npm run build` (core + sync-data + next build), first | **Failed**: `Error [SecurityFatalError]: Your version of Next.js is affected by a known security vulnerability. … This command stopped to show the upgrade recommendation. Retry the same command to continue` | 42 s |
| `npm run build -w @poe2/web`, retry | Passed. Warning: "This command is continuing after the upgrade reminder." | 18 s |
| `next build` compile step | "Compiled successfully in 5.9s". 7 static routes (`/`, `/_not-found`, `/atlas`, `/character`, `/checklist`, `/dashboard`, `/icon.svg`) | — |

No other build warnings. `npm run lint`, `npm run typecheck` and `npm test` all exit 0.

## Output size (`apps/web/out`, 7.4 MB total)

| Group | Raw | Brotli |
|---|---|---|
| All JS chunks (`_next/static/chunks`, 1.5 MB on disk incl. CSS) | 1,494,131 B | 378,331 B |
| CSS `1sn9nsm9eq29y.css` | 89,553 B | — |
| Fonts (`_next/static/media`, 21 woff2) | 549,758 B | (already compressed). 3 preloaded |
| Data JSON (deployed, fetched on demand) | mod-tiers 2,244,828 · passive-tree 616,315 · bases 360,077 · pob-skills 351,131 · atlas-tree 113,325 · monster-stats 4,685 | br on the wire |
| Images | og-cover.jpg 78,573 · atlas-constant.webp 73,420 (unused, ARCH-01) | — |

Largest JS chunks (raw): `3dmm3v_fq28gc.js` 229,820 (react-dom) · `1fiphjhisnbg4.js` 192,174 (strategies data) ·
`3yoo0zfzvphv-.js` 180,239 (passive/bosses, character route) · `2ebd9mx5j0-9f.js` 163,400 · `2eeu_owv62ad5.js` 131,622
(**@poe2/core**, on every route, PERF-01) · `0cz1d0mv5g_q7.js` 112,594 (`noModule` polyfills, legacy browsers only).

### Per route (first load: HTML + referenced JS/CSS)

| Route | HTML raw | HTML gzip | HTML br | JS/CSS files | JS/CSS raw | JS/CSS br |
|---|---|---|---|---|---|---|
| `/` | 60,668 | 16,220 | 13,547 | 11 | 855,415 | **223,126** |
| `/checklist/` | 380,046 | 63,163 | 33,177 | 11 | 911,875 | 238,503 |
| `/character/` | 26,492 | — | — | 12 | 1,029,809 | 262,769 |
| `/atlas/` | 115,492 | 19,197 | 13,770 | 11 | 898,507 | 234,444 |
| `/dashboard/` | 86,316 | — | — | — | — | — |

`/checklist/` also prefetches a 137 KB RSC payload (`__next.checklist.__PAGE__.txt`, live). The reference content is serialised
into both HTML and RSC. That's inherent to the App Router static export, so I'm not raising it as a finding.

## Runtime (headless Chromium, Playwright, software GL)

Caveat: headless Chromium rasterises on the CPU (SwiftShader), so `Task` time overstates real-GPU cost. Treat the **Script**
column as reliable and Task as an upper bound. Idle = 4 s with no input. Scroll = 20 × 300 px wheel steps at 50 ms.

| Viewport | Route | Doc height | sky canvas | atlas-web | card-links | Idle Script | Idle Task | Scroll task |
|---|---|---|---|---|---|---|---|---|
| 390×844 DPR3 | `/` | 2139 | 780×1688 (1.3 MP) | 780×4278 (3.3 MP) | 3.3 MP | 0.9% | 20.7% | 0.48 s |
| 390×844 DPR3 | `/checklist/` | 3942 | 1.3 MP | 780×7884 (**6.1 MP**) | **6.1 MP** | 1.1% | 34.5% | 0.51 s |
| 390×844 DPR3 | `/atlas/` | 3685 | 1.3 MP | 5.7 MP | 5.7 MP | 1.0% | 31.2% | 0.48 s |
| 1366×900 DPR1 | `/` | 1236 | 1366×900 (1.2 MP) | 1.7 MP | 1.7 MP | 2.2% | 21.1% | 0.66 s |
| 1366×900 DPR1 | `/checklist/` | 2721 | 1.2 MP | 3.7 MP | 3.7 MP | 1.9% | 25.2% | 0.68 s |

Layout and RecalcStyle time while idle: 0.0% on all routes, so the per-frame `getBoundingClientRect` in the dim pass doesn't
force layout while idle. The cost of SKY-01 shows during scroll and DOM changes, not at idle.

Console: 4 × 404 per page on the local server only (RSC segment path, DX-02). Production returns 200.

## Lighthouse

**Not run** (not installed; not downloaded during a read-only audit). Run:

```bash
npx lighthouse@12 https://upgraded-disco-companion.pages.dev/ --output=json --output-path=./lh-mobile.json --quiet
npx lighthouse@12 https://upgraded-disco-companion.pages.dev/ --preset=desktop --output=json --output-path=./lh-desktop.json --quiet
```

Keep the JSON out of git. Record LCP, CLS, TBT and INP (field data via CrUX, if any) in the table below.

| Metric | Mobile | Desktop |
|---|---|---|
| Performance score | not run | not run |
| LCP | not run | not run |
| CLS | not run | not run |
| TBT | not run | not run |

Expected risks: LCP element is the hero `<h1>` text (no hero image), so LCP depends on the EB Garamond swap. CLS risk is low
(size-adjust fallbacks, fixed canvases). TBT is driven by the 223 KB br of JS on `/`.

## Third-party origins

| Origin | When | Purpose |
|---|---|---|
| none | page load, all routes | Playwright request log: 0 non-same-origin requests |
| `https://poe2-v3-ninja-proxy.vercel.app` | user imports a character / ladder compare | poe.ninja proxy |
| `https://api.openai.com`, `https://api.anthropic.com`, `https://generativelanguage.googleapis.com` | user sends a chat message with their own key | currently blocked by CSP (SEC-01) |

## Budgets (proposed; enforce after T03)

| Budget | Target | Today |
|---|---|---|
| `/` JS+CSS brotli | ≤ 190 KB | 223 KB |
| Any route JS+CSS brotli | ≤ 250 KB | 263 KB (`/character/`) |
| `/` HTML brotli | ≤ 16 KB | 13.5 KB |
| Decorative canvas pixels per canvas (phone) | ≤ 3 MP | 6.1 MP |
| Sky fill/stroke calls per frame | ≤ 60 | ~1,000+ |
| Idle Script share (desktop, headless) | ≤ 2% | 2.2% |

## Measure (route-weight snippet)

Save it as `scripts/route-weight.mjs` (T03) or run it from a scratch file. Run it from the repo root after `npm run build`.

```js
import { readFileSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'
const out = 'apps/web/out'
for (const p of ['index.html', 'checklist/index.html', 'character/index.html', 'atlas/index.html', 'dashboard/index.html']) {
  const html = readFileSync(`${out}/${p}`, 'utf8')
  const files = new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g)].map((m) => m[0]))
  let raw = 0, br = 0
  for (const f of files) { const d = readFileSync(out + f); raw += d.length; br += brotliCompressSync(d).length }
  console.log(p.padEnd(24), String(files.size).padStart(3), 'files', String(raw).padStart(9), 'raw', String(br).padStart(8), 'br')
}
```

The canvas and CPU numbers came from a Playwright script that loads each route, reads `canvas[data-fx]` sizes, and diffs CDP
`Performance.getMetrics` over 4 s idle and a 20-step wheel scroll. Rebuild it from that description if needed. It was a scratch
file and isn't committed.
