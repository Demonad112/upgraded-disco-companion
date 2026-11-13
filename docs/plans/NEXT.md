# NEXT: run plan after PX waves 1 and D (2026-11-12)

Replaces the wave table and status in `PX-MASTER.md` from here on. PX-MASTER stays as background for scope and
overlap rules. Each step is one session, one branch, one PR. Default to the cheapest model that fits; escalate only if
a step fails twice.

## Where things stand

| Done (merged) | Open |
|---|---|
| PXA #136, PXB #137, PXD #138, PX2 #139, CI draft-skip #140, docs/hook trim #141, check script + generated guard #143, Dependabot + PR template + `.next` cache #144 | #142 PXA finish (draft, 1 mobile e2e failure) |

Closed #145 (duplicate of #143).

## Steps (in order)

| # | Step | Model · effort | Branch | Done when |
|---|---|---|---|---|
| N1 | Finish #142: fix `character.spec.ts` "phone-first screen … above the fold" on mobile (`boundingBox()` returns null after the fixes/full pass split). Wait for the element to be visible before measuring; do not loosen the assertion. Mark ready so CI runs e2e once | Sonnet · medium | `variant/20261112-character` | #142 green and merged. **Status: fixed, awaiting CI e2e + merge** |
| N2 | PXA follow-ups from `docs/carry/PXA.md` Open #2 and #4: remaining `#advanced-fold` clicks → `openTab`; network-log check that no tree/pob-skills/mod-display request starts before the card paints | Sonnet · low | `claude/pxa-followups` | carry rows closed. Status: done on branch; no `#advanced-fold` on main (re-check after #142); `request-order.spec.ts` added, e2e pending CI — see `docs/carry/PXA-followups.md` |
| N3 | PXC (PX10, PX11, PX0, PX12): run PERF-PLAN "Not measured" commands, finish PX10/PX11, ux-audit/spacing/empty-states/verbs sweep, re-run then delete `docs/plans/pp3/*.mjs`. Docs and screenshots to a Haiku subagent | Sonnet · medium | `claude/pxc-perf-qa` | One CI run carries full gate, e2e, Lighthouse, axe on 8 routes. **Status: done on branch; see `docs/carry/PXC.md`** |
| N4 | Small core fixes R64, R66, R67 (verify R67 is not already fixed by #138) in one PR | Sonnet · low | `claude/r64-r66-r67` | unit tests cover each. Status: done on branch; see `docs/carry/N4.md` |
| N5 | R63 PoB2 oracle (Yykiuy, Athrynas) per `docs/plans/POB-VERIFY.md` | Sonnet · medium | `claude/r63-pob-oracle` | parity table in the PR |
| — | Register, carry README and status rows after each merge | Haiku · low | same PR as the step | — |

N2 and N4 can run in parallel with N1 (no shared files). N3 waits for N1. N5 any time after N4.

## Decisions taken (owner may revise)

- PX-MASTER lead models are lowered: PXC Opus/Sonnet-high → Sonnet medium; orchestrator → Haiku. Escalate per step on a second failure.
- R65 (trade-map pseudo totals) waits on the owner's live trade2 check (R42); parked, not in this plan.
- R10/R40 danger calibration stays parked until the owner logs runs.
- Local gate per step: `npm run check` (typecheck, lint, unit tests) plus the touched e2e spec only if it is quick; full e2e and Lighthouse are left to CI (draft PRs skip them; mark ready once).
- Remote branch `ccr-e4f530fb-9ofmui` had one unmerged docs commit (PP1–PP3 marked merged); it is folded into this PR, so the branch can be deleted.
