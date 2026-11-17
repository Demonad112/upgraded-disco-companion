/**
 * Progress export / import (RV1-6). Pure: no window, no DOM, so it is testable alone.
 *
 * What travels: checklist, Atlas, dashboard, Farm Planner and gem-tier progress.
 * What does not: character history (its keys are `account/name` handles), display
 * prefs, caches, banner dismissals and every UI/fx setting. The file holds no
 * account, name, key or contact detail.
 */
import type { FarmPersisted, PersistedState } from "./types";

export const EXPORT_APP = "poe2-endgame-companion";
export const EXPORT_VERSION = 1;
/** A real export is a few KB; 1 MB is generous and bounds what the parser touches. */
export const MAX_IMPORT_BYTES = 1_000_000;
const MAX_ITEMS = 5_000;
const MAX_STRING = 200;

export type ProgressData = Pick<PersistedState, "checklist" | "atlas" | "dashboard" | "farm" | "gems">;

export interface ProgressExport {
  app: typeof EXPORT_APP;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  data: ProgressData;
}

export type ImportMode = "merge" | "replace";
export type ParseResult = { ok: true; data: ProgressData } | { ok: false; error: string };

export function buildExport(state: PersistedState, now: Date = new Date()): ProgressExport {
  const { checklist, atlas, dashboard, farm, gems } = state;
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: { checklist, atlas, dashboard, ...(farm ? { farm } : {}), ...(gems ? { gems } : {}) },
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `poe2-companion-progress-${now.toISOString().slice(0, 10)}.json`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_STRING;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.length <= MAX_ITEMS && v.every(isStr);
const isStrMap = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.keys(v).length <= MAX_ITEMS && Object.entries(v).every(([k, x]) => isStr(k) && isStr(x));
const onlyKeys = (o: Record<string, unknown>, allowed: readonly string[]) => Object.keys(o).every((k) => allowed.includes(k));

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg);
};

function checklist(v: unknown): PersistedState["checklist"] {
  if (!isRecord(v) || !onlyKeys(v, ["completedStepIds", "completedActionItemKeys", "hideCompleted", "highestTier"]))
    return fail("Checklist section is not recognised.");
  if (!isStrArray(v.completedStepIds) || !isStrArray(v.completedActionItemKeys)) return fail("Checklist lists are invalid.");
  if (v.hideCompleted !== undefined && typeof v.hideCompleted !== "boolean") return fail("Checklist setting is invalid.");
  if (v.highestTier !== undefined && !(Number.isInteger(v.highestTier) && (v.highestTier as number) >= 0 && (v.highestTier as number) <= 100))
    return fail("Waystone tier is invalid.");
  return {
    completedStepIds: v.completedStepIds,
    completedActionItemKeys: v.completedActionItemKeys,
    ...(v.hideCompleted !== undefined ? { hideCompleted: v.hideCompleted as boolean } : {}),
    ...(v.highestTier !== undefined ? { highestTier: v.highestTier as number } : {}),
  };
}

function atlas(v: unknown): PersistedState["atlas"] {
  if (!isRecord(v) || !onlyKeys(v, ["allocatedClusterIds", "allocatedForkIds"])) return fail("Atlas section is not recognised.");
  if (!isStrArray(v.allocatedClusterIds) || !isStrArray(v.allocatedForkIds)) return fail("Atlas lists are invalid.");
  return { allocatedClusterIds: v.allocatedClusterIds, allocatedForkIds: v.allocatedForkIds };
}

function dashboard(v: unknown): PersistedState["dashboard"] {
  if (!isRecord(v) || !onlyKeys(v, ["lastQuizAnswers", "pinnedStrategyId"])) return fail("Dashboard section is not recognised.");
  if (!isStrMap(v.lastQuizAnswers)) return fail("Quiz answers are invalid.");
  if (v.pinnedStrategyId !== undefined && !isStr(v.pinnedStrategyId)) return fail("Pinned strategy is invalid.");
  return {
    lastQuizAnswers: v.lastQuizAnswers,
    ...(v.pinnedStrategyId !== undefined ? { pinnedStrategyId: v.pinnedStrategyId as string } : {}),
  };
}

function gems(v: unknown): NonNullable<PersistedState["gems"]> {
  if (!isRecord(v) || !onlyKeys(v, ["maxSupportTier"])) return fail("Gems section is not recognised.");
  const t = v.maxSupportTier;
  if (t !== undefined && t !== null && !(Number.isInteger(t) && (t as number) >= 0 && (t as number) <= 100))
    return fail("Support gem tier is invalid.");
  return t === undefined ? {} : { maxSupportTier: t as number | null };
}

