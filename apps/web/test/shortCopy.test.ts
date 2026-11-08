import { describe, expect, it } from "vitest";
import { roadmapSteps } from "@/data/roadmap";
import { stepSummaries } from "@/lib/stepSummary";
import { glossary } from "@/data/glossary";
import { primerFacts } from "@/data/mechanicsPrimer";
import { farmingStrategies } from "@/data/strategies";
import { pinnacleBosses } from "@/data/bosses";
import { benchmarkGates } from "@/data/benchmarks";

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

// CD2 caddy caps: what a new player sees without Pro detail stays one short line.

describe("caddy caps (CD2)", () => {
  const cap = (label: string, text: string | undefined, max: number) => {
    expect(text, label).toBeTruthy();
    expect(text!.length, `${label}: ${text}`).toBeLessThanOrEqual(max);
  };
  it("checklist action items fit one line", () => {
    for (const s of roadmapSteps) (s.actionItems ?? []).forEach((a, i) => cap(`${s.id}[${i}]`, a, 120));
  });
  it("glossary tooltips are short", () => {
    for (const g of glossary) cap(g.id, g.short, 90);
  });
  it("primer facts have a short line", () => {
    for (const f of primerFacts) cap(f.id, f.short, 100);
  });
  it("every farm has a short summary", () => {
    for (const s of farmingStrategies) cap(s.id, s.summary, 110);
  });
  it("boss requirements and benchmark gates fit one line", () => {
    for (const b of pinnacleBosses) b.gatingRequirements.forEach((r, i) => cap(`${b.id}[${i}]`, r, 100));
    for (const g of benchmarkGates) cap(g.id, g.label, 100);
  });
});
