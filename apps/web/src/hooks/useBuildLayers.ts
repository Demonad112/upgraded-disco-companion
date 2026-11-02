"use client";

import { historyFor } from "@poe2/core";
import { farmData } from "@/data/farm";
import { layersFromSnapshot } from "@/lib/farm/danger";
import { useLocalStore } from "@/lib/localStore";
import { recentCharacters } from "@/lib/recentCharacters";
import type { Layer } from "@/lib/farm/types";
import { usePersistedState } from "./usePersistedState";

/** Defence layers of the last imported character, or null when none is imported (or its figures are unreadable). */
export function useBuildLayers(): { name: string; layers: Layer[] } | null {
  const recents = useLocalStore(recentCharacters);
  const { state } = usePersistedState();
  const latest = recents[0];
  if (!latest) return null;
  const snap = historyFor(state.character.snapshots, latest.key).at(-1);
  const layers = layersFromSnapshot(farmData, snap);
  return layers ? { name: latest.name, layers } : null;
}