function farm(v: unknown): FarmPersisted {
  if (!isRecord(v) || !onlyKeys(v, ["loadouts", "current", "risk", "buildAware", "presets", "view"]))
    return fail("Farm section is not recognised.");
  const { loadouts } = v;
  if (!isRecord(loadouts) || Object.keys(loadouts).length > MAX_ITEMS) return fail("Farm loadouts are invalid.");
  for (const [k, e] of Object.entries(loadouts)) {
    if (!isStr(k) || !isRecord(e) || !isRecord(e.loadout) || !(e.baseline === null || isRecord(e.baseline)))
      return fail("A farm loadout is invalid.");
  }
  if (v.current !== undefined && !isStr(v.current)) return fail("Farm selection is invalid.");
  if (v.risk !== undefined && !isStr(v.risk)) return fail("Farm risk is invalid.");
  if (v.buildAware !== undefined && typeof v.buildAware !== "boolean") return fail("Farm setting is invalid.");
  if (v.presets !== undefined && !isStrMap(v.presets)) return fail("Farm presets are invalid.");
  if (v.view !== undefined && v.view !== "quick" && v.view !== "full") return fail("Farm view is invalid.");
  return v as unknown as FarmPersisted;
}

/**
 * Validate an export file's text. Strict: wrong app or version, a section or field
 * this app does not own, a wrong type or an oversize file is rejected whole, so
 * nothing is ever half-applied.
 */
export function parseImport(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "File is too large to be a progress export." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  try {
    if (!isRecord(raw) || !onlyKeys(raw, ["app", "version", "exportedAt", "data"]) || raw.app !== EXPORT_APP)
      return fail("This is not a progress file from this site.");
    if (raw.version !== EXPORT_VERSION) return fail(`Unsupported file version (${String(raw.version)}); this site reads version ${EXPORT_VERSION}.`);
    const d = raw.data;
    if (!isRecord(d) || !onlyKeys(d, ["checklist", "atlas", "dashboard", "farm", "gems"])) return fail("File has sections this site does not know.");
    if (!d.checklist || !d.atlas || !d.dashboard) return fail("File is missing checklist, Atlas or dashboard progress.");
    return {
      ok: true,
      data: {
        checklist: checklist(d.checklist),
        atlas: atlas(d.atlas),
        dashboard: dashboard(d.dashboard),
        ...(d.farm !== undefined ? { farm: farm(d.farm) } : {}),
        ...(d.gems !== undefined ? { gems: gems(d.gems) } : {}),
      },
    };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/**
 * Apply validated data. `replace` makes the saved progress equal the file (farm and
 * gems the file lacks are cleared); `merge` keeps everything already ticked and adds
 * the file's, with the file winning single-value settings. Character history and
 * display prefs are never touched.
 */
export function applyImport(prev: PersistedState, data: ProgressData, mode: ImportMode): PersistedState {
  if (mode === "replace") {
    const { farm: _f, gems: _g, ...rest } = prev;
    void _f;
    void _g;
    return {
      ...rest,
      checklist: data.checklist,
      atlas: data.atlas,
      dashboard: data.dashboard,
      ...(data.farm ? { farm: data.farm } : {}),
      ...(data.gems ? { gems: data.gems } : {}),
    };
  }
  const c = data.checklist;
  const highestTier = Math.max(prev.checklist.highestTier ?? 0, c.highestTier ?? 0);
  return {
    ...prev,
    checklist: {
      ...prev.checklist,
      completedStepIds: union(prev.checklist.completedStepIds, c.completedStepIds),
      completedActionItemKeys: union(prev.checklist.completedActionItemKeys, c.completedActionItemKeys),
      ...(c.hideCompleted !== undefined ? { hideCompleted: c.hideCompleted } : {}),
      ...(highestTier > 0 ? { highestTier } : {}),
    },
    atlas: {
      allocatedClusterIds: union(prev.atlas.allocatedClusterIds, data.atlas.allocatedClusterIds),
      allocatedForkIds: union(prev.atlas.allocatedForkIds, data.atlas.allocatedForkIds),
    },
    dashboard: {
      lastQuizAnswers: { ...prev.dashboard.lastQuizAnswers, ...data.dashboard.lastQuizAnswers },
      ...((data.dashboard.pinnedStrategyId ?? prev.dashboard.pinnedStrategyId) !== undefined
        ? { pinnedStrategyId: (data.dashboard.pinnedStrategyId ?? prev.dashboard.pinnedStrategyId) as string }
        : {}),
    },
    ...(data.farm || prev.farm
      ? { farm: { ...prev.farm, ...data.farm, loadouts: { ...prev.farm?.loadouts, ...data.farm?.loadouts } } as FarmPersisted }
      : {}),
    ...(data.gems || prev.gems ? { gems: { ...prev.gems, ...data.gems } } : {}),
  };
}
