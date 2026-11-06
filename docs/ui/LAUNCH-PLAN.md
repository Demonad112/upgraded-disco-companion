# Launch plan

Goal: phone-first and simpler for new players, element-true visuals, a show-off character page that doubles as the
share card, and day-1 resilience. Decided with the owner on 2026-11-03 (12-question interview). Run order is the wave
table in `docs/ui/UI-PROGRESS.md` (waves 20–24).

## Waves

| Wave | Batch | Where · model | Runs with | Branch |
|---|---|---|---|---|
| 20 | W0 Prep | Local · Sonnet 5.5 · medium | IMG-1 (owner, Claude chat) | `chore/<date>-w0-prep` |
| 21 | C1 Content short + pro | Cloud · Opus 5.5 · high | H1, L1 | `variant/<date>-short-copy` |
| 21 | H1 Home picker | Local · Opus 5.5 · high | C1, L1 | `variant/<date>-home-picker` |
| 21 | L1 Launch hardening | Cloud · Sonnet 5.5 · medium | C1, H1 | `feat/<date>-launch-hardening` |
| 22 | CH1 Character showcase | Cloud · Opus 5.5 · high | V1 | `variant/<date>-showcase` |
| 22 | V1 SVG diagrams | Local · Opus 5.5 · high | CH1 | `variant/<date>-diagrams` |
| 24 | IMG-2 Visual build | Cloud · Opus 5.5 · high | QA (after IMG-2's PR opens) | `variant/<date>-visuals` |
| 24 | QA sweep | Cloud · Sonnet 5.5 · medium | IMG-2 | none (report only) |

Each wave starts once the previous wave's PRs are merged. Sessions in the same wave own separate files (listed per
batch), so they never conflict.

## Common rules (every batch)

- Follow `docs/SESSION-PROTOCOL.md` (previous-wave check, carry-over, carry file, progress row).
- **Short replies:** 1–2 sentences, during the work and after it. Go longer only to explain the answer to a question you
  raised.
- **Questions:** answer them yourself with the recommended option and note it in the carry file. Ask the owner only for
  high-impact or personal calls: a deploy, `packages/*` beyond what the batch allows, a change to a design rule in
  `CLAUDE.md`, or removing a test assertion.
- **Gate:** local sessions run typecheck, lint, unit tests and build only. e2e and Lighthouse are left to CI; record
  them as "left to CI". Cloud sessions run the full gate.
- **Budgets:** `/` ≤ 190 KB br and `/character/` ≤ 250 KB br (`node scripts/route-weight.mjs`). Put the numbers in the
  PR.
- **Design:** the `CLAUDE.md` Design rules hold (square corners, uppercase EB Garamond labels, `:root` tokens rather
  than hex).
- **Finish:** push, open one PR (protocol sections), then **stop**. Don't watch CI or poll. The owner says when it's red,
  or green and merged.
- Save tokens: grep first, read slices, send independent tool calls together, cap listings.

---

## W0 Prep · wave 20 · Local · Sonnet

Files: `components/layout/{NavBar,CommandPalette,SearchDialog}.tsx` (and whoever mounts the overlays),
`packages/core/test/pob-bridge.test.ts`, `app/tokens.css`, `lib/types.ts`, `lib/storage.ts` (+ its test),
`docs/ui/LAUNCH-PLAN.md`, `docs/ui/UI-PROGRESS.md`.

1. **OD1-3 / MP1-2:** load `CommandPalette` and `SearchDialog` on first open (`next/dynamic` or `import()` on the
   trigger and on the Ctrl/⌘K handler). The keyboard shortcut has to work on the first press. Report `/` before and
   after.
2. **OD1-1** (owner OK given): run the `pob-bridge.test.ts` "gives up once the per-call budget is spent" test on vitest
   fake timers. Test-only.
3. **Palette** (`tokens.css`): physical `#c4beb4`, fire `#cf4524`, cold `#86ccf7`, lightning `#ffe23d`, plus new
   `--dmg-lightning-core: #fff7c2`, chaos `#7a2fb0`, plus new `--dmg-chaos-edge: #14061f`. Each fill must reach 3:1
   against `--surface`; if chaos fails, lift its lightness only. Grep for hard-coded old hex values (share card, sky)
   and point them at the tokens.
4. **Prefs:** add `homeStart: 'dashboard' | 'farming' | 'character' | null` and `proDetail: boolean` (default false)
   to the existing `poe2-endgame-companion:v1` payload. Old payloads must still load (add a test). Add hooks or getters
   only; no UI.
