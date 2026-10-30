"use client";

import { Gauge } from "@/components/shared/Gauge";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";

export function AtlasSequenceTracker() {
  const { allocatedCount, allocationTotal } = useAtlasProgress();

  return (
    <div data-surface="data" className="card p-4">
      <Gauge done={allocatedCount} total={allocationTotal} label="Tracked clusters allocated" />
    </div>
  );
}
