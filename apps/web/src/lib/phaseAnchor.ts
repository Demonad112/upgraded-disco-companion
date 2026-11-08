import type { RoadmapPhase } from "./types";

/** The id a checklist phase block carries, for the phase nav links. */
export function phaseAnchor(phase: RoadmapPhase): string {
  return `phase-${phase}`;
}
