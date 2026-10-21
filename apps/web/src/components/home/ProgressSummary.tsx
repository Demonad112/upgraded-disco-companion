"use client";

import { usePersistedState } from "@/hooks/usePersistedState";
import { ProgressBar } from "@/components/shared/ProgressBar";

const percent = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

/**
 * Totals come in as props (see `progressTotals`) rather than from the progress
 * hooks, which import the full guide data to count it.
 */
export function ProgressSummary({ stepIds, atlasTotal }: { stepIds: string[]; atlasTotal: number }) {
  const { state } = usePersistedState();
  const { completedStepIds } = state.checklist;
  const { allocatedClusterIds, allocatedForkIds } = state.atlas;
  // Count only ids that still exist, as the checklist does.
  const completionPercent = percent(
    stepIds.filter((id) => completedStepIds.includes(id)).length,
    stepIds.length
  );
  const allocationPercent = percent(
    allocatedClusterIds.length + allocatedForkIds.length,
    atlasTotal
  );
  const started = completionPercent > 0 || allocationPercent > 0;

  return (
    <div className="card h-full p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-base">Progress</h2>
        <span className="text-xs text-ink-mute">Saved in this browser</span>
      </div>
      <div className="grid gap-6">
        <ProgressBar percent={completionPercent} label="Checklist" />
        <ProgressBar percent={allocationPercent} label="Atlas allocation" />
      </div>
      {started ? null : (
        <p className="mt-5 text-sm text-ink-dim">Nothing ticked yet. Press “Mark done” on step 1 to start.</p>
      )}
    </div>
  );
}
