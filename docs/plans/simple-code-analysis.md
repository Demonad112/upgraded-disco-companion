# Spec and plan: simple PoB2-code character analysis (V1)

Status: **approved**; Batch 1 in progress (2026-11-25).
Intent (confirmed 2026-11-24): [`docs/intent/simple-code-analysis.md`](../intent/simple-code-analysis.md).
Supersedes the CP, B9 (browser engine) and NJ plans, deleted 2026-11-25 (`docs/HISTORY.md`).

---

## Part 1: Spec

### Objective

A player pastes a PoB2 code into one of two boxes: **poe.ninja code** or **PoB2 code**. The site:

1. **Decodes** it into one `CharacterOutline`: every section of the old character page, each field either filled from the code, marked **missing** with a reason, or marked **≈ est.**
2. **Analyses** the outline the way the old poe.ninja URL flow did (Overview, Findings, Defence, Damage, Gear, Progress, Checks). The copy is written for new players, with full detail behind "Pro detail".

The site reads PoB's numbers; it does not rebuild PoB. Only two numbers are calculated: **other skills' DPS** and the **damage mix**. Both come from a mini-calc shaped like PoB's CalcOffence and are checked on every paste against the code's exact main-skill DPS.

**User:** new players first; advanced players through the Pro toggle.

**User stories**

- As a new player, I paste my poe.ninja PoB code and see my character laid out in plain words, with what's missing named, before any advice.
- As a new player, I see my biggest wins first, then gear tips I wouldn't have thought of (e.g. "you have 59% cold res over the cap; that suffix could be crit chance"), then what to work on next while playing.
- As a PoB2 user with my own config, I tick "my own config" and the site uses only the numbers in my code. It adds no assumptions and lists only skills whose DPS PoB computed.
- As any user, I see DPS for my other skills (≈ est.). If the estimate is unreliable, I'm told how to export a Full DPS code from PoB2 and paste it again, and I can still choose to show the estimate.

### Input rules

| Box | Config assumed | Mini-calc | Skills listed |
|---|---|---|---|
| poe.ninja code | poe.ninja baseline (`docs/POB-NINJA-CONFIG.md`) | on | all groups: main (exact), Full DPS rows (exact), the rest (≈ est.) |
| PoB2 code, toggle **poe.ninja config** (default) | poe.ninja baseline | on | as above |
| PoB2 code, toggle **my own config** | the code's own `<Config>`, listed in plain words | **off** | main skill plus Full DPS rows only |
| PoB2 code, toggle **no config** | none; numbers as the code has them | **off** | main skill plus Full DPS rows only |

The toggle never changes a number read from the code; PoB computed those at export. It changes labels, caveats, and whether the mini-calc runs.

### What is read, derived, estimated or missing

| Category | Provenance | Source |
|---|---|---|
| Class, ascendancy, level | `pob-export` | `<Build>` |
| Life, ES, Mana, Spirit, Evasion, Armour, Deflection, block, resists and overcap, max hit per type, EHP, attributes and requirements, charges | `pob-export` | `<PlayerStat>` |
| Main skill DPS, average hit, crit, speed, costs | `pob-export` | `<PlayerStat>` |
| Per-skill DPS where ticked in PoB | `pob-export` | `<FullDPSSkill>` |
| Items, mod lines, roll ranges | `pob-export` | `<Item>`, `<ModRange>` |
| Skill groups, gems, levels, quality | `pob-export` | `<Skill>`, `<Gem>` |
| Tree, keystones, jewels | `pob-export` (shown, **not analysed**) | `<Spec>` |
| Config conditions | `pob-export` | `<Config>` / `<Input>` |
| Stat breakdowns ("what each item holds up") | `derived` (CP-1) | item and tree text, checked against PlayerStat |
| Checklist, spare to trade, killed by, ceiling if closed, waystone tier risk, affix swaps, empty affixes, tiers below top, gear score | `derived` / `nominal` | PlayerStats, items, shipped data |
| Other skills' DPS, damage mix | `estimate` (≈ est.) | mini-calc |
| Name | missing, or typed by the user | n/a |
| League, account, "updated X ago", ladder, poe.ninja link | **missing** (stated, never blank) | n/a; `#pob=` replaces the link |
| Flasks, charms | not analysed; charm overkill flag only | `<Item>` |

