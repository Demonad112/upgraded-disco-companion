import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { pinnacleBosses } from "@/data/bosses";
import { CHANGELOG } from "@/data/changelog";
import { metaBuilds } from "@/data/metaBuilds";
import { farmingStrategies } from "@/data/strategies";
import { dataUpdated, guideCounts, strategyNames } from "@/lib/homeStats";
import { orderedSteps } from "@/lib/roadmapOrder";
import { progressTotals } from "@/lib/stepSummary";

describe("home meta strip", () => {
  it("counts every figure from the guide data", () => {
    expect(guideCounts().map((c) => c.value)).toEqual([
      orderedSteps.length,
      farmingStrategies.length,
      pinnacleBosses.length,
      metaBuilds.length,
      atlasClusters.length + memoryForks.length,
    ]);
  });

  it("uses the Atlas unit the tracker and tool card divide by", () => {
    const { atlasIds, atlasTotal } = progressTotals();
    expect(atlasIds).toEqual([...atlasClusters, ...memoryForks].map((n) => n.id));
    expect(guideCounts().at(-1)!.value).toBe(atlasTotal);
  });

  it("dates the data by the newest changelog entry that regenerated data", () => {
    const dataDates = CHANGELOG.filter((e) => e.items.some((i) => i.kind === "data")).map((e) => e.date);
    expect(dataUpdated()).toBe([...dataDates].sort().at(-1) ?? null);
    expect(dataUpdated()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("names every strategy a pin can point at", () => {
    const names = strategyNames();
    farmingStrategies.forEach((s) => expect(names[s.id]).toBe(s.name));
  });

  it("types no count into the home page", () => {
    const page = readFileSync(fileURLToPath(new URL("../src/app/page.tsx", import.meta.url)), "utf8");
    expect(page).not.toMatch(/\b\d+\s*(?:\/\s*\d+\s*)?(?:steps?|strateg|pinnacle|bosses|meta builds?|Atlas nodes?)\b/i);
  });
});
