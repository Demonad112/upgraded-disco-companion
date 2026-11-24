# Plan: the old URL analysis from a pasted poe.ninja PoB code

## Goal

Before NP1-1 (2026-11-18), pasting a poe.ninja character URL gave the full analysis. This plan brings back the same responses, findings, panels and recommendations, with the URL replaced by the **PoB code poe.ninja provides on its character page**. That code is the priority source. Nothing new, nothing less, no backend.

Out of scope: the ladder grade (the score keeps its range, e.g. `D–B`), live fetch (`NINJA_IMPORT_BLOCKED` stays), a side-by-side of two codes, ΔDPS (stays null; nothing is simulated).

Owner answers (2026-11-24): the poe.ninja code is the priority; build around the owner's code only; no compare view; the recommended answers below are the owner's answers; fewest batches.

## The reference code

The owner's code (pasted 2026-11-24) is **byte-identical to the committed `packages/core/test/ninja-legacy/main-ninja.code.txt`**. It is the only verification character in this plan. Decoded (untrusted data, read and never executed):

- 11,876 chars, 52,823 B XML, all 203 `_` intact. Root `<PathOfBuilding2>`, Monk / Martial Artist, level 90, `mainSocketGroup` 15 (Storm Wave).
- 107 `PlayerStat`, 0 `FullDPSSkill`, 0 `MinionStat`. 18 items (`Unique ID:` lines, 93 `<ModRange>`), 18 skill groups / 79 gems, 123 nodes, tree `0_5`.
- Life 1494, ES 2827, Mana 790, Spirit 147, Fire / Cold / Lightning / Chaos 75 / 80 / 76 / 53, Armour 75, Evasion 7407, TotalDPS 98,589.73, TotalEHP 20,451.92.
- Config: poe.ninja's baseline, saved as 22 `<Input>` (conditions, charges, nearby enemies, 8 quest rewards). Flasks and charms on = five `<Slot active="true">`. The boss is not an input because it is PoB's unsaved default (`enemyIsBoss` `defaultIndex = 3`, `vendor/pob2/src/Modules/ConfigOptions.lua:1982`).
- poe.ninja strips `<Import>` (no league, no character hash) and re-serialises the XML (alphabetical order, `nil` values). The readers already cope.

The same config gives the same numbers: a PoB2-app code under poe.ninja's config matched this code on all 107 PlayerStats (`CODE-DECODE-FINDINGS`, 2026-11-24). So a PoB2-app code goes through the same path, provided its Config tab is set to the rules list (`docs/POB-NINJA-CONFIG.md`) before Generate.

## Baseline: the old URL flow (`4964edf`)

`ImportBar` → `importProfile` → `parseProfileUrl` → `NinjaClient.fetchCharacter` (proxy `/api/character`) → `handleResult` (`source 'poe.ninja'`, `raw`, `sourceUrl`) → `analyzeCharacter(raw, opts)` in three passes: card `{source, dataVersion}`, fixes `+tiers, ladder`, full `+tree, catalog`. The full pass is saved to history and recents. `CharacterResults` renders six tabs.

**Today** a pasted code already runs the same `analyzeCharacter` (`source: 'pob-export'`, `apps/web/src/app/character/page.tsx:212-216`), and every tab renders. The gaps are data, not wiring. `pobToCharModel` leaves `breakdowns`, `name`, `account` and `league` unset. `allGems` holds only the main skill's name (`pob/to-model.ts:123,143`). Reconciliation is skipped for codes (`analyze.ts:390`).

## Feature inventory

The "Old input" column is what the poe.ninja model supplied. The "From the code" column is where it comes from now.

