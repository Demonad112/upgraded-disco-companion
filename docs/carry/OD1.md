# OD1 carry-over · 2026-11-01
PR: #68 · Branch: variant/20261101-owner-decisions · Preview: https://variant-20261101-owner-decisions.upgraded-disco-companion.pages.dev

Owner decisions batch, docs only. The owner accepted the recommendations for the five open decision rows; this records them
as D11–D15 in `docs/audit/09-OWNER-DECISIONS.md` and applies the two that change a rule.

## Checked (previous wave)
- U13b (#66): ok, merged, main CI green incl. e2e.
- U14 (#67): open when this was written. This PR touches no file #67 changes except other rows of `docs/ui/UI-PROGRESS.md`.

## Resolved from earlier carry files
- SB3-2 → D11: accepted. `SESSION-PROTOCOL.md` Finish step 4 now says to remove any session link the tooling appended.
- SB3-W15-1 → D12: accepted. Timing budgets are ≤ +25 % over same-session `main`, written under Budgets in
  `docs/audit/04-PERFORMANCE-BASELINE.md`. Byte and count budgets stay absolute.
- U13a-1 → D13: accepted; recorded, nothing to change.
- A3-2 → D14: closed. SB1's Windows worker cap fixed it; the remaining flake was U13b-5 (#67).
- SB3 Open 1 → D15: skipped. A deliberate trailer test would itself put a session link on GitHub.
- Branch clean-up: local `variant/20261101-qa` and `variant/20261029-surfaces` deleted (owner's OK). Both were merged;
  `surfaces` only through the #46 squash (`dccb59a`), so it needed `-D`.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | next-A | `packages/core/test/pob-bridge.test.ts:209` uses real timers; on a slow machine the budget can run out after one port and `timeouts[1]` is undefined (HANDOFF Open 2). | Fake timers. Test-only, but in `packages/core`, so it needs the owner's OK in the prompt. Backlog OD1-1. |
| 2 | question | owner | `DESIGN.md` and `DATA-REFRESH.md` were lost in the transfer (HANDOFF Open 1). | Close, not restore: `CLAUDE.md` "Design" and `packages/data/PROVENANCE.md` cover them. Backlog OD1-2. |
| 3 | follow-up | next-U | `/` has ~2.5 KB left of its 190 KB budget. | Before the next home feature, measure the command-palette and search overlays and load them on first open if they cost > ~2 KB. Backlog OD1-3. |
| 4 | follow-up | next-U | The 280 px first-paint overflow fix (U13b-5) is checked only by a local probe. | Add a CPU-throttled CI test only if the 280 px tests flake again. Backlog OD1-4. |

Checked and not an item: the sky, Atlas map and passive-tree canvases are all sized by CSS (`100vw` or `w-full`), so the
300 px default that caused U13b-5 can't widen the page there.

## Needs owner
- OD1-1: allow a test-only change in `packages/core`? Recommended: yes, it's the last known flaky test.
- OD1-2: close the lost-docs item? Recommended: yes.
- With these rows done, the UI and audit backlogs hold no product work. The next programme (new analysis features, data
  refresh for a new league, …) needs a direction from the owner.
- Still the owner's: U13b-1 (real phone / Mac pass), A5-4 / W15-pulse-1 (eyeball the sky and pulse), SB4-1 (delete 3 guard
  run logs).
