# .claude/handoff.md: upgraded-disco-companion overrides for the global `handoff` skill

<!-- Draft for Demonad112/upgraded-disco-companion. Drop in as .claude/handoff.md.
     Derived from CLAUDE.md and docs/SESSION-PROTOCOL.md (2026-11-25). -->

## Rules source
- Read: docs/SESSION-PROTOCOL.md § Needs owner and § Finish. Nothing else is required reading.

## Verify
- Gate: `npm run gate` (once, after merging origin/main; long runs with run_in_background). Docs-only batches run nothing.
- Counts only if it tested something: no `writing actual` outside `e2e/visual.spec.ts`, skipped count not higher than the last batch's.
- e2e and Lighthouse stay with CI. A perf number states profile (live/local) and run count (>= 3 for a median); medians from cloud sessions only.
- Core changes: PR shows a red-then-green test and the golden diff (HG1-1).

## Sync / push
- `git fetch origin`, merge `origin/main`, gate once, then commit and push once. Commit/push via `/commit-commands:commit-push-pr` when available.

## Owner queue
- File: docs/remaining/REMAINING-WORK.md § Owner queue
- Row format: | ID | Question | Recommended answer | Source |
- ID check: `git log --grep <prefix>` plus a grep; never read whole files for it. IDs are stable, never renumber.
- Extra Needs-owner kinds: design rules in apps/web/CLAUDE.md; policy in packages/* (data shape, score rubric weights, keystone trust). Owner answers in a docs/plans/ plan or the prompt count as approval for the kinds they name.

## Other docs the close-out updates
- REMAINING-WORK.md: only rows this batch touched. Closed rows move to docs/remaining/archive/REGISTER-CLOSED.md; new rows get one line and an ID like U1-3.
- Plan fully closed: 1-2 sentences in docs/HISTORY.md and delete the plan file.

## PR
- Open no PR unless the owner asks; push to the branch and report back. If asked: template sections from the repo, Cloudflare Pages preview URL at the top.
- Visual work: before opening the PR, ask whether to run the screenshot check (390 px + 1440 px); images go in chat, never git.

## Check-in
- None unless the owner asks (no scheduled check-ins, no PR watching). If one is requested: ~15 min, fix only a failing required check; done = every required check green.

## Resume block
- Constraints add: Sonnet unless the plan says Opus; fast mode off; one cause / <= ~40 files per batch; never edit generated data, vendor/pob2 or package-lock.json; copy voice per docs/COPY.md.
