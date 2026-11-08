import type { RoadmapPhase } from "@/lib/types";

/**
 * Step ids per phase, in play order: the slice of the roadmap that client
 * components need to count progress and find the next step. Importing
 * `data/roadmap.ts` into a client component ships every step's prose in the
 * JS bundle; this keeps the prose in the server-rendered HTML only.
 * `test/roadmapIndex.test.ts` fails if this drifts from `lib/roadmapOrder`.
 */
export const ROADMAP_INDEX: readonly { phase: RoadmapPhase; ids: readonly string[] }[] = [
  { phase: "campaign-end", ids: ["step-campaign-end", "step-atlas-rules", "step-hilda-contract", "step-waystone-engine"] },
  { phase: "precursor-fortress", ids: ["step-precursor-tower", "step-gateways", "step-enigma-chambers", "step-sustain-cluster"] },
  { phase: "arbiter-of-ash", ids: ["step-arbiter-of-ash"] },
  { phase: "t11-checkpoint", ids: ["step-build-strength-fork", "step-t11-park", "step-doryani-revival", "step-delirium-part1", "step-abyss-breach", "step-level85-ascendancy"] },
  { phase: "arbiter-of-divinity-loop", ids: ["step-find-halls", "step-kill-divinity", "step-memory-forks", "step-repeat-divinity-loop", "step-cardinal-device", "step-spend-full-tree"] },
  { phase: "full-tree", ids: ["step-close-out-tree"] },
  { phase: "masters-and-mechanics", ids: ["step-chain-doryani", "step-chain-hilda", "step-chain-jado", "step-chain-ritual", "step-chain-vaal-temple", "step-chain-delirium", "step-chain-abyss", "step-chain-breach", "step-chain-expedition"] },
  { phase: "juiced-farming", ids: ["step-juiced-loop"] },
];

/** Every step id, in play order. */
export const ROADMAP_STEP_IDS: readonly string[] = ROADMAP_INDEX.flatMap((g) => g.ids);

/** The first step id not yet ticked off, or null when the checklist is done. */
export function nextIncompleteId(completedStepIds: readonly string[]): string | null {
  const done = new Set(completedStepIds);
  return ROADMAP_STEP_IDS.find((id) => !done.has(id)) ?? null;
}
