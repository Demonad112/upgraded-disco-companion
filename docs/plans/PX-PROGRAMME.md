# PoE2 Endgame Companion: presentation, UX and performance programme (PX)

## Context

The app is a PoE2 character analyser and endgame companion: poe.ninja import → graded verdict, ranked fixes, defences,
damage, gear; plus checklist, atlas planner, farm guide and trade helper. Static Next export on Cloudflare Pages, all
analysis in `@poe2/core`, 130 merged PRs, gate green. The engineering is ahead of the presentation: the analysis is
rigorous, but the page that shows it is a long desktop-shaped scroll. This programme makes the character analysis look
and read like something a player wants to open on their phone beside the console.

Reference page for every batch:
`/character/?import=https%3A%2F%2Fpoe.ninja%2Fpoe2%2Fprofile%2FDemonad112-2589%2Fforbiddenrites%2Fcharacter%2FYykiuy`

Not done in plan mode: no build, no Lighthouse, no e2e. Weights are the register's 2026-11-08 figures.

## Owner vision (decided 2026-11-12; these override my earlier draft)

| Topic | Decision |
|---|---|
| Audience | Players and gamers; all three levels, layered: simple first, depth one tap away |
| Device | **Phone first**, then PC. Console players use it on a phone beside the game |
| First 10 seconds | Looks incredible first, then the important info: main damage and the top 3 improvements |
| First screen after import | Build card hero: name, class, grade, main skill DPS, killed-by. Top 3 right under it |
| Page shape | Tabs, one section at a time (not one long scroll) |
| Fix cards | New players: action + gain + one button. Pro detail on: full tier and roll detail visible |
| Extras wanted | "Since last import" for returning players; **Easy wins** ranked by value |
| Easy wins ranking | Calculated from mods and weighted mods. No prices |
| Wow factor | Class and skill character-sheet header, stat tiles like item cards, motion and glow |
| Design limits | Keep the decided rules, raise the craft |
| Sky vs text | **Readability wins**: bars and data panels solid; sky in margins, hero and home |
| Other tools | Checklist, atlas, farm stay standalone guides. No linking to the character needed |
| Home (returning) | My character + next step; the big hero is for first-time visitors |
| Bottom bar | Character, Farm, Atlas, Checklist ("Dashboard" label becomes "Farm"; URL unchanged) |
| Guide pages on phone | Compact rows, one gold action, atlas map as a sheet |
| Performance goal | Fast from Analyse to the build card and Top 3; deeper tabs load when opened |
| Review | Preview link per batch with before/after phone screenshots |
| Autonomy | Start to finish, no questions |
| `packages/core` | Allowed, add-only with tests. Existing numbers and wording do not change |

## What I saw on the live site

| # | Finding | Evidence | Batch |
|---|---|---|---|
| 1 | After import the grade is ~850 px down; page is 11,833 px on a phone, ~60 headings, 2,091 nodes | measured | PX3, PX4 |
| 2 | Sticky tab bar and phone bottom bar are see-through; text shows through labels | `/atlas` y=1100; all phone shots | PX1 |
| 3 | Top-3 fix 2 leaks a truncated tier/roll string in default view; trade button is "Open /trade" on two fixes and "Trade" on one | `/character` Top 3 | PX2 |
| 4 | Small mono labels are dim over the moving sky | all routes | PX1, PX8 |
| 5 | Home repeats the nav in three tiles and shows the full hero to returning players | `/` | PX6 |
| 6 | Farm page: five full-width gold buttons per screen; risk pips red at every level; 7,805 px on a phone | `/dashboard` | PX7 |
| 7 | Atlas map: grey unlabelled nodes, a third of the frame empty; 5,653 px on a phone | `/atlas` | PX7 |
| 8 | Every route is 190–233 KB br; `/` has 1,715 B headroom; `/checklist` is 380 KB HTML; no `content-visibility`; Lighthouse CI covers 2 of 8 routes, 1 run, no interaction metric | register §5 | PP1 → PX9–PX11 |
| 9 | 21 e2e specs, none pins pixels, so each design batch is judged by eye | `apps/web/e2e/` | PX0 |

## Rules for every batch (context economy)

Header to paste into each run:

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch <ID> from docs/plans/PX-PROGRAMME.md; read its section and the
"Owner vision" table only. Phone first: build and check at 390x844 before 1440x900.
- Run start to finish. Answer every open question with the recommended option and record it in one line in the PR.
  Stop only for a gate you cannot fix in 3 attempts or a change to a rule in CLAUDE.md "Design" not already in Owner vision.
