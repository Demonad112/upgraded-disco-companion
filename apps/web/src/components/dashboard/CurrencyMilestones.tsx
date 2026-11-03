import type { CurrencyMilestone } from "@/lib/types";
import { ProOnly } from "@/components/shared/ProToggle";
import { SourceFlag } from "@/components/shared/SourceFlag";

export function CurrencyMilestones({
  milestones,
}: {
  milestones: CurrencyMilestone[];
}) {
  return (
    <ul className="space-y-2">
      {milestones.map((milestone) => (
        <li
          key={milestone.id}
          data-surface="data" className="card p-3 transition-colors hover:border-line-strong"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">
              {milestone.label}
            </span>
            <ProOnly><SourceFlag source={milestone.source} /></ProOnly>
          </div>
          <p className="mt-1 text-xs text-ink-mute">{milestone.description}</p>
        </li>
      ))}
    </ul>
  );
}