| Feature | Component | Core | Old input | Today on a code | From the code | Batch |
|---|---|---|---|---|---|---|
| What each item is holding up | Attribution | attributeToItems | breakdowns | gap | breakdowns read from the code | CP-1 |
| Findings with item sources (resistance rebalancing, armour sources) | Recommendations, DefensePanel | recommend, statSources, spareResistances | breakdowns, defensiveStats | findings without source names | breakdowns read from the code | CP-1 |
| Cross-validation | Reconciliation | reconcile | export vs model | skipped | code breakdowns vs the code's PlayerStats | CP-1 |
| Couldn't check | CouldntCheck | sourceGaps | — | "Stat attribution" gap | gap dropped for verified stats | CP-1 |
| Easy wins, gear targets, gear tiers, gear fit, weighted trade search, top fixes | EasyWins, GearTargets, GearSlotGrid, GearFitReadout, TopFixes | analyzeItem, rankReplacements, gearFit, buildTradeQueries | items' mod ids | runs on text-matched ids, some wrong (PB-12) | the same text match, PB-12 fixed | CP-2 |
| Damage review, audit (gems) | DamageReview, AuditPanel | reviewDamage, auditCharacter | skills[].allGems | main skill name only | `<Skill>` groups (18 groups, 79 gems) | CP-2 |
| Import box | ImportBar | looksLikePobCode, pobToCharModel | URL | paste (PoB wording) | led by "poe.ninja PoB code" | CP-3 |
| Changed since, history, trends, recents | ChangedSincePanel, Progress, HistoryChart, recentCharacters | toSnapshot, latestDiff | account + name | not saved for codes | optional name field in the paste box | CP-3 |
| Build card, grade, share card | Showcase, ShareCard | assessment | identity, defense, dps | yes; age "unknown" | unchanged (a code has no timestamp) | — |
| Build score | BuildScore | assessBuild | defense, dps, ladder, config | yes, a range | unchanged (ladder out of scope) | — |
| Defences, checklist, headroom, what-if | OverviewCards, DefenceChecklist, DefensePanel, Headroom, WhatIfPanel | spareResistances, analyzeContent, whatIfModel | defensiveStats | yes | unchanged | — |
| DPS matrix + config caveat | DpsMatrix | describePobConfig | skills[].dps | main skill only | unchanged: no FullDPSSkill in the code, so the per-skill gap stays | — |
| Character notes, tree and keystones, chat | CharacterNotes, TreePanel, Chat | inactiveSetFromPob, resolveAllocation, buildChatContext | items, passives | yes | unchanged | — |
| Trade league | TopFixes, EasyWins | — | league | `TRADE_LEAGUE` fallback | unchanged (poe.ninja strips the league) | — |
| Copy link | CopyLink | — | sourceUrl | hidden | none (no URL, no scraping) | — |
| Ladder grade | BuildScore | ladder | fetchLadder | none | out of scope | — |

**What the code cannot carry:** per-skill DPS (no FullDPSSkill), a timestamp, the character name and account, the league and the ladder. Each keeps its existing gap or fallback.

## Decision

- **One path.** The poe.ninja code runs as today's `source: 'pob-export'`. There is no new `AnalysisSource`, origin tag or per-source state: one paste, one character. Rejected: an origin tag or a second source (same config gives the same numbers, so nothing would differ), and a compare view (owner: not wanted).
- **Breakdowns are read, not simulated.** `pob/code-breakdowns.ts` builds the existing `BreakdownIndex` from what the code and our shipped data already say:
  - item lines plus their `<ModRange>` rolls (`pob/items.ts`, `gear/text-mods.ts`);
  - tree node stat lines (`passive-tree.json` nodes carry `s: [...]`; the tree is already an `AnalyzeOptions` input);
  - quest `<Input>` text;
  - PoB's level and attribute base constants (CP-5).

  Source kinds use the existing `SourceKind`: `item`, `passive`, `quest`, `base`, `attribute`; anything else is `unknown`.
