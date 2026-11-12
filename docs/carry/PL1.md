# PL1 carry-over · 2026-11-08
PR: see `docs/carry/README.md` · Branch: claude/poe2-companion-planning-171zuo · Preview: none (docs only)

Planning and cleanup session. Docs only: no code, no `packages/*`, no tests.

## Checked (previous wave)
- PR #119 (L1–L3 tidy): merged into main (763b2bb).
- Gate on main:
  - typecheck 0, lint 0, build 0.
  - test 0: core 767 pass / 7 skip / 3 todo; mcp 44; web 297.
  - Coverage 92.04 % statements / 81.01 % branches.
- e2e on main: 347 passed, 3 skipped, 0 failed. Nothing failed before this session.
- Remote branch `copilot/github-workflow-templates` is already gone; only `main` remains.
- `docs/carry/README.md`: every link resolved before this change.

## Resolved from earlier carry files
Every open row in the nine active carry files now maps to a register row, or is closed. All nine files moved to `archive/`.

| Source row | Result |
|---|---|
| CD1-1 card-links canvas height | R56; batch N1. Measured −55 % px at 390, −60 % at 1440 |
| CH7 M2-2 | R31 (parked) |
| CH7 dead-export sweep | R32 (done) |
| CH7 screenshots | R35 (done) |
| CH7 CH6-1 | R42 (owner) |
| L1-1 proxy deploy | R41 (done) |
| L1-2 Lighthouse error flip | R49 (owner confirms) |
| L1-3 Android share | R45 (owner) |
| M2-1 | R21 (done) |
| M2-2 | R31 (parked) |
| M2-3 | R34 (parked) |
| M2-4 | R33 (parked) |
| QP1-1 | R47 (owner) |
| QP1-2 / QP1-5 | R10, blocked on R40 |
| QP1-3 patch-0.5.5e sources | New R57: parked until the patch-day refresh. Both claims are weight 0 |
| S1-1 `sourceMeta.ts` unused exports | New R58: delete in N1. The cited "W23" gate doesn't exist |
| S1-2 | Parked (unchanged) |
| S2-1 / S2-3 | R44 / R47 (owner) |
| S2-2 | Done |
| TT1-2 … TT1-5 | R43 (owner, optional) |
| U14-1 | R44 (owner) |
| U14-2 | R54 (owner confirms) |
| U14-3 | Done |
| U14 local variant branches | Closed: already deleted (see git history) |

## Changes
- `docs/remaining/REMAINING-WORK.md`:
  - 33 closed rows moved to `docs/remaining/archive/REGISTER-CLOSED.md`; IDs unchanged.
  - New rows R57–R62.
  - Measured baseline added.
  - §6 rebuilt: batches N1, N2, N3, OP, F1, F2, F3, plus a "Do not do" list.
- `docs/remaining/OWNER-STEPS.md`: reordered to the owner-pass order; register IDs added.
- `docs/SESSION-PROTOCOL.md`:
  - Step 2 now checks the previous PRs through the carry index, since the wave table is finished.
  - The finish gate adds `route-weight` and `--trace off`.
- `docs/carry/README.md`: PL1 is the only active file.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | N1 | R56 + R58 | See register §6 N1 |
| 2 | follow-up | N2 | R62: CI e2e `--trace off` (−21 % locally) and one core test run | See register §6 N2 |
| 3 | follow-up | N3 | R61: core test gaps | See register §6 N3 |

## Needs owner
- PL1-1: N3 and F2 add tests under `packages/core/test`. **Answered 2026-11-08: OK.**
