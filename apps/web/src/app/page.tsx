import type { ReactNode } from "react";
import Link from "next/link";
import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { TIER_LIST_PATCH } from "@/data/strategies";
import { ProgressSummary } from "@/components/home/ProgressSummary";
import { NextStepCard } from "@/components/checklist/NextStepCard";
import { CompactAlerts } from "@/components/compact/CompactAlerts";
import { Triad } from "@/components/layout/Triad";
import { LastCharacterCard } from "@/components/home/LastCharacterCard";
import { ToolStatus, type ToolStatusProps } from "@/components/home/ToolStatus";
import { StartPicker, type StartTile } from "@/components/home/StartPicker";
import { dataUpdated, guideCounts, strategyNames } from "@/lib/homeStats";
import { progressTotals, stepSummaries } from "@/lib/stepSummary";

const ICONS = {
  checklist: <path d="M5 6h14M5 12h14M5 18h9" />,
  atlas: (
    <>
      <circle cx="12" cy="4" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
      <path d="M12 5.8V11M12 11L5 17.3M12 11l7 6.3" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" />
      <rect x="13.5" y="3.5" width="7" height="5" />
      <rect x="13.5" y="11" width="7" height="9.5" />
      <rect x="3.5" y="14.5" width="7" height="6" />
    </>
  ),
  character: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    </>
  ),
  farming: <path d="M12 3l7 9-7 9-7-9zM5 12h14" />,
};

// Farming falls back to the planner's farm list; StartPicker swaps in the last farm.
const START_TILES: StartTile[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: ICONS.dashboard },
  { id: "farming", label: "Farming", href: "/dashboard#farm-all-h", icon: ICONS.farming },
  { id: "character", label: "Character", href: "/character", icon: ICONS.character },
];

function toolCards(): { href: string; title: string; purpose: string; icon: ReactNode; status: ToolStatusProps }[] {
  const { stepIds, atlasIds } = progressTotals();
  return [
    {
      href: "/checklist",
      title: "Progression Checklist",
      purpose: "What to do next, from campaign end to a juiced farm.",
      icon: ICONS.checklist,
      status: { tool: "checklist", stepIds },
    },
    {
      href: "/atlas",
      title: "Atlas Tree Planner",
      purpose: "Allocation order, trap nodes to skip and memory forks.",
      icon: ICONS.atlas,
      status: { tool: "atlas", atlasIds },
    },
    {
      href: "/dashboard",
      title: "Farming Dashboard",
      purpose: `${TIER_LIST_PATCH} tier list, strategy quiz, pinnacle bosses and meta builds.`,
      icon: ICONS.dashboard,
      status: { tool: "dashboard", strategyNames: strategyNames() },
    },
    {
      href: "/character",
      title: "Character Import",
      purpose: "A poe.ninja profile's defences, skills and gear, read in your browser.",
      icon: ICONS.character,
      status: { tool: "character" },
    },
  ];
}

// The hero's short count row: guideCounts minus meta builds, "pinnacles".
const heroCounts = () =>
  guideCounts()
    .filter((c) => !c.label.startsWith("meta"))
    .map((c) => ({ ...c, label: c.label.replace(/ boss(es)?$/, (_, p) => (p ? "s" : "")) }));

export default function Home() {
  const totals = progressTotals();
  const updated = dataUpdated();
  return (
    // 10-column grid: hero across the top; Up next (6) beside Progress (4), a
    // 1.5 : 1 split; then the four tools as a 2x2 grid of equal cards (5 + 5).
    <div className="home-bento grid grid-cols-1 gap-5 sm:grid-cols-10">
      <section className="sm:col-span-10" data-compact-hide>
        <div data-draw-in className="hero-rule flex flex-col items-center gap-3 py-2 sm:py-6">
          <span className="hero-pill border border-accent-line px-2.5 py-1.5 font-semibold tracking-wider text-accent uppercase">
            Patch {CURRENT_PATCH} · {LEAGUE_LABEL}
          </span>
          <h1 className="hero-title text-4xl text-balance sm:text-6xl">
            <span className="text-gradient-gold">Path of Exile 2</span>
            <br />
            Endgame Companion
          </h1>
          <span className="hero-gem flex items-center gap-2.5" aria-hidden>
            <i />
          </span>
          {/* Counted from the guide data at build time; never typed in. No
              separators: a wrapped line would start with one. */}
          <ul
            aria-label="What the guide covers"
            className="hero-counts label-metric flex flex-wrap justify-center gap-x-4 gap-y-1.5"
          >
            {heroCounts().map((c) => (
              <li key={c.label}>
                <span className="tabular text-ink">{c.value}</span> {c.label}
              </li>
            ))}
          </ul>
          <p className="hero-more max-w-2xl text-base text-ink-dim sm:text-lg">
            A second-monitor guide for the {CURRENT_PATCH} endgame, built on what
            top creators teach: what to do next, which Waystones to run, which
            Atlas nodes to skip, and which farm to commit to.
          </p>
          {updated ? (
            <p className="hero-more label-metric -mt-2">
              Data updated <time dateTime={updated} className="tabular text-ink-dim">{updated}</time>
            </p>
          ) : null}
          <Triad />
        </div>
      </section>

      <div className="sm:col-span-10" data-compact-hide>
        <StartPicker tiles={START_TILES} />
      </div>

      <div className="flex min-w-0 flex-col gap-5 sm:col-span-10 lg:col-span-6 [&>section]:flex-1" data-compact-keep>
        <NextStepCard steps={stepSummaries()} />
        <div data-compact-hide>
          <LastCharacterCard />
        </div>
      </div>
      <div className="min-w-0 sm:col-span-10 lg:col-span-4" data-compact-keep>
        <ProgressSummary stepIds={totals.stepIds} atlasIds={totals.atlasIds} />
      </div>
      <div className="sm:col-span-10">
        <CompactAlerts />
      </div>

      {/* Threads: a rail across the tops with a stem and diamond per card
          (wide screens). Pure CSS; the card-links canvas only links cards
          inside [data-links], so it leaves these alone. */}
      <div className="thread-row sm:col-span-10" data-compact-hide>
        {toolCards().map((card) => (
          <Link
            key={card.href}
            href={card.href}
            data-linkable
            data-pulse
            className="group card thread-card flex flex-col p-6"
          >
            <span className="thread-stem" aria-hidden />
            <span className="thread-diamond" aria-hidden />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="square"
              className="mb-4 size-8 text-accent"
              aria-hidden
            >
              {card.icon}
            </svg>
            <h2 data-vt={card.status.tool} className="text-base text-ink">{card.title}</h2>
            <p className="mt-2 mb-4 text-sm text-ink-dim">{card.purpose}</p>
            <ToolStatus {...card.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
