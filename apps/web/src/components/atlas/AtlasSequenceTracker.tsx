"use client";

import { Gauge } from "@/components/shared/Gauge";
import { Button } from "@/components/shared/controls";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { nextStep, routeSteps } from "@/lib/atlasRoute";
import { atlasClusters } from "@/data/atlasTree";
import { ShowOnTreeButton } from "./AtlasMapContext";

const R = 50;
const C = 2 * Math.PI * R;
const path = routeSteps("path");

/** "Up next" for the Atlas: the first main-path node not yet ticked, plus the overall gauge. */
export function AtlasSequenceTracker() {
  const { allocatedCount, allocationTotal, isClusterAllocated, toggleCluster } = useAtlasProgress();
  // The map pulses this same step (atlas/AtlasTreeMap.tsx reads nextStep over the same route).
  const nextRoute = nextStep(path, (s) => isClusterAllocated(s.id));
  const next = nextRoute && atlasClusters.find((c) => c.id === nextRoute.id);
  const taken = path.filter((c) => isClusterAllocated(c.id)).length;

  return (
    <section aria-labelledby="atlas-next-title" data-surface="data" className="card atlas-next">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-accent uppercase">
            {next ? `Up next · path node ${next.order}` : "Main path done"}
          </span>
          <span className="text-xs text-ink-mute">
            {taken} of {path.length} path nodes taken
          </span>
        </div>
        <h2 id="atlas-next-title" className="title-sentence mt-2 text-xl text-ink">
          {next ? next.name : "Every main-path node is ticked"}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-ink-dim">
          {next ? next.description : "Spend the rest in Memory forks, a mechanic, or Late game."}
        </p>
        {next ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => toggleCluster(next.id)}>
              ✓ Mark taken
            </Button>
            <ShowOnTreeButton names={next.treeNodes} label={next.name} ariaLabel={`Show the next node, ${next.name}, on the Atlas tree`} />
          </div>
        ) : null}
      </div>
      <div className="atlas-next-gauge flex items-center gap-5">
        <div className="relic-ring" role="img" aria-label={`${taken} of ${path.length} path nodes taken`}>
          <svg viewBox="0 0 112 112" aria-hidden>
            <circle className="relic-ring-track" cx="56" cy="56" r={R} />
            <circle
              className="relic-ring-fill"
              cx="56"
              cy="56"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - taken / path.length)}
            />
          </svg>
          <span className="relic-ring-gem" aria-hidden>
            <span className="tabular">{next ? next.order : "✓"}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <Gauge done={allocatedCount} total={allocationTotal} label="Tracked clusters allocated" />
        </div>
      </div>
    </section>
  );
}
