import Link from "next/link";
import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { TIER_LIST_PATCH } from "@/data/strategies";
import { ProgressSummary } from "@/components/home/ProgressSummary";
import { NextStepCard } from "@/components/checklist/NextStepCard";
import { CompactAlerts } from "@/components/compact/CompactAlerts";
import { Triad } from "@/components/layout/Triad";
import { LastCharacterCard } from "@/components/home/LastCharacterCard";
import { progressTotals, stepSummaries } from "@/lib/stepSummary";

const CARDS = [
  {
    href: "/checklist",
    title: "Progression Checklist",
    description:
      "Step-by-step roadmap from campaign end to a juiced farm: Waystone planner, readiness check, Master and league quest chains, and the mistakes to avoid at each step.",
    icon: (
      <path
        d="M5 6h14M5 12h14M5 18h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/atlas",
    title: "Atlas Tree Planner",
    description:
      "Allocation order for early sustain, the trap nodes to skip (points can't be refunded), biome picks, memory forks and per-mechanic sub-trees.",
    icon: (
      <>
        <circle cx="12" cy="4" r="1.8" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5" cy="19" r="1.8" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="19" cy="19" r="1.8" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M12 5.8V11M12 11L5 17.3M12 11l7 6.3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Farming Dashboard",
    description:
      `${TIER_LIST_PATCH} farming tier list, a quick strategy-picker quiz, pinnacle boss requirements, and current meta builds.`,
    icon: (
      <>
        <rect x="3.5" y="3.5" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13.5" y="3.5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13.5" y="11" width="7" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="3.5" y="14.5" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  {
    href: "/character",
    title: "Character Import",
    description:
      "Paste a poe.ninja profile URL to see your character's defenses, skills, and gear — parsed entirely in your browser.",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 19.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

export default function Home() {
  const totals = progressTotals();
  return (
    // 10-column grid: hero across the top; Up next (6) beside Progress (4), a
    // 1.5 : 1 split; then the four tools as a 2x2 grid of equal cards (5 + 5).
    <div className="home-bento grid grid-cols-1 gap-5 sm:grid-cols-10">
      <section className="sm:col-span-10" data-compact-hide>
        <div className="hero-rule flex flex-col items-start gap-3 py-2 sm:py-6">
          <span className="eyebrow text-[var(--accent)]">
            Patch {CURRENT_PATCH} · {LEAGUE_LABEL}
          </span>
          <h1 className="hero-title font-display text-4xl font-bold tracking-[0.04em] text-balance uppercase sm:text-6xl">
            <span className="text-gradient-gold">Path of Exile 2</span>
            <br />
            <span className="hero-title-ink text-ink">Endgame Companion</span>
          </h1>
          <Triad />
          <p className="max-w-2xl text-lg text-ink-dim">
            A second-monitor guide for the {CURRENT_PATCH} endgame, built on what
            top creators teach: what to do next, which Waystones to run, which
            Atlas nodes to skip, and which farm to commit to.
          </p>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-5 sm:col-span-10 lg:col-span-6 [&>section]:flex-1" data-compact-keep>
        <NextStepCard steps={stepSummaries()} />
        <div data-compact-hide>
          <LastCharacterCard />
        </div>
      </div>
      <div className="min-w-0 sm:col-span-10 lg:col-span-4" data-compact-keep>
        <ProgressSummary stepIds={totals.stepIds} atlasTotal={totals.atlasTotal} />
      </div>
      <div className="sm:col-span-10">
        <CompactAlerts />
      </div>

      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          data-linkable
          data-compact-hide
          className="group card p-6 sm:col-span-5"
        >
          <div className="mb-3 text-ink-mute">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
              {card.icon}
            </svg>
          </div>
          <h2 className="text-base text-ink">{card.title}</h2>
          <p className="mt-2 text-sm text-ink-dim">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}