5. Commit `docs/ui/LAUNCH-PLAN.md` and the wave rows already in the working tree with this PR.

## C1 Content short + pro · wave 21 · Cloud · Opus

Files: `apps/web/src/data/*.ts` (not `data/farm/`), `lib/types.ts` (fields only), `components/checklist/*`,
`components/atlas/*`, `components/dashboard/*`, new `components/shared/ProToggle.tsx`, `lib/stepSummary.ts`.

- Owner's intent: by default, everyone sees the title plus **one "why" sentence** (`why: string`, ≤ 140 chars, plain
  words, why it is chosen rather than how it works). Cut tips that state common knowledge. Mark expert-only depth
  `pro: true` (tips, action items, mistakes, notes). Only steps with real expert value keep a pro layer; most steps
  won't.
- **Pro detail** toggle (`proDetail` pref from W0): one switch in the checklist, Atlas and dashboard headers, labelled
  "Pro detail". Off: why plus checkable items plus mistakes titles. On: today's full view.
- **Never** remove, reorder or re-id steps or `actionItems`; they are progress keys. Hide them with `pro: true`
  instead. Sources and citations stay in the data, and their flag shows only in Pro.
- Leave a `diagram?: 'waystone-ladder' | 'atlas-path' | 'boss-order'` field on the three steps V1 will illustrate
  (type only; render nothing yet).
- The carry file lists every step whose text changed (id → old/new word count) so the owner can skim it.

## H1 Home picker · wave 21 · Local · Opus

Files: `app/page.tsx`, `components/home/*`, new `components/home/StartPicker.tsx`, `styles/*` for the home only.

- Phone (≤ 720 px): the hero becomes one line (title plus patch eyebrow; the pitch, counts and date go below the fold
  or are hidden). A **picker** with three large square tiles comes first: **Dashboard**, **Farming**
  (`/dashboard#farm-…`, the FP1 deep link), **Character**. Everything else stays on the tab bar.
- Store the choice in `homeStart`. Once it is set, the chosen tile leads, "Up next" follows, and the picker collapses to
  a one-line "Change" control.
- Desktop keeps today's layout; the picker can sit as a slim row under the hero.
- Must fit `/` ≤ 190 KB br, using the headroom W0 freed.

## L1 Launch hardening · wave 21 · Cloud · Sonnet

Files: `services/ninja-proxy/**`, `apps/web/src/lib/proxy.ts`, `components/ImportBar.tsx`,
`public/manifest.webmanifest`, `app/character/page.tsx` (query param only), `components/layout/PatchVersionBanner.tsx`,
`lib/constants.ts`, `.github/workflows/ci.yml`.

- **Proxy:** cache each response about 60 s (`Cache-Control: s-maxage=60, stale-while-revalidate=120` plus an
  in-memory map), coalesce identical in-flight requests, and map upstream 429/5xx to 503 with `Retry-After`. Use
  `node:test` tests. Don't deploy; print the `vercel --prod` command for the owner.
- **Web:** on 503/429, show "poe.ninja is busy, retrying in N s" with a 3-step backoff and a Cancel button; the error
  appears only after that.
- **Share target:** add `share_target` (GET, `url` and `text` params) to the manifest. `/character?url=` (or a
  poe.ninja URL found inside `text`) prefills and auto-imports. Android and Samsung only; note that iOS has no support.
- **iOS paste:** a Paste button beside the input (`navigator.clipboard.readText()` on tap) that accepts a poe.ninja
  profile URL.
- **Patch switch:** a `DATA_MAY_BE_OUTDATED` constant. When it is true, the banner says "New patch: some data may be
  outdated" and links to What's new. Ship it as `false`.
- **CI:** a Lighthouse mobile job (lhci, built `apps/web/out`, `/` and `/character/`, mobile preset). It warns and
  doesn't fail for now; thresholds are LCP 2.5 s and CLS 0.1.

## CH1 Character showcase · wave 22 · Cloud · Opus

Files: `components/character/*` (incl. `ShareCard.tsx`), `lib/shareCard.ts`, `components/DpsMatrix.tsx`,
`components/character/CharacterResults.tsx`, new `components/character/Showcase.tsx`, `TopFixes.tsx`;
`packages/core/src/recommend*` wording only (owner OK given); trade links through `packages/core/src/trade/query.ts`.

