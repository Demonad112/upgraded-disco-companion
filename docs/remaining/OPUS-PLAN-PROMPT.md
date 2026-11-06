# Planning prompt (start a new chat, Plan mode, Opus)

Paste everything inside the fence as the first message.

```text
You are in Plan mode on Opus. Task: plan how to finish everything still unfinished in this repo, then wait for approval.
Do not edit code in this session.

READ FIRST (slices, not whole files; grep before reading):
1. CLAUDE.md, docs/SESSION-PROTOCOL.md
2. docs/remaining/REMAINING-WORK.md (the register: IDs R01-R55, class A/D/C/R/W, recommended answers)
3. Only to verify a row: its Origin carry file in docs/carry/, docs/ui/LAUNCH-PLAN.md, docs/ui/UI-PROGRESS.md,
   docs/audit/04-PERFORMANCE-BASELINE.md. Don't read anything else unless a row needs it.
Verify the register against main before planning (git log, grep): mark any row already done as `done`, and fix R55
(stale tracker rows) as part of the plan.

STEP 1 - TRIAGE (do this before planning)
- Class D rows (R10-R24): answer each yourself with the recommended answer unless it is high impact (spends owner money,
  changes a CLAUDE.md Design rule, edits packages/* behaviour or data, removes a test assertion, deploys). Record
  "answered: <answer> - <one-line reason>" in the register.
- If you cannot answer one, ask me with AskUserQuestion: multiple choice, recommended option first, up to 4 questions per
  call, as many calls as needed. If one needs more input than that, mark it `parked` with what I must supply, and move on.
- Class A rows (R40-R49, R02): never plan a session for these. Collect them into one owner checklist (what, where, how long).
- Class W (R01): schedule it as a trigger-on-event wave, not now.

STEP 2 - PLAN (usage-efficient and low-error)
Design the fewest sessions that finish the class C work, with these rules:
- Batch by file ownership: one session per cluster of rows that touch the same files, so each file is read once and
  parallel sessions never conflict. State each session's files, rows (IDs), model + effort (Sonnet for mechanical, Opus
  only where judgement is needed), local vs cloud, and what it depends on.
- Order: cheap deterministic work first (tracker reconcile R55, dead-export sweep R32, verify R24), then data/core, then
  UI work that needs owner picks (R03 after R02), QA last (R04).
- Per session give: exact steps in execution order, the acceptance check for each row, the gate commands (typecheck, lint,
  test, build; e2e only where UI changes, per SESSION-PROTOCOL), the route-weight command and budgets, the carry file name,
  and the branch name (`variant/<yyyymmdd>-<slug>` for design changes, `chore/` or `feat/` otherwise).
- Error control: each session starts by checking its dependencies landed and its rows still open; reconciles the register
  at the end; stops and reports instead of guessing when a gate fails twice.
- Token economy per CLAUDE.md: independent tool calls in one message, grep then slice-read, caps on listings, no
  PR/CI watching (use PR auto-fix or a scheduled check-in), compact only at task boundaries.
- Respect CLAUDE.md: Design is decided (square corners, tokens, no restyling live site); poe.ninja numbers as given; no
  session URLs on GitHub; replies 1-2 sentences.
- Reuse existing structure; do not invent new frameworks. Prefer recommending `parked` over speculative work
  (R33, R34, R50-R54 default to parked).

STEP 3 - OUTPUT (copy-paste ready, in this order)
1. Answers table: ID, answer, reason (one line each).
2. Questions still needed from me (multiple choice, via AskUserQuestion) and the list of rows parked pending me.
3. Owner checklist (class A) grouped by device/account.
4. Session plan: a table (Session, rows, files, model, local/cloud, depends on, est. size S/M/L) followed by one
   ready-to-paste start prompt per session (each short, pointing at the register rows and this plan, not restating them).
5. Register updates: statuses you changed, and the exact edits to docs/remaining/REMAINING-WORK.md and
   docs/ui/UI-PROGRESS.md (wave rows) to apply in the first session.
Then call ExitPlanMode. Keep the plan itself under ~150 lines.
```
