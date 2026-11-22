# Session protocol

No required reading. Read a file only when the task needs it; a prompt's `Owner notes` override everything here.

### Start
1. `git fetch origin` and branch off an up-to-date `origin/main`. Run `git worktree list`, `git stash list` and
   `git branch`, and report them in the PR body. Don't delete or prune any of them.
2. Start a new session per batch. A batch is about one cause and about 40 files or fewer; regenerate goldens once, at
   the end.
3. Match the model to the plan's per-batch column (Sonnet unless the plan says Opus). Fast mode off.

### Needs owner
Don't implement these; add a row to `docs/remaining/REMAINING-WORK.md` § Owner queue with a recommended answer:
design rules in `apps/web/CLAUDE.md`, CI behaviour or branch protection, data files or dependencies, policy in
`packages/*` (data shape, score rubric weights, keystone trust), removing or weakening a test assertion, deleting
branches. Any other `packages/*` change needs no owner OK when the PR shows a red-then-green test and its golden diff
(owner answer HG1-1). Owner answers recorded in a plan under `docs/plans/` or in the prompt count as approval for the
kinds they name.

### Finish
1. `git fetch origin`, merge `origin/main`, then `npm run gate` once (see the `ship` skill). It picks the checks from
   the changed paths, so an unchanged area is never re-tested. Docs-only batches run nothing. e2e and Lighthouse stay
   with CI. Run long suites with `run_in_background` so an interruption never lands mid-build.
   The gate counts only if it tested something: no `writing actual` outside `e2e/visual.spec.ts`, and the skipped
   count is not higher than the last batch's. A perf number states its profile, live or local, and the run count (at
   least 3 for a median); perf medians come from cloud sessions only.
2. Update `docs/remaining/REMAINING-WORK.md` only for rows this batch touched (closed rows move to
   `archive/REGISTER-CLOSED.md`; new rows get one line and an ID like `U1-3`). Check an ID is free with
   `git log --grep <prefix>` and a grep, not by reading whole files. When a plan is fully closed, add 1-2 sentences to
   `docs/HISTORY.md` and delete the plan file.
3. Commit and push once, after the gate passes. Open one PR with the template sections and the Pages preview URL at
   the top. Never force-push; never delete branches.
4. Mark the PR ready and book one scheduled check-in (about 15 minutes). When it fires, fix only a failing required
   check. Don't watch CI, subscribe to PR events or poll. Done means every required check is green.
