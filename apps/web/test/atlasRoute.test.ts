import { describe, expect, it } from "vitest";
import { nextStep, routeSteps } from "../src/lib/atlasRoute";

describe("routeSteps", () => {
  it("numbers Path and Late game by cluster order, forks by file order, and leaves other tabs empty", () => {
    const path = routeSteps("path");
    expect(path.map((s) => s.num)).toEqual(path.map((_, i) => i + 1));
    expect(routeSteps("late").length).toBeGreaterThan(0);
    expect(routeSteps("forks").map((s) => s.num)).toEqual([1, 2, 3]);
    expect(routeSteps("mechanics")).toEqual([]);
    expect(routeSteps("traps")).toEqual([]);
  });

  it("nextStep is the first step not done, or undefined when all are", () => {
    const path = routeSteps("path");
    expect(nextStep(path, () => false)).toBe(path[0]);
    expect(nextStep(path, (s) => s.num <= 3)?.num).toBe(4);
    expect(nextStep(path, () => true)).toBeUndefined();
  });
});
