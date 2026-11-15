# Next session: companion C1–C5 (prompt)

Paste the block below into a new session on `Demonad112/upgraded-disco-companion`.

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. No session links on GitHub. Copy voice per docs/COPY.md.
Never merge. Run tests at the end, not after every step.

Context: the perf stack is open, ready, not merged:
  #186 P1 variant/20261115-perf-idle (base main)
  #187 P2 variant/20261115-perf-wraith
  #188 P3 variant/20261115-perf-tier
  #189 P4 variant/20261115-perf-raster
Relevant for C1-C5: lib/idle.ts (subscribeIdle, isIdle, <html data-idle> after 10 s), lib/fxTier.ts
(<html data-fx> full|lite|still), Companion.tsx doze/wander already use the idle signal, hop plays 3x
(companion.css .is-hop), launcher halo is inside the SVG (Wraith.tsx wr-halo).

Branch: variant/20261115-companion from variant/20261115-perf-raster. If the diff passes ~400 lines,
split into one stacked branch/PR per batch (C1 against perf-raster, each next one against the previous).
PR body: Preview URL first (https://<branch-slug>.upgraded-disco-companion.pages.dev/, slug cut at 28 chars),
template headings, and "Merge the perf stack (#186-#189) first".

Owner decisions (2026-11-15): launcher 64 px with a static halo; first visit gets a 3-line tour, then a
smarter hop.

C1 launcher and tour
- Launcher 64 px. Phones: #main bottom padding = 64px + 3rem.
- First visit: a 3-line tour; remember it in localStorage `poe2-companion-toured`.
- Hop only when the checklist has completed > 0 steps or a recent character exists.
- Tip reads "Next: {title}." linking /checklist/#{id}. Titles come from a small {id,title} module
  (src/data/stepTitles.ts) guarded by a test against the roadmap data, so the companion chunk does not
  pull the whole roadmap.
- aria-label "Companion guide". Clear the startle timer on unmount. Check whether a same-path Reopen
  re-imports the chunk; fix if so.
- Update e2e/companion.spec.ts for the tour and the hop rules.
C2 pure nodeFor(id, ctx): the companion's start node follows the page (/character, /checklist,
   /atlas, /dashboard, home). Unit-tested.
C3 Top fix + patch notice
- recordRecent stores topFix: title = splitAction(action).lead, tab id e.g. `top-fixes-title`.
- Patch notice when the stored snapshot's gameVersion differs from CURRENT_PATCH.
C4 Questions node in the companion tree.
C5 Tests: nodeFor per route, tour once, hop gating, topFix shape, patch notice, stepTitles vs roadmap.

Data shapes: when RecentCharacter or the companion store changes, grep apps/web/e2e for the old path and
update specs in the same commit; bump the stored version with an accept guard.

Gate once at the end of each batch: npm run check, npm run build, node scripts/route-weight.mjs (no route
heavier than the perf-raster branch; LAZY_BUDGET is 188,000 with 187,025 used: raise it only with the
reason in the PR body). Then run e2e once: companion, a11y, character specs (--trace off).

Wrap-up:
- docs/design/WRAITH.md: launcher size, tour, hop gating, nodeFor, Questions node.
- docs/HISTORY.md: one entry for the perf stack (P1-P4, numbers from docs/design/SKY-FX.md § Raster) and
  one for C1-C5.
- PRs ready; a scheduled check-in that confirms required checks are green on every open PR of both stacks.
- Final report: PR links, anything queued for the owner (Owner queue has FX-GRAIN from P4).
```
