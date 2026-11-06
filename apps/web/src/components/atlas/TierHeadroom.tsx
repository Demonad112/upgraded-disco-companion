"use client";

import dynamic from "next/dynamic";
import { useLocalStore } from "@/lib/localStore";
import { recentCharacters } from "@/lib/recentCharacters";

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
  // The panel's own title is an h3 (it sits under "Defences" on the Character page), so it gets an h2 here.
  return (
    <section aria-labelledby="atlas-tiers-h" className="flex flex-col gap-3">
      <h2 id="atlas-tiers-h" className="section-title !mb-0">Which tier to run</h2>
      <Headroom key={level ?? "none"} defense={null} level={level} />
    </section>
  );
}
