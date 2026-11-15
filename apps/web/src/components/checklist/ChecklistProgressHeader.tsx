"use client";

import { Gauge } from "@/components/shared/Gauge";
import { ProToggle } from "@/components/shared/ProToggle";
import { useChecklistState } from "@/hooks/useChecklistState";

export function ChecklistProgressHeader() {
  const { completedCount, totalSteps } = useChecklistState();

  return (
    <div data-surface="data" className="card p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="label-field">Overall progression</span>
        <ProToggle />
      </div>
      <Gauge done={completedCount} total={totalSteps} label="Overall progression" hideLabel />
    </div>
  );
}