- Order on the page: **Showcase** → **Top 3 fixes** → **Since last import** → the rest. Checks, Attribution and
  Cross-validation move into a closed "Advanced" fold.
- **Showcase:** name, class and level, a grade "stamp" (one-shot animation, reduced-motion safe), an **element damage
  ring** around the main-skill DPS (split colours from the W0 tokens), and life/ES/spirit plus the killer hit. Make it
  appealing: this is the player's brag card.
- **Top 3 fixes:** plain-English one-liners (shorten the core `action` text if it is jargon), each with a "Details"
  link to its section anchor and a **Trade** button with a prefilled trade2 search where `buildTradeQueries` can make
  one. TT1 found link shape and length unverified, so open the search page with `?q=` and fall back to "Open /trade"
  when there is no query.
- **Share card v2:** the showcase drawing replaces the findings. Add the element ring and "since last import" deltas
  (when history exists), and a **1080×1350 portrait** size next to 1200×630 (a size toggle in the dialog). Keep the
  word-boundary cut.
- `/character/` ≤ 250 KB br; the share card dialog stays lazy.

## V1 SVG diagrams · wave 22 · Local · Opus

Files: new `components/diagrams/*`, plus the three steps' render path in `components/checklist/ChecklistStep.tsx`
(diagram slot only, through the C1 `diagram` field).

- Own inline SVG with no game art: **Waystone tier ladder** (reforge 3→1, boss nodes, Doryani), **Atlas path** (the
  Arbiter route), **boss order**. Gold hairlines, square nodes, labels in uppercase EB Garamond, element tokens where
  relevant. Each diagram must read on its own in under 5 seconds at 360 px wide.
- Lazy-mount below the fold; `aria-label` text carries the same meaning as the picture.

## IMG-1 Design brief · owner · Claude chat or Claude Design (no repo)

Paste this into a new Claude chat (or Claude Design), iterate there, and bring the picks back to IMG-2:

```
Design mockups for "POE2 Endgame Companion", a free Path of Exile 2 helper used mostly on phones (390×844 iPhone,
360×780 Galaxy). Style rules: dark (#08080a page, #0d0d10 surface), gold accent #e3b341, square corners only (no
rounding anywhere), uppercase EB Garamond for headings/labels, Inter body, Geist Mono numbers, a faint gold
constellation sky behind. No game art: our own shapes only.
Element colours: physical #c4beb4, fire #cf4524, cold #86ccf7, lightning #ffe23d (core #fff7c2), chaos #7a2fb0
(edge #14061f). Gradients allowed; keep them CSS-cheap.

Make, as HTML/SVG mockups at phone width, 2–3 variations each, then refine the ones I pick:
1. Damage-split and resistance bars: (a) glass outline (1px element border, 20–30% tinted fill, bright leading edge),
   (b) segmented "rune" cells, (c) ring/dial. Show a fire/cold/lightning split and five resists (one under cap).
2. Character showcase header (name, class, level, grade stamp, element damage ring around DPS, life/ES/spirit,
   "kills you first" hit) and the same as a share card at 1200×630 and 1080×1350, with "since last import" deltas.
3. Home start picker: three large square tiles (Dashboard, Farming, Character) under a one-line hero.
4. A 12-icon line set (1.3px square-cap strokes): waystone, map boss, atlas node, tablet, breach, ritual, expedition,
   delirium, abyss, essence, shrine, trade.
5. Diagram style for: Waystone tier ladder, Atlas path to the Arbiters, pinnacle boss order.
For each pick, export the SVG/HTML and a one-line rationale.
```

## IMG-2 Visual build · wave 24 · Cloud · Opus

Input: the owner's IMG-1 picks (SVG/HTML pasted into the prompt or committed under `docs/ui/img/`). Build the chosen
bar style in `DpsMatrix`, `DefensePanel`, `Instruments` and `Showcase` (bars fill on first view, reduced-motion safe).
Also build the icon set (`components/icons/*`, inline SVG), share-card art refinements, and diagram restyles. Fold in
any QA-sweep fixes before the PR leaves draft.

## QA sweep · wave 24 · Cloud · Sonnet

After IMG-2's PR opens, check out its branch. Take screenshots at 390×844 and 360×780 of `/`, `/checklist`, `/atlas`,
`/dashboard`, `/character` (fixture import) and the share card in both sizes. Then run e2e and Lighthouse mobile.
Report findings to the IMG-2 PR as one comment (no session links); don't open a PR. Owner real-device pass:
Backlog U13b-1.


