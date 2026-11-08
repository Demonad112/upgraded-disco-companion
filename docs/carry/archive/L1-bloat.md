# L1-bloat carry-over · 2026-11-06
PR: pending · Branch: chore/20261106-bloat · Preview: n/a (docs and file renames)

(`L1.md` is the older launch-hardening file, so this one is `L1-bloat`.)

## Done
- Removed 43 tracked PNGs (`docs/constellation-sky`, `docs/design`); `docs/**/*.png` is now gitignored. Image links in `W15` and `TT1` carry files now say "screenshot in PR". History not rewritten.
- Carry: 53 files moved to `docs/carry/archive/` (every file whose ID a later session lists under "Resolved from earlier carry files", plus CH5b with no open rows). New `docs/carry/README.md` index.
- Deleted `PLAN-2026-11-06.md`, `BATCHES-2026-11-06.md`, `OPUS-PLAN-PROMPT.md` (live rows are in the register). Archived IMG2/B3 still name `BATCHES-2026-11-06.md` as history.
- Renamed `gearTargets.ts` -> `gearTargetsData.ts`, `topFixes.ts` -> `topFixesData.ts`; imports and tests updated.
- Section 6 of `REMAINING-WORK.md` replaced with the bloat/load-speed batches (L1-L3).

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | L2 | Payload diet (mod-tiers, trade2-stats, `/` headroom) | Run L2 from register section 6 |
