import type { Metadata } from "next";
import { commonMistakes } from "@/data/commonMistakes";
import { FarmPlanner } from "@/components/farm/FarmPlanner";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { WarningPanel } from "@/components/shared/WarningPanel";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Farming Dashboard — PoE2 Endgame Companion",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        tool="dashboard"
        eyebrow="Farming strategy"
        title="Farming"
        accent="Dashboard"
        source="community data"
        description="What to farm, what bosses need, and which builds are strong right now."
      />

      <section>
        <SectionTitle>Farm planner</SectionTitle>
        <FarmPlanner />
      </section>

      <WarningPanel mistakes={commonMistakes} stage="dashboard" />

      <DashboardTabs />
    </div>
  );
}
