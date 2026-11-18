"use client";


/**
 * The Atlas guide, one section at a time: Path · Forks · Mechanics · Late game
 * · Traps. On a phone the old single column was ~7,800px of scrolling; a tab
 * bar keeps each part a screen or two long.
 *
 * Deep links still work: a hash naming a cluster, fork or trap node opens the
 * tab that holds it, then scrolls to it.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { atlasTrapNodes } from "@/data/trapNodes";
import type { Mechanic } from "@/lib/types";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { useAtlasMap, type AtlasTab } from "./AtlasMapContext";
import { ClusterNode } from "./ClusterNode";
import { MemoryForkBranch } from "./MemoryForkBranch";
import { MechanicSubTreeList } from "./MechanicSubTreeList";
import { TrapNodePanel } from "./TrapNodePanel";
import { Segmented, tabPanelProps } from "@/components/shared/controls";

type TabId = AtlasTab;

const TABS: { id: TabId; label: string }[] = [
  { id: "path", label: "Path" },
  { id: "forks", label: "Memory forks" },
  { id: "mechanics", label: "Mechanics" },
  { id: "late", label: "Late game" },
  { id: "traps", label: "Traps" },
];

const early = atlasClusters.filter((c) => c.group === "early-progression").sort((a, b) => a.order - b.order);
const general = atlasClusters.filter((c) => c.group === "general").sort((a, b) => a.order - b.order);

/** Which tab (and mechanic) holds an element id. */
function locate(id: string): { tab: TabId; mechanic?: Mechanic } | null {
  if (id === "atlas-trap-nodes" || atlasTrapNodes.some((t) => t.id === id)) return { tab: "traps" };
  if (memoryForks.some((f) => f.id === id)) return { tab: "forks" };
  const cluster = atlasClusters.find((c) => c.id === id);
  if (!cluster) return null;
  if (cluster.group === "early-progression") return { tab: "path" };
  if (cluster.group === "general") return { tab: "late" };
  return { tab: "mechanics", ...(cluster.mechanic ? { mechanic: cluster.mechanic } : {}) };
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-ink-dim">{children}</p>;
}

/** The tab row. The open tab lives in AtlasMapContext: the map numbers and frames whichever one is open. */
export function AtlasTabs() {
  const { isClusterAllocated, isForkAllocated } = useAtlasProgress();
  const { tab, setTab } = useAtlasMap();
  const count = (id: TabId): string | null => {
    if (id === "path") return `${early.filter((c) => isClusterAllocated(c.id)).length}/${early.length}`;
    if (id === "late") return `${general.filter((c) => isClusterAllocated(c.id)).length}/${general.length}`;
    if (id === "forks") return `${memoryForks.filter((f) => isForkAllocated(f.id)).length}/${memoryForks.length}`;
    if (id === "traps") return String(atlasTrapNodes.length);
    return null;
  };
  return (
    <Segmented
      kind="tabs"
      label="Atlas guide sections"
      options={TABS.map((t) => ({ value: t.id, label: t.label, count: count(t.id) || undefined }))}
      value={tab}
      onChange={setTab}
      scroll
      idBase="atlas-guide"
    />
  );
}

/** The open tab's list. Its scroller keeps the current row in view; deep-link hashes open the tab that holds them. */
export function AtlasGuidePanel() {
  const [mechanic, setMechanic] = useState<Mechanic | undefined>(undefined);
  const { tab, setTab, current, setListOpen } = useAtlasMap();
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll the list's own box (not the page) so the current row stays in view.
  const currentId = current?.id;
  useEffect(() => {
    const box = panelRef.current?.closest<HTMLElement>("[data-atlas-scroll]");
    const row = panelRef.current?.querySelector<HTMLElement>("[data-current]");
    if (!box || !row) return;
    const b = box.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
  }, [currentId, tab]);

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const found = id ? locate(id) : null;
      if (!found) return;
      setTab(found.tab);
      // Phones keep the list in a sheet: a deep link opens it so the target is on screen.
      if (window.matchMedia("(max-width: 720px)").matches) setListOpen(true);
      if (found.mechanic) setMechanic(found.mechanic);
      // After the tab renders, bring the target into view.
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [setTab, setListOpen]);

  return (
    <div ref={panelRef}>
      <div {...tabPanelProps("atlas-guide", tab)}>
        {tab === "path" ? (
          <>
            <Intro>
              Main-path allocation order, before and after the Arbiter of Ash and Divinity kills. The numbers are the
              order to take them in — tap <span className="text-accent">Map</span> to see where each one is.
            </Intro>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:gap-2">
              {early.map((c) => (
                <ClusterNode key={c.id} cluster={c} />
              ))}
            </ul>
          </>
        ) : null}

        {tab === "forks" ? (
          <>
            <Intro>
              Unlocked after the first Arbiter of Divinity kill. Take whichever of the three branches fits your farm first.
            </Intro>
            <div className="flex flex-col gap-2.5 md:flex-row">
              {memoryForks.map((fork) => (
                <MemoryForkBranch key={fork.id} fork={fork} />
              ))}
            </div>
          </>
        ) : null}

        {tab === "mechanics" ? (
          <>
            <Intro>Commit to one mechanic at a time — the payoff nodes sit deep in each sub-tree.</Intro>
            <Suspense fallback={null}>
              <MechanicSubTreeList clusters={atlasClusters} {...(mechanic ? { initial: mechanic } : {})} />
            </Suspense>
          </>
        ) : null}

        {tab === "late" ? (
          <>
            <Intro>Once the main path is done: where the rest of your points go.</Intro>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:gap-2">
              {general.map((c) => (
                <ClusterNode key={c.id} cluster={c} />
              ))}
            </ul>
          </>
        ) : null}

        {tab === "traps" ? <TrapNodePanel /> : null}
      </div>
    </div>
  );
}
