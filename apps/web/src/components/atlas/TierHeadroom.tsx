"use client";

import dynamic from "next/dynamic";
import { useLocalStore } from "@/lib/localStore";
import { recentCharacters } from "@/lib/recentCharacters";
import { Accordion } from "@/components/shared/Accordion";

const Headroom = dynamic(() => import("@/components/Headroom").then((m) => m.Headroom), {
  ssr: false,
  loading: () => <section data-surface="data" className="card h-48 animate-pulse" aria-label="Loading tier planner" />,
});

/**
 * R38: the survivability-by-tier panel in reference mode (level only, no import). It starts from the last imported
 * character's level when there is one; risk still counts the level gap only, because no defences are read here.
 */
export function TierHeadroom() {
  const recents = useLocalStore(recentCharacters);
  const level = recents[0]?.level ?? null;
  // One tap away on every width (PX7): the panel is 1,000 px tall on a phone. Its own title is an h3.
  return (
    <Accordion id="atlas-tiers" title="Which tier to run" summary="Survivability by tier, from your level." lazy>
      <div className="p-3">
        <Headroom key={level ?? "none"} defense={null} level={level} />
      </div>
    </Accordion>
  );
}
