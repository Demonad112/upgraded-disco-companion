import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_BYTES,
  applyImport,
  buildExport,
  exportFileName,
  parseImport,
} from "@/lib/progressTransfer";
import { defaultState } from "@/lib/storage";
import type { PersistedState } from "@/lib/types";

const state = (over: Partial<PersistedState> = {}): PersistedState => ({
  ...defaultState(),
  checklist: { completedStepIds: ["a", "b"], completedActionItemKeys: ["a:1"], highestTier: 5, hideCompleted: true },
  atlas: { allocatedClusterIds: ["c1"], allocatedForkIds: ["f1"] },
  dashboard: { lastQuizAnswers: { q1: "x" }, pinnedStrategyId: "s1" },
  gems: { maxSupportTier: 3 },
  prefs: { proDetail: true },
  ...over,
});

const file = (data: unknown, over: Record<string, unknown> = {}) =>
  JSON.stringify({ app: "poe2-endgame-companion", version: 1, exportedAt: "2026-11-17T00:00:00.000Z", data, ...over });

const parsed = (text: string) => {
  const r = parseImport(text);
  if (!r.ok) throw new Error(r.error);
  return r.data;
};

describe("progress export / import", () => {
  it("round-trips progress exactly", () => {
    const s = state();
    expect(parsed(JSON.stringify(buildExport(s)))).toEqual({
      checklist: s.checklist,
      atlas: s.atlas,
      dashboard: s.dashboard,
      gems: s.gems,
    });
  });

  it("leaves out character history, prefs and timestamps of saved state", () => {
    const s = state({ character: { snapshots: [{ key: "acct/name" } as never] } });
    const text = JSON.stringify(buildExport(s));
    expect(text).not.toContain("acct/name");
    expect(text).not.toContain("prefs");
    expect(Object.keys(buildExport(s).data).sort()).toEqual(["atlas", "checklist", "dashboard", "gems"]);
  });

  it("names the file by date", () => {
    expect(exportFileName(new Date("2026-11-17T10:00:00Z"))).toBe("poe2-companion-progress-2026-11-17.json");
  });

  it("rejects bad JSON, non-objects and other apps", () => {
    expect(parseImport("{nope").ok).toBe(false);
    expect(parseImport("[]").ok).toBe(false);
    expect(parseImport(file({}, { app: "other" })).ok).toBe(false);
  });

  it("rejects a wrong version", () => {
    const r = parseImport(JSON.stringify({ ...buildExport(state()), version: 2 }));
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toContain("version");
  });

  it("rejects unknown sections, fields and top-level keys", () => {
    const base = buildExport(state()).data;
    expect(parseImport(file({ ...base, character: { snapshots: [] } })).ok).toBe(false);
    expect(parseImport(file({ ...base, checklist: { ...base.checklist, extra: 1 } })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ ...buildExport(state()), extra: 1 })).ok).toBe(false);
  });

  it("rejects wrong types and missing required sections", () => {
    const base = buildExport(state()).data;
    expect(parseImport(file({ ...base, atlas: { allocatedClusterIds: [1], allocatedForkIds: [] } })).ok).toBe(false);
    expect(parseImport(file({ ...base, checklist: { ...base.checklist, highestTier: -1 } })).ok).toBe(false);
    expect(parseImport(file({ ...base, gems: { maxSupportTier: "3" } })).ok).toBe(false);
    expect(parseImport(file({ ...base, dashboard: { lastQuizAnswers: { q: 1 } } })).ok).toBe(false);
    expect(parseImport(file({ atlas: base.atlas, dashboard: base.dashboard })).ok).toBe(false);
  });

  it("rejects an oversize file and oversize lists", () => {
    expect(parseImport(" ".repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false);
    const base = buildExport(state()).data;
    const ids = Array.from({ length: 5001 }, (_, i) => `s${i}`);
    expect(parseImport(file({ ...base, checklist: { ...base.checklist, completedStepIds: ids } })).ok).toBe(false);
  });

  it("merge unions lists, keeps highest tier and keeps history and prefs", () => {
    const prev = state({ character: { snapshots: [{ key: "k" } as never] } });
    const incoming = parsed(
      file({
        checklist: { completedStepIds: ["b", "c"], completedActionItemKeys: [], highestTier: 2 },
        atlas: { allocatedClusterIds: ["c2"], allocatedForkIds: [] },
        dashboard: { lastQuizAnswers: { q2: "y" } },
      }),
    );
    const next = applyImport(prev, incoming, "merge");
    expect(next.checklist.completedStepIds).toEqual(["a", "b", "c"]);
    expect(next.checklist.highestTier).toBe(5);
    expect(next.checklist.hideCompleted).toBe(true);
    expect(next.atlas.allocatedClusterIds).toEqual(["c1", "c2"]);
    expect(next.dashboard).toEqual({ lastQuizAnswers: { q1: "x", q2: "y" }, pinnedStrategyId: "s1" });
    expect(next.gems).toEqual({ maxSupportTier: 3 });
    expect(next.character).toBe(prev.character);
    expect(next.prefs).toBe(prev.prefs);
  });

  it("replace makes progress equal the file, clears absent farm/gems, keeps history and prefs", () => {
    const prev = state({
      character: { snapshots: [{ key: "k" } as never] },
      farm: { loadouts: { f: { loadout: {} as never, baseline: null } } },
    });
    const incoming = parsed(
      file({
        checklist: { completedStepIds: ["z"], completedActionItemKeys: [] },
        atlas: { allocatedClusterIds: [], allocatedForkIds: [] },
        dashboard: { lastQuizAnswers: {} },
      }),
    );
    const next = applyImport(prev, incoming, "replace");
    expect(next.checklist).toEqual({ completedStepIds: ["z"], completedActionItemKeys: [] });
    expect(next.farm).toBeUndefined();
    expect(next.gems).toBeUndefined();
    expect(next.character).toBe(prev.character);
    expect(next.prefs).toBe(prev.prefs);
  });

  it("merges farm loadouts and validates their shape", () => {
    const prev = state({ farm: { loadouts: { a: { loadout: {} as never, baseline: null } }, current: "a" } });
    const data = parsed(file({ ...buildExport(state()).data, farm: { loadouts: { b: { loadout: {}, baseline: null } }, view: "full" } }));
    const next = applyImport(prev, data, "merge");
    expect(Object.keys(next.farm!.loadouts)).toEqual(["a", "b"]);
    expect(next.farm).toMatchObject({ current: "a", view: "full" });
    expect(parseImport(file({ ...buildExport(state()).data, farm: { loadouts: { b: "x" } } })).ok).toBe(false);
    expect(parseImport(file({ ...buildExport(state()).data, farm: { loadouts: {}, view: "huge" } })).ok).toBe(false);
  });
});
