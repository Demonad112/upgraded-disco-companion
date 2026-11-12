# PP2 carry-over · 2026-11-12
PR: (this PR) · Branch: claude/pp2-character-spec · Preview: none (docs only)

## Checked (previous wave)
- Not checked (time box). `npm run typecheck` and `npm test` on `main` were not run; `npm run build` on `main` passed.

## Resolved from earlier carry files
- None handled (time box).

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | PP2b | Finish `docs/plans/CHARACTER-SPEC.md` "Unverified / to finish" list | Use the prompt below |
| 2 | follow-up | PP2b | Add `PP2.md` to `docs/carry/README.md` | PP2 was limited to two files |
| 3 | question | PX4 | Tab label "Advanced" vs "Checks" | "Advanced"; fall back to "Checks" if the bar overflows at 390 px |
| 4 | question | PX5 | `gear-open-affixes` has axis `unclassified`, so its value is null | Keep it listed with "value not measured"; do not invent a weight |

## Needs owner
- None.

## Prompt for the follow-up chat (Sonnet)

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Planning batch PP2b; edit docs/plans/CHARACTER-SPEC.md,
docs/carry/PP2b.md and docs/carry/README.md only. Work on branch claude/pp2-character-spec (the open draft PR); push
to it, do not open a second PR. Run start to finish, no questions; do not watch CI. Replies: one or two sentences.
No session links or ids on GitHub. Never invent a number or field name; write "not verified" instead.

Read docs/plans/CHARACTER-SPEC.md fully, then "Owner vision" in docs/plans/PX-PROGRAMME.md (decided, do not reopen).
Keep every number and decision already in the spec unless you measure it wrong; say so if you change one.

Setup: npm ci; npm run build -w @poe2/core; npm run build; node apps/web/e2e/serve.mjs (port 4321).
Import a fixture by routing every non-localhost request in Playwright: /api/character -> the fixture JSON
(packages/core/test/fixtures/yykiuy-v51.json or athrynas-v43.json), /api/ladder -> 404, else abort; then open
/character/?import=<encoded poe.ninja profile URL> (see apps/web/e2e/fixtures.ts).

Finish, in this order:
1. Section 3: run analyzeCharacter + gearRecommendations + mergeGearRecommendations + rankReplacements on
   athrynas-v43.json (packages/core/dist, tiers from packages/data/generated/mod-tiers.json) and add Athrynas expected
   easy-wins rows using the formula as written. Write PX5 done-when.
2. Section 2: diff Athrynas headings against the table (two extra); audit every e2e spec that touches the character
   page and complete the selector table; measure top nav and bottom bar heights; set the swipe threshold; write PX4
   done-when.
3. Section 1: screenshot Yykiuy at 390x844 then 1440x900, look at each image, correct the size targets against what
   you see; read the durations of reveal-draw, reveal-rise and foil-sweep in apps/web/src/styles/motion.css; run
   frontend-design:frontend-design if available, inside CLAUDE.md "Design".
4. Write the three ready-to-paste build prompts (PX3, PX4, PX5) using the batch header in PX-PROGRAMME.md "Rules for
   every batch", each naming files touched and done-when.
5. Empty the "Unverified / to finish" list or leave each remaining item with its reason.

Finish: update the PR body (Summary, Limits, open questions with the option picked), then send_message to the
orchestrator session named in the owner's prompt with the PR link, a 6-line summary (build card order, tabs with target
heights, hash scheme, easy-wins signature and value formula), unverified items and open questions. Then stop.
```
