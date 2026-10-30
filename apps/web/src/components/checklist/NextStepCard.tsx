"use client";

import Link from "next/link";
import { CircleToggle } from "@/components/shared/CircleToggle";
import { Button } from "@/components/shared/controls";
import type { StepSummary } from "@/lib/stepSummary";
import { actionItemKey, useChecklistActions } from "@/hooks/useChecklistActions";

/**
 * "What do I do now?" — the first unticked step, with its remaining sub-steps
 * checkable in place. On the checklist it links down to the step; elsewhere it
 * links to the checklist.
 */
export function NextStepCard({
  steps,
  onChecklistPage = false,
}: {
  /** Every step in play order, from `stepSummaries()`. */
  steps: StepSummary[];
  onChecklistPage?: boolean;
}) {
  const { completedStepIds, toggleStep, isActionItemComplete, toggleActionItem } =
    useChecklistActions();
  const done = new Set(completedStepIds);
  const step = steps.find((s) => !done.has(s.id)) ?? null;
  const doneCount = steps.filter((s) => done.has(s.id)).length;

  // Tinted on the checklist, where it is a data block in the linked flow
  // (U2-5); clear glass on home, like the other home cards.
  const surface = onChecklistPage ? "data" : undefined;

  if (!step) {
    return (
      <div data-surface={surface} className="card h-full p-6">
        <h2 className="font-semibold text-ink">Checklist complete</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Every step is ticked off. Pick a farm on the Farming Dashboard and keep
          your Atlas allocation up to date.
        </p>
      </div>
    );
  }

  const position = steps.indexOf(step) + 1;
  const { gates, avoid } = step;
  const href = `#${step.id}`;

  return (
    <section
      aria-labelledby="next-step-title"
      data-surface={surface}
      className="card relative h-full overflow-hidden p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">
          Up next · {step.phaseLabel}
        </span>
        <span className="text-xs text-ink-mute">
          Step {position} of {steps.length} · {doneCount} done
        </span>
      </div>

      <h2 id="next-step-title" className="title-sentence mt-2 text-xl text-ink">
        {step.title}
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{step.description}</p>

      {step.actionItems.length > 0 && (
        <ul className="mt-3 space-y-1">
          {step.actionItems.map((item, index) => {
            const key = actionItemKey(step.id, index);
            const done = isActionItemComplete(key);
            return (
              <li key={key}>
                <CircleToggle done={done} onToggle={() => toggleActionItem(key)} className="text-sm">
                  <span className={done ? "text-ink-mute line-through" : "text-ink-dim"}>{item}</span>
                </CircleToggle>
              </li>
            );
          })}
        </ul>
      )}

      {(gates.length > 0 || avoid.length > 0) && (
        <ul className="mt-3 space-y-1 text-xs">
          {gates.map((g) => (
            <li key={g.id} className="text-[var(--warn)]">
              <span className="font-semibold">
                {g.hard ? "Gate:" : "Guideline:"}
              </span>{" "}
              {g.label}
            </li>
          ))}
          {avoid.map((m) => (
            <li key={m.id} className="text-[var(--danger)]">
              <span className="font-semibold">Avoid:</span> {m.title}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => toggleStep(step.id)}>
          ✓ Mark done
        </Button>
        {onChecklistPage ? (
          <Link
            href={href}
            className="btn btn-secondary"
          >
            Jump to step →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
