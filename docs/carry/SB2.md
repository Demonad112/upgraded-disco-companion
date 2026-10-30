# SB2 carry-over · 2026-10-30
PR: #56 · Branch: claude/sb2-pre-wave-cleanup · Preview: https://claude-sb2-pre-wave-cleanup.upgraded-disco-companion.pages.dev

Side batch before the next wave. No tracker wave row.

## Checked (previous wave)
- Baseline on `main` (28a56a1, includes #53) before changes: typecheck ok; tests pass (core 704 + 7 skipped + 3 todo, web 136). Nothing failing.
- U5 (#52): ok. `ProgressBar.tsx` is gone; no `glow-` classes (only `--sky-glow-*` tokens); `<Gauge>` is used on home
  (`ProgressSummary`), `/checklist` (header and each phase) and atlas (`AtlasSequenceTracker`); `test/gauge.test.ts` passes.
- W15 (#54): ok. `AtlasWebCanvas.tsx` and `sky/looks.ts` are gone; no `?sky=` handling; `e2e/sky.spec.ts` has the
  reduced-motion test ("paints one still frame under reduced motion").
- U6 (#53): merged at 06:06 UTC, before this batch started (the prompt assumed it was open), so U6 files were free to read;
  none were edited.
- CI on `main`: #54 merge commit (`7e7ad7b`, includes #52) success. The run for the #52 merge commit shows *cancelled*
  (superseded by the next push), not failed. The run for the #53 merge commit (`28a56a1`) was still in progress when checked.

## Resolved from earlier carry files
- U3-4 (and U5/U6 mentions): resolved. #53 vendored the fonts with `next/font/local`; `git grep "next/font/google"` matches only
  comments and docs, and `npm run build` passes in this cloud sandbox with no swap.
- Dedupe of the "count ids that still exist" filter: one helper `lib/progressCount.ts` (`countIn`, Set-based) now used by
  `ToolStatus`, `ProgressSummary`, `useAtlasProgress` and `useChecklistState`; `test/progressCount.test.ts` added. No behaviour
  change (same filter, same `n / total`).
- SB1-2 and A8-3: `HANDOFF.md` status block refreshed (waves through 10, #55 and SB2 open, next U7). The old "Open 1 (UA fixed)"
  line no longer exists, so A8-3 needed no further edit.
- A1-1, U0-1, U9-1, A5-3 / A7-2: already done by later work (cloud browser lookup in `playwright.config.ts`; template points at the
  protocol; `sitemap.ts` lists `/methodology` and `/whats-new`; `--sky-dim-fill` is in `tokens.css`). No action.
- A4-1: keep. `CardLinksCanvas` watches `class`, `hidden` and `open`; tabs and disclosures toggle by class, so dropping `class`
  would leave connectors stale. Left unchanged.
- U9-4 and U12-1, U12-3: done in #53 (U6).
- U1-1 / U8-2 (`.eyebrow` → `.label-metric`): done for `PageHeader`; the remaining `.eyebrow` uses fall under U3-1 (U13).
- Session-info sweep: `git grep "claude.ai/code/session\|Claude-Session"` over tracked files hits only the rule text in
  `CLAUDE.md`. Nothing to remove. History is untouched (no rewrite, no force-push).
- W15-2: not in this batch (owner asked for a follow-up PR). Cursor spotlight is listed under Needs owner.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | P1 | `scripts/screenshot.mjs` defaults `CHROMIUM_PATH` to `/opt/pw-browsers/chromium-1194/...`; this image has `chromium-1243` (U4-5). #55 owns the file. | Default to `/opt/pw-browsers/chromium` (the image links it to the binary), then glob `chromium-*`. |
| 2 | follow-up | P1 | The "280 px sideways scroll on /checklist" note in #55: #53 fixes it (U9-4; 0 px overflow at 280/320/390 on all routes). | Don't log as new. Re-check after merging `main` into #55. |
| 3 | bug | P1 | `<Term>` renders a `<button>`. `<Glossed>` must never be used inside `<summary>`, `<a>` or `<button>` (nested interactive, axe `nested-interactive`). | Grep `Glossed` call sites in #55 and keep it out of those elements; the a11y spec covers the routes. |
| 4 | bug | P1 | `CountUp`'s `format` prop must be stable (module-level function or `useCallback`), or every parent re-render restarts the animation. | Hoist formatters to module level; consider an effect dependency on the value only. |
| 5 | follow-up | P1 | The #55 PR body contains the Claude session link. CLAUDE.md now forbids it. | Remove it from the PR body. |
| 6 | follow-up | P1 (owner at merge) | **Revised:** an earlier suggestion said to replace #55's WIP commit with clean commits. That needs a force-push, which `.claude/settings.json` denies. | Keep the commit and squash-merge #55 with a clean message (owner's call at merge time). |
| 7 | follow-up | U6 (done) → U13 | The prompt asked U6 to also listen to `window` `resize` in `useKeyboardOpen`. #53's final commit (`e2e8daf` "re-check the keyboard on window resize") already does this. | Nothing to do; U13 still checks the keyboard hide on a real phone (U6-3). |
| 8 | follow-up | P1 / U10 | Text inputs (import URL, paste textarea, Atlas search, Chat) are still hand-styled (U4-4, re-assigned from U6, which touched none). The files are #55's (`components/character/*`, atlas tab). | Add `Input` to `components/shared/controls.tsx` on the `.select` box model once #55 merges; use it in U10. |
| 9 | follow-up | owner | The CI guard against session info (see Needs owner 1). | See below. |

## Needs owner
- SB2-1: add a CI step that fails a PR when a commit in `base..HEAD` or the PR body contains `claude.ai/code/session`.
  Recommended: check the PR body only, because old trailers can't be fixed in history without a force-push (#53 has 4 commits with
  trailers and would fail a commit check). Add the commit check later if wanted, scoped to
  commits after a chosen SHA.
- W15-2: cursor spotlight (from the card-hover pulse / hero draw-in / cursor spotlight follow-up). Cursor effects are deferred in
  CLAUDE.md's Design section. Recommended: keep it deferred and ship only the card-hover pulse and hero draw-in in the
  follow-up PR, because that needs no design-rule change.
