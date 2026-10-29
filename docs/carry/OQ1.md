# OQ1 carry-over · 2026-10-29
PR: #<n> · Branch: ccr-adc6b4c8-t74ga8 · Preview: https://ccr-adc6b4c8-t74ga8.upgraded-disco-companion.pages.dev

Owner-requested sweep after A5 (#29): answer every question still open in `docs/carry/` and implement the answers. Each one
takes the recommended answer unless noted. It runs alongside wave 6 (A6, U12) and touches none of their files: `layout.tsx`,
`NavBar.tsx`, `app/sitemap.ts`, CI, the manifest and the service worker are untouched.

## Checked (previous wave)
- A5: ok. PR #29 merged into `main` (868cd9e), T05–T08 ticked in 08-PROGRESS.md, row ticked in UI-PROGRESS.md.

## Resolved from earlier carry files
- U8-4 (grade on the home Character status line): **implemented, without touching `packages/core`**. The status line reads
  `recentCharacters`, not the core snapshot, so the grade is now kept on the recent-character row
  (`RecentCharacter.grade`, set from `gradeText(assessment).letter` when the character page records the import). The
  analyser stays out of the home bundle. The line shows `Last import: <name> · <grade>`, which is a range such as `D–B` when
  damage could not be graded, as the build score is. Rows saved before this keep showing `· Lv N` until the next import. A
  changed grade on a re-import now updates the row. The e2e test in `character.spec.ts` asserts the grade, not the level;
  the fixture reads `Last import: Athrynas · D–B`.
- U9-1 (largest-hit wording): **keep as shipped.** The Methodology page states the relation and where the app uses it,
  without "as poe.ninja computes", because `defense/implied.ts` treats it as an inference. No change.
- U9-2 ("cross-validated" tag): **keep the code's terms.** The page describes the five labels in `model/provenance.ts`, the
  reconciliation severities and the `Unverified` / `Conflicting sources` flags. No label is invented. No change.
- U0-2 (U6 "After A6"): **keep the note.** U6 runs in wave 10, after A6 in wave 6, so it costs nothing. No change.
- A1-2 (zod 3 advisory): already closed by PR #20 (W1-review). Nothing to do.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | U10 | The Character tool card now has two sources for "last import": `recentCharacters[0]` (name, grade) and the snapshot history (figures). | If U10 adds figures to that line, read them from `latestSnapshot`, and only name and grade from the recent row. |

## Needs owner
- A3-2: still open, and not answerable from a cloud session. The 11 Windows-only e2e failures pass on Linux, CI and every
  later cloud run, including this one (145 passed / 3 skipped). Recommended action unchanged: after `npm ci` and
  `npm run build`, run `npx playwright test --reporter=list` locally and send the first failure's error.
