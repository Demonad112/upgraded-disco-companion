# PX-MASTER · consolidated run plan for the PX programme

Supersedes the wave table and the orchestrator prompt in `docs/plans/PX-PROGRAMME.md` ("Waves", "Orchestration").
The Owner vision table, the findings and the batch sections PX0–PX12 in that file still hold. Nothing in Owner vision
changes here; only the packaging does: 16 batches in 6 waves become 6 sessions in 3 waves.

## Status (2026-11-12, 11:10 UTC)

| Session | State | Where | What is missing |
|---|---|---|---|
| PP1 performance plan | partial, draft PR open | PR 134, `claude/pp1-perf-plan`, `docs/plans/PERF-PLAN.md` | Items 4–8 not measured; PX10 and PX11 are drafts. PX9 is complete |
| PP2 character spec | partial, draft PR open | PR 133, `claude/pp2-character-spec`, `docs/plans/CHARACTER-SPEC.md` | Athrynas easy-wins rows, e2e selector audit, bar heights, swipe threshold, 1440 px pass, done-when lines |
| PP3 design audit | partial, merged | PR 132, `docs/plans/DESIGN-AUDIT.md` | ux-audit, spacing, empty-states and verbs sections; File column for rows 2, 3, 8; the PX8 batch text |
| PX-MASTER | this file | `claude/sleepy-lovelace-qdyh8h` | — |
| PXA, PXB, PXC | not started | — | Start after PR 133 and PR 134 merge |

All three planning sessions were stopped early by the owner. Decision: **no continuation sessions**. The measured
parts are enough to build from, and each gap is assigned below to the build session that owns the code, as
"measure first, then build". The continuation prompts in `docs/carry/PP2.md` and `docs/carry/PP3.md` are not run.

## Shape

| Wave | Session | Covers (old IDs) | Lead model · effort | Branch | Runs |
|---|---|---|---|---|---|
| W0 | PP1, PP2, PP3 | planning | — | `claude/pp*` | done (partial) |
| W1 | **PXA Character** | PX2, PX3, PX4, PX5, PX9 | Opus · high | `variant/20261112-character` | together with PXB |
| W1 | **PXB Shell and guides** | PX1, PX6, PX7, PX8 | Sonnet · medium | `variant/20261112-shell` | together with PXA |
| W2 | **PXC Speed, guardrails, QA** | PX10, PX11, PX0, PX12 | Sonnet · high | `claude/pxc-perf-qa` | after PXA and PXB merge |

Every old ID appears once: PP1–PP3 (W0), PX2 PX3 PX4 PX5 PX9 (PXA), PX1 PX6 PX7 PX8 (PXB), PX0 PX10 PX11 PX12 (PXC).

## Why these three groups

The split follows file ownership, so the two W1 sessions never touch the same file.

- **PXA owns `/character` and `packages/core`.** Fix cards, build card, tabs, easy wins and the import path all edit
  the same page. PX9 (lazy JSON on tab open, one `analyzeCharacter` run per import; see
  `apps/web/src/app/character/page.tsx:61-105`) is the same code as the tabs, so it is built once.
- **PXB owns the shared shell and the guide pages.** `app/tokens.css`, `app/globals.css`, `styles/nav.css`,
  `styles/bars.css`, `styles/footer.css`, `shared/ScrollSpyNav.tsx`, `home/*`, `components/farm/*`,
  `components/atlas/*`, the checklist row components, `styles/quick-picks.css`, and CLAUDE.md "Design".
- **PXC runs last because it measures the finished site.** Screenshot baselines (old PX0) move here: a baseline
  taken before a redesign pins pixels that are about to change on purpose.

| Overlap in the old plan | Resolution |
|---|---|
| PX1 and PX4 both edit the sticky bar | PXB keeps `bars.css` and `ScrollSpyNav.tsx`. PXA builds a new `CharacterTabs` component with its own stylesheet and stops using `ScrollSpyNav` on `/character` |
| PX3 and PX8 both want tokens | PXA does not edit `tokens.css`; it defines component variables in its own stylesheet from existing tokens. PXB owns all token edits |
| PX6 home card depends on the PX3 build card | PXB uses the existing `home/LastCharacterCard.tsx` data. PXC aligns its look with the finished build card |
| Several batches edit CLAUDE.md "Design" | PXB makes all of them (solid data panels, tab order, "Farm" label) |
| Every batch edits the register and `docs/carry/README.md` | Batches write only their own `docs/carry/<ID>.md`. The orchestrator updates the register, the README and this Status table once per wave |

## Plan-doc gaps and who closes them

