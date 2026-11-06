# SB3 carry-over · 2026-10-30
PR: #58 · Branch: claude/sb3-pr-body-guard · Preview: n/a (no web code)

## Checked (previous wave)
- main: green (CI run 126 on 57d52c5). Open PR #57 touches only `docs/carry/P1.md`; no overlap.

## Resolved from earlier carry files
- None.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | Optional deliberate check: put `Claude-Session: x` at the start of a line in this PR's body, see `PR body guard` go red, remove it, see green. The URL pattern is already proven (see Limits); this exercises the trailer pattern on GitHub. | Skip if satisfied by the unit tests. |
| 2 | recommendation | next-A | The PR-creation tooling appends a session footer to PR bodies by default. Sessions must strip it after creating a PR (update the body), or the guard goes red. | Add a line to the PR section of docs/SESSION-PROTOCOL.md (needs owner OK). |

## Needs owner
- SB3-1: make `PR body guard / guard` a required check in branch protection. Recommended: yes, because an unrequired check only warns.

## Limits
- The script and its 8 cases are verified locally (`npm run test:scripts`, 8/8 pass).
- Workflow history on this PR: runs 1 and 2 failed because the PR-creation tool had appended a session-URL footer to the body (run 2 read the body just before it was edited); run 3, after the footer was removed, passed. So fail and pass are both seen on GitHub, by accident rather than by a deliberate test.
- Scope is PR title and body only. Commit messages are not checked: #53's four trailer commits cannot be removed without a force-push.
- No web code touched, so e2e was skipped; typecheck, lint, test and build were run.
