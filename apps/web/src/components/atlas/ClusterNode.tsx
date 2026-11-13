"use client";

import { useState } from "react";
import type { AtlasCluster } from "@/lib/types";
import { ProOnly } from "@/components/shared/ProToggle";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { Tag } from "@/components/ui";
import { ShowOnTreeButton } from "./AtlasMapContext";

/** Descriptions longer than this are clamped to two lines until expanded. */
const LONG = 120;

export function ClusterNode({ cluster }: { cluster: AtlasCluster }) {
  const { isClusterAllocated, toggleCluster } = useAtlasProgress();
  const allocated = isClusterAllocated(cluster.id);
  const [expanded, setExpanded] = useState(false);
  const long = cluster.description.length > LONG;

  return (
    <li
      id={cluster.id}
      data-reveal="node"
      data-surface="data"
      data-taken={allocated || undefined}
      className={`scroll-mt-40 border px-3 py-2.5 shadow-[var(--lift)] transition-colors max-sm:py-1.5 ${
        allocated ? "border-good/40" : "border-line hover:border-line-strong"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <label className="-my-2.5 max-sm:-my-1.5 -ml-3 flex min-h-(--tap-min) min-w-(--tap-min) shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={allocated}
            onChange={() => toggleCluster(cluster.id)}
            aria-label={`Allocated ${cluster.name}`}
            className="size-4"
          />
        </label>
        <span
          className={`tabular mt-px flex size-5 shrink-0 items-center justify-center border text-[length:var(--fs-micro)] ${
            allocated ? "border-good/40 text-good" : "border-accent-line text-accent"
          }`}
        >
          {cluster.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-sm font-medium ${allocated ? "text-ink-mute line-through" : "text-ink"}`}>
              {cluster.name}
            </span>
            {cluster.killGated ? <Tag>kill-gated</Tag> : null}
            <ProOnly><SourceFlag source={cluster.source} /></ProOnly>
          </div>
          <p className={`mt-1 text-xs leading-relaxed text-ink-dim ${expanded ? "" : `max-sm:hidden ${long ? "line-clamp-2" : ""}`}`}>
            {cluster.description}
          </p>
          {/* Phones: every row's description is one tap away (compact rows); from sm up only the long ones clamp. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={`hit-area mt-0.5 !min-h-0 -mb-1 text-[12px] text-accent hover:underline ${long ? "" : "sm:hidden"}`}
          >
            {expanded ? "Less" : "More"}
          </button>
        </div>
        <ShowOnTreeButton names={cluster.treeNodes} label={cluster.name} />
      </div>
    </li>
  );
}
