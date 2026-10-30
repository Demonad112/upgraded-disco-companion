"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "./usePersistedState";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { countIn } from "@/lib/progressCount";

export function useAtlasProgress() {
  const { state, setState } = usePersistedState();
  const { allocatedClusterIds, allocatedForkIds } = state.atlas;

  const toggleCluster = useCallback(
    (clusterId: string) => {
      setState((prev) => {
        const set = new Set(prev.atlas.allocatedClusterIds);
        if (set.has(clusterId)) set.delete(clusterId);
        else set.add(clusterId);
        return {
          ...prev,
          atlas: { ...prev.atlas, allocatedClusterIds: Array.from(set) },
        };
      });
    },
    [setState]
  );

  const toggleFork = useCallback(
    (forkId: string) => {
      setState((prev) => {
        const set = new Set(prev.atlas.allocatedForkIds);
        if (set.has(forkId)) set.delete(forkId);
        else set.add(forkId);
        return {
          ...prev,
          atlas: { ...prev.atlas, allocatedForkIds: Array.from(set) },
        };
      });
    },
    [setState]
  );

  const isClusterAllocated = useCallback(
    (clusterId: string) => allocatedClusterIds.includes(clusterId),
    [allocatedClusterIds]
  );

  const isForkAllocated = useCallback(
    (forkId: string) => allocatedForkIds.includes(forkId),
    [allocatedForkIds]
  );

  // Count only ids that still exist, as the checklist and home tool card do.
  const allocatedCount = useMemo(
    () =>
      countIn(
        [...atlasClusters, ...memoryForks].map((n) => n.id),
        [...allocatedClusterIds, ...allocatedForkIds]
      ),
    [allocatedClusterIds, allocatedForkIds]
  );
  const allocationTotal = atlasClusters.length + memoryForks.length;
  const allocationPercent =
    allocationTotal === 0 ? 0 : Math.round((allocatedCount / allocationTotal) * 100);

  return {
    toggleCluster,
    toggleFork,
    isClusterAllocated,
    isForkAllocated,
    allocationPercent,
    allocatedCount,
    allocationTotal,
  };
}
