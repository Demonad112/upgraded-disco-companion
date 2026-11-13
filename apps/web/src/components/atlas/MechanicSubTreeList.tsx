"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AtlasCluster, Mechanic } from "@/lib/types";
import { MECHANIC_LABELS } from "@/lib/constants";
import { Tag } from "@/components/shared/Tag";
import { ScrollFade } from "@/components/shared/ScrollFade";
import { RouteList } from "./RouteList";
import { IconPlate } from "@/components/icons";

const MECHANICS: Mechanic[] = ["abyss", "breach", "expedition", "ritual", "delirium"];

function isMechanic(value: string | null): value is Mechanic {
  return !!value && (MECHANICS as string[]).includes(value);
}

export function MechanicSubTreeList({ clusters, initial }: { clusters: AtlasCluster[]; initial?: Mechanic }) {
  const searchParams = useSearchParams();
  const mechanicParam = searchParams.get("mechanic");
  const [active, setActive] = useState<Mechanic>(
    isMechanic(mechanicParam) ? mechanicParam : initial ?? "abyss"
  );

  // Search results for a mechanic sub-tree cluster carry ?mechanic=<x> since
  // this tab picker only renders the active mechanic's clusters in the DOM —
  // re-sync whenever that param changes (covers navigating between two
  // different mechanic search results while already on this page). Adjusting
  // during render (React's recommended pattern) instead of an effect avoids
  // an extra commit/re-render cycle.
  const [prevMechanicParam, setPrevMechanicParam] = useState(mechanicParam);
  if (mechanicParam !== prevMechanicParam) {
    setPrevMechanicParam(mechanicParam);
    if (isMechanic(mechanicParam)) setActive(mechanicParam);
  }

  const activeNodes = clusters
    .filter((c) => c.group === "mechanic-subtree" && c.mechanic === active)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      <ScrollFade className="mb-3 flex gap-1.5 border border-line bg-surface-sunken p-1.5">
        {MECHANICS.map((mechanic) => (
          <button
            key={mechanic}
            onClick={() => setActive(mechanic)}
            aria-pressed={active === mechanic}
            className={`hit-area flex shrink-0 items-center gap-1.5 px-1 py-1 transition-all ${
              active === mechanic
                ? "bg-surface-sunken ring-1 ring-line"
                : "opacity-50 hover:opacity-80"
            }`}
          >
            <IconPlate name={mechanic} size={24} />
            <Tag mechanic={mechanic} />
          </button>
        ))}
      </ScrollFade>
      <p className="mb-3 text-xs leading-relaxed text-ink-mute">
        Priority order for {MECHANIC_LABELS[active]}. Don&apos;t run this mechanic&apos;s own tablets while doing its quest; they slow it down.
      </p>
      <RouteList clusters={activeNodes} />
    </div>
  );
}
