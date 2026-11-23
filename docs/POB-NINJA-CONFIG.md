# poe.ninja's PoB config baseline

Source: the owner (2026-11-22). This is the config poe.ninja applies when it computes a build's numbers, and it explains why PoB2's damage on a pasted code differs from the figures poe.ninja showed before. **Not implemented yet**: the oracle and the headless runner use the code's own saved config today (see PB-10 in `docs/remaining/REMAINING-WORK.md`).

- Boss: Arbiter of Ash. Flasks and charms on. "Disable EHP gain on block/suppress" checked. Nearby enemies 1, nearby rare/unique 1. Enemy ailments: bleed, chill, ignite.
- Charges set to max, depending on which skills and items are present:
  - Power: Voll's Protector, Power Charge on Critical or Hit, Ailith's Chimes, Guatelitzi's Ablation, Lingering Illusion, Killing Palm, Power Siphon, Profane Ritual, Siphoning Strike, Wing Blast, Devour, Combat Frenzy + Resonance, or any Frenzy skill + Resonance.
  - Frenzy: Frenzy Charge on Hit, Combat Frenzy, Sniper's Mark, Cull The Weak, Disengage, Mist Raven, or any Endurance skill + Resonance.
  - Endurance: Endurance Charge every second when hit recently, Magma Barrier, Lingering Illusion + Resonance, or any Power skill + Resonance.
  - All: Charge Profusion Support or Thaumaturgic Generator.
- Buffs and states, each enabled only when its source is present:
  - Low Life: Coward's Legacy.
  - Rage max: any Rage source.
  - Crit Recently: all builds unless Resolute Technique is allocated.
  - Lifetap, Arcane Surge, Used Warcry Recently, Banner (planted, max Valour), Trinity Resonance, Flame Wall added damage.
  - While Moving: a "while moving" node.
- Enemy debuffs:
  - Impaled, Dazed, Blinded.
  - Withered at 10 stacks.
  - Open Weakness (Predatory Instinct), Intimidated (Blackheart or Intimidate on Hit), Critical Weakness (Sandstorm Visage, Malice, Effigy of Cruelty).
  - Elemental exposure (matching source or Potent Exposure Support).
  - Enemy Near You (Meat Shield).
- Second pass: Been Hit Recently is on unless the calculated evade chance against the Arbiter is 50% or more. Wind Dancer max stages is on when Been Hit Recently is off.
