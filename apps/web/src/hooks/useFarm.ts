"use client";

import { useCallback } from "react";
import { usePersistedState } from "./usePersistedState";
import type { FarmPersisted } from "@/lib/types";
import type { Loadout, RiskKey, Score } from "@/lib/farm/types";

const EMPTY: FarmPersisted = { loadouts: {} };

/** A saved loadout is only trusted if it has the shape the page reads; anything else falls back to the starter. */
export function isLoadout(v: unknown): v is Loadout {
  const l = v as Loadout | null;
  return (
    !!l && typeof l === "object" && Array.isArray(l.tablets) && !!l.waystone && Array.isArray(l.waystone.prefixes) &&
    Array.isArray(l.waystone.suffixes) && !!l.options && Array.isArray(l.options.effects) &&
    l.tablets.every((t) => t && Array.isArray(t.prefixes) && Array.isArray(t.suffixes) && typeof t.type === "string")
  );
}

export function useFarm() {
  const { state, setState } = usePersistedState();
  const farm = state.farm ?? EMPTY;

  const patch = useCallback(
    (fn: (f: FarmPersisted) => FarmPersisted) => setState((prev) => ({ ...prev, farm: fn(prev.farm ?? EMPTY) })),
    [setState],
  );
  const saveLoadout = useCallback(
    (id: string, loadout: Loadout, baseline: Score | null) => patch((f) => ({ ...f, loadouts: { ...f.loadouts, [id]: { loadout, baseline } } })),
    [patch],
  );
  const setCurrent = useCallback((id: string | undefined) => patch((f) => ({ ...f, current: id })), [patch]);
  const setRisk = useCallback((risk: RiskKey) => patch((f) => ({ ...f, risk })), [patch]);
  const setBuildAware = useCallback((buildAware: boolean) => patch((f) => ({ ...f, buildAware })), [patch]);
  const setPreset = useCallback(
    (id: string, preset: string | undefined) =>
      patch((f) => {
        const presets = { ...f.presets };
        if (preset) presets[id] = preset;
        else delete presets[id];
        return { ...f, presets };
      }),
    [patch],
  );

  return { farm, saveLoadout, setCurrent, setRisk, setBuildAware, setPreset };
}
