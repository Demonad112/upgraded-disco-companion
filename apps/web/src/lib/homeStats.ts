import { pinnacleBosses } from "@/data/bosses";
import { CHANGELOG } from "@/data/changelog";
import { metaBuilds } from "@/data/metaBuilds";
import { farmingStrategies } from "@/data/strategies";
import { progressTotals } from "@/lib/stepSummary";

/**
 * The figures in the home page's meta strip. Every one is counted from the
 * guide data at build time, never typed in, so the strip cannot drift from
 * the pages it describes.
 */
export interface GuideCount {
  value: number;
  label: string;
}

const count = (value: number, one: string, many: string): GuideCount => ({
  value,
  label: value === 1 ? one : many,
});

export function guideCounts(): GuideCount[] {
  const { stepIds, atlasTotal } = progressTotals();
  return [
    count(stepIds.length, "step", "steps"),
    count(farmingStrategies.length, "strategy", "strategies"),
    count(pinnacleBosses.length, "pinnacle boss", "pinnacle bosses"),
    count(metaBuilds.length, "meta build", "meta builds"),
    // Clusters plus memory forks: the same unit the Atlas tracker ticks.
    count(atlasTotal, "Atlas node", "Atlas nodes"),
  ];
}

/**
 * Date of the newest changelog entry that regenerated data (the changelog's
 * dates come from packages/data/PROVENANCE.md), or null when there is none.
 */
export function dataUpdated(): string | null {
  const dates = CHANGELOG.filter((e) => e.items.some((i) => i.kind === "data")).map((e) => e.date);
  return dates.length === 0 ? null : dates.reduce((a, b) => (b > a ? b : a));
}

/** Strategy names by id, so a tool card can name the pinned one. */
export function strategyNames(): Record<string, string> {
  return Object.fromEntries(farmingStrategies.map((s) => [s.id, s.name]));
}
