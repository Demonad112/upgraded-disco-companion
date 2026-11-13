# PXC carry-over · 2026-11-13
PR: draft · Branch: claude/pxc-perf-qa · Preview: Cloudflare Pages preview of this PR

PXC = PX10, PX11, PX0, PX12 (N3 in `docs/plans/NEXT.md`). Measured on main at c6caaee, mobile 390x844, 4x CPU, ~1.6 Mbps / 165 ms.
Commits: (1) PX10/PX11 /trade CLS fix and global Lighthouse assertion; (2) PX11b route-weight budgets, import e2e; (3) PX0 visual spec; (4) PX12 LastCharacterCard order.

## Checked (previous wave)
- N1, N2, N4: merged (per owner brief).
- main route-weight: `/` was 127 B over its 156,842 budget (156,969 br); fixed by PX11b budget 158,000.

## Resolved from earlier carry files
- PXD-1: PERF-PLAN "4–8" items run except 1b and 1c (see Open). Results in PERF-PLAN "4–8" Result column.
- PXD-2: PX11b done (budgets, `scripts/perf-*`, `apps/web/e2e/perf-import.spec.ts`); lazy-chunk budget line not added (Open).
- PXD-3: partial. PX10 candidates resolved as listed in PERF-PLAN PX10 table; two remain open.
- PXD-4: Lighthouse runs on all 8 routes with one global assertion; CI job time to be read on the first CI run.
- PXD-6: /trade CLS fixed (loading card min-height 840 px phone / 660 px md+; was 0.3855, now expected 0).

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | owner step | PX0 | Visual baselines not generated locally. After the first CI run, download artifact `visual-baselines` and commit PNGs to `apps/web/e2e/visual.spec.ts-snapshots/` | Do it, because until then the diffs fail (`updateSnapshots: 'missing'` only fills gaps in CI) |
| 2 | follow-up | PX9 | `/character` lazy-chunk budget line in `scripts/route-weight.mjs` | Add once PX9 lands chunk names |
| 3 | follow-up | next-U | `/checklist` content-visibility (85 % below fold, style 93 ms, layout 61 ms) | Measure after visual baselines exist; needs per-section intrinsic sizes, CLS risk |
| 4 | follow-up | next-U | Sky rAF loop: pause when covered by solid panels (not measured; sky visible in margins, so never fully covered) | Do not apply yet; revisit if a route is fully covered |
| 5 | follow-up | next-U | Global CSS split (coverage reports 0 % unused; treat as unproven) | Re-measure with `CSS.startRuleUsageTracking` on a real build before any split |
| 6 | follow-up | next-U | Service worker (item 8): headless run registered no controller; second visit 48 requests / 618,544 B | Re-run with a real browser profile; sw.js read found no fault |
| 7 | follow-up | next-U | Items 1b (import trace split) and 1c (live ladder timing) | Run 1b locally; 1c needs the proxy (offline here) |
| 8 | follow-up | owner / next-U | Skills not installed in this session: ux-audit, spacing, empty-states, verbs. Those sections NOT run (no pass claimed) | Run them in a session that has the skills |
| 9 | bug | next-U | `/dashboard` `#farm-tab-setup` "Set up" contrast 2.21:1 at 390 px (ink-mute @0.45, dimmed tab) | Check whether the tab is disabled; if disabled, WCAG exempts it; if not, raise opacity |
| 10 | follow-up | next-U | Touch targets under 44 px at 390: skip link; "About patch data" 16x12; "Dismiss patch notice" 21x14; two 112x18 checkbox labels; footer "Farm" 29x44 (home, character) | Fix in PX7/PX8 follow-up |
| 11 | question | PX9 | `scripts/perf-diff.mjs`: kept, currently unused | Delete in the PX9 PR if still unused, because unused scripts drift |

## Needs owner
- PXC-1: commit the `visual-baselines` PNGs after the first CI run. Recommended: yes, because without them the 36 visual shots fail rather than guard anything.
