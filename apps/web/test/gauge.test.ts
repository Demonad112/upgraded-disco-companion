import { describe, expect, it } from "vitest";
import { gaugeModel } from "../src/lib/gauge";

describe("gaugeModel", () => {
  it("uses one segment per unit up to 40", () => {
    expect(gaugeModel(0, 32)).toMatchObject({ segments: 32, filled: 0, next: 0, percent: 0 });
    expect(gaugeModel(1, 32)).toMatchObject({ segments: 32, filled: 1, next: 1, percent: 3 });
    expect(gaugeModel(16, 32)).toMatchObject({ filled: 16, next: 16, percent: 50 });
    expect(gaugeModel(32, 32)).toMatchObject({ filled: 32, next: -1, percent: 100 });
    expect(gaugeModel(3, 40).segments).toBe(40);
  });

  it("switches to 20 proportional segments above 40", () => {
    expect(gaugeModel(0, 42)).toMatchObject({ segments: 20, filled: 0, next: 0 });
    // 2/42 is under one 20th: nothing fills yet, the first segment is next.
    expect(gaugeModel(2, 42)).toMatchObject({ filled: 0, next: 0, percent: 5 });
    expect(gaugeModel(21, 42)).toMatchObject({ filled: 10, next: 10, percent: 50 });
    // Never full before the total.
    expect(gaugeModel(41, 42)).toMatchObject({ filled: 19, next: 19, percent: 98 });
    expect(gaugeModel(42, 42)).toMatchObject({ filled: 20, next: -1, percent: 100 });
  });

  it("clamps out-of-range input and handles an empty total", () => {
    expect(gaugeModel(50, 32)).toMatchObject({ done: 32, filled: 32 });
    expect(gaugeModel(-3, 32)).toMatchObject({ done: 0, filled: 0 });
    expect(gaugeModel(0, 0)).toEqual({ done: 0, total: 0, percent: 0, segments: 1, filled: 0, next: -1 });
  });
});
