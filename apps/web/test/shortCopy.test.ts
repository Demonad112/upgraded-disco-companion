import { describe, expect, it } from "vitest";
import { roadmapSteps } from "@/data/roadmap";
import { stepSummaries } from "@/lib/stepSummary";

describe("short copy (C1)", () => {
  it("every step has a plain one-sentence why of at most 140 chars", () => {
    for (const s of roadmapSteps) {
      expect(s.why, s.id).toBeTruthy();
      expect(s.why!.length, s.id).toBeLessThanOrEqual(140);
    }
  });
  it("coreTips index real tips", () => {
    for (const s of roadmapSteps) for (const i of s.coreTips ?? []) expect(s.tips?.[i], `${s.id}[${i}]`).toBeTruthy();
  });
  it("the three diagram slots are set", () => {
    expect(roadmapSteps.filter((s) => s.diagram).map((s) => s.diagram).sort()).toEqual([
      "atlas-path",
      "boss-order",
      "waystone-ladder",
    ]);
  });
  it("step summaries use the why", () => {
    for (const s of stepSummaries()) expect(s.description.length).toBeLessThanOrEqual(140);
  });
});
