# Handoff: simple code analysis, Batch 1 (2026-11-25)

Delete this file in the PR that finishes Batch 1.

## Done (PR Demonad112/upgraded-disco-companion#252, branch `claude/laughing-carson-s702ag`)

- **Task 0, oracle reproduces the code** (`847fbbf`). Root cause: `vendor/pob2` was pinned to the fork's `dev` head
  (`601768b`); the owner's app and poe.ninja run the v0.23.1 release (`7d6f530`). Re-pinned; `pob2:oracle` now
  reproduces all 107 PlayerStats of `packages/core/test/reference/ninja-default/code.txt` (was +9.15 % DPS,
  −8.33 % max hits). Before/after table: `docs/POB2-SYNC.md` § "Pin = the released PoB". Reference fixtures:
  `code.txt`, `oracle.json`, `groups.oracle.json`, `app.expected.json` (owner screenshots, PoB2 0.23.1, 2026-11-24).
- **Task 1, old direction removed** (second commit): `tools/pob2/wasm`, its test, the CP/B9/NJ plans, rows PB-9,
  PB-10, PB-3a, BE-*, E*, NJ-*, CP-* (one line in `docs/HISTORY.md`); `pob-sim` provenance gone (`EstimatedCard`,
  label "≈ est."); `pob/stale.ts` deleted; CLAUDE.md Architecture rewritten; tree test counts moved to the release
  tree (4544 nodes / 5185 edges / 1192 notables / 429 ascendancy nodes).
- `npm run gate` passed on the final tree.

## Next (new branch off `main` after #252 merges)

The spec is the owner's original request; the plan is `docs/plans/simple-code-analysis.md` (Batch 1 at "Batch 1").

1. **Docs** (one commit):
   - Rewrite `docs/POB-NINJA-CONFIG.md` (still describes the old Arbiter of Ash baseline) from the code's `<Config>`
     and screenshot 3: enemy level 82, Guardian/Pinnacle boss (PoB default `enemyIsBoss` index 3, not saved in the
     code), endgame −60 % resistance penalty, enemy resists 50/50/50/0, Dazed/Bleeding/Ignited/Chilled on,
     power/frenzy/endurance charges on, Crit Recently and Been Hit Recently on, nearby enemies 1, nearby rare/unique 1,
     quest rewards ticked, EHP gain on block disabled. Delete text that contradicts this.
   - Add the section map below to the plan.
   - Spec changes in the plan: read numbers always win; self-check error = estimate / TotalDPS − 1, |error| ≤ 0.25 →
     scale other same-kind (attack/spell) skills by TotalDPS / estimate, else hide them, show Full DPS steps, offer
     "show anyway"; no estimate or TotalDPS 0 → hidden, "≈ est., unchecked"; mini-calc conditions from `<Config>`;
     every outline field is a value with provenance or `{ missing, reason }`; correct names (`ImportBar.tsx`,
     `character/page.tsx`, `readPobSnapshotFromCode`, `codeBreakdowns(snap, model, tree)`,
     `readPobConfig().conditionals` with `humaniseCondition` only for unlabelled ones, `AverageDamage`, `TAB_IDS` in
     `characterTab.ts`); charm overkill covers charms only; stat swaps name a suffix that can roll on that base and
     share over-cap across items; testable "no blank category": every `[data-outline-field]` has `data-provenance` in
     {pob-export, derived, estimate, nominal, missing} and non-empty text.
2. **Core** `packages/core/src/outline/`: `buildCharacterOutline(snap, { box, config, model, tree, name? })`. Tests: an
   outline golden; every read value === the code's PlayerStat; the `app.expected.json` values the code carries match.
3. **Web**: poe.ninja code box and PoB2 code box with a config toggle (poe.ninja baseline / own / none); beginner
   CharacterSheet; "what's missing" list; Pro detail with raw stats; e2e per box and toggle with no blank category.
   Run `npm run gate`; ask the owner before the 390/1440 screenshot check.
4. **Exit**: the outline exposes defences, resists and over-cap, max hits, EHP, items with mod lines, ranges and tiers,
   charms, config. Report what Batch 2 (Defence) still lacks.

Owner decisions (don't re-ask): code is truth; oracle is a CI guard; no PoB in browser or server; three grade axes;
advice order biggest wins → gear tips and stat swaps → improving while playing; tree shown, not analysed; flasks and
charms not analysed beyond charm overkill; no crafting now.

## poe.ninja character page: section map (from the owner's .mht, Yykiuy)

| Section | Fields |
|---|---|
| Header | name, level + ascendancy, account, league, last fetched |
| Import code | PoB code box |
| Equipment | weapon sets I/II, Trade/Copy per item; Runes; Base Jewels |
| Stats → Character | Str/Dex/Int, Movement Speed 139 %, Item Rarity 15 %, charges 3/3/5 |
| Stats → Defensive | Life 1,494; ES 2,827; Runic Ward 854 (not in the code); Mana 790; Spirit 147; Armour 75; DR 1 %; Evasion 7,407; Evade 44 %; Deflection 1,925 / 15 %; Resists 75/80/76/53; EHP 20k; Max Hit 5.2k / 18k / 23k / 19k / 8.0k |
| Stats → Recovery | mana regen 41/s, ES recharge 353/s, recharge delay 3.51 s |
| Main Skills | per skill: speed, crit, multiplier, hit, radius/duration, DPS, damage mix by type, gem level/quality, attack rate, cooldown. Storm Wave 187k; Hollow Resonance avg 67k; Whirling Assault 66k; Staggering Palm 63k; Tempest Bell 47k; Falling Thunder 14k; Frozen Locus; Hollow Focus; Profane Ritual (DoT) |
| Passive tree | 113 / 1 / 8 points |
| Ascendancy & Keystones | Hollow Focus Technique, Hollow Resonance Technique, Runic Meridians, Way of the Stonefist |
| Quest Rewards | per act |
| Skills | gem groups with level/quality and supports |
