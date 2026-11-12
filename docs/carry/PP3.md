# PP3 carry-over · 2026-11-12
PR: (this PR) · Branch: claude/pp3-design-audit · Preview: n/a (docs only)

Partial: stopped by the owner at 06:00 UTC. `docs/plans/DESIGN-AUDIT.md` holds every measurement taken.

## Checked (previous wave)
- Not checked: the brief limited this batch to the audit doc and this file; `docs/carry/README.md` and
  `docs/remaining/` are not updated.

## Resolved from earlier carry files
- None read.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | PP3 (next chat) | Finish the audit: ux-audit, spacing, empty-states, verbs; 1440 px keyboard; file checks for rows 2, 3, 8; the PX8 batch section | Use the prompt below |
| 2 | question | PP3 | Raise `hit-area` to 44 px everywhere or only for touch? | Touch only (`pointer: coarse`): desktop rows stay dense |
| 3 | question | PP3 | Minimum text size | 12 px for sentences, 11 px for uppercase mono labels and chips |
| 4 | question | PP3 | Keep `docs/plans/pp3/*.mjs` in the repo? | Yes until PX8 is done; PX8 re-runs them for its done-when, then deletes them |
| 5 | recommendation | PX4 | Sticky tabs sit at the top of a phone screen, out of thumb reach | Keep swipe between tabs as the main gesture |
| 6 | follow-up | PP3 | Unverified: disabled state of "Ask" and farm "Set up"; `.hero-more` at opacity 0.1 on wide screens; unnamed controls | Check each in the DOM; add a row only if real |

## Needs owner
- None.

## Continuation prompt (Sonnet · medium)

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PP3 (continuation), docs only: finish docs/plans/DESIGN-AUDIT.md
and docs/carry/PP3.md on branch claude/pp3-design-audit (draft PR already open; push to it, do not open a second PR).
- Run start to finish, no questions. Replies: one or two sentences. Grep first; cap output with | head.
- No session links or ids on GitHub. Never write a finding you did not observe or a ratio you did not compute.

Read docs/plans/DESIGN-AUDIT.md first: it lists what is measured, what is provisional and what was not run.
Read "Owner vision" in docs/plans/PX-PROGRAMME.md. The decided design in CLAUDE.md is fixed.

1. npm ci; npm run build -w @poe2/core; npm run build; node apps/web/e2e/serve.mjs &
   Copy docs/plans/pp3/audit.mjs into apps/web (it needs that folder's node_modules), run
   `node <copy> <outdir> 390,768,1440`, delete the copy. Reports: `node docs/plans/pp3/analyse.mjs <outdir> <width>
   tokens|fails|sky|type|targets|kb`. Check the new numbers match the doc; correct the doc where they differ.
2. Read the screenshots in <outdir>/shots (fold of each page at 390 px, full page of character-imported) and write the
   sections not run: ux-audit, spacing, empty-states (/character with no import, /trade, /checklist fresh), verbs
   (button and link labels against docs/COPY.md). If a named skill is installed, run it for its section; if not, say
   "skill not installed, scripted checks only".
3. Run `analyse.mjs <outdir> 1440 kb` and `768 targets`; add what differs from 390.
4. Resolve carry item 6 (three unverified items) by inspecting the DOM.
5. Grep the source file for rows 2, 3, 8 and 9 and fill the File column. For row 7 compute the lightest change to
   --ink-mute that gives a worst-pixel ratio ≥ 4.5 and state the hex with its computed ratio.
6. Finalise the one table (finding, route, file, severity, fix, size); move anything owned by PX1–PX7 or contradicting
   the decided design to "Not doing" with the reason.
7. Write the PX8 batch: files touched (token edits in app/tokens.css only), ordered steps, done-when (the scripted
   numbers that must hold), and a ready-to-paste prompt. Apply carry answers 2, 3 and 4.
8. Update docs/carry/PP3.md, commit, push, edit the PR body (Summary, Limits, open questions with the option picked).
9. Send session_019X9NrdHSabTtMNzegqvGQL (claude-code-remote send_message): PR link, count of accepted PX8 rows by
   severity, the 5 highest-severity rows in one line each, skills or widths not run, each open question with the option
   picked. Then stop. Do not watch CI.
```
