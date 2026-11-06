# PW1 carry-over · 2026-11-06
PR: not opened yet · Branch: copy/20261106-plain-words · Preview: Cloudflare Pages preview once the PR exists

Plain-words pass for newcomers, plus IMG2-4. B4b itself was already merged as #110.

## Checked (previous wave)
- B4b (#110): merged, no open PRs. Only owner device checks remain (R44, R45, R46).

## Done
| Item | What |
|---|---|
| Default-visible copy | Glossary, primer, common mistakes, patch changes, core tips, page intros, panel notes, import and error messages: 1-2 plain sentences |
| Methodology | 27 paragraphs cut to 1-2 sentences; the scoring figures stay |
| Dashboard farms | New `summary` field on 9 farms, shown by default; full `atlasSetup` moved behind Pro detail; label is now "How to run it" |
| Core findings | Reworded jargon and the longest lines ("vector" is gone from reader text); logic unchanged |
| IMG2-4 | Tablet and Waystone icons on the farm Quick setup cards, trade icon on "Find better gear" |

Left long on purpose: Pro detail text (step `description`, `atlasSetup`, boss `notes`, source notes). It is opt-in and holds the game detail that a two-sentence summary can't carry.

## Gate
- Local: lint clean; unit tests pass (765 core, 44, 290 web).
- `npm run typecheck` fails in `apps/web` on Windows only: `./GearTargets` and `./TopFixes` resolve to the lowercase `.ts` twins on a case-insensitive disk. Those import lines are unchanged here; CI on Linux is the check.
- Left to the cloud session: `npm run build`, `node scripts/route-weight.mjs`, `npm run e2e -w @poe2/web`.

## Resolved from earlier carry files
- IMG2-4: done as above.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | `GearTargets.tsx`/`gearTargets.ts` and `TopFixes.tsx`/`topFixes.ts` differ only by case, which breaks typecheck on Windows | Rename the `.ts` twins (e.g. `gearTargetsData.ts`) in a small PR |

## Needs owner
- None. The copy touches `packages/core` strings because the owner asked for all areas; no logic or test assertion changed.
