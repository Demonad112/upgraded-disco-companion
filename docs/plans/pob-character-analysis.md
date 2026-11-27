# Plan: PoB code character analysis, checked against real PoB2

Status: open. Owner: run the comparison (§4) and paste the two outputs back; a session tunes from there.
Rows: NP1-6b, AL1-1, GF1-8 (targets), and owner step 11 (minion second pass, which revisits the closed GF1-5 and GF1-6 with minion evidence).

## 1. Goal

Paste a Path of Building 2 code into the site and check every number and finding it shows against a real PoB2 run of the same code. Then fix whatever disagrees. poe.ninja is out of scope, because the character import is blocked (NP1-1). The PoB code is the source, and PoB2 is the reference.

The loop:

1. Owner exports a code from PoB2.
2. `node scripts/pob-sheet.mjs code.txt` prints what the site reads and concludes (§3).
3. The PoB2 MCP runs the same code with the prompt in §5 and returns the same fields.
4. The two are diffed row by row. Each difference is sorted (§6) and fixed or recorded.

## 2. What the site does with a whole PoB code today

How a code flows through the site:

1. `readPobSnapshotFromCode` decodes the code (base64url, then zlib, then XML) and reads it into a `PobSnapshot`.
2. `pobToCharModel` (`packages/core/src/pob/to-model.ts`) builds a `CharModel` from the parts the code carries.
3. `analyzeCharacter(model, { source: 'pob-export', tree, tiers, catalog, dataVersion })` runs the same analysis the poe.ninja import uses.
4. The site is never reconciled against itself: a code is not compared with its own export.

### 2.1 Filled from the code (read through, never derived)

| Site field | PoB source | Web tab |
|---|---|---|
| `identity.level`, `identity.className` | `<Build level ascendClassName className>` (the ascendancy, or the base class if there is none) | Header |
| Life, ES, Mana, Spirit, Armour, Evasion, EvadeChance, BlockChance, Ward | `<PlayerStat>` with the same names; Evasion maps to `evasionRating`, TotalEHP to `effectiveHealthPool` | Defence |
| Max hit per type | `<PlayerStat>` `{Physical,Fire,Cold,Lightning,Chaos}MaximumHitTaken` | Defence |
| Resistances: value, max, over-cap | `FireResist` etc., `…ResistOverCap`, and `…ResistMax` when present. With no over-cap, a value at or under 75 is read against 75 and the "Raised maximum resistances" gap is shown | Defence |
| Main skill: hit DPS, DoT DPS, speed, crit chance, crit multiplier | `readPobMainSkill` (the selected socket group) plus `TotalDPS`, `TotalDotDPS`, `Speed`, `CritChance`, `CritMultiplier` | Damage |
| Passive selection | `<Spec nodes>`. **Both weapon sets are merged**, see W1 | Advanced: tree |
| Config | `<Calcs><Input>`, via `readPobConfig`: the enemy (boss or not), buff mode, conditions | Damage: config note |
| Skill groups | `<Skills>`, via `readPobSkillGroups`: label, gems, enabled, weapon set | Advanced, Damage |

### 2.2 Computed by the site from those numbers

| Output | How | PoB has an equivalent? |
|---|---|---|
| `defense.lowestMaximumHit` and its type | Minimum of the max hits | Yes (Calcs: max hit taken) |
| `ehpOverstatementRatio` | TotalEHP ÷ lowest max hit; flagged above `EHP_OVERSTATEMENT_WARN` (1.5) | No. Check the arithmetic only |
| Resistance verdicts | Against the character's own max (chaos too); critical gap at `RES_GAP_CRITICAL` (+25% damage taken) | Partly: PoB shows uncapped resistances in red |
| Weak damage types | Max hit under `WEAK_HIT_RATIO` (0.4) × the best type | No |
| Crit "not the lever" | Effective crit multiplier under `CRIT_UNINVESTED` (1.15) | No. PoB's CritChance and CritMultiplier are the inputs |
| DoT dominant | DoT share over `DOT_DOMINANT` (0.6) | No. TotalDotDPS and TotalDPS are the inputs |
| Keystone corrections | Keystone names from the tree data, applied only where the stats confirm them | PoB applies keystones itself, so compare the effect |
| Tree check | Every allocated node is known to `passive-tree.json` | No. A `stale` result means the site's tree is behind (DATA-1) |
| Assessment (tier range, weaknesses) | `assessBuild`: defence half only. Offence is unscored without the ladder (NP1-1) | No. Compare the weaknesses with PoB's numbers |
| Recommendations (ranked) | `recommend` + `priority.ts`, ordered by cost and evidence | No. Each one cites numbers, and those numbers must match PoB |
| Ailment immunities | From item lines. **Unknown for a code**, because there are no items | Yes, once W1 lands |
| `stamp` | Data revision, import hash (SHA-256 of the model, first 16 hex digits), engine version | Lets a result be matched to its input |

