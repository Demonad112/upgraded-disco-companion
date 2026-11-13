"use client";

import type { MemoryFork } from "@/lib/types";
import { ProOnly } from "@/components/shared/ProToggle";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { ShowOnTreeButton } from "./AtlasMapContext";

export function MemoryForkBranch({ fork }: { fork: MemoryFork }) {
  const { isForkAllocated, toggleFork } = useAtlasProgress();
  const allocated = isForkAllocated(fork.id);

  return (
    <div
      id={fork.id}
      data-reveal="branch"
      data-surface="data"
      className={`card relative scroll-mt-40 flex-1 !p-3.5 transition-colors ${
        allocated ? "!border-good/40" : "hover:border-line-strong"
      }`}
    >
      {/* The branch: a gold stroke along the top edge that draws in as the fork scrolls into view (styles/motion.css). */}
      <svg aria-hidden className="reveal-stroke" viewBox="0 0 100 2" preserveAspectRatio="none">
        <path d="M0 1H100" pathLength="1" />
      </svg>
      <div className="flex items-center gap-2">
        <label className="flex size-6 shrink-0 cursor-pointer items-center justify-center pointer-coarse:size-(--tap-min)">
          <input
            type="checkbox"
            checked={allocated}
            onChange={() => toggleFork(fork.id)}
            aria-label={`Allocated ${fork.title}`}
            className="size-4"
          />
        </label>
        <h2 className="title-sentence text-base text-ink">{fork.title}</h2>
        <ProOnly><SourceFlag source={fork.source} /></ProOnly>
        <span className="ml-auto">
          <ShowOnTreeButton names={fork.treeNodes} label={fork.title} />
        </span>
      </div>
      <ul className="mt-2 ml-6 list-disc space-y-0.5 text-sm text-ink-dim marker:text-accent">
        {fork.nodes.map((node) => (
          <li key={node}>{node}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-mute">{fork.description}</p>
    </div>
  );
}
