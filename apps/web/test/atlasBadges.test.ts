import { describe, expect, it } from "vitest";
import { placeBadges, type BadgeInput } from "../src/components/atlas/atlasBadges";

const W = 390;
const H = 360;

/** Deterministic scatter, including nodes on every canvas edge and some stacked on one another. */
function scatter(n: number): BadgeInput[] {
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out: BadgeInput[] = [];
  for (let k = 0; k < n; k++) {
    out.push({ id: k, x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 6, label: String(1 + Math.floor(rnd() * 17)) });
  }
  out.push({ id: n, x: 0, y: 0, r: 4, label: "1" }, { id: n + 1, x: W, y: H, r: 4, label: "12" });
  out.push({ id: n + 2, x: 100, y: 100, r: 4, label: "3" }, { id: n + 3, x: 100, y: 100, r: 4, label: "3" });
  return out;
}

describe("placeBadges", () => {
  for (const n of [5, 40, 200]) {
    it(`keeps ${n} badges inside the canvas and apart`, () => {
      const rects = placeBadges(scatter(n), W, H);
      expect(rects.length).toBeGreaterThan(0);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(W);
        expect(r.y + r.h).toBeLessThanOrEqual(H);
      }
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!;
          const b = rects[j]!;
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart, `${a.id} vs ${b.id}`).toBe(true);
        }
    });
  }

  it("moves a badge to another corner, and drops one with no room", () => {
    const [a, b] = placeBadges([{ id: 1, x: 100, y: 100, r: 4, label: "1" }, { id: 2, x: 100, y: 100, r: 4, label: "2" }], W, H);
    expect(a!.x).toBeGreaterThan(100); // NE first
    expect(b!.y).toBeGreaterThan(100); // SE next
    expect(placeBadges(Array.from({ length: 6 }, (_, k) => ({ id: k, x: 100, y: 100, r: 4, label: "1" })), W, H).length).toBe(4);
  });
});
