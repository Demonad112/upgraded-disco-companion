# Farm Planner — fact-check RE-RUN (FP1-3). Separate Claude chat, Research on.

Paste the block. Attach `apps/web/src/data/farm/tablets-0.5.5.json` and the first fact-check output.
Return goes to Claude Code as the input for FP2 (data replace + test update). Run before any planner data edit.

```
You are re-checking the data behind my fan-made PoE2 Farm Planner (console/Xbox player). The first fact-check
(attached) was used as the data source; the build found defects in it. Rules unchanged: never invent a number; every
value carries source URL, source date, patch, confidence. Use only primary pages you actually opened; no URL = say so.

EVIDENCE BAR (relaxed): this does not need to be perfect. Where no primary source exists, give your best
conclusion from community views (poe2db, Maxroll, Mobalytics, r/PathOfExile2, forums, streamers) and label it
confidence "community" with the 1-2 sources and a one-line reason. Never leave a value blank if a reasoned estimate is
possible; mark estimates "judgement". Only use "no evidence" when nothing at all is written about it. Still no
fabricated URLs.

STEP 0. Confirm current patch/league from official GGG sources. If newer than 0.5.5, say so first and tag all rows.

FIX LIST (answer each, row per item, with URL + date + confidence):
1. AFFIX SIDE for every mechanic-specific tablet mod (Abyss, Breach, Expedition, Delirium, Ritual, Overseer, Temple).
   The first output filed all 31 under a "Suffix Pools" heading with no per-mod side. Give prefix|suffix per mod,
   and its mod group (which mods exclude each other).
2. TIERS. The first output gave T1 only. For each tablet mod and each Waystone mod: every tier, min-max, item level
   (tablets) or Waystone tier requirement (Waystones). If poe2db shows one tier only, say "single tier".
3. OUT-OF-RANGE FIXTURE ROLLS. Confirm the real range for: Abyss "chance to lead to Abyssal Depths" (first output
   10-20 vs fixture roll 30), Waystone pack size and extra-Fire at LOW Waystone tiers (fixture used 15% / 20%; only
   41-50 and 36-40 were listed). Is the roll range tier-dependent? Give the table.
4. TABLET MOD LIMITS. Fixtures 2 and 4 had tablets with 3 suffixes. Re-confirm per-side caps for Rare tablets:
   base total 3 -> is the split max 2 prefix + 2 suffix (so 3 = 2+1 or 1+2)? With both keystones 2+2? Cite the
   passive text verbatim.
5. MISSING POOLS. Waystone mods absent from the first list that exist in 0.5.5 (e.g. "Monsters Penetrate X% Elemental
   Resistance", extra damage, ailment/reduced-effect mods, "no regen", "less recovery"...). Full Waystone prefix and
   suffix list with text, stat id, tiers, group. Also the 4 effect-scaling Atlas passives: confirm exact text, value,
   what each scales (tablet mods only? waystone mods? flat counts like "+1 Remnant"?).
6. WHAT SCALES. Do "increased effect of explicit modifiers" passives scale flat counts (+N Rare Monsters, +1 Remnant,
   chance-% mods)? Cite. Where not citable, say "unknown", not a guess.
7. SOURCES WITHOUT URLs: "Maxroll Currency Guide", "Maxroll Breach Guide", "Developer Mechanics Notes". Give the real
   URL + quoted sentence, or withdraw the claim and the weights that depend on it.
8. PRESET WEIGHTS (1.6, 1.8, 2.5 ...). For each weight: is it (a) quoted from a source, (b) derived from a stated
   drop-rate fact, or (c) a judgement? Mark (c) rows "judgement" and give no confidence of "confirmed".
9. UNIQUE HUNTING / BOSS RUSH. Which stats do top guides name for boss rush, Vaal Temple, Azmerian Wisps, Trial of
   Chaos, hybrid farms? Give a preset per strategy ONLY where a source names the stats; else "no evidence".
10. DANGER SEVERITY 0-3 per layer (ES, armour, evasion, mana/MoM, recovery). For each hazard: is the number sourced
    or your judgement? Judgement rows labelled as such with the reasoning.

11. PATCH. Current patch per community sources is 0.5.5e Hotfix 1 (0.5.5b-e followed the Sep 3-4 notes). Did 0.5.5b-e
    change any tablet or Waystone mod, range, tower socket rule, or Atlas passive used here? List changes, or "none found".
    1.0 is reported for 2026-12-11: note anything announced about tablets/Waystones for 1.0.
12. WAYSTONE MAX MODS. Three claims conflict: first fact-check says 6 normal / 10 corrupted (5+5); a Fubgun-sourced spec
    says "T14-T15 8-mod Waystones" and "6-mod corrupted"; Mobalytics/Maxroll guides say 6 is the rare cap. Give the
    number per case (rare, corrupted, any Atlas/omen/Vaal route to more), with the quoted source line. Shipped data
    uses 6 and 10 (5+5).
13. EXPEDITION STACKING. Shipped (1 tablet = 1 Expedition; 2 = +1 Verisium Remnant +35% density; 3 = +1 Expedition;
    4 = +1 Remnant +35% density, City/overlap only). A second source says 4 tablets = +second Remnant AND +70% density.
    Which is right per the 0.5.5 notes? Quote them. Also: is "density" a monster-density stat that stacks with pack size?
14. IRRADIATED "Map has (1-2) additional random Modifiers": community guides describe "2 additional random map
    modifiers" on Irradiated tablets for Grand Expedition farms. Confirm the real range and which tablet bases roll it.
15. MECHANIC FACTS TO CHECK (single-source today): Delirium fog spreads to 10 maps (was 8-16); Delirium pack count
    capped at 100% (effectiveness and rarity still to 200%); Breach rares spawn in waves of 5; Overseer tablet
    guarantees a Rogue Exile / Powerful Boss. Say which are confirmed by the 0.5.5 notes.

CALIBRATION (needed to fix Net): the planner multiplies stat totals by weights, so Waystone crit (150-200%) swamps
reward stats (30-60%). Give a normaliser per stat that has a SOURCE (e.g. typical max roll, or a documented
effect-per-% on monster damage/loot). No source -> "no evidence", leave empty.

OUTPUT (in order)
1. 10-line summary: patch, which of items 1-10 changed the data, which could not be confirmed.
2. One table per item. Columns: row, value, patch, URL, source date, confidence
   (confirmed by 2+ | single source | community | judgement | unverified).
3. "Corrections to the first fact-check" list, plain statements.
4. "Couldn't confirm" list.
5. ONE ```json block matching apps/web/src/data/farm/tablets-0.5.5.json top-level keys exactly
   (rules, stats, tabletMods, waystoneMods, effectModifiers, weights, fixtures). Per mod: id, text, affix, modGroup,
   stat, tabletTypes, tiers[{tier,min,max,ilvl}], spawnWeight (null if unknown), confidence, sources[]. Validate
   yourself: ids unique, every stat exists, min <= max, every fixture roll inside its tier range, every fixture
   within side and total caps. Report any fixture you had to change and why.
```

## Next in Claude Code once the output is back (FP2)
1. Diff the new JSON against the shipped one; list changed rows.
2. Replace the data file; flip the test expectations (currently 1, 4, 2, 2 asserted validation errors across fixtures
   1-4) to 0 where the new fixtures are legal.
3. Normalisers: add to `weights.danger` only where sourced; otherwise leave Net uncalibrated and keep the 50-map log.
4. Gate: typecheck, lint, test, build, e2e; `/dashboard/` first-load stays under 250 KB (now 208,826 B br).
```