### 2.3 Absent for a code (named in `sourceGaps`, never guessed)

- Damage per skill: only the selected skill.
- Items: no gear findings, Gear fit, "Worth replacing", trade links or ailment sources (W1).
- Weapon-set passives: the merged node list (W1).
- Stat attribution: needs poe.ninja breakdowns. A code carries no per-stat sources, so the "What each item is holding up" panel is empty.
- Ward and block chance when PoB did not export them.
- Offence grade: no ladder (NP1-1).

## 3. Running the site side

```bash
npm run build -w @poe2/core
```

```bash
node scripts/pob-sheet.mjs path/to/code.txt
```

Add `--json` for machine-readable output, or pass `-` to read the code from stdin. The sheet's field names match the MCP prompt below. On the committed Athrynas code (`athrynas-v43`), the sheet reports:

- Life 1448, ES 1937; max hits: chaos 3808, physical 4264, cold 14107, fire and lightning 14611.
- Resistances: fire 75 (+24 over), cold 74, lightning 75 (+8 over), chaos 18.
- Ice Shot: 109,859 hit DPS, 298.7 DoT, 2.322 attacks/s, 5% crit, 2.48× multiplier.
- Config: not a boss, 6 conditions on. Tree check: current. Tier range C–A, with offence unscored.

## 4. The comparison run (owner steps)

1. In PoB2, open the build and set the config you play with. Note the PoB version (Help → About).
2. Export with Import/Export → Generate, then copy and save the code to `code.txt`.
3. Run §3 and save the output as `site.txt`.
4. Send §5 to the PoB2 MCP with the same code. Save its answer as `pob.txt`.
5. Optional: in PoB2, switch the config to a boss (Pinnacle) and export a second code. Run steps 3 and 4 again, which shows how much the config moves the numbers.
6. Paste `site.txt` and `pob.txt` into a session with "tune from the PoB comparison". That session follows §6.

## 5. Prompt for a PoB2 MCP

Copy everything inside the fence. Replace `<CODE>`.

````text
You have Path of Building 2 tools. Load the build below exactly as exported and report Path of Building's own numbers. This is a reference run for checking another tool, so:
- Do not change the config, the skills, the tree or any item. Do not optimise or suggest anything.
- Report a value only if PoB computed it. If a value is not available, write "missing". Never estimate.
- Use PoB's internal stat names as given below.

BUILD CODE:
<CODE>

Return ONE fenced JSON block with exactly these keys, then a short "Notes" list for anything that surprised you.

{
  "pob": { "version": "<PoB version>", "gameVersion": "<tree/game version PoB loaded>", "treeVersion": "<spec treeVersion>" },
  "character": { "level": n, "class": "<ascendancy, or base class if none>" },
  "config": {
    "enemyIsBoss": "<None | Boss | Pinnacle | ...>",
    "buffMode": "<unbuffed | combat | effective, the mode the main output uses>",
    "conditionsOn": ["<every enabled condition/toggle in the Config tab>"]
  },
  "defence": {
    "Life": n, "EnergyShield": n, "Mana": n, "Spirit": n, "Ward": n|"missing",
    "Armour": n, "Evasion": n, "EvadeChance": n, "BlockChance": n|"missing", "SpellBlockChance": n|"missing",
    "TotalEHP": n,
    "maxHits": { "physical": n, "fire": n, "cold": n, "lightning": n, "chaos": n },
    "resistances": {
      "fire":      { "value": n, "max": n, "overCap": n },
      "cold":      { "value": n, "max": n, "overCap": n },
      "lightning": { "value": n, "max": n, "overCap": n },
      "chaos":     { "value": n, "max": n, "overCap": n }
    },
    "physicalDamageReductionFromArmour": n
  },
  "offence": {
    "mainSkill": "<selected main skill name>",
    "TotalDPS": n, "TotalDotDPS": n, "CombinedDPS": n,
    "Speed": n, "CritChance": n, "CritMultiplier": n, "HitChance": n,
    "damageTypeShares": { "physical": %, "fire": %, "cold": %, "lightning": %, "chaos": % }
  },
  "skillGroups": [ { "label": "<label or first gem>", "enabled": true|false, "gems": ["..."], "weaponSet": 1|2|null, "slot": "<slot it is socketed in, if any>" } ],
  "passives": {
    "allocatedCount": n,
    "keystones": ["<allocated keystone names>"],
    "weaponSet1Nodes": [ids] | "missing",
    "weaponSet2Nodes": [ids] | "missing"
  },
  "items": [
    {
      "slot": "<PoB slot name, e.g. Weapon 1, Weapon 1 Swap, Body Armour, Ring 1>",
      "name": "<item name>", "base": "<base type>", "rarity": "<NORMAL|MAGIC|RARE|UNIQUE>",
      "itemLevel": n, "quality": n,
      "implicits": ["<line>"], "explicits": ["<line>"], "runes": ["<line>"], "corrupted": true|false
    }
  ],
  "ailments": { "freeze": "immune|not immune", "chill": "...", "shock": "...", "ignite": "...", "poison": "...", "bleed": "...", "stun": "..." },
  "pobWarnings": ["<any warning PoB shows: unmet requirements, over-reserved spirit, uncapped resistances, ...>"]
}

