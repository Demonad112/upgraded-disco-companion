# PW1 carry-over · 2026-11-06
PR: #111 · Branch: copy/20261106-plain-words-msss83 · Preview: https://copy-20261106-plain-words-ms.upgraded-disco-companion.pages.dev (expected alias; confirm from the Cloudflare check)

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
- Cloud (Linux): `npm run typecheck` pass (the Windows-only case clash does not occur here); `npm run lint` clean; `npm test` pass (765 core, 44, 290 web); `npm run build` pass.
- `node scripts/route-weight.mjs`: `/` 190,237 B br (limit 192,000; 1,763 B headroom); largest other route `/character/` 230,329 (limit 250,000).
- `npm run e2e -w @poe2/web`: 339 passed, 3 skipped, 2 failed on first run. Both were `quick-picks.spec.ts` pinning the old danger-note wording ("Farm risk on the farm tile"); match updated to the new sentence, intent unchanged (the note still separates farm risk from map danger). Re-run of that spec: 28 passed.
- Icons at 390 and 360 px: Tablet and Waystone icons on Quick setup cards sit inline, no horizontal overflow. `.btn` is already `inline-flex` with `gap: 0.5rem`, so "Find better gear" needed no change.
- Leftover sweep: no default-visible string over 2 sentences remains. Atlas cluster text over 120 characters is already clamped to 2 lines with an expand button; the diagram `aria-label`s are screen-reader descriptions and stay complete.

## Resolved from earlier carry files
- IMG2-4: done as above.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | `GearTargets.tsx`/`gearTargets.ts` and `TopFixes.tsx`/`topFixes.ts` differ only by case, which breaks typecheck on Windows | Rename the `.ts` twins (e.g. `gearTargetsData.ts`) in a small PR |

## Needs owner
- None. The copy touches `packages/core` strings because the owner asked for all areas; no logic or test assertion changed.
