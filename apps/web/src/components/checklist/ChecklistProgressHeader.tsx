"use client";

import { Gauge } from "@/components/shared/Gauge";
import { ProToggle } from "@/components/shared/ProToggle";
import { useChecklistState } from "@/hooks/useChecklistState";

export function ChecklistProgressHeader() {
  const { completedCount, totalSteps } = useChecklistState();

  return (
    <div data-surface="data" className="card p-4">
      <Gauge done={completedCount} total={totalSteps} label="Overall progression" />
      <div className="mt-3 flex justify-end">
        <ProToggle />
      </div>
    </div>
  );
}
