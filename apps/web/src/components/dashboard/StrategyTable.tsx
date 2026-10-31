"use client";

import { useMemo, useState } from "react";
import type { FarmingStrategy } from "@/lib/types";
import { Tag } from "@/components/shared/Tag";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { TIER_LIST_PATCH } from "@/data/strategies";
import { Segmented } from "@/components/shared/controls";
import { LevelPill } from "@/components/shared/Pill";

type SortKey = "rank" | "investment" | "risk";
const SORTS = [
  { value: "rank", label: "Tier list" },
  { value: "investment", label: "Cheapest" },
  { value: "risk", label: "Safest" },
] as const satisfies readonly { value: SortKey; label: string }[];
const TIER_ORDINAL: Record<string, number> = { low: 0, medium: 1, high: 2 };

export const STRATEGY_TIER_STYLES: Record<string, string> = {
  S: "gold-surface border-[var(--accent)]",
  A: "border-good/40 bg-good/10 text-[var(--good)]",
  B: "border-line bg-surface-sunken text-ink-dim",
  C: "border-line bg-surface-sunken text-ink-mute",
};

export function StrategyTierBadge({ tier }: { tier?: string }) {
  return (
    <span
      title={tier ? `${tier} tier on the ${TIER_LIST_PATCH} creator tier list` : `Not ranked by a ${TIER_LIST_PATCH} source`}
      className={`inline-flex size-6 shrink-0 items-center justify-center border font-mono text-xs font-bold ${
        tier ? STRATEGY_TIER_STYLES[tier] : "border-line text-ink-mute"
      }`}
    >
      {tier ?? "–"}
    </span>
  );
}

/**
 * Ranked strategies as one-line rows: tier, name, mechanics, investment and
 * risk. Tap a row for the expected return, Atlas setup and sources. The old
 * table forced a 720px minimum width, so on a phone it scrolled sideways with
 * the return text squeezed into a narrow column.
 */
export function StrategyTable({ strategies }: { strategies: FarmingStrategy[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");

  const sorted = useMemo(() => {
    return [...strategies].sort((a, b) => {
      if (sortKey === "rank") return a.rank - b.rank;
      return TIER_ORDINAL[a[sortKey]] - TIER_ORDINAL[b[sortKey]] || a.rank - b.rank;
    });
  }, [strategies, sortKey]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-ink-mute">Sort by</span>
        <Segmented kind="toggle" label="Sort by" options={SORTS} value={sortKey} onChange={setSortKey} />
      </div>
      <p className="tier-legend" aria-label="Tier legend">
        <span className="text-ink-mute">Tier on the {TIER_LIST_PATCH} creator list, best first:</span>
        {(["S", "A", "B", "C"] as const).map((t) => (
          <span key={t}>
            <StrategyTierBadge tier={t} />
          </span>
        ))}
        <span>
          <StrategyTierBadge /> not ranked
        </span>
      </p>
      <ol data-surface="data" className="overflow-hidden border border-line shadow-[var(--lift)]">
        {sorted.map((strategy) => {
          const stage = [strategy.leagueStartViable && "League start", strategy.lateGameViable && "Late game"]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={strategy.id} className="border-b border-line last:border-b-0">
              <details id={strategy.id} className="group scroll-mt-40">
                <summary className="strat-row cursor-pointer list-none px-3 py-2.5 transition-colors hover:bg-surface-overlay/60 [&::-webkit-details-marker]:hidden">
                  <StrategyTierBadge tier={strategy.tier} />
                  <span className="title-sentence block min-w-0 text-[15px] text-ink">{strategy.name}</span>
                  <span className="strat-facts">
                    <LevelPill label="Invest" value={strategy.investment} />
                    <LevelPill label="Risk" value={strategy.risk} />
                    <span className="strat-stage">{stage || "Niche"}</span>
                  </span>
                  <span className="strat-tags">
                    {strategy.mechanics.map((m) => (
                      <Tag key={m} mechanic={m} />
                    ))}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="strat-chevron size-3.5 text-ink-mute transition-transform group-open:rotate-90"
                  >
                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="space-y-2 border-t border-line bg-surface-sunken/40 px-3 py-3 sm:pl-12">
                  {strategy.mechanics.length ? (
                    <div className="strat-tags-detail flex flex-wrap gap-1">
                      {strategy.mechanics.map((m) => (
                        <Tag key={m} mechanic={m} />
                      ))}
                    </div>
                  ) : null}
                  <p className="text-sm leading-relaxed text-ink">
                    <span className="text-ink-mute">Return: </span>
                    {strategy.expectedReturn}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-dim">
                    <span className="text-ink-mute">Atlas setup: </span>
                    {strategy.atlasSetup}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
                    <SourceFlag source={strategy.source} />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
