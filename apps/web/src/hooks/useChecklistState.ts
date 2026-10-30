"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "./usePersistedState";
import { useChecklistActions } from "./useChecklistActions";
import { roadmapSteps } from "@/data/roadmap";
import { countIn } from "@/lib/progressCount";

export { actionItemKey } from "./useChecklistActions";

export function useChecklistState() {
  const { state, setState } = usePersistedState();
  const { completedStepIds, toggleStep, toggleActionItem, isActionItemComplete } =
    useChecklistActions();
  const {
    hideCompleted = false,
    highestTier = 0,
  } = state.checklist;

  const setHideCompleted = useCallback(
    (value: boolean) => {
      setState((prev) => ({
        ...prev,
        checklist: { ...prev.checklist, hideCompleted: value },
      }));
    },
    [setState]
  );

  const setHighestTier = useCallback(
    (tier: number) => {
      setState((prev) => ({
        ...prev,
        checklist: { ...prev.checklist, highestTier: tier },
      }));
    },
    [setState]
  );

  const isStepComplete = useCallback(
    (stepId: string) => completedStepIds.includes(stepId),
    [completedStepIds]
  );

  // Count only ids that still exist: a renamed or removed step must not keep
  // inflating the percentage from an old save.
  const completedCount = useMemo(
    () => countIn(roadmapSteps.map((s) => s.id), completedStepIds),
    [completedStepIds]
  );
  const totalSteps = roadmapSteps.length;
  const completionPercent = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

  return {
    toggleStep,
    toggleActionItem,
    isStepComplete,
    isActionItemComplete,
    completionPercent,
    completedCount,
    totalSteps,
    completedStepIds,
    hideCompleted,
    setHideCompleted,
    highestTier,
    setHighestTier,
  };
}