| Gap | Owner | How |
|---|---|---|
| CHARACTER-SPEC "Unverified / to finish" (Athrynas easy-wins rows, e2e selector audit, nav and bottom bar heights, swipe threshold, 1440 px targets, keyframe durations) | PXA | Measure each before the commit that depends on it; record the number in `docs/carry/PXA.md` |
| Tab label "Advanced" vs "Checks" | PXA | "Advanced"; "Checks" only if the bar overflows at 390 px |
| `gear-open-affixes` has no axis, so no easy-wins value | PXA | List it with "value not measured"; no invented weight |
| Easy-wins inputs live in web (`components/character/gearTargetsData.ts`: `resistGaps`, `improvable`, `weightedTradeLink`) | PXA | `rankEasyWins` goes in `packages/core`, add-only with tests; it takes the merged recommendation list as input and does not move the web helpers |
| DESIGN-AUDIT rows 2, 3, 8 have no file | PXB | Grep the component, then fix |
| Row 7 `--ink-mute` value | PXB | Lightest value with a scripted worst-pixel ratio ≥ 4.5 (`docs/plans/pp3/analyse.mjs`) |
| `hit-area` 44 px everywhere or touch only | PXB | Touch only (`pointer: coarse`) |
| Minimum text size | PXB | 12 px sentences; 11 px uppercase mono labels and chips |
| ux-audit, spacing, empty-states, verbs sections never run | PXC | Run in the final sweep on the finished site; fix S-size findings, list the rest |
| `docs/plans/pp3/*.mjs` | PXC | Re-run for the final numbers, then delete |
| PERF-PLAN items 4–8; PX10 and PX11 are drafts | PXC | Run the commands in PERF-PLAN "Not measured" first, then finish and build PX10 and PX11 |

## Models and subagents

| Session | Lead does | Sonnet subagent | Haiku subagent |
|---|---|---|---|
| PXA (Opus · high) | build card, tabs, import path | easy-wins core function and tests (`packages/core` only); fix cards (`Recommendations.tsx`, `OverviewCards.tsx`, `shortCopy.test.ts`) | e2e selector updates, screenshots, carry file |
| PXB (Sonnet · medium) | bars and panels, home, farm and atlas | none | PX8 rows, CLAUDE.md lines, screenshots, carry file |
| PXC (Sonnet · high) | PX10 load and render, PX11b thresholds | none (Lighthouse routes done in PXD) | axe run, docs |
| Orchestrator (Sonnet) | accept or revise from the carry file and CI status | none | register and status rows |

Rule: a subagent only for a slice with its own files; none for a search or a single-file edit.

## Verification, reduced

| When | Runs |
|---|---|
| During work | `npm run typecheck` and the touched vitest file only |
| End of PXA and PXB | `typecheck`, the touched vitest files, and `node scripts/route-weight.mjs`. Lint, full test, build and e2e are left to CI on the PR (it runs them all); fix what CI reports |
| End of programme (PXC) | One CI run carries the check: full gate, full e2e, Lighthouse (PR job) and axe on all 8 routes, visual baselines, import-to-card timing test. Rerun only a failed job |

Kept because CI enforces them anyway: core coverage 90 % statements / 75 % branches, `npm run tools` for MCP drift,
the PR-body guard, the 5 % perf bar. One commit per old batch ID, so one part can be reverted alone. These are
deviations from `docs/SESSION-PROTOCOL.md`; each prompt carries them under `Owner notes`, which override it.

## Prompts (ready to paste; each in its own cloud session, not plan mode)

### PXA Character · Opus · high · branch `variant/20261112-character`

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PXA from docs/plans/PX-MASTER.md; read its sections "Why these
three groups" and "Plan-doc gaps", the Owner vision table in docs/plans/PX-PROGRAMME.md (sections PX2–PX5),
docs/plans/CHARACTER-SPEC.md and section "PX9" of docs/plans/PERF-PLAN.md. Phone first: 390x844 before 1440x900.
Branch: variant/20261112-character. Open one draft PR.

Owner notes (override the protocol): skip the start-of-session typecheck and test on main. During work run only
npm run typecheck and the vitest file you touched. Run the gate once, at the end: typecheck, lint, test, build,
node scripts/route-weight.mjs, and the e2e specs that touch /character with --trace off; CI runs full e2e. One commit
per old batch ID (PX2, PX3, PX4, PX5, PX9). Do not edit docs/remaining/REMAINING-WORK.md or docs/carry/README.md;
write docs/carry/PXA.md only.

