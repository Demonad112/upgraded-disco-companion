# SB3 carry-over · 2026-10-30
PR: #58 · Branch: claude/sb3-pr-body-guard · Preview: n/a (no web code)

## Checked (previous wave)
- main: green (CI run 126 on 57d52c5). Open PR #57 touches only `docs/carry/P1.md`; no overlap.

## Resolved from earlier carry files
- None.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | Confirm the workflow fails on a bad body on GitHub: edit this PR's body to include `Claude-Session: x` once, see `PR body guard` go red, then remove the line and see it go green. | Do it once after merge or on this PR. |

## Needs owner
- SB3-1: make `PR body guard / guard` a required check in branch protection. Recommended: yes, because an unrequired check only warns.

## Limits
- The script and its 8 cases are verified locally (`npm run test:scripts`, 8/8 pass).
- The workflow itself is verified only by passing on this PR. The cloud session cannot trigger a failing run on GitHub.
- Scope is PR title and body only. Commit messages are not checked: #53's four trailer commits cannot be removed without a force-push.
- No web code touched, so e2e was skipped; typecheck, lint, test and build were run.
