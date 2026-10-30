"use client";

import { usePersistedState } from "@/hooks/usePersistedState";
import { Gauge } from "@/components/shared/Gauge";
import { countIn } from "@/lib/progressCount";

/**
 * Totals come in as props (see `progressTotals`) rather than from the progress
 * hooks, which import the full guide data to count it.
 */
export function ProgressSummary({ stepIds, atlasIds }: { stepIds: string[]; atlasIds: string[] }) {
  const { state } = usePersistedState();
  const { completedStepIds } = state.checklist;
  const { allocatedClusterIds, allocatedForkIds } = state.atlas;
  const stepsDone = countIn(stepIds, completedStepIds);
  const atlasDone = countIn(atlasIds, [...allocatedClusterIds, ...allocatedForkIds]);
  const started = stepsDone > 0 || atlasDone > 0;

  return (
    <div className="card h-full p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-base">Progress</h2>
        <span className="text-xs text-ink-mute">Saved in this browser</span>
      </div>
      <div className="grid gap-6">
        <Gauge done={stepsDone} total={stepIds.length} label="Checklist" />
        <Gauge done={atlasDone} total={atlasIds.length} label="Atlas allocation" />
      </div>
      {started ? null : (
        <p className="mt-5 text-sm text-ink-dim">Nothing ticked yet. Press “Mark done” on step 1 to start.</p>
      )}
    </div>
  );
}
