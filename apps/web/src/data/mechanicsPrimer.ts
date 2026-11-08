import type { PrimerFact, TierBreakpoint } from "@/lib/types";
import { video05Source, videoSource } from "./sourceMeta";

/** "Before your first map" facts — the rules the endgame never explains. */
export const primerFacts: PrimerFact[] = [
  {
    id: "primer-tiers",
    topic: "Tiers and area level",
    short: "Each tier makes the map harder and the loot better. T11–15 (red) is real endgame.",
    detail:
      "T1 is area level 65 and each tier adds 1, up to T15 at 79; T1–5 are white, T6–10 yellow, T11–15 red. T16 (area 80) only comes from Vaal-corrupting a T15, which can also drop it to T14.",
    source: video05Source(["jOU2zNgLxJ0@08:22", "5Vp_3gUFbwI@00:45"]),
  },
  {
    id: "primer-mods",
    topic: "Waystone modifiers",
    short: "Waystone mods make the map harder and cost you a revive each. Add only what you can handle.",
    detail:
      "Mods only make the map harder; the Waystone's built-in stat is what raises rewards. Each mod also removes one of your 6 revives, so a 6-mod map gives one attempt.",
    source: video05Source(["zMFBAr1a6SA@02:04", "yHLuC_pnFco@05:24"]),
  },
  {
    id: "primer-boss-death",
    topic: "Dying to the map boss",
    short: "Die to the boss and the rest of the map is gone. Do side content first.",
    detail:
      "The boss resets to full life and the rest of the map empties. Do side objectives before the boss.",
    source: video05Source(["yHLuC_pnFco@06:56"]),
  },
  {
    id: "primer-tablet-slots",
    topic: "Tablet slots",
    short: "More Waystone mods means more tablet slots: magic holds 1, rare 2, six mods 3.",
    detail:
      "A magic Waystone holds 1 tablet. A rare with 3+ mods (Alchemy, or Transmute + Augment + Regal) holds 2, and six mods (Alchemy + 2 Exalts) holds 3.",
    source: video05Source(["yHLuC_pnFco@09:14"]),
  },
  {
    id: "primer-tablet-mods",
    topic: "Tablet modifier cap",
    short: "Tablets get more mods as you beat the Arbiters. Every tablet mod is pure upside.",
    detail:
      "Tablets start with 2 mods, rise to 3 after Arbiter of Ash and to 4 with Partial Translation after Arbiter of Divinity. Every tablet mod is a pure bonus, unlike Waystone mods.",
    source: video05Source(["lsu7-ITJe_M@12:07", "lsu7-ITJe_M@13:08"]),
  },
  {
    id: "primer-powerful-boss",
    topic: "Climbing tiers",
    short: "To climb tiers, kill Powerful Map Bosses (red icon) or use the 3-for-1 bench.",
    detail:
      "Only Powerful Map Boss nodes (red demon icon) drop a Waystone one tier higher, and the 3-for-1 reforge bench is the only other way up. Doryani sells one tier below your best map and restocks each level-up.",
    source: videoSource(["uMHfOL8sT6I@03:03", "uMHfOL8sT6I@01:32"]),
  },
  {
    id: "primer-atlas-points",
    topic: "Where Atlas points come from",
    short: "Atlas points come from the Fortress quest, then the second Arbiter of Divinity kill.",
    detail:
      "Fortress maps give points once you're past the Ancient Gateway, and the second Arbiter of Divinity kill unlocks the rest. League mechanics and Masters have their own point trees from their quests.",
    source: videoSource(["5Vp_3gUFbwI@03:49", "uMHfOL8sT6I@05:20"], {
      note: "Wall-tower point counts differ between sources (+3 vs +4), as does the total tree size (311 vs 335).",
    }),
  },
];

export const tierBreakpoints: TierBreakpoint[] = [
  {
    tier: "T1",
    areaLevel: "65",
    unlocks: "30% movement speed boots, +2 minion helmets",
    purpose: "Leave the campaign with basic structural items",
    source: video05Source(["jOU2zNgLxJ0@08:22"], {
      verified: "unverified",
      note: "Affix unlocks per tier come from the web digest; the area levels are from the videos.",
    }),
  },
  {
    tier: "T6–T7",
    areaLevel: "70–71",
    unlocks: "Higher resistance tiers and base defences; first power spike",
    purpose: "Fix your resistance caps before the Enigma Chambers",
    source: video05Source(["jOU2zNgLxJ0@08:22"], {
      verified: "unverified",
      note: "Scorpius names T6 and T11 as power spikes; the exact affix list is from the web digest.",
    }),
  },
  {
    tier: "T11",
    areaLevel: "75",
    unlocks:
      "T1 flat damage (rings/gloves), T1–2 life, T2 resistances/defences, +3 amulets, T2 weapon physical, level-18 gems",
    purpose: "The gearing checkpoint — best power per risk; park here until geared",
    source: video05Source(["VSeDfybR3Cc@09:07", "VSeDfybR3Cc@10:07"]),
  },
  {
    tier: "T15",
    areaLevel: "79",
    unlocks: "Top tiers of a few affixes (e.g. 35% movement speed) — plus more niche mods that dilute rolls",
    purpose: "Push only once T11 gear is done and T15 clears at a decent pace",
    source: video05Source(["jOU2zNgLxJ0@08:22", "VSeDfybR3Cc@10:07"], {
      verified: "conflicting",
      note: "Older guides describe T15 drops as item level 82; the videos put T15 at area level 79.",
    }),
  },
];