### Rules decided 2026-11-25 (they win over anything below that disagrees)

- **Authority order:** the PoB code, then the owner's PoB2 screenshots (`app.expected.json`), then the poe.ninja page, then the intent and this plan, then the repo.
- **Read numbers always win.** A number the code carries is shown as read. Anything computed for it only measures error and calibrates.
- **Self-check:** `error = estimate / TotalDPS − 1`. If `|error| ≤ 0.25`, scale the other same-kind (attack or spell) skills by `TotalDPS / estimate`. Otherwise hide them, show the Full DPS steps and offer "show anyway". With no estimate, or a `TotalDPS` of 0, the estimate is hidden and labelled "≈ est., unchecked".
- **Mini-calc conditions** come from the code's `<Config>` (`readPobConfig().conditionals`; `humaniseCondition` only for conditions with no label), not from a separate baseline list.
- **Every outline field** is a value with provenance, or `{ missing, reason }`.
- **Names:** `ImportBar.tsx`, `apps/web/src/app/character/page.tsx`, `readPobSnapshotFromCode`, `codeBreakdowns(snap, model, tree)`, the `AverageDamage` PlayerStat, `TAB_IDS` in `apps/web/src/lib/characterTab.ts`.
- **Charm overkill** covers charms only (flasks are not analysed).
- **Stat swaps** name a suffix that can roll on that base, and share over-cap across items.
- **No blank category (testable):** every `[data-outline-field]` has a `data-provenance` in `pob-export`, `derived`, `estimate`, `nominal` or `missing`, and non-empty text.

### Mini-calc contract (Batch 3)

- **Shape:** mirrors PoB's CalcOffence (`vendor/pob2/src/Modules/CalcOffence.lua`, `docs/calcOffence.md` in PoB2):
  - attacks run a pass per hand (`MainHand`, `OffHand`), everything else one pass;
  - per-pass values go to `output.MainHand.<Name>`, global ones to `output.<Name>`;
  - `combineStat(name, mode)` merges the hands;
  - output names match PoB's (`TotalDPS`, `AverageHit`, `Speed`, `CritChance`, `CritMultiplier`, `HitChance`, per-type `<Type>HitAverage`).
- **Steps ported:** base hit damage (gem level data plus weapon/added damage) → conversion and "gain as" → increased and more → crit → hit chance → speed → DPS. Not ported: ailment and DoT DPS, minions, totems/traps/mines beyond a count multiplier, triggered skills. Each unported case is "not estimated" with the reason.
- **Conditions:** the poe.ninja baseline only. The mini-calc does not run under own/none config.
- **Self-check:** compute the main skill and compare it with the code's `TotalDPS`. `ratio = code / estimate`.
  - `|ratio − 1| ≤ 0.25`: scale the other skills' estimates by `ratio`, label them "≈ est., calibrated".
  - `|ratio − 1| > 0.25`: hide them. Show the Full DPS steps (tick "Include in Full DPS" per skill in PoB2 → Generate → paste again), plus a "Show estimates anyway" toggle that shows them labelled "≈ est., unreliable (main skill off by N%)".
- **Damage mix:** per-type share of the average hit (main skill included), ≈ est.

### Grade (three axes, each graded on its own)

