"use client";

import { useMemo } from "react";
import { farmingStrategies } from "@/data/strategies";
import { scoreStrategies, type QuizAnswers } from "@/lib/quiz";
import { useStrategySelection } from "@/hooks/useStrategySelection";
import type { InvestmentTier, RiskTier } from "@/lib/types";
import { Button, Select } from "@/components/shared/controls";

const BUDGET_OPTIONS: { value: InvestmentTier; label: string }[] = [
  { value: "low", label: "Low — a few Divines" },
  { value: "medium", label: "Medium — willing to invest tablets" },
  { value: "high", label: "High — mirror-tier ready" },
];

const TANKINESS_OPTIONS: { value: RiskTier; label: string }[] = [
  { value: "low", label: "Squishy — I die if I look at it wrong" },
  { value: "medium", label: "Moderate — can handle some risk" },
  { value: "high", label: "Tanky — bring on the delirium fog" },
];

const STAGE_OPTIONS = [
  { value: "league-start", label: "League start / early progression" },
  { value: "late-game", label: "Late-game / fully juiced" },
] as const;

/** The three quiz answers as stored; the top three strategies for them, or none until one is answered. */
export function useSuggestedStrategies(): Set<string> {
  const { quizAnswers } = useStrategySelection();
  const budget = quizAnswers.budget as InvestmentTier | undefined;
  const tankiness = quizAnswers.tankiness as RiskTier | undefined;
  const stage = quizAnswers.stage as QuizAnswers["stage"];
  return useMemo(() => {
    if (!budget && !tankiness && !stage) return new Set<string>();
    return new Set(scoreStrategies(farmingStrategies, { budget, tankiness, stage }).slice(0, 3).map((s) => s.id));
  }, [budget, tankiness, stage]);
}

/** "Help me choose": the quiz questions as filters. The farm tiles highlight the matches (FarmPlanner). */
export function QuizFilters() {
  const { quizAnswers, setQuizAnswer, resetQuiz } = useStrategySelection();
  const answered = Boolean(quizAnswers.budget || quizAnswers.tankiness || quizAnswers.stage);

  return (
    <div className="flex flex-col gap-4 border border-line bg-surface-sunken p-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <QuizSelect label="Budget" value={quizAnswers.budget} options={BUDGET_OPTIONS} onChange={(v) => setQuizAnswer("budget", v)} />
        <QuizSelect label="Build tankiness" value={quizAnswers.tankiness} options={TANKINESS_OPTIONS} onChange={(v) => setQuizAnswer("tankiness", v)} />
        <QuizSelect label="League stage" value={quizAnswers.stage} options={STAGE_OPTIONS} onChange={(v) => setQuizAnswer("stage", v)} />
      </div>
      {answered ? (
        <div className="-mt-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetQuiz}>
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function QuizSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-mute">{label}</span>
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Choose...
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
