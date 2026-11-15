# Carry index

One line per session ID: PR state, then open rows. This index is shared (any session updates it); carry files are not.
The PR number lives here only. Live rows are tracked in `docs/remaining/REMAINING-WORK.md`; owner decisions in its
§ Owner queue. Session IDs: prefix + next free number for that prefix (Active and Archive below).

## Active
- [WQA4](WQA4.md): merged #177.
- [PRO1](PRO1.md): merged #175 (W1–W6 closed in WQA4; open row W7 for next-A; PRO1-3 in Owner queue)
- [WQA1](WQA1.md): merged #173, `test` red at merge (e2e flake; `main` green after). Open rows WQA1-2 to WQA1-6; WQA1-1 in Owner queue
- [WQA3](WQA3.md): done, docs-only PR (scroll + quality audit: sky loses its scroll pause on resize, 17–34 % janky frames on phone; open rows in batches A, C–F; WQA3-5/6 declined and WQA3-7/19 done in WQA4)
- [UXS2](UXS2.md): merged #171 (layout defects UXS2-2 to UXS2-7; UXS-1 type scale in Owner queue)
- [CF2](CF2.md): merged #163 (follow-ups CF2-1 to CF2-5; CF1-1 settings deny in Owner queue)
- [PXC](PXC.md): merged #154, #169 (open rows 2–7 and 11; PXC-1 declined by owner in WQA4)
- [PXV](PXV.md): merged #155, #158 (waystone #156 and ledger #157 closed; open row PXV-5)
- [PXA](PXA.md): merged #136, #142 (open row PXA-9; PXA-7, PXA-8 in Owner queue)
- [PXB](PXB.md): merged #137 (open row PXB-2, home hero CLS)
- [PV1](PV1.md): merged #128 (open row PV1-4 = register R65, batch PV3)
- [OC1](OC1.md): merged #121, #127 (open row 3 = register R60, in Owner queue)

## Archive
Carry files removed; see git history.
- 2026-11-14 (companion removal): CMP1 #172. The owner removed the mock companion; its code, tests, styles, footer
  toggle and carry file are gone, and rows CMP1-1 to CMP1-5 are closed as withdrawn.
- 2026-11-14 (PRO1): UXS #170, CF1 #162, N1 #122, N2 #124, N3 #125, N4 #153, PL1 #120/#123, PX #135/#131, PP1 #134,
  PP2 #133, PP3 #132, ATLAS-MAP #164/#166 (#165 closed), PXD #138, PXA-followups #151, ATLAS-MAP-PLAN and
  GEAR-DESIGN-PROMPT (prompts, built in #160 and #164–#166). Rows they still had are resolved in `PRO1.md`.
- 2026-11-12: earlier batches.
