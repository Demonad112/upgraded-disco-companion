import Image from "next/image";
import Link from "next/link";
import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { BASE_PATH } from "@/lib/basePath";
import { TIER_LIST_PATCH } from "@/data/strategies";
import { ProgressSummary } from "@/components/home/ProgressSummary";
import { NextStepCard } from "@/components/checklist/NextStepCard";
import { CompactAlerts } from "@/components/compact/CompactAlerts";
import { LastCharacterCard } from "@/components/home/LastCharacterCard";
import { progressTotals, stepSummaries } from "@/lib/stepSummary";

const CARDS = [
  {
    href: "/checklist",
    span: "lg:col-span-3",
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
    span: "lg:col-span-3",
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
    span: "lg:col-span-2",
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
    span: "lg:col-span-4",
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
    // Bento on 6 columns: hero across the top, Up next (4) beside Progress (2),
    // then four feature cards of different widths (3, 3, 2, 4).
    <div className="home-bento grid grid-cols-1 gap-4 sm:grid-cols-6">
      <section className="relative overflow-hidden sm:col-span-6" data-compact-hide>
        <Image
          src={`${BASE_PATH}/images/atlas-constant.webp`}
          alt=""
          aria-hidden
          fill
          priority
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 38%", opacity: "var(--hero-image-opacity)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--hero-scrim)] via-[var(--page)]/70 to-[var(--page)]" />
        <div className="hero-rule relative z-10 my-10 flex flex-col items-start gap-4 sm:my-16">
          <span className="eyebrow text-[var(--accent)]">
            Patch {CURRENT_PATCH} · {LEAGUE_LABEL}
          </span>
          <h1 className="font-display text-4xl font-semibold text-balance text-ink sm:text-6xl">
            Path of Exile 2
            <br />
            Endgame Companion
          </h1>
          <p className="max-w-2xl text-lg text-ink-dim">
            A second-monitor guide for the {CURRENT_PATCH} endgame, built on what
            top creators teach: what to do next, which Waystones to run, which
            Atlas nodes to skip, and which farm to commit to.
          </p>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4 sm:col-span-6 lg:col-span-4" data-compact-keep>
        <NextStepCard steps={stepSummaries()} />
        <div data-compact-hide>
          <LastCharacterCard />
        </div>
      </div>
      <div className="min-w-0 sm:col-span-6 lg:col-span-2" data-compact-keep>
        <ProgressSummary stepIds={totals.stepIds} atlasTotal={totals.atlasTotal} />
      </div>
      <div className="sm:col-span-6">
        <CompactAlerts />
      </div>

      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          data-linkable
          data-compact-hide
          className={`group card p-6 sm:col-span-3 ${card.span}`}
        >
          <div className="mb-4 flex size-10 items-center justify-center border border-[var(--accent)]/30 bg-accent-soft text-[var(--accent)]">
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              {card.icon}
            </svg>
          </div>
          <h2 className="flex items-center gap-1.5 font-semibold text-ink">
            {card.title}
            <span className="translate-x-0 text-[var(--accent)] opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
              →
            </span>
          </h2>
          <p className="mt-2 text-sm text-ink-mute">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}
