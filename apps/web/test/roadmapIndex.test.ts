import { describe, expect, it } from "vitest";
import { ROADMAP_INDEX, ROADMAP_STEP_IDS, nextIncompleteId } from "@/data/roadmapIndex";
import { nextIncompleteStep, stepsByPhase } from "@/lib/roadmapOrder";

describe("roadmapIndex", () => {
  it("matches the roadmap's phases and step order", () => {
    expect(ROADMAP_INDEX.map((g) => ({ phase: g.phase, ids: [...g.ids] }))).toEqual(
      stepsByPhase.map((g) => ({ phase: g.phase, ids: g.steps.map((s) => s.id) }))
    );
  });

  it("finds the same next step as the full roadmap", () => {
    for (const done of [[], ROADMAP_STEP_IDS.slice(0, 5), [...ROADMAP_STEP_IDS]]) {
      expect(nextIncompleteId(done)).toBe(nextIncompleteStep(done)?.id ?? null);
    }
  });
});
