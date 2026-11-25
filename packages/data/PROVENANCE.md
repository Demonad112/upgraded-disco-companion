# Data provenance

This file covers generated game data. The refresh commands are below. The
hand-written endgame guide content lives in `apps/web/src/data`.

## Freshness

`mod-tiers.json`, `bases.json`, `pob-skills.json`, `skill-levels.json` and `passive-tree.json` are
built from the **vendored Path of Building 2** (`vendor/pob2`, the owner's fork
pinned in `vendor/pob2/PIN.json`): commit `601768b` (2026-11-10), PoB `0.23.1`,
tree `0_5`, game patch **0.5.5**. They are not parsed out of PoB's Lua text.
`tools/pob2/export/*.lua` load PoB headless and dump the tables PoB itself uses,
and the build scripts read that JSON ([How the PoB artifacts are built](#how-the-pob-artifacts-are-built)).
The earlier `mod-tiers.json` and `bases.json` came from PathOfBuilding-PoE2
`ce566ea` (the 0.5.5 export, 2026-09-10); the passive tree came from a non-PoB
source that predated 0.5.5 (DATA-1, closed by this build).

**PoB version.** `0.23.1`, the `manifest.xml` version in `PIN.json`. A matching
version does not prove a PoB build has the current data (the `v0.23.1` release
of 2026-07-28 predates 0.5.5 and carries the same number), which is why the
data is stamped with the commit, not the version. `poe2_pob_rank_nodes` passes
`0.23.1` as `expectedPobVersion` (a mismatch only warns); the live baseline
check against poe.ninja is the real safeguard.

The other artifacts were last generated on **2026-07-28**, before patch 0.5.5
(2026-09-04):

- **Soul Core entries.** 0.5.5 reworked about 20 Soul Cores and added 17 (13
  "Jiquani's Soul Core of …", 4 "Atziri's Soul Core of …"). `mod-tiers.json`
  still carries Soul Core base tags and display-only mods from the RePoE build,
  so the new bases are absent and reworked values are the old ones. Nothing
  grades against these: socketed core text reaches the item view verbatim from
  the character payload, and resistances are attributed from poe.ninja's
  `breakdowns`. Limit checks read the item first and fall back to a table in
  `packages/core/src/gear/audit.ts`. Open as DATA-2: PoB carries them
  (`data.itemMods.Runes`, the soul core bases), so the next step is another
  exporter field, not a new source.

### How the PoB artifacts are built

All four read `vendor/pob2` through `scripts/pob2/run.mjs --export <name>` and
take the revision from `PIN.json` (`scripts/lib/pob.mjs`). They need LuaJIT
with lua-utf8 (`scripts/pob2/install-luajit.sh`) or Docker, and no PoB checkout
or `POB2_DIR`. From the repository root:

```bash
npm run build:pob -w @poe2/data   # all four, in order
# or one at a time: build:mod-tiers:pob, build:pob-skills, build:tree:pob
```

`generated/version.json` is rewritten by each of them, from `PIN.json`, so
whichever runs last writes the same file. Rebuild all four after a PoB bump;
`scripts/pob2/data-stamp.test.mjs` fails when `PIN.json` moves without it.
Exporter reference: `docs/POB2-SYNC.md`.

The RePoE-fork route (`npm run build:mod-tiers -w @poe2/data`, then
`build:mods`, `build:mod-bases`, `build:monster-stats`, `build:skills`) needs
`repoe-fork.github.io` to be reachable. Run it first if you want to refresh the
stat ids that the PoB build carries over. Afterwards, update the counts quoted
below and run `npm test`.

## `generated/version.json`

Machine-readable data revision (`<gameVersion>@<PoB commit>`), export date and source of the canonical
artifacts. Written by every PoB build script (`scripts/lib/version.mjs`) from `vendor/pob2/PIN.json`, never by
hand: `dataRevision` is `0.5.5@601768b`, `extractedAt` is the pinned commit's date (so a rebuild is
byte-identical), and the full commit, PoB version and tree version ride along. The one reviewed constant is
`GAME_PATCH` (`0.5.5`): PoB's data carries no patch string, only the tree version `0_5`, and the build refuses a
patch that doesn't extend it. `@poe2/core` reads the file with `readDataVersion` and stamps answers with
`provenanceFor` (tiers ported from demonad112/poe2-mcp2, MIT).

## `mod-tiers.json` from Path of Building

Built by `scripts/build-mod-tiers-pob.mjs` from PoB's loaded `data.itemMods.Item`,
`data.itemMods.Jewel` and `data.itemBases` (exporters `mods.lua` and `bases.lua`).

**What PoB supplies:**

- each mod's level, group, affix name and text;
- its ordered spawn weights (`weightKey`/`weightVal`);
- base tags.

**What it doesn't: stat ids.** PoB has no stat ids (`additional_strength`),
and item analysis joins on them. So the build carries stat ids over by mod id
from the previous, RePoE-derived artifact, and checks every carried-over range
against the numbers in PoB's own text for that mod.

That check has to allow for display scaling. Stats are stored in internal
units and shown converted:

| Stat | Stored as | Shown as |
|---|---|---|
| Life regeneration | per minute | per second (÷60) |
| Leech, crit chance | permyriad | % (÷100) |
| Durations | ms | seconds (÷1000) |

It also allows for two-decimal rounding.

Three mods can't be checked from their text, and are listed in the script:

- the fishing lure and hook mods roll an enum;
- one rage line shows a single roll of its range.

A mod with no stat source, or a range that disagrees, fails the build.
`displayOnly` is carried over unchanged.

**Result against the July artifact:**

| | |
|---|---|
| Mods kept | 2,927 (was 2,962) |
| Removed | 35, all gone from 0.5.5: trap throw speed / trigger radius / cascade speed, master-vendor and essence-only lines |
| Level or roll-range changes | 0 |
| Spawn-weight changes outside jewels | 0 |
| Jewel spawn changes | 377, where PoB writes `jewel: 0` instead of `default: 0` (equivalent for jewels) |
| Group changes | 122, all jewel mods; PoB splits crafted-jewel groups more finely |
| Bases added | 5: Energy Blade 1H/2H, three Shrine Sceptres |
| Bases retagged | 66, where PoB adds `genesis_tree_*` and `*_implicit_skill` tags |

In short, 0.5.5 changed no affix ladder the planner uses. The data is now
stamped as 0.5.5 rather than assumed to be.

**Result of the exporter rebuild (B4, pin `601768b`, against the `ce566ea` artifact):**

| | |
|---|---|
| Mods kept | 2,927 (unchanged); 0 level, group or spawn changes, 0 range mismatches |
| Gear bases | 1,703 (was 1,716), 1,445 obtainable (was 1,460) |
| Bases gone from PoB | 13 `TrapTool` bases (kept in `baseTags` by the carry-over) |
| Bases changed | 28: PoB keys bases by name, so a name defined twice now resolves to the last definition (the regex took the first), e.g. Golden Blade, Runeforged Fur Plate; plus real stat changes between the two commits |
| Key order | Object keys are sorted (Lua tables carry no source order), so `bases.json` and `baseTags` reorder without changing content |

## `generated/bases.json`

Written by the same script. It covers every equipment base (flasks, charms,
jewels, fishing rods and Transcendent limbs excluded):

- PoB item type and defence split (`subType`);
- implicit lines;
- base defences or weapon stats;
- requirements (level, Str/Dex/Int);
- whether the base is obtainable. Hidden bases and `not_for_sale` bases are
  never suggested.

Spawn tags are not duplicated here; they live in `mod-tiers.json` `baseTags`.

The replacement planner uses it to compare other bases for a slot. Totals:
1,716 gear bases, 1,460 of them obtainable; 352 KB raw, 30 KB gzipped. The web
build copies it to `apps/web/public/`.

## `generated/atlas-tree.json`

The 0.5.5 Atlas passive tree, built by `scripts/build-atlas-tree.mjs` from the data file poe2db serves to its interactive planner:

```
https://poe2db.tw/data/atlas-skill-tree/4.5/data_us.json
```

Regenerate with `npm run build:atlas-tree -w @poe2/data`. The download is cached in `generated/.cache/`, so delete the cached file to refetch.

| | |
|---|---|
| Generated | 2026-09-25 |
| Nodes | 576 (224 notable) |
| Links | 593, undirected |
| Distinct names | 378; "Pack Size", "Item Rarity" and others repeat |
| Size | 104 KB raw · 26 KB gzipped |

**What it is, and why this source.**

- **The version tag.** "4.5" is poe2db's version tag for its PoE 2 data, not a game patch. The build refuses data that lacks Royal Lenience, a node new in 0.5.5.
- **The only source found.** GGG's own export (`grindinggear/poe2-skilltree-export`) covers the character tree only. The user's `poe2-mcp` data has no Atlas tree, and RePoE-fork was unreachable.

**What the build does.**

- **Positions** come from the group position plus the node's orbit: `x = gx + r·sin θ`, `y = gy − r·cos θ`. Orbits of 16 and 40 nodes use the game's fixed angle tables, the same rule poe2db's renderer applies.
- **Links** are stored under `connections` (the `orbit` there only bends the drawn arc) and, for the root, under `out`. Both are read, deduplicated and made undirected.
- **Each node's subtree** (`t`: Ritual, Breach, Generic, …) comes from its internal id prefix.

**How the guide uses it.** Guide entries name their nodes in a `treeNodes` field, and `apps/web/test/atlasTree.test.ts` fails if any of those names isn't in this file. The tree confirms that a node *exists* under that name. It says nothing about whether the guide's advice about the node is right.

## `generated/passive-tree.json`

Built by `scripts/build-tree-pob.mjs` from the passive tree PoB loads for a new
build (`main.tree[latestTreeVersion]`, exporter `tools/pob2/export/tree.lua`),
at the commit pinned in `vendor/pob2/PIN.json`. Regenerate with:

```bash
npm run build:tree:pob -w @poe2/data
```

| | |
|---|---|
| Tree | `PassiveTree-0.5@601768b` (PoB tree `0_5`) |
| Nodes | 4,546 |
| Edges | 5,187 undirected |
| Notables / keystones / jewel sockets | 1,193 / 33 / 18 |
| Ascendancy nodes | 431 across 22 ascendancies |
| Size | 646 KB raw · 160 KB gzipped (was 147 KB; 22 ascendancies and complete stat lines; +3 KB `characterBase`, CP-1) |
| `characterBase` | PoB's character base values (Life/Mana per level and per attribute, Spirit, Evasion, resistance penalty and cap) and its 17 configurable quest rewards, from `tools/pob2/export/constants.lua` (CP-5). Literals in PoB's calc source are read from the vendored text by pattern; a pattern that stops matching fails the build |

The web build copies this to `apps/web/public/passive-tree.json`
(`prebuild` → `sync-data`); that copy is generated and gitignored.

**Same shape as before** (`PassiveTree` and the renderer are unchanged), built
by the same rules except where PoB's own typing replaces a guess:

- **Decorative nodes are dropped.** PoB types mastery art and background pieces
  `OnlyImage` (368). They have no stats and can't be allocated, and PoB draws
  no edge to them. The old source listed them as ordinary nodes.
- **Edges** are undirected and de-duplicated. Dropped: 561 to decorative nodes,
  14 to ids PoB's own tree lacks, 1 self-loop.
- **Jewel sockets** are PoB's `Socket` nodes, so the Sinister sockets and
  Zarokh's Gift count (18, was 12 by name).
- **Ascendancy** is PoB's `ascendancyName` (22, with the current names such as
  Blood Mage, Martial Artist, Gemling Legionnaire), not an icon-folder guess;
  the old file still had pre-rename ones (Bloodmage, Temporalist, Primalist,
  Inquisitor). `c: 1` is PoB's `isAscendancyStart`.
