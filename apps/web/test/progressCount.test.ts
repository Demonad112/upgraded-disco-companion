import { describe, expect, it } from "vitest";
import { countIn } from "../src/lib/progressCount";

describe("countIn", () => {
  it("counts only ids that still exist", () => {
    expect(countIn(["a", "b", "c"], ["a", "c", "gone"])).toBe(2);
  });

  it("is 0 for empty inputs or no overlap", () => {
    expect(countIn([], ["a"])).toBe(0);
    expect(countIn(["a"], [])).toBe(0);
    expect(countIn(["a"], ["b"])).toBe(0);
  });

  it("does not double-count a saved id listed twice", () => {
    expect(countIn(["a", "b"], ["a", "a", "b"])).toBe(2);
  });
});
