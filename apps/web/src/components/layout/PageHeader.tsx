import type { ReactNode } from "react";
import { Triad } from "@/components/layout/Triad";
import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";

/**
 * The one page header: eyebrow, two-tone title, rule, description, meta row.
 * `accent` is the gold word and is rendered after `title` (`Character` +
 * `analysis`). Home keeps its own hero and does not use this.
 */
export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  source,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: ReactNode;
  /** Where the page's numbers come from, e.g. "poe.ninja". */
  source?: string;
}) {
  return (
    <header className="page-title">
      <div className="label-metric">{eyebrow}</div>
      <h1 className="mt-2 font-display text-[clamp(34px,5.2vw,64px)] leading-[1.04] font-bold text-ink">
        {title} <span className="text-gradient-gold">{accent}</span>
      </h1>
      <Triad />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-dim">{description}</p>
      <p className="label-metric mt-3">
        Patch {CURRENT_PATCH} · {LEAGUE_LABEL}
        {source ? ` · ${source}` : ""}
      </p>
    </header>
  );
}
