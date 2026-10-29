"use client";

import { usePersistedState } from "@/hooks/usePersistedState";
import { recentCharacters } from "@/lib/recentCharacters";
import { useLocalStore } from "@/lib/localStore";

/**
 * One line of live state under a home tool card, read from what this browser
 * saved. Totals and names come in as props (counted from the guide data by the
 * server page), so the guide data stays out of the home bundle.
 */
export type ToolStatusProps =
  | { tool: "checklist"; stepIds: string[] }
  | { tool: "atlas"; atlasIds: string[] }
  | { tool: "dashboard"; strategyNames: Record<string, string> }
  | { tool: "character" };

// Count only ids that still exist, as the checklist and Progress card do.
const countIn = (ids: string[], saved: string[]) => ids.filter((id) => saved.includes(id)).length;

function useStatus(props: ToolStatusProps): { text: string; active: boolean } {
  const { state } = usePersistedState();
  const recents = useLocalStore(recentCharacters);

  switch (props.tool) {
    case "checklist": {
      const done = countIn(props.stepIds, state.checklist.completedStepIds);
      return { text: `${done} / ${props.stepIds.length} steps`, active: done > 0 };
    }
    case "atlas": {
      const { allocatedClusterIds, allocatedForkIds } = state.atlas;
      const done = countIn(props.atlasIds, [...allocatedClusterIds, ...allocatedForkIds]);
      return { text: `${done} / ${props.atlasIds.length} Atlas nodes`, active: done > 0 };
    }
    case "dashboard": {
      const id = state.dashboard.pinnedStrategyId;
      const name = id ? props.strategyNames[id] : undefined;
      return name ? { text: `Pinned: ${name}`, active: true } : { text: "Pick a strategy", active: false };
    }
    case "character": {
      const last = recents[0];
      if (!last) return { text: "No character imported yet", active: false };
      // The grade at import when it was kept; rows saved before that show the level.
      const detail = last.grade ? ` · ${last.grade}` : last.level === null ? "" : ` · Lv\u00a0${last.level}`;
      return { text: `Last import: ${last.name}${detail}`, active: true };
    }
  }
}

export function ToolStatus(props: ToolStatusProps) {
  const { text, active } = useStatus(props);
  return (
    <p
      className={`tabular mt-auto flex min-w-0 items-baseline gap-2 border-t border-line pt-3 text-xs ${
        active ? "text-accent" : "text-ink-mute"
      }`}
      data-tool-status={props.tool}
    >
      <span aria-hidden className={`inline-block size-1.5 shrink-0 -translate-y-px rotate-45 border border-accent ${active ? "bg-accent" : ""}`} />
      <span className="min-w-0 break-words">{text}</span>
    </p>
  );
}
