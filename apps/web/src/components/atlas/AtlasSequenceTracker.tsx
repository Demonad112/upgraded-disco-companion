"use client";

import { Gauge } from "@/components/shared/Gauge";
import { Button } from "@/components/shared/controls";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { atlasClusters } from "@/data/atlasTree";
import { ShowOnTreeButton } from "./AtlasMapContext";

const path = atlasClusters.filter((c) => c.group === "early-progression").sort((a, b) => a.order - b.order);

/** "Up next" for the Atlas: the first main-path node not yet ticked, plus the overall gauge. */
export function AtlasSequenceTracker() {
  const { allocatedCount, allocationTotal, isClusterAllocated, toggleCluster } = useAtlasProgress();
  const next = path.find((c) => !isClusterAllocated(c.id));
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
        <div className="mt-3 flex items-center gap-4">
          <span className="waystone waystone-lg" data-state={next ? "next" : "taken"} aria-hidden>
            <span className="tabular">{next ? next.order : "✓"}</span>
          </span>
          <h2 id="atlas-next-title" className="title-sentence text-xl text-ink">
            {next ? next.name : "Every main-path node is ticked"}
          </h2>
        </div>
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
      <div className="atlas-next-gauge">
        <Gauge done={allocatedCount} total={allocationTotal} label="Tracked clusters allocated" />
      </div>
    </section>
  );
}