- **Verified against PoB's own totals.** Each stat runs the existing `verifyTotal` against the code's PlayerStat. A stat whose parts do not reproduce it (conversion, override, a line the grammar misses) is marked "doesn't add up" through the existing `partsReproduceBase` path. It is never adjusted to fit. `attributeToItems` and `recommend` stay unchanged.
- **Coverage first:** Life, Energy Shield, Mana, Spirit, Armour, Evasion and the four resistances, as poe.ninja's breakdowns had. Max hits, EHP and DPS keep PoB's numbers as given, with no per-source rows (the old flow had none either).
- **Rejected:**
  - The headless per-stat sources exporter (NJ-4..NJ-6): CI-only, so it never reaches a live paste.
  - A live calc service (B9): a backend.
  - PoB in the browser: about 42 MB of Lua and data.

## Batches

| Wave | Batch | Model | Depends on | Parallel with |
|---|---|---|---|---|
| 1 | CP-1 Core: breakdowns read from the code, verified; reconcile for codes; attribution gap dropped | Opus | CP-4, CP-5 (answered) | none |
| 2 | CP-2 Core: `allGems` from `<Skill>` groups; PB-12 mod-id fixes (**done**) | Sonnet | CP-1 merged | none |
| 2b | CP-7 CI-only all-groups oracle from PoB's engine (`tools/pob2/groups.lua`, `run.mjs --groups`, `*.groups.oracle.json`) (**done**) | Opus | CP-2 | none |
| 3 | CP-3 Web: paste box for the poe.ninja code, optional name, e2e on main-ninja | Sonnet | CP-2 merged, CP-6 (answered) | none |

**CP-1** (Opus, about 15–25 files)
- **Files:**
  - `packages/core/src/pob/code-breakdowns.ts` (new);
  - `analyze.ts` (use it when `fromCode`; run `reconcile` on code breakdowns vs PlayerStats; `pobCodeGaps` drops "Stat attribution" when stats verify);
  - a base-constants exporter in `tools/pob2/export/` plus its generated file (CP-5).
- **Red test:** `packages/core/test/ninja-legacy/code-analysis.test.ts` on main-ninja. Each covered stat either passes `verifyTotal` against the numbers above or is listed as not reproducing. `attribution.items.length > 0`. A resistance finding names its item sources.
- **Golden diff:** `ninja-legacy/golden/main-ninja.expected.json` (cause CP-1). Other goldens regenerate with the same cause; they are not used as verification here.
- **Route:** `/character` has about 435 B headroom, so expect a raise to the measured size rounded up to the next 2,000 B, with the cause in `scripts/route-weight.mjs`.
- **e2e:** none.

