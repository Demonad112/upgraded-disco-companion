# UI polish plan: POE2 Endgame Companion (apps/web)

## Context

The site (`upgraded-disco-companion.pages.dev`, repo `Demonad112/upgraded-disco-companion`) works and has a strong identity:
dark, gold constellation sky, square corners, EB Garamond headings, and a character analyser that already shows real numbers
well. The goal is to make it look as precise as the game its users play. This plan comes from reading the repo, `docs/audit/*`,
`docs/design-decisions.md`, and screenshots of all five live routes at 1440 px and 390 px, including a loaded character.

What the review found (desktop and phone):

1. **Legibility.** Cards have 0 % fill (`--glass-fill: 0%`), so star lines and constellations cross body text and numbers
   (Dashboard strategy rows, Character findings, Checklist).
2. **Inconsistent page headers.** Character has a mono eyebrow, a two-tone title and its own `<h1>` (`app/character/page.tsx:89`).
   Checklist, Atlas and Dashboard use the plain `PageHeader`. Home is a centred hero (that one is intended).
3. **Thread connectors everywhere.** `CardLinksCanvas.tsx:41` links every `main .card`, so `o—o` marks sit between unrelated
   grid cards on Character, Atlas and Checklist. That reads as noise, not structure.
4. **Uppercase long titles.** Finding titles are full sentences set in uppercase Garamond and are hard to read.
5. **Progress bars look like sliders.** The gold diamond bead (`.glow-bead`) at 0 % looks draggable.
6. **Controls are a mix.** Dashboard selects use the native chevron, sort chips and the Default/Mapping/Bossing switch are styled
   differently, What-if sliders have round thumbs, and Footer buttons still carry `rounded-md`.
7. **Character layout gaps.** "FINDINGS" heading appears twice. Spare-to-trade and Since-last-import are unequal half cards.
   The Resistances card is half empty beside the taller Largest-hit card. The grade letter has no scale shown, and "Why this grade"
   is collapsed. Labels switch between mono uppercase and sans case in the same card.
8. **Phone navigation.** The top bar shows four unlabelled icons. The patch banner truncates.
9. **Thin footer and missing pages.** There is no Methodology/About page, the changelog is only in the patch menu, and the
   footer has only a disclaimer.
10. **PWA.** No "new version" toast, no offline indicator, no install entry point, and the manifest has no shortcuts.

## Owner decisions (2026-10-28)

| Topic | Decision |
|---|---|
| Sequencing | Interleave with audit sessions 1–8 (`docs/audit/10-SESSION-SCHEDULE.md`). UI work that touches `globals.css` or the sky waits for audit sessions 5 and 7 |
| Card legibility | Tinted glass on data panels (~70 % dark fill). Home and hero cards stay clear glass |
| Long titles | Section and card headings stay uppercase Garamond. Finding, step and strategy titles use bold Garamond in sentence case |
| Connectors | Keep only where they show a sequence (home tool row, checklist flow). Remove them between grid cards |
| "App" | Installable PWA polish. MCP is out of scope |
| New pages | `/methodology` and `/whats-new` |
| Mobile nav | Bottom tab bar on phones |
| Page headers | Character style everywhere: eyebrow, two-tone title, meta row. Home keeps its hero |
| Footer | Full four-column footer |
| Progress | Square segmented gauge with `n / total` |
| Where to run | Mixed. Each batch is marked cloud OK or local preferred |

These change two lines of the decided design in `CLAUDE.md` (glass fill, uppercase scope). Batch U0 records them first so
later sessions don't treat them as violations.

## Ground rules for every UI batch

- **Branch:** `variant/<yyyymmdd>-<slug>` off up-to-date `main` (CLAUDE.md rule), e.g. `variant/20261030-headers`. Pages builds a
  preview at `https://variant-<yyyymmdd>-<slug>.upgraded-disco-companion.pages.dev/` (keep the alias ≤ 28 chars). The owner
  reviews the preview, then the session's PR merges into `main`. Docs-only batches (U0) may use `docs/<slug>`.
- **Scope:** `apps/web` only. Never `packages/*`, `services/*`, `apps/mcp`, `packages/data/generated`, or behavioural test
  assertions. e2e selectors may follow renamed markup; no assertion is removed. Stop and ask if a change needs core data that
  isn't exposed.