- Replies: one or two sentences. Final message = PR link, preview URL, gate table, open items.
- Grep first; read only files you will edit; cap output with | head; never truncate failures.
- PR body carries before/after screenshots at 390x844 of the reference character. No session links on GitHub.
```

Verification tiers (cheapest tier that can catch the break, at the point it can first occur):

| Tier | When | Commands |
|---|---|---|
| T1 | after each logical change | `npm run typecheck`, `npm run lint`, the touched vitest file |
| T2 | right after any shared-file change (`globals.css`, `tokens.css`, `layout.tsx`, `nav.css`, `bars.css`, `ui.tsx`) or any `packages/core` change | T1 + core tests if core changed + the e2e specs for that surface, `--trace off` + PX0 screenshot diff |
| T3 | once, at batch end | full SESSION-PROTOCOL gate incl. `route-weight` and full e2e |

Shared files and core break every route, so they are checked at once; leaf components wait for T3.

Branches: PX1, PX2, PX5 are normal branches. Batches that change look or layout use `variant/<yyyymmdd>-<slug>` and are
reviewed on the Pages preview. Each batch that implements an Owner-vision decision updates the matching line in
CLAUDE.md "Design" in the same PR (solid data panels, tab order, "Farm" label).

## Waves

W0 planning runs alongside W1. W2 needs PP2 and PX0. W4 needs PP1.

| Wave | Batch | Model · effort | Scope | Depends |
|---|---|---|---|---|
| W0 | **PP1** performance plan | Fable · high | Measure; write PX9–PX11 in full | — |
| W0 | **PP2** character page spec | Fable · high | Build card, tabs, fix cards, easy-wins formula | — |
| W0 | **PP3** design + accessibility audit | Fable · medium | Skill-driven audit → PX8 rows | — |
| W1 | **PX0** screenshot baseline | Sonnet · medium | Pixel net for later batches | — |
| W1 | **PX1** solid bars and panels | Sonnet · low | Findings 2, 4 | — |
| W1 | **PX2** fix cards: new vs Pro | Sonnet · medium | Finding 3 | — |
| W2 | **PX3** build card hero | Opus · high | First screen, wow factor | PP2, PX0 |
| W2 | **PX4** character tabs | Opus · high | One section at a time | PX3 |
| W2 | **PX5** easy wins | Opus · high | Core ranking + UI | PP2 |
| W3 | **PX6** home and bottom bar | Sonnet · medium | Finding 5 | PX3 |
| W3 | **PX7** farm and atlas on phone | Sonnet · medium | Findings 6, 7 | PX0 |
| W3 | **PX8** type, contrast, spacing | Sonnet · medium | PP3 rows | PP3 |
| W4 | **PX9–PX11** performance | per PP1 | Finding 8 | PP1, PX4 |
| W5 | **PX12** final QA | Sonnet · medium | Regression, Lighthouse all routes | all |

### PX0 Screenshot baseline
`apps/web/e2e/visual.spec.ts`: 8 routes × (390×844, 1440×900) plus `/character` with the bundled fixture from
`e2e/fixtures.ts`; `toHaveScreenshot`, `maxDiffPixelRatio 0.01`; reduced motion on and `.sky-canvas` masked so stars
never fail a diff; baselines from CI Linux Chromium only. Done when two consecutive CI runs show zero diff.

### PX1 Solid bars and panels (readability wins)
1. `styles/nav.css:21` phone tab bar and the stuck state of `.bar.idx` (`styles/bars.css`, `shared/ScrollSpyNav.tsx`):
   fully opaque `--surface`.
2. `--data-fill` in `app/tokens.css` becomes opaque for data panels; home and hero keep clear glass. With no sky behind
   them, drop `backdrop-filter` on data panels (removes real paint work on phones).
3. `main` bottom padding ≥ tab bar height + `env(safe-area-inset-bottom)`.
- Gate: T2 (`nav.spec.ts`, `layout.spec.ts`, `sky.spec.ts`). Done when no text is legible through any bar or data panel.

### PX2 Fix cards: new vs Pro
1. Default card: action title, one gain line ("Chaos resistance 69% → 75%"), one button. The tier/roll sentence shows only
   when Pro detail is on (`ProOnly` / `ProSwap` already exist). Source: `components/Recommendations.tsx`,
   `character/OverviewCards.tsx`; text from `packages/core/src/recommend/gear.ts`. If core has no short field, add one
   (add-only, with a test); do not reword existing strings.
2. One trade label everywhere: "Find on trade". "Details" styled as its sibling button.
3. `apps/web/test/shortCopy.test.ts` covers Top-3 bodies on both fixtures.
- Done when no default Top-3 body is truncated at 390 px, and Pro detail shows the full text.

### PX3 Build card hero
Implements PP2 §1. Fixed intent: after import the page title and import box collapse to one line; the first phone
screen is one card with a character-sheet header (name, level, class and ascendancy, league, main skill; text and glyphs
only, no game art), the grade, and four item-card stat tiles (main skill DPS, killed-by, life, energy shield) with
resistances as a strip. Motion: card draws in once, numbers count up, foil sheen; all off under reduced motion and none
of it may delay the numbers being readable. Top 3 start directly under the card. Reuse `character/Showcase.tsx`,
`BuildScore.tsx`, `OverviewCards.tsx`, `styles/motion.css`; tokens only.

### PX4 Character tabs
Implements PP2 §2. The sticky bar becomes real tabs: Overview (card, Top 3, since last import, easy wins), Defence,
Damage, Gear, Progress, Advanced. One panel mounted at a time; swipe and arrow keys move between them; the tab is kept in
the URL hash so `?import=` links and e2e deep links still work. Lazy JSON (`mod-tiers`, `mod-display`, `passive-tree`)
is fetched when its tab opens, not on import. "Since last import" leads Overview when a prior snapshot exists
(`lib/storage.ts`, `components/Progress.tsx`). e2e selectors follow; no assertion removed.

### PX5 Easy wins
Implements PP2 §3. A new add-only core function ranks candidate fixes by value from mods: gain toward the character's
own gaps (uncapped resistances, killed-by hit, empty affix slots, low tiers) weighted with the existing mod weights in
`packages/core/src/upgrade/scoring.ts` and `gear/tiers.ts`, grouped by effort using the existing cost kinds (free,
craft, gear). No prices, no invented constants: weights that cannot be derived are reported as missing. UI: an "Easy
wins" block on Overview, three rows, same card as PX2. Core tests on both fixtures; MCP tool list unchanged unless
`npm run tools` shows a diff.

### PX6 Home and bottom bar
Bottom bar and nav order: Character, Farm, Atlas, Checklist (label only; `/dashboard` stays). Returning players (a saved
character in `storage.ts`): build card summary (`home/LastCharacterCard.tsx`) and one next-step card on top, hero reduced
to the title. First-time visitors keep the hero; the three duplicate tiles become one primary action, "Analyse my
character", and one secondary. Home JS must be net ≤ 0 B br (1,715 B headroom).

### PX7 Farm and atlas on phone
`components/farm/*`, `styles/quick-picks.css`: farms as compact rows (name, risk, open), one gold action for the top pick,
risk pips coloured by level with existing tokens. `components/atlas/AtlasTreeMap.tsx`: map opens as a sheet from the row's
Map button on phones, fits to content, guide nodes numbered. Targets at 390 px: farm ≤ 4,500 px, atlas ≤ 3,500 px.

### PX8 Type, contrast and spacing
PP3's accepted rows; token edits in `tokens.css` only.

### PX12 Final QA
Full e2e, PX0 baselines refreshed once, Lighthouse and axe on all 8 routes, 280 px to 1920 px sweep, baseline doc updated.

## Side-plan prompts (each in its own chat; docs-only, no gate)

### PP1 Performance plan
```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Planning batch PP1; write docs/plans/PERF-PLAN.md and docs/carry/PP1.md only.
Read "Owner vision" in docs/plans/PX-PROGRAMME.md. Primary metric: on a phone (390x844, 4x CPU throttle, Fast 4G),
time from tapping Analyse to the build card and Top 3 being painted and readable. Measure before proposing.

Measure (npm ci, build core, npm run build, serve apps/web/out with apps/web/e2e/serve.mjs):
1. Import timeline for the reference character and the bundled fixture: proxy fetch, parse, core analyse, first paint
   of the grade, first paint of Top 3, last layout shift. Which step dominates; what runs on the main thread.
2. Which lazy JSON is fetched on import (mod-tiers 101 KB br, mod-display 108 KB, passive-tree 96 KB, trade2-stats 76 KB)
   and which of it the Overview actually needs.
3. node scripts/route-weight.mjs for all routes; list every chunk on / and /character with br size and contents.
   Name the shared floor loaded on all 8 routes. Is @poe2/core in it (audit PERF-01), and which routes call it?
4. Per route, phone profile: LCP element and time, CLS, TBT, long tasks > 50 ms, interaction delay for tab switch,
   accordion open, checklist tick.
5. Canvas cost on a phone: sky and card-links sizes, script ms per frame idle and scrolling, whether rAF stops when
   hidden, off-screen, under reduced motion, or behind a solid data panel.
6. /checklist (380 KB HTML, 2,191 nodes) and /character after import (2,091 nodes): share below the fold, render cost.
7. Fonts preloaded vs used above the fold; CSS size and unused share per route; cost of backdrop-filter panels.
8. Service worker: precache list and size, second-visit cache hits, update path.

Write three batches, each with files, ordered steps, tier gate, "done when" and expected saving in ms or B br:
- PX9 import path: get the build card painted first; defer everything the Overview does not need to its tab (PX4).
- PX10 load and render: shared floor, route splitting, content-visibility, DOM reduction, phone canvas work.
- PX11 guardrails: Lighthouse CI on all 8 routes, 3 runs, phone profile, TBT assertion, an import-to-card timing test
  in e2e, per-route budgets enforced in CI.
Apply the 5 % bar from CLAUDE.md; list anything under it in "Not worth it" with its number; do not re-propose rows in
REMAINING-WORK.md "Do not do" unless a measurement changes the answer. Reply in two sentences plus the PR link.
```

### PP2 Character page spec
```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Planning batch PP2; write docs/plans/CHARACTER-SPEC.md and
docs/carry/PP2.md only. Read "Owner vision" in docs/plans/PX-PROGRAMME.md; it is decided, do not reopen it.
Build, serve, import both fixtures (Yykiuy, Athrynas) and screenshot every section at 390x844, then 1440x900.
Deliver three specs, phone first, each precise enough that the build batch asks nothing:
1. Build card hero (PX3): exact content and order, which existing fields feed it (name the core result fields and the
   components in apps/web/src/components/character/), sizes, tokens, the motion sequence with durations and the
   reduced-motion version, and the collapsed one-line import bar. Use frontend-design:frontend-design inside the decided
   rules in CLAUDE.md "Design" (dark, gold, square corners, EB Garamond capitals). No game art or copied assets.
2. Tabs (PX4): assign every one of the ~60 current headings to a tab, a Pro-detail slot, or "merge with X" where two
   blocks say the same thing (Defences at a glance vs Defences; Top 3 vs Findings; Advanced vs Damage). Give a target
   height per tab at 390 px, the hash scheme, swipe and keyboard behaviour, and the e2e selectors that change.
3. Easy wins (PX5): the calculation. Inputs available today in packages/core (upgrade/scoring.ts, gear/tiers.ts,
   gear/replace.ts, recommend/*, trade/query.ts weightedTradeLink). Define value from mods and weighted mods against the
   character's own gaps, effort groups from existing cost kinds, tie-breaks, and what is reported as missing. No prices,
   no invented thresholds. Give the function signature, three worked examples from the Yykiuy fixture with real numbers,
   and the tests to write. Add-only: no existing number or string changes.
Also list "since last import" content for a returning player from the snapshot data in lib/storage.ts.
Reply in two sentences plus the PR link.
```

### PP3 Design and accessibility audit
```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Planning batch PP3; write docs/plans/DESIGN-AUDIT.md and docs/carry/PP3.md only.
Read "Owner vision" in docs/plans/PX-PROGRAMME.md. Build, serve, screenshot all 8 routes plus the imported reference
character at 390, 768 and 1440 px; phone findings rank first.
Run each skill as one section: vectorlab-ux-skills:ux-audit, design:accessibility-review, vectorlab-ux-skills:typography,
:spacing, :colour-palette, :viewports, :empty-states, :motion, :reduced-motion, :verbs, :keyboard.
The decided design is fixed. Where a skill's default contradicts it (rounded corners, no glass, no decorative motion),
write "conflicts with decided design, skipped" and move on. Check touch targets ≥ 44 px and thumb reach for the bottom
bar and tabs. Measure contrast for every text token on its real background.
Output one table: finding, route, file, severity, fix, size. Accepted rows form PX8; the rest go to "Not doing" with a
reason. Skip anything already covered by PX1–PX7. Reply in two sentences plus the PR link.
```

## Orchestration

One chat acts as orchestrator. It never builds; it hands out work, checks results and keeps the master plan current.
Run the planning prompts (PP1–PP3) outside plan mode: they need to build and measure, and they only write docs.

Order:

| Step | Runs | In parallel | Comes back as |
|---|---|---|---|
| 1 | PP2 character spec, PP1 performance plan, PP3 design audit | yes, three chats | `docs/plans/CHARACTER-SPEC.md`, `PERF-PLAN.md`, `DESIGN-AUDIT.md` (draft PRs) |
| 2 | Orchestrator merges the three into `docs/plans/PX-MASTER.md` | — | every batch PX0–PX12 with its final prompt, branch, order and dependencies |
| 3 | W1: PX0, PX1, PX2 | yes | three PRs |
| 4 | W2: PX3, then PX4; PX5 alongside PX3 | partly | variant previews |
| 5 | W3: PX6, PX7, PX8 | yes | variant previews |
| 6 | W4: PX9, PX10, PX11 | in PERF-PLAN's order | PRs |
| 7 | W5: PX12 | — | final QA PR |

Each variant batch gets its own `variant/<yyyymmdd>-<slug>` branch and preview; a later batch branches off the previous
merged one, never off an unmerged variant, so each preview shows one change.

### Orchestrator prompt
```
You are the orchestrator for the PX programme of the PoE2 Endgame Companion. Follow CLAUDE.md. Do not edit source code
yourself. Replies: short. Answer open questions with your recommended option and say which you picked.

Setup: git fetch origin. Read docs/plans/PX-PROGRAMME.md (if it is not on main, read it from
origin/claude/festive-euler-q02lqu). Read docs/carry/README.md and the PX rows in docs/remaining/REMAINING-WORK.md to
see which batches are already done; skip those.

Then work through the Orchestration table one step at a time:
1. For the current step, try to start each batch as a new cloud session (create_session: this repo, base branch
   origin/main or the branch that holds the plans, the batch's model, the batch's prompt from the plan with the standard
   header, not plan mode). If I approve, watch them with get_session and list_events instead of polling in a loop;
   schedule one check-in rather than waiting.
2. If session creation is denied or unavailable, print the prompts for this step instead: one fenced block per chat,
   numbered in run order, marked "run together" or "run after N", each with the model and effort to pick. Then stop and
   wait for me to paste back each chat's PR link or its plan text.
3. When results come back (PR links or pasted text), check each against its "Done when": read the PR diff or the doc,
   not the whole repo. List anything missing as a follow-up prompt for that same chat.
4. After step 1 of the table (PP1, PP2, PP3), write docs/plans/PX-MASTER.md: every batch PX0 to PX12 in run order with
   wave, dependencies, branch name, model and effort, the final ready-to-paste prompt (taken from the three plan docs,
   conflicts between them resolved and noted), the verification tier for each step, and done-when. Where two plans touch
   the same file in the same wave, put them in sequence. Commit it on a docs branch and open a draft PR.
5. After every later step, update the status column in PX-MASTER.md and the register rows, then give me the next step's
   prompts or start its sessions.
Stop and ask me only when a batch fails its gate three times, two plans conflict on an Owner-vision decision, or a
batch needs a change to CLAUDE.md "Design" that the Owner vision table does not already cover.
Start now with step 1.
```

## Lower confidence or lower value (last, or not at all)

| Item | Why it is here |
|---|---|
| "Try an example" button | Not picked; the `?import=` link already demos a full analysis. Cheap to add later |
| Share image upgrade | Not picked; `ShareCard.tsx` exists and works |
| Personalised farm, atlas and checklist | Owner: tools are standalone guides |
| Live or poe.ninja prices for fixes | Owner: rank by mods, no prices |
| Light theme, cursor effects beyond the lantern | Deferred by the owner |
| Fold the top banner into the patch chip | 32 px saved; touches a deliberate disclosure |
| Controller or TV-browser layout | Console players use a phone; no hardware to test (R47) |
| Methodology as a visual explainer | 7,604 px on a phone but low traffic |
| Privacy-friendly analytics | Would show which routes matter; needs a CSP change and an owner decision |
| Onboarding tour | The build card and tabs should make it unnecessary |
| Accounts or cross-device sync | Contradicts the client-only design |
| PoB probes, MCP changes, danger calibration (R10), R39, R50 | Tracked in the register; PP1 may reopen R50 with numbers |

## Filing

This file is the programme. Register rows are in `docs/remaining/REMAINING-WORK.md` §6; carry-over is `docs/carry/PX.md`.
Run PP1, PP2, PP3 and PX0–PX2 first, each as its own chat.

## Verification of the programme

- PX0 baselines pass twice in CI before any variant batch starts.
- Each batch: T3 gate green, route-weight before and after, preview URL and phone before/after screenshots in the PR.
- End state (PX12) on the reference character at 390×844: build card and the first fix in the first screen; every tab
  within PP2's height target; no text visible through any bar or panel; import-to-card time at PP1's target and enforced
  in CI; all 8 routes under budget and in Lighthouse CI.
