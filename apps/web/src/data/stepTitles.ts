/**
 * Checklist step ids and titles, in play order: the companion's tip needs only these, and importing the roadmap would
 * pull every step's body into the companion chunk. test/stepTitles.test.ts fails when this drifts from
 * src/data/roadmap.ts (via lib/roadmapOrder); regenerate it from `orderedSteps` then.
 */
export interface StepTitle {
  id: string
  title: string
}

export const STEP_TITLES: readonly StepTitle[] = [
  { id: "step-campaign-end", title: "Finish campaign, enter the Ziggurat Refuge" },
  { id: "step-atlas-rules", title: "Know the three rules of the Atlas rush" },
  { id: "step-hilda-contract", title: "Hilda's Camp — first Great Beast only → Mighty Prey" },
  { id: "step-waystone-engine", title: "Run the Waystone engine" },
  { id: "step-precursor-tower", title: "Rush the first Precursor Tower → Ancient Gateway → Burning Monolith" },
  { id: "step-gateways", title: "Light both Gateway beacons" },
  { id: "step-enigma-chambers", title: "Enigma Chambers → Weathered + Ancient Crisis Fragments" },
  { id: "step-sustain-cluster", title: "Allocate the sustain/tablet-unlock cluster" },
  { id: "step-arbiter-of-ash", title: "Kill Arbiter of Ash (quest version)" },
  { id: "step-build-strength-fork", title: "Pick your track: fast-track to T15, or park at T11" },
  { id: "step-t11-park", title: "Grind T11 as the key gearing checkpoint" },
  { id: "step-doryani-revival", title: "Take one Doryani point for the extra revival" },
  { id: "step-delirium-part1", title: "Delirium Part 1 only — amulet anointing unlock" },
  { id: "step-abyss-breach", title: "Layer Abyss, then Breach, while mapping" },
  { id: "step-level85-ascendancy", title: "Hit level 85+, finish your 4th Ascendancy" },
  { id: "step-find-halls", title: "Quest Halls: Matriarch Hall + Patriarch Hall" },
  { id: "step-kill-divinity", title: "Kill #1: quest Arbiter of Divinity" },
  { id: "step-memory-forks", title: "Allocate the top-of-tree passives and memory forks" },
  { id: "step-repeat-divinity-loop", title: "Hunt one Matriarch + Patriarch pair outside the Fortress" },
  { id: "step-cardinal-device", title: "Kill #2: non-quest Arbiter of Divinity → full Atlas unlocked" },
  { id: "step-spend-full-tree", title: "Spend the full tree — skip the trap nodes" },
  { id: "step-close-out-tree", title: "Close out the remaining tree" },
  { id: "step-chain-doryani", title: "Master: Doryani — corrupted nexuses" },
  { id: "step-chain-hilda", title: "Master: Hilda — Great Beasts" },
  { id: "step-chain-jado", title: "Master: Jado — Sealed Vault and anomaly maps" },
  { id: "step-chain-ritual", title: "Ritual — King in the Mists → The Bodach" },
  { id: "step-chain-vaal-temple", title: "Vaal Temple — Architect → Atziri" },
  { id: "step-chain-delirium", title: "Delirium — Grand Mirror → Simulacrum → Tangmazu" },
  { id: "step-chain-abyss", title: "Abyss — Well of Souls → Kulemak" },
  { id: "step-chain-breach", title: "Breach — Monastery → Breach Colony → Xesht" },
  { id: "step-chain-expedition", title: "Expedition — Ruins of Kingsmarch → Olroth → crater" },
  { id: "step-juiced-loop", title: "Commit to a juiced single-mechanic farming loop" },
]

/** The first step not ticked off, or null when the checklist is done. */
export function nextStepTitle(completed: readonly string[]): StepTitle | null {
  const done = new Set(completed)
  return STEP_TITLES.find((s) => !done.has(s.id)) ?? null
}