- **CSS placement (cuts conflicts):** from U2 onward, new component CSS goes in its own file under `apps/web/src/styles/`
  (`surfaces.css`, `type.css`, `controls.css`, `gauge.css`, `nav.css`, `footer.css`, `pwa.css`), imported from `globals.css` right
  after `@import 'tailwindcss'`. Tokens go in `tokens.css` (created by audit T19). Values come from tokens, not hex.
- **Design invariants:** dark palette, square corners, no script fonts, gold rotating sky, sky-dim toggle, lighter sky on phones,
  "Up next" block, `prefers-reduced-motion` honoured, 44 px tap targets (`--tap-min`), no horizontal scroll at 280 px.
- **Gate** (separate commands, summarise output; cloud: `npm ci` then `npm run build -w @poe2/core` first):
  `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run e2e -w @poe2/web`
- **Screenshots:** `node scripts/screenshot.mjs <preview-url>/character/ <dir>` plus 390/768/1440 shots of every touched route.
  Keep them out of git (`C:\Dev\data\poe2-variants\<slug>\` locally, or attach to the PR).
- **Tracking:** tick the batch row in `docs/ui/UI-PROGRESS.md` (created by U0) in the batch's last commit. Commit with
  `git commit -F`, one PR per batch, owner merges.
- **Protocol:** Every session follows docs/SESSION-PROTOCOL.md; carry-over lives in docs/carry/.

## Order (waves)

Audit sessions are `A1`–`A8`, prompts in `docs/audit/10-SESSION-SCHEDULE.md`. In each wave the two items touch different files
and can run at the same time (one cloud, one local if you like). Merge both before the next wave.

| Wave | Run | Why they don't collide |
|---|---|---|
| 1 | **A1** ∥ **U0** | U0 is docs only |
| 2 | **A2** ∥ **U1** page headers | A2 = `_headers`; U1 = `PageHeader`, page.tsx files |
| 3 | **A3** ∥ **U9** new pages | A3 = `next.config`, SW; U9 = new routes, search index, NavMenu |
| 4 | **A4** ∥ **U8** home | A4 = canvases, a11y spec; U8 = `app/page.tsx`, `components/home/*` |
| 5 | **A5** (sky) alone | rewrites `ConstellationSky.tsx` + `globals.css` |
| 6 | **A6** ∥ **U12** PWA | A6 = layout landmarks, NavBar, sitemap; U12 = `ServiceWorker.tsx`, manifest (after A3's SW change) |
| 7 | **A7** (tokens.css) ∥ **A8** (proxy) | unchanged from the audit plan |
| 8 | **U2** surfaces + connectors | first batch on `tokens.css` |
| 9 | **U3** typography → **U4** controls | sequential: U4 builds on U3's label classes |
| 10 | **U5** gauge ∥ **U6** mobile nav | separate CSS files, separate components |
| 11 | **U7** footer | needs U9 pages, U12 install button, U6 nav |
| 12 | **U10** character ∥ **U11a** checklist | different component folders |
| 13 | **U11b** dashboard + atlas | |
| 14 | **U13** final QA (local) | |

About 14 sittings at one or two batches each.

## Batches

Size: S < 1 h, M 1–2 h, L 2–3 h of agent time. "Agent" means the session type and model to start.

### U0: Record decisions and tracker (S, docs, cloud OK, Sonnet)
- `CLAUDE.md` Design section: replace "clear-glass blocks" with "clear glass on home/hero; data panels use `--data-fill` tinted glass".
  Add "uppercase Garamond for headings and labels; sentence titles (findings, steps, strategies) are sentence case". Add
  "thread connectors only on `[data-links]` sequences". Add "phones use a bottom tab bar".
- New `docs/ui/UI-PLAN.md` (this plan, trimmed) and `docs/ui/UI-PROGRESS.md` (one row per batch: status, PR, preview URL).
- Done when: both files exist, CLAUDE.md diff is ≤ 10 lines, PR open.

### U1: One page-header system (M, cloud OK, Sonnet)
- `components/layout/PageHeader.tsx`: add `eyebrow`, `accent` (the gold word, rendered with `.text-gradient-gold`) and `meta`
  props. Meta row is mono and small: `Patch {CURRENT_PATCH} · {LEAGUE_LABEL}` from `lib/constants.ts`, plus an optional source
  line (e.g. "poe.ninja", "community tier list").
- Use it in `app/checklist/page.tsx`, `app/atlas/page.tsx`, `app/dashboard/page.tsx`, and replace the bespoke `<h1>` in
  `app/character/page.tsx:89` so all four share one component. Eyebrows: "Endgame roadmap", "Atlas passive tree",
  "Farming strategy", "poe.ninja import". Gold words: Checklist, Planner, Dashboard, Analysis.
- Remove the duplicate inner "FINDINGS" title in `components/Recommendations.tsx` (keep its "Ranked by gain per unit of cost…"
  line and the Default/Mapping/Bossing switch).
- Accept: one `<h1>` per page (axe `heading-order` unchanged or better), screenshots of the four pages match in rhythm (title top
  offset within ±4 px).

### U2: Surfaces and connectors (M, local preferred, Opus: visual judgement)
- `tokens.css`: `--data-fill: color-mix(in srgb, var(--surface) 72%, transparent)`, `--data-fill-blur: 0px` (no blur: keep it cheap).
- `styles/surfaces.css`: `.card[data-surface='data']` uses `--data-fill`. Apply `data-surface="data"` to: findings cards
  (`Recommendations.tsx`), Defence panels (`DefensePanel.tsx`, `Headroom.tsx`), Damage (`DamageReview.tsx`), What-if
  (`character/WhatIfPanel.tsx`), strategy table/rows (`dashboard/StrategyTable.tsx`), boss and meta cards, checklist steps
  (`checklist/ChecklistStep.tsx`, `ChecklistSection.tsx`), atlas list and map panel. Not on home tool cards, Up next or the hero.
- `fx/CardLinksCanvas.tsx:41`: switch from opt-out (`[data-no-links]`) to opt-in. Link only cards inside `[data-links]`.
  Add `data-links` to the checklist flow (overall bar → Up next → planner → reference blocks) only. The home `thread-row` is CSS
  and stays as is.
- Accept: no star line visible behind text in data cards at 1440 and 390 with dim on and off; axe `color-contrast` 0; card count
  linked by the canvas drops (log it before/after); sky still visible around cards.

### U3: Typography and labels (M, cloud OK, Sonnet)
- `styles/type.css`: `.title-sentence` (Garamond 600–700, normal case, `letter-spacing: 0`, `text-wrap: balance`, `line-height: 1.25`).
  Apply to finding titles (`Recommendations.tsx`), checklist step titles (`ChecklistStep.tsx`, `NextStepCard.tsx`), strategy names
  (`StrategyTable.tsx`, `StrategyCard.tsx`). Content strings are unchanged. Only CSS case changes. Check source strings are not
  stored uppercase.
- Two label roles, used consistently: `.label-metric` (mono, uppercase, 11 px, `--ink-mute`) for numeric stat labels (LIFE,
  KILLS YOU FIRST, OVER TIME) and `.label-field` (sans, sentence case, 13 px, `--ink-dim`) for prose labels (Cost, Chaos resistance,
  Trade-off). Update `Stat` in `components/ui.tsx` and the findings cost/delta blocks.
- Numbers: every figure uses `.tabular`. Pick one compact rule. Stat tiles may use `fmtCompact` (110.2k) only if the full value
  shows in a `title`. Tables and headings use `fmt` (110,157).
- Accept: no sentence-length title rendered uppercase (grep the touched components); unit tests on `fmt`/`fmtCompact` unchanged.

### U4: Controls kit (L, local preferred, Opus)
- `styles/controls.css` + small components in `components/ui.tsx` (or `components/shared/`):
  - `Select`: native `<select>` with `appearance: none`, square gold chevron (inline SVG background via token colour), same
    height as buttons. Use in `dashboard/StrategyQuiz.tsx`, `checklist/WaystonePlanner.tsx`, `Headroom.tsx` (waystone picker),
    `character/CompareCharacters.tsx`, `GearWorkbench.tsx`, `DamageReview.tsx`.
  - `Segmented`: one look for sort chips (`polish.spec.ts` "dashboard sort chips"), Default/Mapping/Bossing, ImportBar tabs
    (poe.ninja URL / Paste data), dashboard tabs, atlas guide tabs. Square, 1 px line, active = gold text + `--accent-soft` fill +
    2 px gold underline. `role="tablist"` or `radiogroup` per current semantics. Don't change behaviour.
  - Range: square thumb (rotated-square "bead" to match the brand), 4 px track, gold fill to the value (`WhatIfPanel.tsx`).
  - Buttons: `Button` with `primary` (gold surface), `secondary` (line), `ghost`, `danger`. Remove `rounded-md` in `Footer.tsx`
    and anywhere else (`grep -r "rounded-"` in components; the global `!important` rule hides it today).
  - Focus: one `:focus-visible` ring (`--focus-ring`, 2 px offset) on every control. Hover: border to `--accent-line`, no lift on
    data cards.
- Accept: e2e passes with the same selectors (update only class/role selectors that changed, keep assertions). Keyboard-only pass
  on Dashboard, Character import, What-if. axe 0 on all routes.

### U5: Segmented gauge (M, cloud OK, Sonnet)
- Replace `components/shared/ProgressBar.tsx` (and `.glow-track/.glow-fill/.glow-bead` in `globals.css`) with a square segmented
  meter: one segment per unit when the total ≤ 40 (checklist 32 steps, atlas clusters, phase sub-steps), else 20 proportional
  segments. Filled segments are gold, the next segment has a 1 px gold outline (the "up next" cue), and `n / total` plus `%` show
  in mono to the right. Keep `role="progressbar"` and `aria-valuenow/min/max`.
- Callers: `home/ProgressSummary.tsx`, `checklist/ChecklistProgressHeader.tsx`, the atlas header in `app/atlas/page.tsx`,
  and the phase cards in `ChecklistSection.tsx`. The phase track today is almost invisible, so this fixes it too.
- Remove the dead `.glow-*` rules once nothing uses them (`grep`).
- Accept: reads correctly at 0 %, 1/32, 50 %, 100 %; reduced-motion shows no fill animation; e2e progress assertions unchanged.

### U6: Phone navigation (M, local preferred, Sonnet)
- New `components/layout/MobileTabBar.tsx`, rendered in `app/layout.tsx`: fixed bottom bar ≤ 720 px with the four tools (icon +
  short label: Checklist, Atlas, Farming, Character), `aria-current` gold, `padding-bottom: env(safe-area-inset-bottom)`, `<nav
  aria-label="Tools">`. `main` gets bottom padding equal to the bar.
- `layout/NavBar.tsx` ≤ 720 px: hide the four tool links (they live in the tab bar); keep brand, Search and Patch. Bar height stays
  `--nav-h`. Coordinate with A6 landmark changes (run after A6 merged).
- Compact mode (`:root[data-compact]`) hides the tab bar like other chrome. The bar must hide while the on-screen keyboard is open
  (`visualViewport` resize) so it doesn't cover inputs.
- Patch banner on phones: shorten to "Patch 0.5.5 · community data ⓘ" with the full text in the Patch menu (no truncation).
- Accept: no horizontal scroll at 280/320/390; the existing narrow-nav e2e still passes; a new e2e checks the tab bar is visible at
  390 and absent at 1024; focus order is header → main → tab bar.

### U7: Full footer (M, cloud OK, Sonnet)
- `layout/Footer.tsx` + `styles/footer.css`, four columns ≥ 981 px, two at 621–980 px, stacked on phones (above the tab bar):
  - **Tools:** the four routes.
  - **Resources:** Methodology, What's new, GitHub repo, report an issue (GitHub issues URL).
  - **Data:** `Patch {CURRENT_PATCH}`, leagues, "Data version" (`NEXT_PUBLIC_DATA_VERSION` short hash), poe.ninja credit (reuse
    `components/Attribution.tsx`), GGG disclaimer.
  - **Settings:** sky dim (`SkyDimToggle`), compact mode (`lib/compactMode.ts`), Install app (from U12), Reset all progress (keep
    the existing `<dialog>`).
- Accept: `polish.spec.ts` "footer links" passes (extend it for the new links); reset dialog unchanged; footer contrast passes axe.

### U8: Home page (M, cloud OK, Opus: content/layout judgement)
- `app/page.tsx`, `components/home/*`:
  - Under the hero, a mono meta strip with live counts from existing data: `32 steps · 14 strategies · 8 pinnacle bosses · 11 meta
    builds · N atlas nodes` (computed from `data/*.ts`, never typed in), plus "data updated <date>" if `sourceMeta.ts` has one.
  - Tool cards (`thread-row`): larger icon (32 px, gold line art), title, one-line purpose, and a **live status line** from local
    state: "4 / 32 steps", "6 / 17 path nodes", "Last import: Athrynas · C" (via `LastCharacterCard`/`recentCharacters`), "Pick a
    strategy". Whole card is the link; keep the thread connectors (they are the intended sequence).
  - Keep Up next and Progress side by side. Progress uses U5's gauge once that lands (not a blocker: U8 can ship first).
- Accept: no hard-coded counts (grep), home e2e passes, LCP element still the hero title.

### U9: Methodology and What's new pages (M, cloud OK, Opus for Methodology accuracy)
- `app/methodology/page.tsx`: how the grade range is formed, largest-hit/max-hit (pool / (1 − effective resistance), as poe.ninja
  computes), EHP and why it overstates safety, findings ranking (gain per unit of cost), provenance tags (derived, cross-validated,
  unverified/conflicting), what is read from poe.ninja vs computed, what is deliberately not guessed (no DPS thresholds). **Every
  statement must be traced to `packages/core/src` code or existing UI copy; cite the file in a code comment. Nothing invented.**
  Anchored sections with copy-link, a sticky on-page index (reuse `shared/ScrollSpyNav.tsx`).
- `app/whats-new/page.tsx`: render `data/changelog.ts` as a dated timeline (patch chip, change list), newest first. The Patch menu
  (`layout/NavMenu.tsx`) gets a "See all changes" link.
- Add both to `lib/searchIndex.ts`, footer (U7) and the sitemap (`app/sitemap.ts` from audit T15, if merged; otherwise note it in
  the PR). Use the U1 `PageHeader`.
- Accept: both pages build statically, axe 0, appear in Ctrl K search, a new e2e visits both.

### U10: Character page polish (L, local preferred, Opus)
Files: `app/character/page.tsx`, `components/character/*`, `BuildScore.tsx`, `Recommendations.tsx`, `DefensePanel.tsx`,
`Headroom.tsx`, `DamageReview.tsx`. No core changes. If a figure isn't exposed, leave it out.
- **Grade:** under the big letter, a horizontal ladder of the grade letters with the current letter or range (`D–B`) highlighted,
  and the numeric score below. Show the first line of "Why this grade" in the overview card, and keep the details disclosure.
- **Overview grid:** merge "Spare to trade" and "Since last import" into one full-width row with two equal columns, or make Since
  last import a slim one-line notice when there's no previous import. No half-empty card.
- **Defences:** place the resistance legend and Spare-to-trade summary under the Resistances bars so the card pair balances
  with Largest hit (`align-items: stretch`, shared footers).
- **Findings cards:** evidence link sits directly under the body (not pinned to the card bottom); `#n` rank chip + category chips
  in one row, wrapping cleanly; delta lines use `.label-metric`/`.label-field` from U3; trade-off text gets a left rule in `--warn`.
- **Section tab bar** (`.bar.idx`): active underline animates between items (respect reduced motion); show a small count chip
  per section where cheap (Findings 7, Checks n).
- **Loading:** skeleton matching the overview layout while importing (`components/Skeleton.tsx` exists).
- Accept: `node scripts/screenshot.mjs` render assertions pass; `layout.spec.ts` "findings flow into two columns" passes;
  no grid card with > 40 % empty height at 1440 (eyeball list in the PR).

### U11a: Checklist polish (M, cloud OK, Sonnet)
- `checklist/ChecklistPhaseNav.tsx`: one horizontal scrollable rail (no wrap to two rows), each phase chip shows `n/total` and a
  2-segment status (done/active); scroll-snap; fade edges (`shared/ScrollFade.tsx`).
- Reference blocks (Before your first map, What changed, Trial of Chaos, Essence, Glossary, Mistakes): group under one
  "Reference" sub-heading, quieter titles (uppercase Garamond 18 px in `--ink`, not gold), and keep badges.
- "Am I ready?" card: equal height with Waystone planner, with a clear CTA button to `/character/`.
- Step rows: completed rows dim to `--ink-mute` with a gold check, and "Hide completed" moves next to the rail.
- Accept: checklist e2e passes; rail doesn't scroll the page horizontally at 280 px.

### U11b: Dashboard and Atlas polish (M, cloud OK, Sonnet)
- Dashboard (`dashboard/*`): the quiz uses U4 `Select` with a "Reset" link. Strategy rows become an aligned grid: tier badge |
  name + meta | invest pill | risk pill | stage | mechanic tags | chevron. Pills use colour **and** text (no colour-only meaning).
  Add a one-line tier legend (S/A/B/–) above the list. Pinnacle boss cards show requirement numbers in `.tabular` stat tiles.
- Atlas (`atlas/*`): map legend moves into the map panel's header with counts (Guide n, Trap n, Ticked n). `+ − fit` controls
  become a vertical square button group with tooltips and keyboard shortcuts (`+`, `-`, `0`). Search field gets a clear button
  and result count. The list "Map" buttons use `Button secondary` size sm.
- Accept: `polish.spec.ts` dashboard sort chips and Atlas Map buttons pass; `layout.spec.ts` Atlas map stays beside the guide.

### U12: Installable app polish (M, cloud OK, Sonnet; after A3)
- `components/ServiceWorker.tsx`: when a new SW is waiting, show a square toast "New version ready, Reload" (`styles/pwa.css`,
  `role="status"`). Reload posts `SKIP_WAITING` and reloads on `controllerchange`. Must match A3/T04's build-keyed cache design.
- Offline indicator: a small mono chip in the header when `navigator.onLine` is false ("Offline · saved data only"). Character import
  shows a clear offline message instead of a fetch error.
- Install: capture `beforeinstallprompt`; expose `InstallButton` (used in the footer Settings column by U7, hidden when installed or
  unsupported; iOS shows a "Share → Add to Home Screen" hint).
- `public/manifest.webmanifest`: `shortcuts` for the four tools (with 96 px icons, generated from `icon.svg`), `id`, `scope`,
  `display_override: ["standalone"]`, `description`. Check `basePath` handling (`lib/basePath.ts`) for GitHub Pages builds.
- Accept: unit test for the update-toast state machine; Lighthouse PWA installability passes on the preview URL; offline reload of
  `/checklist/` works.

### U13: Final QA pass (M, local, Opus)
- Full screenshot sweep (390, 768, 1440; dim on/off; compact mode) on the last preview, axe on every route, keyboard-only walk,
  Lighthouse per `docs/audit/04-PERFORMANCE-BASELINE.md` (record numbers; home JS must not regress beyond +10 KB brotli vs post-A3).
- Fix only small regressions in the same PR; log anything bigger as a new row in `docs/ui/UI-PROGRESS.md`.
- Update `HANDOFF.md`.

## Copy-paste prompts

Use this one template and replace `<ID>` (U0…U13), `<n>`, `<ID2>` and `<files>`. Start the session in
`C:\Dev\projects\POE2 Endgame Companion App` (local) or on the repo (cloud), on an up-to-date `main`:

```text
Session <ID> (wave <n>). The parallel session is <ID2>, which owns <files>; don't touch them.
1) Follow docs/SESSION-PROTOCOL.md Start.
2) Do batch <ID>: read CLAUDE.md, the Ground rules and the <ID> section; branch variant/<yyyymmdd>-<slug>.
3) Follow Finish, then stop.
Owner notes: none
```

Batch prompts read this file. For audit sessions, use the prompts in `docs/audit/10-SESSION-SCHEDULE.md`.

Model guide (the Model column in `docs/ui/UI-PROGRESS.md` is authoritative): Sonnet for well-specified batches (U0, U1, U3, U5, U6, U7, U11a, U11b, U12). Opus where visual or content
judgement matters (U2, U4, U8, U9, U10, U13). Local preferred where the owner reviews visuals before the PR (U2, U4, U6, U10, U13).

## Verification (whole programme)

- Every PR: the gate above passes, CI is green, and the Pages preview is reviewed by the owner before merge.
- After waves 8–10, compare the variant preview against production side by side (two tabs) on Character and Dashboard.
- After U13: axe 0 on all seven routes, Lighthouse recorded, no horizontal scroll at 280 px, keyboard-only walk passes, and
  `scripts/screenshot.mjs` render assertions pass on production.