Notes: list (1) any stat whose value depends on a config toggle, (2) anything PoB flags as unsupported or unparsed on an item, (3) which weapon set is active.
````

`items`, `weaponSet*Nodes` and `ailments` are there for W1. The site does not read them yet, so for now they are the expected values for that work.

## 6. Tuning loop: how each difference is handled

| Kind of difference | Example | Fix |
|---|---|---|
| **Read error**: a PoB field and the site field disagree on a read-through value | Site Evasion 6490, PoB 6512 | Bug in `to-model.ts` or `export.ts`. Write a red test with that code's XML, then fix |
| **Config or version**: values differ by a config toggle or a PoB version | DPS differs and PoB's conditions differ | No code fix. Check that the site's config note (`describePobConfig`) says the same as PoB's Config tab |
| **Missing**: PoB has a value and the site says "missing" | BlockChance missing on the site | Read it if the code carries it (add it to `DIRECT`). If it doesn't, the gap stays and its wording is checked |
| **Derived disagreement**: the site's arithmetic on correct inputs is wrong | Over-cap or EHP ratio | Core red test plus golden diff |
| **Verdict looks wrong**: the numbers match but a finding misleads | "Weak physical" on a high-armour build | Note which constant decided it (`ASSUMED_CONSTANTS`). Change a constant only with evidence, and record the sample in its provenance entry (`sampleSize`) |
| **Data stale**: the tree check says `stale`, or a node or keystone is unknown | Nodes missing from `passive-tree.json` | DATA-1 (next-chat plan) |

Each difference becomes a line in this plan's §9 log (code hash, field, site, PoB, kind, result). Use the import hash from `stamp`, never the code itself.

## 7. Workstreams, in order

### W1: NP1-6b, items and weapon sets from the code

1. **Red test first.** On `athrynas-v43`, `pobToCharModel(code).items` is non-empty. For each slot, the base type, rarity and explicit lines match poe.ninja's `items` in the same fixture. That fixture carries both a code and poe.ninja items, so it is the cross-check.
2. **Read `<Items><Item id>`.** PoB's item text is line based, as in this item from the Athrynas code:
   - `Rarity: RARE`, then the name, then the base (`Militant Bow`);
   - `Item Level: 76`, `Quality: 20`, `Sockets: S S`, `Rune: …`, `LevelReq: 62`;
   - `Implicits: 3`, then that many implicit lines. Lines tagged `{enchant}{rune}` are rune lines;
   - the explicit lines, with `{crafted}`, `{desecrated}` or `{fractured}` prefixes;
   - `Corrupted`, if present;
   - `<ModRange>` children, which are skipped.

   Map each item to the `NinjaItem` shape that `normalizeItems` already reads (`itemData.{name, typeLine, rarity, ilvl, implicitMods, explicitMods, runeMods, inventoryId}`). Read only the fields that map one to one.
