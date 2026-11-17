---
name: review-triage
description: Triage an outside or peer code review against current main for this repo. Checks every finding with file:line evidence (confirmed, wrong, already fixed, not verifiable here), fixes the confirmed ones with a red-then-green test each, and routes owner-only items to the Owner queue. Use whenever the owner pastes or attaches a review, audit, critique or findings list (e.g. OUTSIDE-REVIEW-*.md, "review these findings", "is this review right", "check these claims against main"), even if they don't say "triage".
---

# Review triage

A review is a list of claims. Each one is a hypothesis until `main` says otherwise, so the job is
evidence first, fixes second, and nothing the owner must decide gets implemented quietly.

## 1. Start per protocol

Follow `docs/SESSION-PROTOCOL.md` § Start (fetch, branch off `origin/main`, previous-wave check).
Record the `main` sha you checked: every verdict is "as of <sha>".

## 2. Verdict table (before any code change)

Split the review into atomic claims: one checkable statement each. A finding that bundles
"X is wrong and therefore Y is understated" is two claims; they often get different verdicts.

For each claim, grep first, then read only the lines you need, and assign one verdict:

| Verdict | Means | Evidence required |
|---|---|---|
| Confirmed | `main` behaves as the review says | `path:line` showing it, plus the call site if the effect depends on use |
| Wrong | the code already handles it, or the stated effect cannot happen | `path:line` of the handling, or of why the effect doesn't follow |
| Already fixed | true when written, fixed since | the fixing PR link or commit |
| Not verifiable here | needs the live site, a device, or data this container lacks | which batch or row will verify it |

Print the table in chat. Push back where the review is wrong; a wrong claim fixed anyway is churn.

## 3. Sort the confirmed claims

- **Needs owner** (the kinds in SESSION-PROTOCOL § Start step 3: design rules, CI or branch
  protection, data or dependencies, `packages/*` policy, weaker tests, branch deletion): add one
  row each to `REMAINING-WORK.md` § Owner queue with a recommended answer and one-line reason.
  Don't implement unless `Owner notes` in the prompt approve that kind.
- **Small and in scope** (about 30 minutes, no parallel session's files): fix in this batch.
- **Larger or owned elsewhere**: open a row assigned to the owning batch. Never drop a claim.
- **Choice between options** (e.g. "apply X or remove X"): pick one, state why in one line, and
  say what risk the other option avoided and how yours surfaces it instead.

## 4. Fix red-then-green

For each fix, write the test first and run it against the unchanged source. Record the failing
assertion line; that line goes in the PR under the fix. A test that passes before the fix proves
nothing; rewrite it until it fails for the reason the review gave.

Prefer tests that go through the public entry point (e.g. `keystoneEffectsOf`, `assessBuild`)
over hand-built intermediate objects: the review often found a bug precisely because tests
bypassed the real path. A test that passes on a word match in output is not a test of behaviour.

`packages/*` changes also list their golden diff in the PR (HG1-1). If a data shape changes,
grep `apps/web/e2e` for the old path and update specs in the same commit.

## 5. Finish per protocol

Run SESSION-PROTOCOL § Finish: gate, register updates (close rows in `REGISTER-CLOSED.md`, new
rows with IDs), HISTORY line, PR with the template sections. Put the verdict table in the PR
under **Summary** and the Owner queue rows under **Needs owner**. No session links anywhere.

## Reply shape

Lead with counts ("14 claims: 9 confirmed, 3 wrong, 2 not verifiable"), then the table, then what
was fixed, what went to the Owner queue, and which choice you made for each option question.