**CP-2** (Sonnet, about 10–15 files) — done 2026-11-24, see the batch log
- **Files:** `pob/to-model.ts` (`allGems` per `<Skill>` group); `gear/text-mods.ts` (PB-12: prefer ids legal for the base's class, scale stats stored in hundredths, resolve the two-stat implicit).
- **Red tests, in the same test file:**
  - damage review lists the supports of the 18 groups;
  - every matched id is legal for its item's base;
  - the amulet's capacity reads 4/2.
- **Golden diff:** `main-ninja.expected.json` (cause CP-2).
- **Route:** measured.
- **e2e:** none.

**CP-3** (Sonnet, about 10–20 files)
- **Changes:**
  - `ImportBar.tsx`: the paste box leads with "Paste the PoB code from poe.ninja's character page", plus one line for PoB2-app codes ("Set Config to poe.ninja's rules before Generate", linking `docs/POB-NINJA-CONFIG.md` content on `/methodology`).
  - An optional character name, which becomes `identity.name`. History, recents and changed-since are keyed by it.
  - `page.tsx` header and footer wording.
  - `apps/web/e2e/main-payload.ts` and `scripts/lib/main-payload.mjs` read main-ninja (CP-6).
- **Red test:** e2e first. Paste main-ninja: all six tabs render, "What each item is holding up" has rows, a resistance finding names items, and gear tiers show.
- **e2e:** update `character.spec.ts:59-78`. Grep `apps/web/e2e` for numbers from the old `main.code.txt` and update them in the same commit.
- **Screenshots:** ask before the PR.

**Each batch:** about one cause, ≤40 files; `npm run gate`; `npm run test:coverage -w @poe2/core` (90 / 75, never lowered); `node scripts/route-weight.mjs`.

## Owner rows (answered, 2026-11-24: the recommended answer is the answer)

| ID | Question | Answer |
|---|---|---|
| CP-4 | Do code-read breakdowns (item, tree, quest and base lines, verified against the code's own PlayerStat totals) count as PoB's figures (`pob-export`), not a simulation? | Yes. Unverified stats are flagged, never adjusted |
| CP-5 | Export PoB's level and attribute base constants (Life, Mana, ES, Evasion) via `tools/pob2/export/` into generated data | Yes, rebuilt with `npm run build:pob -w @poe2/data`, like B4 |
| CP-7 | Per-skill DPS for the non-main groups: the code has none, and the site never simulates | A CI-only oracle from PoB's engine now (pob2-alignment decision 3): `*.groups.oracle.json`, tests only; the site shows these numbers in B9 with provenance `pob-sim` (answered 2026-11-24) |
| CP-6 | Should e2e, the mock proxy and the screenshot payload use main-ninja as the one reference character? | Yes. Numbers change; no assertion is removed |

Rows this plan supersedes:
- NJ-3 is dropped (no compare).
- NJ-4, NJ-5, NJ-6, NJ-8 and NJ-9 are parked (reopen if `verifyTotal` fails on most covered stats).
- PB-10 is parked (the poe.ninja code already carries the baseline).
- PB-6's import-UX half moves to CP-3.
- PB-12 is folded into CP-2.

## Risks

| Risk | Mitigation |
|---|---|
| A stat does not reproduce (conversion, override, an unparsed line) | Flagged per stat by `verifyTotal`, and attribution marks it untrustworthy. CP-1's test lists which stats verify |
| A code carries less than the model did | The inventory names every gap (per-skill DPS, timestamp, name, league, ladder); each keeps its existing gap copy |
| Stale poe.ninja data | Numbers are used as given; no timestamp is claimed |
| PoB version drift | The code's numbers come from poe.ninja's PoB and are used as given; the site recomputes nothing. "PoB 0.23.1" labels only runner-recomputed figures |
| Cloudflare / ToS | No fetch and no scraping; poe.ninja data arrives only as a code the user pastes |
| Bundle size | CP-1 and CP-3 are measured, and any raise follows the CLAUDE.md rule |
| Golden churn | One cause per batch; main-ninja's golden is the only one reviewed as verification |

## Verification

1. `npm run gate` per batch.
2. CP-1 / CP-2 test file on main-ninja green: verified stats, attribution rows, sourced findings, gems, legal ids.
3. `npm run test:coverage -w @poe2/core` (90 / 75).
4. `node scripts/route-weight.mjs` within budget, with raises stated.
5. CP-3 e2e: paste main-ninja, all six tabs, attribution rows, gear tiers. Screenshots at 390 / 1440 px if the owner says yes.

## Batch log

One entry per batch: decisions (Q → A (why)), then "Suggestions for next batch".

### CP-1 (2026-11-24)

Result on main-ninja (read lines vs PoB's PlayerStat):

| Stat | PoB | Lines | |
|---|---|---|---|
| Life | 1494 | 1423 flat × 1.05 = 1494 | verifies |
| Energy Shield | 2827 | 839 × 3.37 = 2827 | verifies |
| Mana | 790 | 752 × 1.05 = 790 | verifies |
| Spirit | 147 | 100 (three default quests) + 47 | verifies |
| Armour | 75 | 42 × 1.78 = 75 | verifies |
| Evasion | 7407 | 2279 × 3.25 = 7407 | verifies |
| Fire / Cold / Lightning / Chaos (before cap) | 87 / 139 / 130 / 53 | 42 / 34 / 85 / 8 | don't: Mageblood's "Legacy of …" lines grant resistances that depend on the copied flasks and charms; they are not stat lines in the code |

The owner's PoB2-app export of the same build (`pob2/forbidden-rites/main.code.txt`, a different config) also verifies the same six with different numbers (ES 2673, Evasion 6837, Armour 73), so the grammar is not fitted to one code.

Decisions:
- Where do the base constants ship? → In `passive-tree.json` as `characterBase` (exporter `tools/pob2/export/constants.lua`, run by `build-tree-pob.mjs`). Why: a code breakdown needs the tree and the base at once, and the web already passes the tree to the full pass, so no web wiring. Literals in PoB's calc source (`base = 16`, `or -60`, 2 Life per Strength) are read from the vendored text by pattern and fail the build if they stop matching.
- How is a failing stat kept out of attribution when `base` is the sum of the lines? → `BreakdownIndex.unreproduced` (code only), read by `attributeToItems` beside `partsReproduceBase`. Why: one optional field; poe.ninja's path and goldens are unchanged.
- Strictness → a resistance must match PoB's uncapped value (`Resist + OverCap`), not only the capped one, because attribution's "without" and overcap figures use the uncapped sum. Reconcile for codes uses the same checks (`codeChecks`), and skips the sheet-vs-PlayerStat checks (that would compare the code with itself).
- Item defences → the armour piece's header (`Evasion: 1264`) is PoB's local total; local lines on it are not re-added. `Has +N … per player level` is scaled by local increases and quality as `Item.lua` does.
- Attributes → Str/Int as PoB states them (PlayerStat), not recomputed from "+5 to any Attribute" choices.
- Not read, named per stat when they touch it: `Bonded:` rune lines (PoB applies them only with a flag), conditions other than Been Hit Recently, `more` multipliers.
- Cross-validation panel subtitle now says what a code is checked against (copy only).
- Other goldens: none changed.

Suggestions for next batch (CP-2):
- `allGems` from `<Skill>` groups in `pob/to-model.ts`; red test in `code-analysis.test.ts`.
- PB-12 in `gear/text-mods.ts`: base-class-legal ids first, hundredths, the two-stat amulet implicit (capacity 4/2).
- If a later code shows a common unread condition on Life/ES/Evasion, add it to `KNOWN_CONDITIONS` in `code-breakdowns.ts` with the config input it reads; never widen without a code that verifies.
- Mageblood: reading its legacies needs the flask/charm lines it copies; worth a row only if more than this character carries it.

### CP-2 (2026-11-24)

Result on main-ninja: 18 `<Skill>` groups, 79 gems, all in `skills[].allGems` with supports flagged; Pinpoint Critical on groups 10, 12 and 15; Storm Wave's review lists its own five supports (before: none, only the skill name). Amulet capacity 4/2. Blight Weaver's `Rune: None` ×2 is a finding. Tests: `ninja-legacy/code-analysis.test.ts` (CP-2 blocks), `ninja-legacy/decode-completeness.test.ts`.

Decisions:
- Order of `skills` → the main group first (poe.ninja's convention, which `dps.primary` and many tests rely on), then PoB's order; each entry carries `group` (1-based, code only). Why: the CP-7 oracle joins on the group number, not on position.
- Supports in `allGems` → `itemData.support: true` and no level/quality, as poe.ninja reports them. Why: `auditGemQuality` would otherwise flag every support at quality 0.
- A `<FullDPSSkill>` figure → placed on the group whose active gem it names; its own entry only when no group does.
- PB-12 → wrong-class affix ids and the hundredths scale were already fixed (spawn rules, `scaleFor`); both are now pinned by tests on main-ninja. The open part was the implicit: a multi-stat display mod printed one line per stat is matched as one mod (`matchJoined`, up to 3 lines, only when every line is one of its stats), and implicits with the same text on two classes are told apart by the id's class name (`AmuletImplicit…` on an amulet). Side effect: two more implicits resolve on main-ninja (Morbid Mantle movement speed, Behemoth Band chaos resistance), which moves Ring 1 from rank 4 to 7 in `gear-ranking-main-reference-defence` (a replacement no longer "closes" its implicit chaos).
- Empty runes → `Rune: None` is a socket, not a rune (`pob/items.ts`), so the existing audit section sees it; a new rule `empty-rune-sockets-<slot>` makes it a finding with `impact: null`, so `measured.dps` stays null.
- Per-use label → `SkillDamage.useRates` is set only when the code's CombinedDPS is below TotalDPS; the DPS row shows "N per use · M if used continuously". Storm Wave doesn't fire. The group-4 test variant carries PoB's engine figures for that group, because a code holds PlayerStats for its main group only. Note: Whirling Assault's CombinedDPS (20,186) is above its TotalDPS (14,085), so the rule does not fire for it.
- Decode completeness → every element path and attribute of the main-ninja XML and every item-header key is listed as read (where) or not read (why); `Bonded:` lines and Mageblood's four legacies are listed as not read, per CP-1.

Suggestions for next batch (CP-7, then CP-3):
- CP-7: the group-4 per-use test should read its figures from `main-ninja.groups.oracle.json` instead of literals.
- CP-3: the DPS row's per-use line is the first web text from CP-2; check it at 390 px.

### CP-7b (2026-11-24): groups oracle in one PoB load

Cause: `pob2-oracle` on the #242 merge head exited 137 in `groups.lua` on main-ninja (run 45354507354). Reloading the export per (group, active skill) built 39 whole builds; one local run of five ran away to 13.9 GB and was OOM-killed, the others peaked at ~850 MB.

Result: `groups.lua` loads once and switches the main skill the way PoB's sidebar dropdowns do (`mainSocketGroup`, `mainActiveSkill`, `buildFlag`, one frame). main-ninja: 14 s instead of 31 s locally, peak ~720 MB, no reloads; `pob2:oracle -- --check` passed 3 runs in a row. 20 of 21 rows unchanged on both codes.

Decisions:
- Rows stay keyed by the export's `<Skill>` order (core's `group`); each row now carries `pobGroup`, PoB's own index. PoB folds granted-skill groups on its first calc, so export groups 2, 16, 17, 18 are computed from the group PoB kept for the same skill (`FOLDED` in the test pins the map).
- Group 18 → now Spear Throw (the kept swap-weapon Spear Throw) instead of Spear Stab. The old Spear Stab was PoB clamping an index that no longer existed, not a PoB fallback; `ENGINE_FALLBACK` is gone.

### CP-7 (2026-11-24)

Result: `tools/pob2/groups.lua` (the attached driver plus an `enabled` flag per row) runs headless PoB once per (group, active skill); `npm run pob2:oracle` writes `<name>.groups.oracle.json` for every current-league code and for `ninja-legacy/main-ninja.code.txt`, `-- --check` fails on a diff, `node scripts/pob2/run.mjs --groups <file|->` prints one. main-ninja matches the reference byte for byte (18 groups, 21 rows, Storm Wave 98,591, Hollow Resonance 33,332 per use / 69,531). Tests: `pob2-groups-oracle.test.ts`, `scripts/pob2/run.test.mjs`; the CP-2 group-4 test now reads the oracle.

Decisions:
- Group 18 (Spear Throw granted by Daevata's Wind on the swap weapon) → PoB fails to process it and computes Spear Stab; named in `ENGINE_FALLBACK` so a PoB change shows up. (Superseded by CP-7b: that was index clamping.)
- `forbidden-rites/main` TotalDPS → 0.21 % off current PoB (stale PoB2-app export, PB-3a); pinned in `STALE_TOTAL_DPS`, every other code within 0.1 %.
- CI path filter → `pob2-oracle` doesn't run on `packages/core/test/ninja-legacy/`; queued as owner row CP-7a (CI).

Suggestions for next batch (CP-3):
- The DPS row's per-use line is the first web text from CP-2; check it at 390 px.
