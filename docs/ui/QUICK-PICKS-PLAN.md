# Quick picks (QP1)

## What it is
Five ready farms at the top of the Farm Planner on `/dashboard`. Two taps from "which farm" to "what do I roll":
1. **Pick a farm.** Five tiles in curated order, each with a "Set up" button.
2. **Your setup.** The recommended tablets and Waystone as large mod chips. Tapping a chip opens a sheet with "Keep" plus the
   2–3 best legal alternatives from the engine ("▲ Better by 6%", "▼ Worse by 4%") and an Apply button.

Below the setup: a result strip (Reward, Danger, Net, each with its change vs the recommended start), "What the map has"
(top 5 lines, "Show all"), "Copy shopping list", "Reset to recommended" and "Open full planner".

## How it fits FP1 (no second store, no second engine)
- **Placement.** Quick picks sits at the top of Step 1 (Decide). FP1's tiles stay below it under "All farms". Step 2 (Set up)
  shows the Quick picks setup for a quick-pick farm, or FP1's full planner. The step bar and its keyboard model are unchanged.
- **State.** Each quick pick's loadout lives in FP1's `farm.loadouts` under the key `qp-<pick id>`, so "Open full planner"
  opens FP1's Step 2 on the same loadout and edits there show up in Quick picks. The only new persisted field is
  `farm.view` (`quick` | `full`), so a reload lands in the view you left.
  - Why keys of their own, not the strategy ids: a player who already used FP1 on, say, Omen Abyss keeps that loadout, and
    Quick picks never overwrites it. FP1's own starter loadouts and its e2e stay untouched.
- **Links.** `#quick-<pick id>` opens the Quick picks setup. `#farm-<id>` keeps its FP1 meaning (full planner), and it also
  works for `#farm-qp-<pick id>`. Strategy, boss and build hashes still go to `DashboardTabs`.
- **Numbers.** Scores use the same `ScoreOptions` FP1 uses for that key (preset, danger setting, build-aware danger), so the
  two views always agree. Alternatives are `allSwaps()` filtered to the tapped slot, so the order and tie-break are swaps.ts's
  own. "Better by N%" is `pctChange()` rounded the way `formatChange()` rounds. Nothing in a component is a typed number.

## Data (additive to `tablets-0.5.5.json`)
- `quickPicks.picks[]`: id, name, plain line, linked strategy id (for investment and danger 1–3), preset, the recommended
  loadout, and `basis: "estimate"` with a one-line why. Order in the file is the display order.
- `quickPicks.labels`: a short chip name per mod ("+{v} Abyss rares"), one for every tablet and Waystone mod, so any legal
  alternative has a plain name. A test checks every mod has one.
- `quickPicks.patchNote`, `quickPicks.disagreements` (Waystone max mods 6/8/10; 4-tablet Expedition +35%/+70%),
  `quickPicks.excluded` (Ritual, one line).
- `weights.strategyPreset["boss-rush-tablet-rush"] = "unique-hunting"` (FP1-2, answered).

## What I changed from the prompt, and why
| Prompt | Built | Why |
|---|---|---|
| Rolls "inside the tier range" | The rounded middle of each tier | Net is then neither optimistic (top roll) nor pessimistic. The shopping list shows the full range. |
| Danger normalisers allowed | Not added | Any value would be a number nobody measured. Danger stays visible next to Net, and farms are not ranked by Net (curated order). All five recommended Waystones carry no danger mod, so Danger starts at 0 except where a tablet adds Monster effectiveness. |
| Chips "+3 Abyss rares" | Same, ordered reward first: mechanic suffixes then prefixes on tablets; prefixes then danger suffixes on the Waystone | Most important mod first; "prefix" and "suffix" never appear in Quick picks (the sheet only offers legal mods, so the player never needs the words). |
| Bottom sheet | Native `<dialog>` opened with `showModal()`: bottom sheet ≤ 720 px, anchored popover above that | The browser gives Escape, an inert background and the top layer; a small Tab handler keeps focus inside, and focus returns to the chip (or its replacement after Apply). |
| Copy shopping list | Clipboard first; if the browser refuses (some console browsers do), the list appears as selectable text | A console player still gets the list. |

## Recommended loadouts (from the prompt, unchanged except where noted)
| # | Farm | Tablets | Waystone (T15 rare) |
|---|---|---|---|
| 1 | Abyss + Rogue Exiles | 3 Abyss: Abyss rares, Abyss density; prefix Pack size | Pack size, Rare monsters, Item quantity |
| 2 | Expedition, 4 tablets (City map) | 4 Expedition: Logbooks + Rares, Artifacts + Remnant, Logbooks + Artifacts, Rares + Remnant (each mod on two tablets); prefix Pack size | Pack size, Item quantity, Rare monsters |
| 3 | Breach + Genesis Tree | 3 Breach: Rares + Hiveblood, Rares + Wombgifts, Hiveblood + Wombgifts; prefix Pack size | Pack size, Rare monsters, Item quantity |
| 4 | Delirium | 3 Delirium: Reward progress, Splinter stack; prefix Pack size | Pack size, Item quantity, Rare monsters |
| 5 | Unique hunting | 2 Overseer (boss mod) + 1 Irradiated (Rare monsters); prefixes Item rarity, Item quantity | Item rarity, Item quantity, Rare monsters |

Ritual is not in the five: the research notes call it oversupplied this patch.

Known engine effects the player will see (shown honestly, flagged under Needs owner):
- The Delirium and Expedition presets give Pack size and the Waystone reward stats no weight, so swapping those reads
  "Same Net". The sheet says "This farm's score does not count this mod" when every alternative is equal.
- The Abyss preset gives Rogue Exile chance no weight, so the "+ Rogue Exiles" in the farm name is not chased by tablets.

## Things I recommend that were not asked for
- **TV distance.** At ≥ 1280 px the chips, numbers and body type step up one size, so an Xbox browser reads at couch distance.
- **"Estimate" once, clearly.** One line under the result strip: "Net = reward minus danger. All three are estimates from
  the farm's scoring weights, not predicted drops." Recommended setups carry "Recommended · estimate".
- **Quick view from the full planner.** FP1's Step 2 for a quick-pick key gets a "Quick view" button back.
- **Make Quick picks the default view of `/dashboard`** once reviewed (Needs owner).

## Budget
`/dashboard/` was 208,827 B br on `main`. The tiles use the farm data FP1's Step 1 already loads; the setup view, the sheet
and the engine load on first open (lazy chunk). `/` gets nothing.
