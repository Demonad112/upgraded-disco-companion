import { describe, expect, it } from "vitest";
import { routeLegs } from "../src/lib/atlasLegs";

/** A stub tree:   1 - 2 - 3 - 4
 *                     |
 *                     5 - 6          7 (unreachable) */
const edges: Array<[number, number]> = [
  [1, 2],
  [2, 3],
  [3, 4],
  [2, 5],
  [5, 6],
];
const adj = new Map<number, number[]>();
for (const [a, b] of edges) {
  adj.set(a, [...(adj.get(a) ?? []), b]);
  adj.set(b, [...(adj.get(b) ?? []), a]);
}
const graph = { neighbours: (id: number) => adj.get(id) ?? [] };

describe("routeLegs", () => {
  it("keeps one leg while each step continues from the last target", () => {
    const legs = routeLegs(graph, 1, [
      { id: "a", nodes: [2] },
      { id: "b", nodes: [3] },
      { id: "c", nodes: [4] },
    ]);
    expect(legs.map((l) => l.leg)).toEqual([1, 1, 1]);
    expect(legs[0]!.path).toEqual([1, 2]);
    expect(legs[2]!.path).toEqual([3, 4]);
  });

  it("starts a new leg when the route branches off an earlier node", () => {
    const legs = routeLegs(graph, 1, [
      { id: "a", nodes: [4] },
      { id: "b", nodes: [6] },
    ]);
    // 1-2-3-4, then 6 attaches at 2 (not at 4): a second leg whose path begins at the attachment.
    expect(legs[0]!.path).toEqual([1, 2, 3, 4]);
    expect(legs[1]).toEqual({ stepId: "b", path: [2, 5, 6], leg: 2 });
  });

  it("goes to the nearest of several ids, and treats an already-reached target as a one-node path", () => {
    const legs = routeLegs(graph, 1, [
      { id: "a", nodes: [4, 5] },
      { id: "b", nodes: [2] },
    ]);
    expect(legs[0]!.path).toEqual([1, 2, 5]);
    expect(legs[1]!.path).toEqual([2]);
    expect(legs[1]!.leg).toBe(2);
  });

  it("skips steps with no nodes or no path", () => {
    const legs = routeLegs(graph, 1, [
      { id: "none", nodes: [] },
      { id: "island", nodes: [7] },
      { id: "ok", nodes: [3] },
    ]);
    expect(legs.map((l) => l.stepId)).toEqual(["ok"]);
    expect(legs[0]!.leg).toBe(1);
  });
});

import { clampToExtent } from "../src/components/tree/geometry";

describe("clampToExtent", () => {
  const extent = { minX: -100, maxX: 100, minY: -50, maxY: 50 };
  it("pulls a centre back inside the extent and leaves an inside one alone", () => {
    expect(clampToExtent({ cx: 500, cy: -500, scale: 0.1 }, extent)).toEqual({ cx: 100, cy: -50, scale: 0.1 });
    const inside = { cx: 10, cy: 10, scale: 0.1 };
    expect(clampToExtent(inside, extent)).toBe(inside);
  });
});