- **Class starts** keep the six labels the site shows. PoE2 classes share a
  start node (Witch and Sorceress, Ranger and Huntress), so PoB lists two names
  per node; the script checks each label against PoB's `classesStart` and fails
  on a new class rather than leaving it unlabelled.

**Closes DATA-1.** The tree check (HG1-9) reads Yykiuy as `current` (its 3
missing nodes resolve) and the Athrynas allocation resolves to one main-tree
group plus the ascendancy, where the old data left 4 nodes detached for want of
links. `build-tree.mjs` (the `poe2-mcp` route below) stays as a fallback.

### What the old build script corrected (`build-tree.mjs`, fallback source)

Built from `data/psg_passive_nodes.json` in
[Demonad112/poe2-mcp](https://github.com/Demonad112/poe2-mcp) (4,975 nodes),
with `node packages/data/scripts/build-tree.mjs <path>`. Three properties of
that source produced wrong output if used as-is. All three were verified
against the data, not assumed. `build-tree-pob.mjs` applies the first two
(undirected edges, self-loops dropped) too, and takes the ascendancy from PoB's
`ascendancyName` instead.

**Connections are stored directed.** Of 5,888 stored entries exactly one is
reciprocated. Rendering straight from the field draws each link once with an
arbitrary owner — survivable — but any graph walk (path finding, connectivity)
silently gets a one-way tree. The artifact carries a de-duplicated *undirected*
edge list.

**One self-loop exists.** Node 35653 ("Grenade Damage") connects to itself. It
draws nothing and makes edge counts disagree with themselves, so it is dropped —
leaving 5,887 real edges from 5,888 entries.

**`is_ascendancy` does not mean "is an ascendancy passive".** It is set on 17
nodes, which are the ascendancy *class* nodes ("Deadeye", "Titan", …) — not the
353 passives on the wheels. Structural detection fails too: the whole graph is a
single connected component, so the wheels cannot be separated by walking it. The
reliable signal is the icon path, whose subfolder names the ascendancy
(`passives/DeadEye/…`). That is what the script uses.

### Coordinate space and framing

Full extent spans x −22597…21814, y −18721…20054, but the ascendancy wheels are
small clusters at the periphery (Deadeye sits near x 15000, y 5000). The artifact
therefore also carries `mainExtent`, excluding them, and the renderer frames
against the character's *allocated* nodes rather than either — the full extent is
mostly empty space and other classes' wheels.

### Class start nodes

`47175` Warrior · `50459` Ranger · `54447` Sorceress · `50986` Mercenary ·
`61525` Druid · `44683` Monk. Their `name` fields carry PoE1 legacy labels
(`MARAUDER`, `RANGER`, `WITCH`, …), so the display names above come from the
build script, not the data.

## `generated/pob-skills.json`

Support-gem effects and active-skill types, taken from
[Path of Building PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)'s
loaded `data.skills` and `data.gems` (the `sup_*` and `act_*` skill files),
through `tools/pob2/export/skills.lua`. MIT licensed, Path of Building Community.

```
npm run build:pob-skills -w @poe2/data
```

The output records the pinned source commit, and `generatedAt` is that
commit's date. 539 supports (215 with constant effects) and 327 actives. Against
the `ce566ea` artifact the support ids are the same and the active skill types
are identical. Sixteen supports gained effects the old text parsing could not
read (modifier names containing `:`, such as `Multiplier:ManaFlaskMaxChargesPercent`,
and two `Damage` mods, Deadly Heralds and Gambleshot). Flag and skill-type
names are decoded from PoB's bitfields where the regex read the source tokens;
the two agree on every damage and speed effect the planner reads. What's kept:

- **Supports** that exist as socketable gems (Gems.lua `gemType = "Support"`):
  name, gem family, tier, the `requireSkillTypes` / `excludeSkillTypes`
  postfix expressions, and every constant stat. Stats with a local `statMap`
  entry carry the PoB modifier they map to (name, MORE/INC, flags, and whether
  a condition table is attached); the rest are kept raw under `unmapped`.
- **Actives**: skill name → skill types.

What's deliberately not kept: effects whose value scales per gem level. The
damage review reports those supports as "not quantified" rather than guessing.

## `trade2-stats.json`

The trade site's stat listing (`GET https://www.pathofexile.com/api/trade2/data/stats`),
flattened to `{ id, text, type, group }` entries exactly as returned. `patch` is
the `gameVersion` of `generated/bases.json` (the data patch this app ships), not
a value the trade site states; `fetchedAt` is the ISO time of the request.

It is recorded by hand, not in CI: set `TRADE_SNAPSHOT_CONTACT` (goes in the
User-Agent) and run `npm run snapshot:trade-stats`, then commit the file. One
request, no retries. The committed file starts empty (`patch` and `fetchedAt`
null, `entries` empty) until the owner runs it; consumers treat that as
"no snapshot yet" and never guess ids. `apps/web` copies it to `public/` via
`sync-data`.

## Licensing

Passive tree data derives from Path of Exile 2, © Grinding Gear Games. It is
included here for interoperability in an unofficial fan tool. See the repository
`LICENSE`.

## `generated/mods.json` and `generated/mod-bases.json`

Two artifacts, two sources, because neither alone is sufficient.

**`mod-tiers.json`** — the affix ladders. Built by `scripts/build-mod-tiers.mjs`
from [RePoE-fork](https://repoe-fork.github.io/poe2/) `mods.min.json` and
`base_items.min.json`, plus [pob-data](https://repoe-fork.github.io/pob-data/poe2/)
`ModItem.min.json`. 2,585 craftable prefixes and suffixes across 594 ladders,
plus 5,220 display-only mods (implicits, corrupted, unique) and 4,494 base names
with their spawn tags. 2.0 MB raw, 0.26 MB gzipped.

**`monster-stats.json`** — base monster damage by area level, waystone tier to
area level, and Path of Building's boss reference levels. From RePoE
`default_monster_stats` and `base_items`, plus pob-data `WorldAreas`. 4.6 KB raw,
1.9 KB gzipped.

### A second correction

An earlier version of this artifact asserted that map tier is **not derivable**,
because `WorldAreas` carries no tier field and its 158 endgame maps use only six
distinct levels. That observation was right; the conclusion was wrong. I had
looked in one place.

Waystones are *items*. `base_items.json` lists `Waystone (Tier 1..16)` with item
class `Map`, and their `drop_level` equals **64 + tier** for every tier from 2 to
16. Tier 1 lists 58 — where the item begins dropping in the late campaign, not
the map's own level — and 64 + 1 = 65, which WorldAreas independently confirms.

Four separate corroborations:

- `drop_level == 64 + tier` for all 15 of tiers 2–16
- WorldAreas' real map levels 65 / 74 / 75 / 79 / 80 are exactly tiers 1 / 10 / 11 / 15 / 16
- the highest waystone (T16) sits at 80, the highest map level in WorldAreas
- pob-data `Misc.mapLevelLifeMult` is keyed 66–90, starting one above tier 1

The build script fails if more than one tier ever stops matching the formula,
rather than silently drifting.

**Boss levels** are quoted from
[PathOfBuildingCommunity/PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2),
`src/Modules/ConfigOptions.lua`, the `enemyLevel` tooltip: *"The maximum level
for normal enemies and all bosses is 85"* and *"The default and minimum level for
pinnacle bosses and uber pinnacle bosses is 82."* Those are prose constants, so
they are written out with their source rather than scraped.

**Still not modelled:** rare and unique monster damage multipliers, and map
modifiers. So the headroom figure is an upper bound against a normal monster,
never a verdict that a tier is safe.

**`mods.json`** — affix names and roll windows, keyed by mod text. Built by
`scripts/build-mods.mjs` from `data/game/mods/mods.json` joined to
`stat_descriptions.json`, both from Demonad112/poe2-mcp. 12,601 mods across
3.4 MB raw, 0.36 MB gzipped. **Carries no tier numbers** — see below.

### Why tier numbers were removed from `mods.json`

They were wrong, and the conclusion is stronger than the bug.

The first grouping used `stat_id | generation_type`. That produced a "tier 1"
rolling LOWER than the bottom tier in **375 of 1,103 families**, because
unrelated ladders share a stat id: `base_resist_all_elements_%` as a SUFFIX
covers both the real all-resistance ladder and the Hand Wraps
"of Covering / of Sheathing / of Lining" ladder.

The second attempt joined RePoE's published ladder key by mod id. Better — 87%
correct — but the remaining 33 violations were all per-class and essence
variants sharing a group with the generic ladder
(`SpellCriticalStrikeChanceRing6`, `LightningResistancePenetrationEssence4`).

That is not a bug to patch. **A tier is meaningless without an item class.** So
tiers live in `mod-tiers.json`, resolved per base at query time, and this
artifact carries roll windows and affix names only.

**`mod-bases.json`** — which item class each modifier can appear on, and whether
as prefix or suffix. Built by `scripts/build-mod-bases.mjs` from
[RePoE-fork](https://repoe-fork.github.io/poe2/) `mods_by_base.min.json` and
`base_items.min.json`. 2,585 mods across 53 item classes, plus 1,722 base names
mapped to their class; 267 KB raw, 24 KB gzipped.

### A correction worth recording

An earlier version of this project asserted that mod-to-item-base compatibility
"is not derivable from the available data". That was true of the first source
only — its `type_key` looks like an index into `spawn_tags` and is not, mapping
attack speed to belts alone and flat energy shield to bows and to non-item tags
like `Claw_onhit_audio`, with only 11,403 of 16,788 keys even in range.

It was wrong as a general claim, and RePoE-fork disproved it. The two sources
share a mod-id namespace (2,795 of RePoE's 3,450 ids appear in the tier table),
so they join cleanly.

### Two naming traps in the RePoE join

- `mods_by_base.json` uses plural class names ("Bows", "Body Armours");
  `base_items.json` uses singular ("Bow", "Body Armour"). Matching on exact
  equality silently drops every weapon — the build script bridges them and
  reports anything left unmatched.
- `unique` mods are excluded: they appear on specific uniques rather than
  through crafting, so including them would let anything validate anywhere.

## `generated/monk-gloves.json`

Martial Artist rewrites the stats on gloves and hand wraps. poe.ninja reports the
rewritten mod (`HandWraps<SourceModId>`, e.g. `HandWrapsAddedColdDamage7`), whose
craftable ladder is the *source* mod's. This table lets `ModTiers.monkGloveSource`
reverse-map a glove line to its source mod and tier. It labels only; resistances and
maximum resistances stay poe.ninja's values.

- **Source:** `vaisest/PathOfBuilding-PoE2`, branch `monk-export`,
  `python-stuff/monk_gloves.txt` (MIT, via Path of Building). 85,855 B, 588 blocks.
- **Build:** `npm run build:monk-gloves -w @poe2/data [url-or-path]`.
- **Shape:** `{ modId, source, transformed[] }[]`, `modId` being the source mod id.
- **Not synced to the web yet.**

## `generated/skill-levels.json`

Per-level data of the attack skills (first stat set flagged `attack`), for the damage mini-calc (Batch 3): castTime,
base flags, constant stats (for example the physical-to-lightning conversion) and `levels[gemLevel - 1] =
[baseMultiplier, attackSpeedMultiplier]`. An attack's hit is the weapon's damage times `baseMultiplier`, so nothing
else is needed. Spells (base damage from a per-level table) are not exported; the calc reports them "not estimated".
Supports come from `pob-skills.json`. Source: PoB2's loaded `data.skills` through
`tools/pob2/export/skill-levels.lua`, MIT licensed, Path of Building Community.

```
npm run build:skill-levels -w @poe2/data
```
