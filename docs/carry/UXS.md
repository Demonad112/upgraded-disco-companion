# UXS carry-over · 2026-11-13
PR: #TBD · Branch: claude/ux-skills-sweep · Preview: Cloudflare Pages preview of this PR

Sweeps PXC skipped, run with the new `.claude/skills` (ui-type-and-space, ui-design-critique-loop, site-ui-rules).
Scope: 8 routes plus `/character` imported with the bundled fixture, at 390x844 and 1440x900, reduced motion, built export. Scripted DOM pass (targets, spacing, sizes, radius, labels, overflow) plus screenshots read at 390 for `/dashboard`, `/checklist`, `/character`, `/trade`, import. 1440 shots were captured, not read one by one.

## Checked (previous wave)
- PXC (#169): still open; not edited. Branch is off main, so `route-weight.mjs` still reports `/` over budget by 234 B on main (PXC raises the budgets).

## Resolved from earlier carry files
- PXC (Needs owner, dashboard "Set up" tab 2.21:1): the tab is `disabled` until a farm is picked (`FarmPlanner.tsx`, `farm.css` opacity .45), so it is exempt from WCAG 1.4.3. No change. The same holds for atlas "← Prev" at .5.

## Results
- No horizontal overflow on any route at either width.
- No rounded corners on any visible element.
- Spacing: padding, gaps and margins sit on the 4 px grid except `.pill` (1 px / 7 px), the `.seg-item` gap (6.4) and gauge gaps (3). All are intentional compact controls; not changed.
- Fixed (S): the nine Atlas "More" / "Less" buttons had the same accessible name. Now "More about <cluster>" (visible text still starts the name).
- Empty states: every list had content with the fixture. Checked by hand: `/character` before import (form plus a dashed preview with no action of its own; the action is the Analyse button above), `/trade` (no base picked).
- Verbs: actions are verbs ("Set up", "Analyse", "Mark done", "Copy …", "Open map"). Tabs and sort chips are nouns by design. `docs/COPY.md` has no control-label rule, so "start with a verb" was judged on buttons only.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | recommendation | next-U | 17 distinct text sizes across 8 routes (9, 10, 10.5, 11, 11.5, 12, 12.8, 13, 14, 15, 15.5, 16, 17, 18, 19, 20, 22, 24, 26, 34, 36, 38, 60, 64 px in use); 27 text nodes are 9 or 10 px | Collapse to about 8 sizes with a 11 px floor for labels. Size M. Needs a visual pass, so run it as a variant branch. |
| 2 | recommendation | next-U | Tap boxes under 36 px (nav links 24 px, "More" 19 px, "Watch the source video" 22 px, footer links, banner dismiss 21x14). `hit-area` pseudo-elements enlarge some; not re-measured here | Re-measure with the PXC target script; fix any without `hit-area`. Size S. |
| 3 | recommendation | next-U | ImportBar "Example: <url>" button has the URL as its only label (no verb) | Change to "Example: Use this URL" or similar; Size S, needs the e2e touching it re-run. |
| 4 | follow-up | next-U | `/character` before import: the dashed preview box has no next action | Add a "Paste a URL above" line or hide the box until a result exists. Size S. |
| 5 | follow-up | next-U | 1440 px screenshots not read frame by frame; import view at 1440 checked by script only | Read them with the critique rubric. |

## Needs owner
- None.
