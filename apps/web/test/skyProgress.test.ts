import { describe, expect, it } from "vitest";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { PHASE_NAMES } from "@/data/phaseNames";
import { currentRunes, RUNE_SETS } from "@/data/runes";
import { BAND, BAND_MARGIN, bandUnit, buildField } from "@/components/fx/sky/field";
import {
  completePhases,
  hashId,
  layoutProgress,
  newlyComplete,
  threadsFor,
} from "@/components/fx/sky/progress";
import { progressGroups } from "@/components/fx/sky/progressData";
import { CURRENT_PATCH, LEAGUES } from "@/lib/constants";
import { orderedSteps, PHASE_ORDER } from "@/lib/roadmapOrder";

const layout = layoutProgress(progressGroups());
const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [1280, 720],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 640],
  [320, 568],
];

const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const k = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
  return Math.hypot(ax + dx * k - x, ay + dy * k - y);
};

describe("progress constellation layout (LS1)", () => {
  it("has one star per checklist step and Atlas node, each once", () => {
    const ids = layout.stars.map((s) => s.id);
    const expected = [
      ...orderedSteps.map((s) => s.id),
      ...atlasClusters.map((c) => c.id),
      ...memoryForks.map((f) => f.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...expected].sort());
  });

  it("is one constellation per phase that has stars, in play order, steps first in step order", () => {
    const phases = layout.phases.map((p) => p.phase);
    expect(phases).toEqual(PHASE_ORDER.filter((p) => phases.includes(p)));
    for (const ph of layout.phases) {
      const steps = layout.stars.slice(ph.from, ph.to).filter((s) => s.id.startsWith("step-"));
      expect(steps.map((s) => s.id)).toEqual(orderedSteps.filter((s) => s.phase === ph.phase).map((s) => s.id));
    }
  });

  it("is deterministic: the same ids give the same positions, seeded from the id", () => {
    expect(layoutProgress(progressGroups())).toEqual(layout);
    expect(hashId("step-campaign-end")).toBe(hashId("step-campaign-end"));
    expect(hashId("step-campaign-end")).not.toBe(hashId("step-atlas-rules"));
  });

  it("puts every star inside the reserved band, and no two stars on top of each other", () => {
    for (const s of layout.stars) {
      const r = Math.hypot(s.x, s.y);
      expect(r).toBeGreaterThanOrEqual(BAND[0]);
      expect(r).toBeLessThanOrEqual(BAND[1]);
    }
    // Neighbours in a phase sit in their own slot of the arc.
    for (let i = 1; i < layout.stars.length; i++) {
      const a = layout.stars[i - 1];
      const b = layout.stars[i];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.005);
    }
  });

  it.each(VIEWPORTS)("never collides with a generated constellation at %ix%i", (w, h) => {
    const f = buildField(w, h);
    let closest = Infinity;
    for (const s of layout.stars) {
      const x = s.x * bandUnit(w, h);
      const y = s.y * bandUnit(w, h);
      for (const c of f.constellations) {
        for (const n of c.stars) closest = Math.min(closest, Math.hypot(n.x - x, n.y - y));
        for (const [a, b] of c.links) {
          const p = c.stars[a];
          const q = c.stars[b];
          closest = Math.min(closest, segDist(x, y, p.x, p.y, q.x, q.y));
        }
      }
    }
    expect(closest).toBeGreaterThanOrEqual(BAND_MARGIN);
  });
});

describe("progress completion (LS1)", () => {
  const first = layout.phases[0];
  const firstIds = layout.stars.slice(first.from, first.to).map((s) => s.id);

  it("threads each done star to the previous done star in its phase", () => {
    const done = new Set([firstIds[0], firstIds[2]]);
    const prev = threadsFor(layout, done);
    expect(prev[first.from]).toBe(-1);
    expect(prev[first.from + 1]).toBe(-1);
    expect(prev[first.from + 2]).toBe(first.from);
  });

  it("detects a phase completing, and never flares on undo or reset", () => {
    const most = new Set(firstIds.slice(0, -1));
    const all = new Set(firstIds);
    expect(completePhases(layout, most)[0]).toBe(false);
    expect(completePhases(layout, all)[0]).toBe(true);
    expect(newlyComplete(layout, most, all)).toEqual([0]);
    expect(newlyComplete(layout, all, most)).toEqual([]);
    expect(newlyComplete(layout, all, new Set())).toEqual([]);
    expect(newlyComplete(layout, all, all)).toEqual([]);
  });
});

describe("phase names and league runes (LS1)", () => {
  it("names every phase, once each", () => {
    const names = PHASE_ORDER.map((p) => PHASE_NAMES[p]);
    expect(names.every((n) => n.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has five runes for the current league and patch, inside their box", () => {
    const set = currentRunes();
    expect(set?.league).toBe(LEAGUES[0]);
    expect(set?.patch).toBe(CURRENT_PATCH);
    expect(set?.runes).toHaveLength(5);
    for (const rune of set?.runes ?? []) {
      for (const stroke of rune.strokes) {
        expect(stroke.length).toBeGreaterThanOrEqual(2);
        for (const [x, y] of stroke) {
          expect(Math.abs(x)).toBeLessThanOrEqual(1);
          expect(Math.abs(y)).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(currentRunes("No Such League")).toBeNull();
    expect(new Set(RUNE_SETS.map((s) => s.league)).size).toBe(RUNE_SETS.length);
  });
});

describe("low power (LS1)", () => {
  it("treats data saver, 2 cores or 2 GB as a weak device", async () => {
    const { weakDevice } = await import("@/components/fx/sky/living");
    const nav = (n: object) => n as Navigator;
    expect(weakDevice(nav({ hardwareConcurrency: 8, deviceMemory: 8 }))).toBe(false);
    expect(weakDevice(nav({ hardwareConcurrency: 4 }))).toBe(false);
    expect(weakDevice(nav({ hardwareConcurrency: 2 }))).toBe(true);
    expect(weakDevice(nav({ hardwareConcurrency: 8, deviceMemory: 2 }))).toBe(true);
    expect(weakDevice(nav({ hardwareConcurrency: 8, connection: { saveData: true } }))).toBe(true);
  });
});