Build: PX2 fix cards (new vs Pro, one trade label "Find on trade"); PX3 build card hero (CHARACTER-SPEC §1); PX4 tabs
as a new CharacterTabs component with its own stylesheet, hashes #overview #defences #damage #gear #progress
#advanced, one panel mounted at a time (§2); PX5 rankEasyWins in packages/core, add-only with tests, plus its UI (§3);
PX9 import path (lazy JSON on tab open, one analyzeCharacter run per import).
Yours: apps/web/src/app/character/*, components/character/*, components/Recommendations.tsx, OverviewCards.tsx,
packages/core (add-only), apps/web/e2e specs for /character.
Not yours: app/tokens.css, app/globals.css, styles/nav.css, styles/bars.css, shared/ScrollSpyNav.tsx, home/*,
CLAUDE.md. Define component variables in your own stylesheet from existing tokens.

Subagents, only for slices with their own files: Sonnet for rankEasyWins and its tests, and for the fix cards; Haiku
for e2e selector updates, screenshots and the carry file. The lead does the build card, tabs and import path.

Run start to finish; answer open questions with the recommended option (PX-MASTER "Plan-doc gaps" has them) and record
each in one line in the PR. Any "not measured" or "not verified" item in a plan doc: measure it yourself first, then
proceed. Stop only for a gate you cannot fix in 3 attempts or a change to CLAUDE.md "Design" not in Owner vision.

Done when: the build card and the "Top 3 fixes" heading fit the first 390x844 screen on the reference character; one
tab panel is mounted at a time and the tab is in the URL hash; no default Top-3 body is truncated; the only trade
label is "Find on trade"; easy wins shows three rows with no prices; lazy JSON is fetched on tab open, not on import;
no e2e assertion is removed.

Replies: one or two sentences. Final message: PR link, preview URL, gate table, open items. PR body: SESSION-PROTOCOL
sections plus before/after screenshots at 390x844 of the reference character. No session links or ids on GitHub.
Stop. Do not merge.
```

### PXB Shell and guides · Sonnet · medium · branch `variant/20261112-shell`

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PXB from docs/plans/PX-MASTER.md; read its sections "Why these
three groups" and "Plan-doc gaps", the Owner vision table and sections PX1, PX6, PX7 in docs/plans/PX-PROGRAMME.md,
and "Findings" in docs/plans/DESIGN-AUDIT.md. Phone first: 390x844 before 1440x900.
Branch: variant/20261112-shell. Open one draft PR.

Owner notes (override the protocol): skip the start-of-session typecheck and test on main. During work run only
npm run typecheck and the vitest file you touched. Run the gate once, at the end: typecheck, lint, test, build,
node scripts/route-weight.mjs, and the e2e specs for the surfaces you changed with --trace off; CI runs full e2e. One
commit per old batch ID (PX1, PX6, PX7, PX8). Do not edit docs/remaining/REMAINING-WORK.md or docs/carry/README.md;
write docs/carry/PXB.md only.

Build: PX1 solid bars and data panels (no text legible through them); PX6 home for returning players and bottom bar
order Character, Farm, Atlas, Checklist, with /dashboard unchanged; PX7 farm and atlas on phone; PX8 = DESIGN-AUDIT
rows 1–9 with the answers in PX-MASTER "Plan-doc gaps" (grep the file for rows 2, 3, 8 first).
Yours: app/tokens.css, app/globals.css, styles/nav.css, styles/bars.css, styles/footer.css, styles/quick-picks.css,
shared/ScrollSpyNav.tsx, home/*, components/farm/*, components/atlas/*, the checklist row components, and the
CLAUDE.md "Design" lines for solid data panels, tab order and the "Farm" label (all in Owner vision).
Not yours: anything under app/character or components/character, components/Recommendations.tsx, packages/core.
Use the existing home/LastCharacterCard.tsx data; do not wait for the new build card.

Subagents: Haiku only, for PX8 rows, the CLAUDE.md lines, screenshots and the carry file.

Run start to finish; answer open questions with the recommended option and record each in one line in the PR. Any
"not measured" or "file to confirm" item: check it yourself first, then proceed. Stop only for a gate you cannot fix
in 3 attempts or a change to CLAUDE.md "Design" not in Owner vision.

Done when: no text is legible through any bar or data panel; the bottom bar reads Character, Farm, Atlas, Checklist;
home JS net change is ≤ 0 B brotli; /farm is ≤ 4,500 px and /atlas ≤ 3,500 px tall at 390 px; DESIGN-AUDIT rows 1–9
are each closed or listed with a reason; `node docs/plans/pp3/analyse.mjs <outdir> 390 targets|kb|fails` shows the
High rows gone.

Replies: one or two sentences. Final message: PR link, preview URL, gate table, open items. PR body: SESSION-PROTOCOL
sections plus before/after screenshots at 390x844 of /, /farm, /atlas and the reference character. No session links
or ids on GitHub. Stop. Do not merge.
```

### PXC Speed, guardrails, QA · Sonnet · high · branch `claude/pxc-perf-qa` (after PXA and PXB merge)

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PXC from docs/plans/PX-MASTER.md; read its sections "Plan-doc
gaps" and "Verification, reduced", docs/plans/PERF-PLAN.md, docs/carry/PXA.md, docs/carry/PXB.md, and "PX0", "PX12"
and "Verification of the programme" in docs/plans/PX-PROGRAMME.md. Branch: claude/pxc-perf-qa. Open one draft PR.

Owner notes (override the protocol): this is the one full check of the programme, so run the full start and finish
protocol. One commit per old batch ID (PX10, PX11, PX0, PX12). You may edit docs/remaining/REMAINING-WORK.md and
docs/carry/README.md: close the PX rows and archive the PX carry files.

Order:
1. Run the commands in PERF-PLAN "Not measured" (items 4–8); finish the PX10 and PX11 sections from the numbers.
2. PX10 load and render. Keep a change only if it saves ≥ 5 % brotli on its file or route, or removes real work.
3. PX11b: pin route-budget thresholds from the post-merge numbers, plus an import-to-card timing test. (Lighthouse routes and the harness are PXD.)
4. PX0 visual baselines: apps/web/e2e/visual.spec.ts, 8 routes x 2 viewports plus /character with the fixture, sky
   masked, reduced motion. Add 280 and 1920 px to the same spec: they replace a separate width sweep.
5. PX12: no separate 280–1920 px sweep (step 4 covers it); axe on all 8 routes; run the ux-audit, spacing, empty-states and verbs checks that PP3
   did not run; fix S-size findings, list the rest. Align home/LastCharacterCard.tsx with the build card. Re-run
   docs/plans/pp3/*.mjs for the final numbers, then delete them.

Subagents: Haiku for axe and docs only. Do not repeat checks CI already runs.

Already done in PXD (read docs/carry/PXD.md first): PX11a (route-weight fix, perf harness as scripts/perf-*), Lighthouse on all 8 routes, R67. Tried and dropped: changelog split, sky rAF stop. Skip those; do the rest of step 1 and steps 2-5.

Run start to finish; answer open questions with the recommended option and record each in one line in the PR. Stop
only for a gate you cannot fix in 3 attempts or a change to CLAUDE.md "Design" not in Owner vision.

Done when: the end state in PX-PROGRAMME "Verification of the programme" holds on the reference character at 390x844,
the full gate passes, and CI is green once with the visual baselines (rerun only if a job flaked).

Replies: one or two sentences. Final message: PR link, preview URL, gate table, open items. No session links or ids
on GitHub. Stop. Do not merge.
```

## Next steps (orchestrator, new chat on Sonnet)

1. Owner merges this PR, PR 134 (PP1) and PR 133 (PP2). Both are docs only.
2. Start PXA and PXB together from the prompts above. Schedule one check-in; do not watch.
3. When each reports: check its done-when from the PR body, its carry file and CI status (no subagent, no diff reads); accept, or send one revision.
4. Owner reviews the two previews and merges. Then start PXC.
5. After each wave: update the register rows, `docs/carry/README.md` and the Status table here in one docs commit.

### Orchestrator prompt

```
You are the orchestrator for the PX programme. Follow CLAUDE.md. Do not edit source code yourself; docs only.
Replies: one or two sentences. Answer open questions with your recommended option and say which you picked.
No session links or ids on GitHub.

Read docs/plans/PX-MASTER.md (Status, Shape, Next steps, Prompts). Then:
1. Check PR 133 and PR 134 are merged. If not, say so and stop.
2. Start two cloud sessions together, not in plan mode, each with its prompt from PX-MASTER: PXA on Opus, effort high;
   PXB on Sonnet, effort medium. Schedule one check-in for 90 minutes; do not watch them.
3. When a session reports, check its "Done when" from the PR body, its carry file and CI status; no subagent, no
   diff reads. Accept, or send one revision message. Check the two PRs share no file.
4. Tell me when both previews are ready to review. After I merge both, start PXC on Sonnet, effort high.
5. After each wave, on a docs branch: update the PX rows in docs/remaining/REMAINING-WORK.md, docs/carry/README.md
   and the Status table in PX-MASTER; open a draft PR.
Stop and ask me only when a session fails its gate three times, or needs a CLAUDE.md "Design" change that the Owner
vision table in docs/plans/PX-PROGRAMME.md does not cover.
```

## What this costs

- Two large PRs are harder to review than seven small ones, and a late gate failure costs more to trace. One commit
  per old batch ID limits that.
- No pixel net during W1. Routes that should not change (`/trade`, `/methodology`, `/whats-new`) are only covered by
  the existing e2e specs until PXC.
- The plan docs are partial, so PXA, PXB and PXC each start with a short measuring step.
