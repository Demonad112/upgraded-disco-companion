import type { Metadata } from "next";
import { pageMeta } from '@/lib/pageMeta'
import { WarningPanel } from "@/components/shared/WarningPanel";
import { BiomePanel } from "@/components/atlas/BiomePanel";
import { RegexPanel } from "@/components/atlas/RegexPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { AtlasMapProvider } from "@/components/atlas/AtlasMapContext";
import { AtlasStage } from "@/components/atlas/AtlasStage";
import { commonMistakes } from "@/data/commonMistakes";

export const metadata: Metadata = pageMeta('Atlas Tree Planner', 'Which Atlas nodes to take, in order, with the route drawn on the tree.')

export default function AtlasPage() {
  return (
    <AtlasMapProvider>
      <div className="flex flex-col gap-4 sm:gap-5">
        <PageHeader
          tool="atlas"
          eyebrow="Atlas passive tree"
          title="Atlas Tree"
          accent="Planner"
          description="Which Atlas nodes to take, in order. Tick one and the map moves to the next."
        />

        <AtlasStage
          aside={
            <>
              <WarningPanel mistakes={commonMistakes} stage="atlas" title="Atlas mistakes" />
              <BiomePanel />
              <RegexPanel />
            </>
          }
        />
      </div>
    </AtlasMapProvider>
  );
}
