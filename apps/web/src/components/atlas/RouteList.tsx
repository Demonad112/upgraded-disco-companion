"use client";

import type { AtlasCluster } from "@/lib/types";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { ClusterNode } from "./ClusterNode";

/** An ordered set of Atlas nodes on one thread (styles/waystone.css). The first unticked node is "next"; the thread is gold up to it. */
export function RouteList({ clusters }: { clusters: AtlasCluster[] }) {
  const { isClusterAllocated } = useAtlasProgress();
  const nextIndex = clusters.findIndex((c) => !isClusterAllocated(c.id));
  const stop = nextIndex === -1 ? clusters.length : nextIndex;
  return (
    <ul data-links className="route">
      {clusters.map((c, i) => (
        <ClusterNode key={c.id} cluster={c} step={{ next: i === nextIndex, walked: i < stop && i < clusters.length - 1 }} />
      ))}
    </ul>
  );
}
