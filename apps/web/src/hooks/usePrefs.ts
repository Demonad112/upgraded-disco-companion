"use client";

import { useCallback } from "react";
import { usePersistedState } from "./usePersistedState";
import { getPrefs } from "@/lib/storage";
import type { HomeStart } from "@/lib/types";

/** Display preferences (home start, Pro detail). Getters and setters only; no UI. */
export function usePrefs() {
  const { state, setState } = usePersistedState();
  const { homeStart, proDetail } = getPrefs(state);

  const setHomeStart = useCallback(
    (value: HomeStart | null) =>
      setState((prev) => ({ ...prev, prefs: { ...prev.prefs, homeStart: value } })),
    [setState]
  );
  const setProDetail = useCallback(
    (value: boolean) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, proDetail: value } })),
    [setState]
  );

  return { homeStart, proDetail, setHomeStart, setProDetail };
}
