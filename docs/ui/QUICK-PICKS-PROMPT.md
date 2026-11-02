# Quick Picks — prompt for a new Opus session (QP1)

**How to use.** Start a new Claude Code cloud session on `Demonad112/upgraded-disco-companion` with Opus. Attach the two
prototype screenshots ("Pick a farm" and "Expedition · 4 tablets"). Paste everything inside the block below. No
fact-check re-run is needed first: this builds on the data already shipped (`apps/web/src/data/farm/tablets-0.5.5.json`).

Context: FP1 (#73) shipped a full planner on `/dashboard` (Decide → Set up). It works but is heavy for a phone or a
console player who just wants "what do I roll". This wave adds the **simple path on top of it**. It does not replace the
full planner.

```
Follow docs/SESSION-PROTOCOL.md and CLAUDE.md. Cloud session: npm ci, then npm run build -w @poe2/core.

GOAL (QP1)
Add "Quick picks" to the Farm Planner on /dashboard: the 5 best farms, each with a ready recommended set of tablets and
their modifiers, and for every modifier the 2-3 best alternatives with how much Net goes up or down. Priority order:
(1) easy to understand, (2) works great on a phone, (3) correct numbers. A player on an Xbox browser or a phone should
get from "which farm" to "what do I roll" in two taps, with no jargon.

One variant branch variant/<yyyymmdd>-quick-picks, one PR, carry ID QP1, reviewed on its Cloudflare Pages preview.
Never put Claude session links or session info on GitHub (commits, PR title/body, comments); remove anything the tooling
appends to the PR body (pr-body-guard fails the PR otherwise).

START HERE — think first, then act
Before writing code, read docs/ui/FARM-PLANNER-PLAN.md, docs/carry/FP1.md, apps/web/src/lib/farm/*, apps/web/src/data/farm/*,
apps/web/src/components/farm/*. Then write a short design note (one commit, docs/ui/QUICK-PICKS-PLAN.md): what you will
build, what you would change from this prompt and why, and anything you recommend that I did not ask for. You have
latitude: where you have a better idea than the spec below, say so in the note, pick the better one, and build it. Do
not stop to ask unless you are blocked.

DECISIONS ALREADY MADE (do not re-open)
- No more research round. Use the shipped data. Values the data marks single/unverified stay marked, and the UI keeps its
  "N unverified" footnote. Interpretation and community consensus are acceptable, but must be labelled "estimate".
- Boss Rush / Tablet Rush use the unique-hunting preset (FP1-2 answered).
- Net comes from the existing engine (apps/web/src/lib/farm). Every percentage you show is computed by the engine
  (swaps.ts / netLabels / pctChange). Never type a number by hand. No hard-coded numbers in components.
- Danger scale (FP1-1): the weights are uncalibrated, so Waystone crit can swamp rewards. You may add per-stat
  normalisers to the data file, but each must carry confidence "judgement" and a one-line why, and the UI must say
  "estimate". If you do not add them, keep danger visible next to Net and do not rank farms by Net.
- Patch footnote: "Patch 0.5.5, checked against 0.5.5e. 1.0 is reported for Dec 11, 2026; values may change." Show a
  "sources disagree" note where known: Waystone max mods (6 vs 8 vs 10), 4-tablet Expedition stacking (+35% vs +70%
  density). Keep the shipped values.
- Do not touch packages/*. Everything lives in apps/web. Data changes are additive to tablets-0.5.5.json.
- CLAUDE.md design rules still apply: dark, square corners, uppercase EB Garamond headings, tokens only (new tokens in
  tokens.css), restrained motion, no sounds. NO bars, gauges or charts for scores, totals or deltas: plain numbers with
  signed % and text markers. The prototype screenshots show bars; use them for LAYOUT only (tile grid, step names, tablet
  cards), not for the bars.

THE FIVE FARMS (curated order, stored in the data file, not computed by Net)
Each farm has `recommended`: tablets (type, rarity, mods with tier and a roll value inside the tier range), a Waystone,
options (map context, keystones off by default), and a preset id. Every recommended loadout must pass validate() with
zero errors. Mechanic mods are suffixes in the data; a rare tablet has 3 mods (2 prefixes + 1 suffix, or 1 + 2) without
the keystones. Starting recommendations, using real mod ids (you may improve them, and say why in the note):

| # | Farm | Preset | Tablets | Mods per tablet (start) | Waystone (T15 rare, reward prefixes first) |
|---|---|---|---|---|---|
| 1 | Abyss + Rogue Exiles | abyss | 3 Abyss, rare | t-abyss-rares, t-abyss-density, prefix t-pack-size | w-pack-size, w-rare-monsters, w-quantity; no danger suffix |
| 2 | Expedition, 4 tablets (City map) | expedition | 4 Expedition, rare | two of t-exp-logbook / t-exp-rares / t-exp-artifact / t-exp-remnant (spread the four across tablets), prefix t-pack-size | w-pack-size, w-quantity, w-rare-monsters |
| 3 | Breach + Genesis Tree | breach | 3 Breach, rare | two of t-breach-rares / t-breach-hiveblood / t-breach-wombgift (spread), prefix t-pack-size | w-pack-size, w-rare-monsters, w-quantity |
| 4 | Delirium | delirium | 3 Delirium, rare | t-del-progress, t-del-splinter, prefix t-pack-size | w-pack-size, w-quantity, w-rare-monsters |
| 5 | Unique hunting | unique-hunting | 2 Overseer + 1 Irradiated, rare | prefixes t-item-rarity and t-item-quantity, one suffix (Overseer: boss mod; Irradiated: rare monsters) | w-rarity, w-quantity, w-rare-monsters |

Other farms (Ritual, general mapping, custom) stay available through the existing FP1 tiles and the full planner. Ritual
is not in the top 5 because the research notes call it oversupplied this patch; say so in one line.

THE SCREENS (mobile first, one column up to 720 px; desktop is the same content in a roomier grid)
1. Pick a farm: five large tiles in the curated order. Each tile: farm name, one plain-language line ("Spawns more rare
   monsters in Abysses"), investment level, danger 1-3 (words and pips, not colour alone), "Set up" button. Reuse FP1's
   "Help me choose" as a link, not a section.
2. Your setup: the recommended tablets as compact cards, one per tablet ("Tablet 1 · Abyss · Rare"). Each mod is a large
   chip showing its value and name ("+3 Abyss rares"). Under the cards: the Waystone as the same kind of chips, and a
   "Waystone: look for" line in plain words.
3. Tap a mod: a bottom sheet (full-width on a phone, a popover on desktop) with "Keep" and the 2-3 best alternatives
   from the engine, each as one row: new mod name, then "Better by 6%" with a ▲ or "Worse by 4%" with a ▼, and an Apply
   button. Only legal alternatives (right tablet type, right side, no repeated mod group). Fewer than 2 legal
   alternatives is fine; show what exists. Never show more than 3. Sorted best first. Tie-break exactly like swaps.ts.
4. Result strip: Reward, Danger, Net as three plain numbers with change since the recommended start ("Net 199, ▲ +6%
   vs recommended"). Sticky under the header on phones. Below it: "What the map has", top 5 stats only, each as a line
   ("Pack size +18%"), danger lines first in the danger token colour; "Show all" opens the full list.
5. "Copy shopping list" button: plain text, one line per tablet and the Waystone, ready to paste into notes or a message
   on a console ("Tablet 1 Abyss rare: +2-3 Abyss rares, +20-30% Abyss density, +5-7% Pack size"). "Reset to
   recommended" button. "Open full planner" link into FP1's Step 2 with the same loadout loaded (reuse its state, no
   second store).

WORDING RULES
Short sentences, no abbreviations the page has not explained once (Net = reward minus danger). "Better by 6%" and
"Worse by 4%" in words as well as ▲/▼. Danger is "Danger" not "risk-adjusted anything". Say "estimate" next to anything
marked judgement. A first-time player should understand each screen without reading the methodology page.

MOBILE REQUIREMENTS
Tap targets >= 44 px. Single column <= 720 px. Bottom sheet reachable with the thumb; Escape and a visible Close button
dismiss it; focus is trapped and returned. No sideways scroll at 280 px. Safe-area padding on the sticky strip (the
header is sticky: reuse FP1's offset). Works with the on-screen keyboard (no inputs are needed in Quick picks). Respect
prefers-reduced-motion (sheet appears without animation; otherwise <= 150 ms). Text >= 16 px for body, numbers in Geist
Mono with tabular figures. Must also read well on an Xbox browser at TV distance (large type at >= 1280 px).

TESTS AND GATE
- Unit: each of the 5 recommended loadouts validates with zero errors; alternatives are legal, deterministic, <= 3, sorted
  best first; "Better/Worse by N%" matches pctChange; copy-list text snapshot for each farm.
- e2e (apps/web/e2e/quick-picks.spec.ts): pick farm -> setup renders; tap a mod -> sheet shows 2-3 alternatives; Apply
  changes Net text; Reset restores; copy button writes text; deep link #farm-<id> still works; 390 px and 280 px have no
  sideways scroll; axe clean on both screens.
- Gate as separate commands: typecheck, lint, test, build, e2e. Measure scripts/route-weight.mjs for / and /dashboard/
  before and after. Hard limits: /dashboard/ <= 250 KB br (FP1 left 208,826 B, so lazy-load the sheet and the Quick
  picks view if needed); / has ~635 B of budget left, so do not add anything to home JS.
- Docs: docs/carry/QP1.md, a row in docs/ui/UI-PROGRESS.md, a PR with the protocol sections (Summary, Previous wave check,
  Carry-over handled, Gate, Screenshots, Limits, Needs owner) and the Pages preview URL at the top. Screenshots (1440 and
  390, both screens, sheet open) kept out of git.

FINISH
In the PR "Needs owner", list anything you recommend that I should decide, e.g. changing a farm in the top 5, the
normalisers, or whether Quick picks should become the default view of /dashboard. Report anything you could not do.
```

## Why these choices (for the owner)
- **Curated, not ranked.** The preset weights are judgement calls and Net is uncalibrated, so the top 5 order is a stored
  recommendation (Abyss, Expedition, Breach, Delirium, Unique hunting), not a live ranking. Net is shown per setup and per
  swap, where it is a fair comparison.
- **Alternatives come from the existing swap engine.** `netLabels` and `allSwaps` already rank legal replacements by Net
  change, so the "top 2-3 alternatives" are real engine output, not hand-typed.
- **No numbers invented.** Percentages are computed; the only new data are the recommended loadouts and any normalisers,
  and normalisers are labelled "judgement".
- **Prototype bars are dropped.** The screenshots use bars; CLAUDE.md and the FP1 owner note say numbers only. Layout is kept.
