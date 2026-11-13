"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/shared/controls";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { ShowOnTreeButton } from "./AtlasMapContext";

const path = atlasClusters.filter((c) => c.group === "early-progression").sort((a, b) => a.order - b.order);
const late = atlasClusters.filter((c) => c.group === "general");

/** "Up next" for the Atlas: the first main-path node not yet ticked, plus the overall gauge. */
export function AtlasSequenceTracker() {
  const { allocatedCount, allocationTotal, isClusterAllocated, isForkAllocated, toggleCluster } = useAtlasProgress();
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
      <div className="atlas-next-gauge">
        <ul className="ledger-meters" aria-label="Atlas nodes taken, by section">
          {[
            { label: "Path", done: taken, total: path.length },
            { label: "Memory forks", done: memoryForks.filter((f) => isForkAllocated(f.id)).length, total: memoryForks.length },
            { label: "Late game", done: late.filter((c) => isClusterAllocated(c.id)).length, total: late.length },
            { label: "All tracked", done: allocatedCount, total: allocationTotal },
          ].map((m) => (
            <li key={m.label}>
              <span className="text-xs text-ink-dim">{m.label}</span>
              <span className="ledger-num text-sm">
                {m.done}
                <small> / {m.total}</small>
              </span>
              <span className="meter" style={{ "--v": m.total ? m.done / m.total : 0 } as CSSProperties} aria-hidden>
                <i />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