3. **Read `<Slot name itemId>`** (under `<Items activeItemSet useSecondWeaponSet>`; `itemId="0"` means the slot is empty). Map PoB slot names to poe.ninja `inventoryId`s in one table, checked against the Athrynas fixture, which carries both:

   | PoB slot | `inventoryId` |
   |---|---|
   | `Weapon 1` | `Weapon` |
   | `Weapon 2` | `Offhand` |
   | `Weapon 1 Swap` | `Weapon2` |
   | `Weapon 2 Swap` | `Offhand2` |
   | `Helmet` | `Helm` |
   | `Body Armour` | `BodyArmour` |
   | `Gloves`, `Boots`, `Belt`, `Amulet` | same name |
   | `Ring 1` | `Ring` |
   | `Ring 2` | `Ring2` |

   Flask, Charm, Ring 3, Arm and Leg slots are skipped until they have a mapping, never guessed. `useSecondWeaponSet` says which weapon set is live.
4. **Split weapon-set nodes.** The export carries `<Spec><WeaponSet1 nodes="…"/><WeaponSet2 nodes="…"/></Spec>`, and `<Spec nodes>` also includes those ids (on Athrynas, 35878 is in both). `passiveSelection` gets the main nodes minus both sets. The set lists go to the live or inactive set, following `useSecondWeaponSet`. Remove the "Weapon-set passives" gap only when the split is read.
5. **Remove the "Gear findings and trade searches" gap** once items are read. Gear fit, "Worth replacing", trade links and ailment sources then run unchanged.
6. **Golden diff:** `pob-code-athrynas-v43.expected.json` gains items and their findings. Grep `apps/web/e2e` for any PoB-paste spec that asserts "no gear".
7. **Compare with the run:** the MCP `items` list against the site's Gear tab, slot by slot.

### W2: GF1 item 8, user-set targets against PoB-code numbers

- A "targets" list compared against the analysed numbers (from a code, or from poe.ninja when that works again). For example: Life ≥ 5000, every elemental resistance ≥ its max, chaos ≥ 30, lowest max hit ≥ X. This is arithmetic only, with no simulation and no poe.ninja dependency.
- **Core:** `checkTargets(analysis, targets): TargetResult[]`, each result `{ id, stat, op, want, have | null, met | 'missing' }`. A stat the code does not carry is `missing`, never failed.
- **Seed** from `apps/web/src/data/benchmarks.ts`. For example, `b-pinnacle-readiness` gives life ≥ 5000 and resistances ≥ 80; take the numbers from the label only where they are stated.
- **Web:** an editable list in the Progress tab, stored in `localStorage` (`poe2-targets`). The copy follows `docs/COPY.md`.
- **Test** on the Athrynas code: life 1448 against 5000 is not met; chaos 18 against 30 is not met; BlockChance is missing.

### W3: AL1-1, an Atlas leg on a no-op step

`apps/web/src/lib/atlasLegs.ts:63`: when the BFS frontier (`reached`) already holds every target of a step, skip the step and leave `leg` alone, so "leg L" never lands on a step with no path. Red test: a step whose nodes are all reached gets no `RouteLeg` and does not advance the leg number. This is web only, with no core change.

### W4 (last): second pass on a minion character (owner step 11; revisits GF1-5 and GF1-6)

Run once W1 to W3 are in.

1. The owner exports a **minion** build code from PoB2 and runs §4 again.
2. Check what changes for minions:
   - PoB's `TotalDPS` for a minion skill is the minion's DPS. Check that the Damage tab labels it as minion damage, and that the crit and DoT findings are not applied to the player's numbers.
   - **GF1-5 (closed: a Minion main skill gets no dead-stat verdict):** with a real minion code, decide which gear lines are dead for it. "Minions deal X% increased damage" counts; player-only attack or spell lines do not, unless the skill is a player skill. Add only the rules the run proves, each with a red test.
   - **GF1-6 (closed on Yykiuy):** run Gear fit again on the minion build. Record where `ARCHETYPE` and `GEAR_FIT` mislead (GF1-3), and update their provenance (`ASSUMED_CONSTANTS`, `sampleSize`) with what was seen. Run the compare target if the owner names a candidate item.
3. Record the result as a new row (or rows) in the register, citing the closed GF1-5 and GF1-6.

## 8. Done when

- On two codes (the owner's main build and the minion build), every read-through field matches PoB2 exactly, or differs only by a recorded config or version reason.
- Every "missing" on the site is either missing in PoB too, or is listed in `sourceGaps`.
- NP1-6b, GF1-8 and AL1-1 are closed, and the minion pass is recorded.

## 9. Comparison log

| Date | Import hash | Field | Site | PoB2 | Kind | Result |
|---|---|---|---|---|---|---|
| | | | | | | |
