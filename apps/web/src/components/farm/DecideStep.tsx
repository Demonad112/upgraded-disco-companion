"use client";

import { useEffect, useState } from "react";
import { farmingStrategies } from "@/data/strategies";
import { farmData } from "@/data/farm";
import { presetFor } from "@/lib/farm/score";
import { buildFit, type FitVerdict } from "@/lib/farm/fit";
import { useBuildLayers } from "@/hooks/useBuildLayers";
import { useFarm } from "@/hooks/useFarm";
import { LevelPill } from "@/components/shared/Pill";
import { Tag } from "@/components/shared/Tag";
import { Button } from "@/components/shared/controls";
import { QuizFilters, useSuggestedStrategies } from "@/components/dashboard/StrategyQuiz";
import { useStrategySelection } from "@/hooks/useStrategySelection";
import { CUSTOM_FARM } from "./ids";
import { QuickPicksTiles } from "./QuickPicksTiles";

/**
 * Step 1: Quick picks (QP1) first, then one tile per farm plus Any farm / custom. "Help me choose" turns the quiz into a
 * highlight; the Quick picks link opens it and scrolls to it.
 */
export function DecideStep({ onPick, onQuick }: { onPick: (id: string) => void; onQuick: (pickId: string) => void }) {
  const [help, setHelp] = useState(false);
  const [jump, setJump] = useState(0);
  useEffect(() => {
    if (!jump) return;
    const el = document.getElementById("farm-help");
    el?.scrollIntoView({ block: "start" });
    document.getElementById("farm-help-toggle")?.focus({ preventScroll: true });
  }, [jump]);
  const suggested = useSuggestedStrategies();
  const { pinnedStrategyId } = useStrategySelection();
  const sorted = [...farmingStrategies].sort((a, b) => a.rank - b.rank);
  const build = useBuildLayers();
  const { farm } = useFarm();
  const fitFor = (id: string): FitVerdict | null => {
    const saved = farm.loadouts[id];
    if (!build || !saved) return null;
    return buildFit(farmData, saved.loadout, farm.presets?.[id] ?? presetFor(farmData, id).id, build.layers).verdict;
  };

  return (
    <div className="flex flex-col gap-8">
      <QuickPicksTiles onPick={onQuick} onHelp={() => { setHelp(true); setJump((n) => n + 1); }} />
      <section aria-labelledby="farm-all-h" className="flex flex-col gap-4">
      <h3 id="farm-all-h" className="section-title !mb-0">All farms</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-dim">Pick the farm you are setting up. Tablets and the Waystone come next.</p>
        <Button id="farm-help-toggle" size="sm" aria-expanded={help} aria-controls="farm-help" onClick={() => setHelp((v) => !v)}>
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
          const fit = fitFor(s.id);
          return (
            <li key={s.id}>
              <button type="button" className="farm-tile" data-suggested={suggested.has(s.id) || undefined} onClick={() => onPick(s.id)}>
                <span className="title-sentence text-[17px] text-ink">{s.name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {suggested.has(s.id) ? <span className="farm-mark">Suggested</span> : null}
                  {pinnedStrategyId === s.id ? <span className="farm-mark">★ Pinned</span> : null}
                  {fit === "fits" || fit === "harder" ? (
                    <span className="farm-mark" data-fit={fit} title={`Your saved Waystone's danger mods, rated for ${build!.name}'s defence layers against the average build`}>
                      {fit === "fits" ? "Fits your build" : "Harder for your build"}
                    </span>
                  ) : null}
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
      </section>
    </div>
  );
}