| Axis | Batch | Input | Method |
|---|---|---|---|
| Defence | 2 | PoB numbers | Existing `assessBuild` / `defenceParts` (`packages/core/src/score/index.ts`), unchanged logic |
| Gear score | 2 | items + profile | Re-implementation of poe2-upgrade-checker's method in our code: per slot `Σ importance × min(roll / cap, 1) / ideal(top K stats)`, resists counted only up to what's still needed, conditional lines ×0.6, rune lines ×0.5; the profile is picked from the main skill type and the life/ES/armour/evasion mix; S/A/B/C/D at 85/70/55/40. Weights come from our own `gear/weights.ts` and `fit.ts` data, not copied from the GPL source |
| Damage | 3 | main-skill DPS (exact) | Content bars (project judgement, labelled as such); see Open question 2 |

The ladder-based damage half and the single combined score are retired.

### Advice (ordering rule)

1. **Biggest wins:** existing Top fixes and Findings ranking.
2. **Gear tips, explained simply:** includes **stat swaps**: an over-cap surplus on a line (e.g. Cold +59) becomes "that line could be X instead", where X is a stat the gear score profile values and the slot can roll.
3. **Improving while playing:** Progress, "Next 3 steps by content".

Plus "What your build is" (a plain summary from skill, damage mix, defence layers and ascendancy), a gem link check (supports whose tags don't match the skill, empty support slots, gems under level, duplicate families), and a charm overkill flag (a charm granting a stat that is already capped).

### Section map: the poe.ninja character page (from the owner's .mht, Yykiuy)

| Section | Fields |
|---|---|
| Header | name, level + ascendancy, account, league, last fetched |
| Import code | PoB code box |
| Equipment | weapon sets I/II, Trade/Copy per item; Runes; Base Jewels |
| Stats → Character | Str/Dex/Int, Movement Speed 139 %, Item Rarity 15 %, charges 3/3/5 |
| Stats → Defensive | Life 1,494; ES 2,827; Runic Ward 854 (not in the code); Mana 790; Spirit 147; Armour 75; DR 1 %; Evasion 7,407; Evade 44 %; Deflection 1,925 / 15 %; Resists 75/80/76/53; EHP 20k; Max Hit 5.2k / 18k / 23k / 19k / 8.0k |
| Stats → Recovery | mana regen 41/s, ES recharge 353/s, recharge delay 3.51 s |
| Main Skills | per skill: speed, crit, multiplier, hit, radius/duration, DPS, damage mix by type, gem level/quality, attack rate, cooldown |
| Passive tree | 113 / 1 / 8 points |
| Ascendancy & Keystones | the ascendancy notables and keystones |
| Quest Rewards | per act |
| Skills | gem groups with level/quality and supports |

### Tech stack

Node ≥22, TypeScript strict, npm workspaces. `packages/core` is pure (no I/O). `apps/web` is Next.js with static export. Vitest (core, web) and Playwright (e2e). No new dependencies.

### Commands

```
npm run gate                                  # changed-path checks; run before every PR
npm run typecheck                             # builds @poe2/core first
cd packages/core && npx vitest run            # core tests
npm run test:coverage -w @poe2/core           # 90% statements / 75% branches
cd packages/core && npx vitest run -u         # regenerate goldens after review; commit with the cause
npm run build -w @poe2/web && npm run e2e -w @poe2/web
node scripts/route-weight.mjs                 # route budgets
node scripts/screenshot.mjs <baseUrl> <scratchpad dir>   # 390 px + 1440 px, never into git
npm run pob2:oracle -- --check                # CI-only guard (LuaJIT or Docker)
```

### Project structure (new or changed)

```
packages/core/src/outline/        CharacterOutline: types, builder, missing list (Batch 1)
packages/core/src/offence/        mini-calc: passes, combineStat, self-check, damage mix (Batch 3)
packages/core/src/gear/score.ts   gear score + profile pick (Batch 2)
packages/core/src/advice/         stat swaps, gem link check, charm overkill, build summary, next steps (Batches 2–3)
packages/core/test/outline|offence|advice/
apps/web/src/components/character/ImportBar → two boxes + config toggle (Batch 1)
apps/web/src/components/character/CharacterSheet.tsx  (Batch 1)
docs/plans/simple-code-analysis.md  this file
```

### Code style

Every outline field carries its provenance; missing is explicit, never `undefined`:

```ts
export type OutlineField<T> =
  | { value: T; provenance: Provenance }                 // 'pob-export' | 'derived' | 'estimate' | 'nominal'
  | { value: null; provenance: 'missing'; reason: string } // shown as "missing: <reason>"

export interface OutlineIdentity {
  className: OutlineField<string>
  ascendancy: OutlineField<string>
  level: OutlineField<number>
  name: OutlineField<string>     // typed by the user, else missing: "a PoB code carries no name"
  league: OutlineField<string>   // always missing for a code
}
```

Plus the existing conventions: pure functions in core, `Sourced<T>` / `labelOf` for UI labels, copy per `docs/COPY.md` (one or two sentences, action first, long text behind Pro detail), design rules in `apps/web/CLAUDE.md`.

### Testing strategy

- **Reference codes:** `packages/core/test/reference/ninja-default/` (poe.ninja config) and `packages/core/test/reference/pob2-own/` (PoB2 export, the owner's own config; added 2026-11-25 with three app screenshots). Both drive every batch's tests.
- **Batch 1:** an outline golden per reference code (`*.outline.expected.json`); a test that every section key is filled or `missing` with a reason; a test that read values equal the code's PlayerStats exactly.
- **Batch 2:** red-then-green unit tests for the gear score, stat swaps and charm overkill; golden diff for the Defence tab inputs.
- **Batch 3:** mini-calc unit tests per step; an accuracy test that the main skill is within 25% of `TotalDPS` on both reference codes; per-skill estimates compared with `*.groups.oracle.json`, with the error reported and asserted ≤ 25% after calibration where the skill type is supported.
- **e2e:** paste each reference code into its box, each toggle state; every tab renders with no blank category.
- **Coverage:** core 90/75 holds.

### Boundaries

- **Always:** run `npm run gate` before a PR. Read PoB numbers verbatim. Label every estimate "≈ est." and every derived figure as derived. Every category shows data, "missing" or "≈ est.". Grep `apps/web/e2e` when a data shape changes. Keep route budgets.
- **Ask first (owner queue):** new dependencies; CI job changes beyond those listed here; design rule changes; content bar values for the damage axis; any extension of the mini-calc past the steps listed.
- **Never:** edit `vendor/pob2/` or generated data; run PoB in the browser or on a server; copy code or tables from GPL/AGPL repos; simulate a number the code already carries; analyse the tree, flasks or charms beyond the overkill flag; weaken or skip a test to get green.

### Success criteria (V1 done)

1. Pasting either reference code, in each box and toggle state, renders every category from the reference design: data, "missing: <reason>" or "≈ est.". Nothing is blank or broken (e2e).
2. Every value read from the code equals the code's PlayerStat exactly (unit tests).
3. The mini-calc's main skill is within ±25% of the code's `TotalDPS` on both reference codes (unit test). Past 25%, other skills hide and show Full DPS steps plus "show anyway" (unit and e2e).
4. Under own/none config, no estimate appears, and only the main skill plus Full DPS rows are listed (e2e).
5. The owner reads the Overview at 390 px and 1440 px (screenshots in chat) and judges it followable by a new player.
6. B9 spike removed; `#pob=` still works (e2e); the oracle CI job still passes.

### Out of scope (deferred)

- Tree analysis (nearby notables, pathing): owner said it's too much; shown only.
- Flask and charm analysis beyond the overkill flag.
- Crafting odds, craft-vs-buy pricing, step routes (POE2_HTC ideas): owner said "not now".
- Item-swap ΔDPS/ΔEHP: not chosen for the mini-calc.
- PoB in the browser (B9 E2–E6) or a calc server.
- Ailment, DoT, minion and trigger DPS in the mini-calc.
- Guide-code compare: a bigger feature.
- Auto-detecting a config mismatch on the PoB2 box: not chosen; easy to add later.
- Ladder grade or live poe.ninja fetch.

### Open questions (with recommended answers)

1. **Config wording.** The owner will supply exact wording and PoB2 settings screenshots for the baseline toggle. *Recommended until then:* the bullet list in `docs/POB-NINJA-CONFIG.md`, verbatim. Needed by Batch 1's toggle copy.
2. **Damage axis bars.** What counts as enough DPS? *Recommended:* time to kill a base rare at the T15/T16 area level from shipped monster-life data, if `packages/data` has it, else owner-set bars labelled "project judgement". Needed by Batch 3.
3. **Oracle scope.** Keep the `pob2-oracle` CI job, busted specs and groups oracle as the CI guard (path-gated, never on the site)? *Recommended:* keep them; the groups oracle is the only per-skill truth for testing the mini-calc. Delete only the B9 WASM pieces.
4. **Gear score weights.** *Recommended:* derive from our existing `gear/weights.ts` and mod tier caps, not the GPL tables. The owner reviews the per-slot table in Batch 2's PR.

---

## Part 2: Plan

### Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| `code-outline` | Decode a code into `CharacterOutline`, plus the missing list, two boxes and the toggle | existing `pob/` readers |
| `defence-analysis` | Defence axis, gear score, defensive gear tips and stat swaps, charm overkill, beginner copy for the Overview, Defence and Gear areas | `code-outline` |
| `damage-analysis` | Mini-calc, self-check, per-skill DPS, damage mix, damage axis, gem link check, "What your build is", "Next 3 steps", three-axis grade | `code-outline` (the gear score from `defence-analysis` feeds the final grade) |

Build order: `code-outline` → `defence-analysis` → `damage-analysis`. One batch each, and each batch ends with a PR, a green gate and screenshots for the owner.

### Batch 1: decode and sort into sections (`code-outline`)

Goal: one decoded object behind every tab. No new analysis.

- [ ] **1.1 Cleanup** (own commit)
  - Delete `tools/pob2/wasm/`, `scripts/pob2/wasm-transform.test.mjs` and the `wasmoon` mentions.
  - Archive the B9, CP and NJ plans to `docs/remaining/archive/`, with a pointer to this plan.
  - Keep `#pob=` (`apps/web/src/lib/pobLink.ts`) and the `forbidden-rites/current` fixture.
  - Acceptance: no reference to `tools/pob2/wasm` remains; `npm run test:scripts` passes; the `#pob=` e2e passes.
  - Files: `tools/pob2/wasm/*`, `scripts/pob2/wasm-transform.test.mjs`, `docs/plans/*`, `docs/remaining/REMAINING-WORK.md`.
- [ ] **1.2 Outline types and builder**
  - `packages/core/src/outline/{types,build,missing}.ts`: `buildCharacterOutline(snapshot, { box, config })` from `readPobSnapshot`, `readPobSkillGroups`, `readPobConfig`, the item readers and `code-breakdowns`.
  - Sections: identity, config (plain words via `humaniseCondition`), defences, offence (main skill plus Full DPS rows), items (flasks and charms listed, not analysed), skill groups and gems, tree (shown), missing.
  - Acceptance: both reference codes build an outline; every field is filled or `missing` with a reason; read values equal PlayerStats exactly.
  - Verify: `npx vitest run test/outline`, goldens `*.outline.expected.json`.
  - Files: about 4 new files plus 2 tests.
- [ ] **1.3 Route the existing analysis through the outline**
  - `analyzeCharacter` receives the outline alongside today's `CharModel` adapter. Each tab's "missing" states read the outline's missing list.
  - Acceptance: existing goldens unchanged, or changed only where a blank became "missing: <reason>" (golden diff with the cause).
  - Files: `analyze.ts`, `pob/to-model.ts`, tab panels.
- [ ] **1.4 Two boxes, toggle, character sheet**
  - Add a poe.ninja code box and a PoB2 code box with the toggle (poe.ninja config, the default / my own / none), saved in `localStorage`.
  - Add a beginner `CharacterSheet` (identity, numbers, gear, skills, config in plain words, "what's missing"); Pro detail shows the raw stat list.
  - Acceptance: e2e pastes each reference code into each box and each toggle state, and the sheet and all tabs render with no blank category; route budget holds or is raised by rule.
  - Files: `ImportBar.tsx`, `CharacterSheet.tsx`, `character/page.tsx`, e2e spec.
- **Checkpoint:** PR plus 390/1440 screenshots. The owner reviews the sheet and the missing list before Batch 2.
- **Done 2026-11-25:** `buildCharacterOutline` (`packages/core/src/outline/`), two code boxes with the config toggle (`ImportBar.tsx`), the Sheet tab (`CharacterSheet.tsx`), the missing list and Pro detail, e2e in `apps/web/e2e/sheet.spec.ts`.
- **Import leniency, 2026-11-25:** codes decode the way PoB2's ImportTab does (trim whitespace and `?`, drop characters outside base64, zlib or gzip); a pasted pobb.in/poe.ninja/maxroll/poe2db/pastebin/rentry link is named back with "copy its PoB code" (static site, no fetch); `enemyIsBoss` gets PoB's load migration (title case, `Uber Atziri`→Boss, `Shaper`/`Sirus`→Pinnacle); the pinned PoB2's `customMods` lines are listed as config settings.
- **What Batch 2 still lacks:** (1) item mod tiers are read from the ladder data once the Gear data loads; a line the ladders cannot place says why, and jewels carry no tier because their slot id is shared; (2) ~~no per-slot gear score, stat swap or charm overkill flag~~ score and swaps on the Gear tab since 2.4; the charm flag stays core-only (owner, 2026-11-25: not on the site for now); (3) ~~over-cap is shown per resistance, not yet shared across items~~ done 2026-11-25 (2.4): the Sheet lists each resistance's over-cap split across the lines that spend it; (4) Runic Ward, item rarity and ES recharge are not in a PoB2 code (shown as missing, not derivable); (5) the Sheet tab shows the code's numbers without grades or advice; (6) ~~recents and `#pob=` re-opens use the poe.ninja baseline~~ done 2026-11-25: both store the box and toggle (`#pob=<code>&box=pob&config=<mode>`); (7) ~~the Defence axis still comes from the old assessment~~ done 2026-11-25 (2.4): the defence half, unchanged, graded on its own.

### Batch 2: Defence calcs, analysis and tips (`defence-analysis`)

- [x] **2.1 Gear score**
  - `gear/score.ts` with a profile pick, per-slot 0–100 and S–D, and "wasted" stats.
  - Acceptance: red-then-green tests on hand-built items; the per-slot table is in the PR for owner review.
  - Done 2026-11-25: `scoreGear`, `pickProfile` (`test/gear-score.test.ts`); both reference tables pinned in `test/golden/gear-score-*.expected.json`. Weights are `familyFactor × (½ + ½ × importance)` from `deriveStatWeights`; the best roll is `ModTiers.topRoll` on the base; bands and discounts in `GEAR_SCORE` (`thresholds.ts`). Each resistance's over-cap is spent once across items, biggest line first (closes "lacks" item 3 in core; the Sheet shows it with 2.4). An item with fewer than half its affix lines readable is not graded (the reference gloves: 1 of 7, item 1).
- [x] **2.2 Stat swaps and defensive gear tips**
  - Turn over-cap surpluses into "this line could be X", with X drawn from the profile's valued stats that the slot can roll (mod tier data).
  - Acceptance: on main-ninja, Cold +59 over cap produces a swap suggestion naming a concrete affix.
  - Done 2026-11-25: `findStatSwaps` (`advice/swaps.ts`). Short resistances first (a gap one swap closes is not offered again), then valued stats; same affix kind, spawnable on the base, best tier at the item's level with the better tier on a new base named. A partly wasted line is offered only when at least half is waste. Reference: Boots' 36% cold → `of Flexure` deflection, tier 1.
- [x] **2.3 Charm overkill flag**
  - Flag a charm or flask stat that targets an already capped value.
  - Acceptance: a unit test with a capped fire res and a fire res charm.
  - Done 2026-11-25: `findCharmOverkill` (`advice/charm-overkill.ts`), charms and flasks (owner, 2026-11-25). Resistance lines only; neither reference code has one, so nothing is flagged on them.
- [x] **2.4 Defence axis and beginner copy**
  - The defence grade stands as its own axis.
  - Rewrite the Overview, Defence and Gear copy for new players per `COPY.md`; the old text moves behind Pro detail.
  - Acceptance: e2e text checks updated; screenshots.
  - Done 2026-11-25: `defenceAxis` (`score/defence-axis.ts`, `test/defence-axis.test.ts`): the defence half over its 0.5 weight on the unchanged A–D bands (owner: keep A–D; S–D is B2-4a in the Owner queue), a range only when the max hit is unreported; up to three tips (weak hit types, then uncapped elemental, then chaos). The combined grade is retired from the stamp, share card, recents and What-if. `gearReview` (`advice/gear-review.ts`): gear axis = mean of graded slots on S–D, at most 5 swaps with up to 3 options each (owner: no tiebreak tuning), shared over-cap per resistance. Minion stats are their own family. Site: grade badges on Overview (Defence, Gear, Damage "not graded yet"), Defence grade card, Gear grade card, Sheet over-cap; the old verdict is behind Pro detail. e2e `grades.spec.ts`.
- **Checkpoint:** PR plus screenshots. The owner reviews the defence and gear advice.

### Batch 3: Damage calcs, analysis and tips (`damage-analysis`)

- [ ] **3.1 Mini-calc core**
  - `offence/{pass,combine,hit,conversion,modifiers,crit,speed}.ts` mirroring CalcOffence names.
  - Acceptance: unit tests per step; the main skill is within 25% on both reference codes.
- [ ] **3.2 Self-check, calibration, hide rule**
  - Ratio, the ±25% gate, Full DPS instructions, and a "show anyway" toggle.
  - Acceptance: unit tests for each of the three states.
- [ ] **3.3 Per-skill list and damage mix**
  - The Damage tab lists exact rows (main, Full DPS) and ≈ est. rows; the damage mix is shown per skill.
  - Under own/none config, only exact rows appear.
  - Acceptance: e2e for both configs; the CI accuracy report against `*.groups.oracle.json`.
- [ ] **3.4 Gem link check, damage gear tips**
  - Damage-stat swaps (e.g. over-cap res → crit) and the gem link findings.
  - Acceptance: unit tests on main-ninja's 18 groups.
- [ ] **3.5 Damage axis, three-axis grade, build summary, next 3 steps**
  - Assemble the Overview: three graded axes, "What your build is", and "Next 3 steps by content" ordered by the advice rule.
  - Acceptance: golden diff; e2e; screenshots; the owner judges new-player readability.
- **Checkpoint:** PR plus screenshots. V1 is done against the success criteria; the owner starts the per-category deep dives.

### Risks

| Risk | Mitigation |
|---|---|
| The mini-calc misses 25% on Storm Wave-type skills (conversion, "gain as") | The self-check hides the estimates and points to Full DPS; the port is extended only with owner approval |
| Batch 3 is large | Split into two PRs inside the batch (3.1–3.2, then 3.3–3.5); still one batch for the owner |
| Route budget growth from the mini-calc | Keep `offence/` imported only by the Damage tab chunk; raise the budget by rule if the growth is the feature |
| Scope creep back toward PoB | Boundaries "Never" list; anything new goes to Out of scope (deferred) |
