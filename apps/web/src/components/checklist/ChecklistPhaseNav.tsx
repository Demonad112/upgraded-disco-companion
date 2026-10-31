"use client";

import { ROADMAP_PHASE_LABELS } from "@/lib/constants";
import { phaseAnchor, stepsByPhase } from "@/lib/roadmapOrder";
import { useChecklistState } from "@/hooks/useChecklistState";
import { ScrollFade } from "@/components/shared/ScrollFade";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { Gauge } from "@/components/shared/Gauge";

/** Sticky phase rail: one scrollable row of chips (n/total + a small gauge each), with the hide-completed toggle beside it. */
export function ChecklistPhaseNav() {
  const { completedStepIds, hideCompleted, setHideCompleted } = useChecklistState();
  const done = new Set(completedStepIds);
  const firstOpen = stepsByPhase.find((g) => g.steps.some((s) => !done.has(s.id)))?.phase;
  const [reading] = useScrollSpy(stepsByPhase.map((g) => phaseAnchor(g.phase)));

  return (
    <nav
      aria-label="Checklist phases"
      data-surface="data"
      className="phase-rail sticky top-[var(--nav-h)] z-10 -mx-4 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 sm:mx-0 sm:border"
    >
      <ScrollFade className="phase-rail-scroll flex min-w-0 flex-1 items-center gap-1.5">
      {stepsByPhase.map(({ phase, steps }, i) => {
        const count = steps.filter((s) => done.has(s.id)).length;
        const complete = count === steps.length;
        const current = phase === firstOpen;
        const inView = reading === phaseAnchor(phase);
        return (
          <a
            key={phase}
            href={`#${phaseAnchor(phase)}`}
            title={ROADMAP_PHASE_LABELS[phase]}
            aria-current={inView ? "location" : undefined}
            data-phase-chip=""
            className={`phase-chip flex shrink-0 items-center gap-1.5 border px-2 text-xs transition-colors ${
              inView ? "ring-2 ring-[var(--accent)] " : ""}${complete
                ? "border-good/30 bg-good/10 text-ink"
                : current
                  ? "border-[var(--accent)]/50 bg-accent-soft text-ink"
                  : "border-line text-ink-mute hover:text-ink-dim"
            }`}
          >
            <span className="font-mono">{complete ? "✓" : i + 1}</span>
            <span className="hidden whitespace-nowrap md:inline">
              {(ROADMAP_PHASE_LABELS[phase] ?? phase).split(" — ")[0]}
            </span>
            <span className="font-mono text-[10px]">
              {count}/{steps.length}
            </span>
            {/* Decorative: the chip text already says n/total. Segments come from lib/gauge via <Gauge>. */}
            <span aria-hidden className="phase-chip-gauge">
              <Gauge done={count} total={steps.length} label={`${ROADMAP_PHASE_LABELS[phase] ?? phase} steps`} hideLabel size="sm" />
            </span>
          </a>
        );
      })}
      </ScrollFade>
      <label className="phase-rail-hide ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 px-1 text-xs text-ink-mute">
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={(e) => setHideCompleted(e.target.checked)}
        />
        Hide completed
      </label>
    </nav>
  );
}
