import type { Metadata } from "next";
import { AtlasSequenceTracker } from "@/components/atlas/AtlasSequenceTracker";
import { WarningPanel } from "@/components/shared/WarningPanel";
import { BiomePanel } from "@/components/atlas/BiomePanel";
import { RegexPanel } from "@/components/atlas/RegexPanel";
import { TierHeadroom } from "@/components/atlas/TierHeadroom";
import { PageHeader } from "@/components/layout/PageHeader";
import { AtlasMapProvider } from "@/components/atlas/AtlasMapContext";
import { AtlasTreeMap } from "@/components/atlas/AtlasTreeMap";
import { AtlasMapSheet, OpenMapButton } from "@/components/atlas/AtlasMapSheet";
import { AtlasGuideTabs } from "@/components/atlas/AtlasGuideTabs";
import { commonMistakes } from "@/data/commonMistakes";

export const metadata: Metadata = {
  title: "Atlas Tree Planner — PoE2 Endgame Companion",
};

export default function AtlasPage() {
  return (
    <AtlasMapProvider>
      <div className="flex flex-col gap-4 sm:gap-5">
        <PageHeader
          tool="atlas"
          eyebrow="Atlas passive tree"
          title="Atlas Tree"
          accent="Planner"
          description="Which Atlas nodes to take, in order. Tap Map to find one on the tree."
        />

        <OpenMapButton />

        <AtlasSequenceTracker />

        {/* Phones keep map-then-guide. From lg the guide takes the left column
            and the map sticks in the right one, so "Map" on any row frames the
            node without scrolling back up to find the tree. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <AtlasMapSheet>
            <AtlasTreeMap />
          </AtlasMapSheet>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <WarningPanel mistakes={commonMistakes} stage="atlas" title="Atlas mistakes" />

            <AtlasGuideTabs />

            <BiomePanel />

            <RegexPanel />

            <TierHeadroom />
          </div>
        </div>
      </div>
    </AtlasMapProvider>
  );
}
