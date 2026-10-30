"use client";

import { Gauge } from "@/components/shared/Gauge";
import { useChecklistState } from "@/hooks/useChecklistState";

export function ChecklistProgressHeader() {
  const { completedCount, totalSteps } = useChecklistState();

  return (
    <div data-surface="data" className="rounded-lg card p-4">
      <Gauge done={completedCount} total={totalSteps} label="Overall progression" />
    </div>
  );
}
