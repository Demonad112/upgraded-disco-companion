# SB4 carry-over · 2026-10-31
PR: see tracker · Branch: ccr-4278c1a3-e97dih · Preview: n/a (docs only)

Side batch: validate wave 11 and the 2026-10-30 side batches, then write the prompts for waves 12–14. No tracker wave row.

## Checked (previous wave)
- Baseline on `main` (`bb6e0ba`): typecheck ok, lint ok, tests pass (core 704 + 7 skipped + 3 todo, web 145), build ok, e2e 205 passed + 3 skipped.
  CI on `main` green (run 136). Runs 134/135 show *cancelled* (superseded by the next merge), not failed.
- U7 (#60): ok. Merged, row ticked. `Footer.tsx` has four `<section aria-labelledby>` columns, `InstallButton` in Settings,
  Methodology and What's new linked. Tracker row had no PR number: added `#60`.
- W15-2 (#59): ok. `data-draw-in` on the hero and `data-pulse` on the tool cards in `app/page.tsx`. Not in the tracker: added a
  Backlog row.
- SB3 (#58): ok. `pr-body-guard.yml` and `scripts/check-pr-body.mjs` on `main`. Added a Backlog row.
- P1 (#55), SB2 (#56): already recorded; nothing new.

## Resolved from earlier carry files
- A2-1: done. Production `og-cover.jpg` returns `cache-control: public, max-age=86400, stale-while-revalidate=604800`.
- A8-1: done. The proxy echoes `access-control-allow-origin: https://upgraded-disco-companion.pages.dev` with `vary: Origin`, so the
  T20 deploy is live.
- U7-1: UI-PLAN U7 text fixed (plain credit line; `Attribution.tsx` is the per-item panel).
- SB1-2: `HANDOFF.md` status block refreshed to wave 11 done, next wave 12.
- **New, fixed here (SB3 follow-up):** the PR body guard passed the body through the step's `env:`, and the runner prints env
  values in the job log, so a failing run published the session URL it blocks (seen on this PR's first guard run). The script now
  reads `$GITHUB_EVENT_PATH`; `PR_TITLE` / `PR_BODY` still override for tests. 3 tests added (11/11), no assertion changed.
- U4-2: done in #55 (P1 dropped the phone blur on the Dashboard and Atlas tab bars). U11b only re-checks it.

## Open (routed to the next waves; the prompts below carry them)
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | U10 | U4-4 / SB2-8: no shared `Input`. | U10 adds `Input` to `shared/controls.tsx` + `controls.css` on the `.select` box model (44 px) and uses it on Character (import URL, paste textarea, Chat). U11b reuses it for Atlas search. |
| 2 | decision | U11b | U6-2: tab bar says "Farming", everything else says "Dashboard". | Tab goes back to "Dashboard": one word, one file (`navLinks.tsx`), matches page title, Ctrl K and sitemap. |
| 3 | bug | U11b | `AtlasTreeMap.tsx` keeps `backdrop-blur` on the map controls, node chip and tooltip; U4-2 only covered the tab bars. | Drop it in U11b's control rebuild. |
| 4 | follow-up | U13 | Carry items for final QA: A5-4, A7-4, A8-2, P1-3, P1-4, U2-4, U4-1, U6-3, U7-2, U7-3, U8-3, U12-4, W15-pulse-2. | Listed in the U13 prompt. |

## Needs owner
- SB3-1: make `PR body guard / guard` a required check in branch protection. Recommended: yes; an unrequired check only warns.
- SB3-2: add to SESSION-PROTOCOL Finish step 4: "after creating the PR, remove any session link the tooling appended to the body".
  Recommended: yes; the PR tooling appends it by default and the guard then goes red. The prompts below say it explicitly meanwhile.
- SB4-1: delete the logs of guard runs that failed on a session link: run 41174630514 (this PR) and the two failed runs on #58.
  Recommended: yes; the logs still hold the URL. Actions > run > ⋯ > Delete all logs.
- W15-pulse-1: eyeball the hover pulse and hero draw-in on production. Recommended: accept unless the draw-in feels slow.
- Branch cleanup: merged `variant/*` and `claude/*` branches are still on origin. Recommended: delete merged ones after U13, not
  before (their Pages previews are the review record).

## Run order

| When | Session | Where · model | Branch | Parallel with |
|---|---|---|---|---|
| Now | **U10** character page | Local · Opus 5.5 high | `variant/20261031-character` | U11a |
| Now | **U11a** checklist | Cloud · Sonnet 5.5 medium | `variant/20261031-checklist` | U10 |
| After both U10 and U11a merge | **U11b** dashboard + atlas | Cloud · Sonnet 5.5 medium | `variant/<yyyymmdd>-dash-atlas` | none |
| After U11b merges | **U13** final QA | Local · Opus 5.5 high | `variant/<yyyymmdd>-final-qa` | none |

U11b waits for U10 because it reuses U10's `Input`. U13 runs last on the merged tree; it needs a real phone and Safari.

## Prompts

### U10 (wave 12, local)
```text
Session U10 (wave 12). The parallel session is U11a, which owns apps/web/src/components/checklist/*, apps/web/src/app/checklist/*, apps/web/src/components/shared/Gloss.tsx and apps/web/src/data/glossary.ts; don't touch them.
1) Follow docs/SESSION-PROTOCOL.md Start.
2) Do batch U10: read CLAUDE.md, the Ground rules and the U10 section of docs/ui/UI-PLAN.md; branch variant/20261031-character.
3) Follow Finish, then stop.
Owner notes:
- Add an `Input` (and textarea variant) to components/shared/controls.tsx + styles/controls.css on the `.select` box model (44 px, --tap-min, one focus ring). Use it for the import URL, paste textarea and Chat input on Character (U4-4, SB2-8). Don't change Atlas search; U11b adopts it next wave.
- Move the remaining small hand-styled Character buttons to `Button` (U4-3): GearWorkbench Undo/tier/add/remove, ReplacementPlanner, LastCharacterCard CTA, Chat chips. What-if re-craft checkboxes reach 24 px minimum hit area.
- Prose labels in Character cards (Chaos resistance, DefensePanel and OverviewCards captions) go on `.label-field` (U3-2).
- If the home Character tool card line gains figures, read them from `latestSnapshot`, not `recentCharacters[0]` (OQ1-1).
- No `packages/*` changes; if a figure isn't exposed, leave it out and log it.
- After creating the PR, remove any session link the tooling appended to the PR body (the PR body guard fails on it).
```

### U11a (wave 12, cloud)
```text
Session U11a (wave 12). The parallel session is U10, which owns apps/web/src/app/character/*, apps/web/src/components/character/*, BuildScore.tsx, Recommendations.tsx, DefensePanel.tsx, Headroom.tsx, DamageReview.tsx, apps/web/src/components/shared/controls.tsx and apps/web/src/styles/controls.css; don't touch them.
1) Follow docs/SESSION-PROTOCOL.md Start.
2) Do batch U11a: read CLAUDE.md, the Ground rules and the U11a section of docs/ui/UI-PLAN.md; branch variant/20261031-checklist.
3) Follow Finish, then stop.
Owner notes:
- Phase rail chips reuse `<Gauge size="sm" hideLabel>` or `gaugeModel()` from lib/gauge.ts; no third bar (U5-2).
- Gloss once per step: pass one shared `seen` set from ChecklistStep into glossSegments (P1-1). Gloss.tsx is yours this wave; keep the Character finding-rationale call site working.
- Completed steps: dim to --ink-mute with a gold check; no background tint under the data fill (U2-2).
- NextStepCard is also the home "Up next" block: any change must leave home's Up next unchanged (U8 design invariant).
- New CSS goes in a new styles/checklist.css imported from globals.css, not in controls.css (U10's file).
- Rail must not scroll the page horizontally at 280 px; check 280/320/390.
- After creating the PR, remove any session link the tooling appended to the PR body (the PR body guard fails on it).
```

### U11b (wave 13, cloud; start after U10 and U11a are merged)
```text
Session U11b (wave 13). No parallel session.
1) Follow docs/SESSION-PROTOCOL.md Start.
2) Do batch U11b: read CLAUDE.md, the Ground rules and the U11b section of docs/ui/UI-PLAN.md; branch variant/<yyyymmdd>-dash-atlas.
3) Follow Finish, then stop.
Owner notes:
- U6-2: the phone tab bar label goes back to "Dashboard" (navLinks.tsx) so one word is used everywhere; update any e2e locator that follows the label, remove no assertion.
- Atlas search uses U10's `Input` from components/shared/controls.tsx, with the clear button and result count.
- If StrategyTable's opaque `bg-surface-raised` fill is removed, tag its list `data-surface="data"` instead (U2-3).
- U4-2 was done in #55 for the sticky tab bars. AtlasTreeMap.tsx still has `backdrop-blur` on the + − fit buttons, the selected-node chip and the hover tooltip (lines ~354–372): drop it while rebuilding those controls (no backdrop-filter; the fills are already /90–/95).
- Check the "Dashboard" tab label fits the tab bar at 280 px. If it doesn't, keep "Farming" and log it under Needs owner rather than inventing a third word.
- Pills carry text as well as colour; check with forced colours on.
- After creating the PR, remove any session link the tooling appended to the PR body (the PR body guard fails on it).
```

### U13 (wave 14, local; start after U11b is merged)
```text
Session U13 (wave 14). No parallel session.
1) Follow docs/SESSION-PROTOCOL.md Start.
2) Do batch U13: read CLAUDE.md, the Ground rules and the U13 section of docs/ui/UI-PLAN.md; branch variant/<yyyymmdd>-final-qa.
3) Follow Finish, then stop.
Owner notes:
- Fix in this PR (small): share card cuts long text at a word boundary, not mid-word (P1-4, lib/shareCard.ts); remove `--data-fill-blur` from tokens.css if nothing uses it (U2-4).
- Check on real devices and record the result: keyboard hides the tab bar on iOS Safari and Android Chrome (U6-3); Install app shows on Chrome and the iOS hint on Safari (U7-2, U12-4: use DevTools Application > Manifest, Lighthouse has no PWA category); share card on Safari 17 (P1-3); character import from production and one preview host (A8-2); watch the sky ~30 s for twinkle stepping (A5-4); hover pulse and hero draw-in feel (W15-pulse-1).
- Lighthouse per docs/audit/04-PERFORMANCE-BASELINE.md on a GPU machine at 1440 @1 and 390 @2; home JS ≤ +10 KB brotli vs post-A3. The LCP element is the Up next description, not the hero title (U8-3); record it, don't chase it.
- Keep footer rows at 32 px (axe target-size, U7-3). Tab rows: decide roving tabindex + aria-labelledby on tabpanels (U4-1); implement if small.
- Re-run the sharing.spec.ts workbench flake 10× on Windows with 2 workers (A7-4); quarantine nothing.
- Update HANDOFF.md. After creating the PR, remove any session link the tooling appended to the PR body.
```
