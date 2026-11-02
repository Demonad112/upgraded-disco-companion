"use client";

import { useState } from "react";
import { farmingStrategies } from "@/data/strategies";
import { farmData } from "@/data/farm";
import { presetFor } from "@/lib/farm/score";
import { LevelPill } from "@/components/shared/Pill";
import { Tag } from "@/components/shared/Tag";
import { Button } from "@/components/shared/controls";
import { QuizFilters, useSuggestedStrategies } from "@/components/dashboard/StrategyQuiz";
import { useStrategySelection } from "@/hooks/useStrategySelection";
import { CUSTOM_FARM } from "./ids";

/** Step 1: one tile per farm, plus Any farm / custom. "Help me choose" turns the quiz into a highlight. */
export function DecideStep({ onPick }: { onPick: (id: string) => void }) {
  const [help, setHelp] = useState(false);
  const suggested = useSuggestedStrategies();
  const { pinnedStrategyId } = useStrategySelection();
  const sorted = [...farmingStrategies].sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-dim">Pick the farm you are setting up. Tablets and the Waystone come next.</p>
        <Button size="sm" aria-expanded={help} aria-controls="farm-help" onClick={() => setHelp((v) => !v)}>
          Help me choose
        </Button>
      </div>
      {help ? (
        <div id="farm-help" className="flex flex-col gap-2">
          <QuizFilters />
          <p className="text-xs text-ink-mute" aria-live="polite">
            {suggested.size > 0 ? "Suggested farms are marked below." : "Answer any question to mark suggested farms."}
          </p>
        </div>
      ) : null}
      <ul className="farm-tiles">
        {sorted.map((s) => {
          const preset = presetFor(farmData, s.id);
          return (
            <li key={s.id}>
              <button type="button" className="farm-tile" data-suggested={suggested.has(s.id) || undefined} onClick={() => onPick(s.id)}>
                <span className="title-sentence text-[17px] text-ink">{s.name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {suggested.has(s.id) ? <span className="farm-mark">Suggested</span> : null}
                  {pinnedStrategyId === s.id ? <span className="farm-mark">★ Pinned</span> : null}
                  {s.mechanics.map((m) => (
                    <Tag key={m} mechanic={m} />
                  ))}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <LevelPill label="Invest" value={s.investment} />
                  <LevelPill label="Danger" value={s.risk} />
                </span>
                <span className="text-sm text-ink-dim">{s.expectedReturn}</span>
                <span className="text-xs text-ink-mute">
                  {preset.fallback ? "Scored with the general preset" : `Scored with the ${farmData.weights.presets[preset.id]!.name.toLowerCase()} preset`}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className="farm-tile" onClick={() => onPick(CUSTOM_FARM)}>
            <span className="title-sentence text-[17px] text-ink">Any farm / custom</span>
            <span className="text-sm text-ink-dim">Build tablets and a Waystone without a farm in mind; choose the scoring preset yourself.</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
