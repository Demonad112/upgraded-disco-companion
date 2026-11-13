"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { CharacterSnapshot } from "@poe2/core";
import { usePersistedState } from "@/hooks/usePersistedState";
import { importPath, recentCharacters } from "@/lib/recentCharacters";
import { useLocalStore } from "@/lib/localStore";

const RES = [
  ["fire", "Fire", "var(--dmg-fire)"],
  ["cold", "Cold", "var(--dmg-cold)"],
  ["lightning", "Light.", "var(--dmg-lightning)"],
  ["chaos", "Chaos", "var(--dmg-chaos)"],
] as const;

// Square-cut 16px glyphs, one per figure, tinted by the well's --c colour.
const ICON: Record<string, string> = {
  Life: "M8 15 1 7.5v-4L3.5 1H6l2 2 2-2h2.5L15 3.5v4z",
  "Energy shield": "M8 .5 14.5 3v5c0 3.5-2.8 6-6.5 7.5C4.3 14 1.5 11.5 1.5 8V3z",
  "Main skill DPS": "m1.5 3.5 2-2 11 11-2 2zm11-2 2 2-11 11-2-2z",
  "Killed by": "M3 1h10l2 3v5l-3 2v4H4v-4L1 9V4zm1.5 5v2.5h3V6zm4 0v2.5h3V6z",
};
const TONE: Record<string, string> = {
  Life: "var(--dmg-fire)",
  "Energy shield": "var(--dmg-cold)",
  "Main skill DPS": "var(--accent)",
  "Killed by": "var(--dmg-physical)",
};

export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined || now === before || before === 0) return null;
  const up = now > before;
  return (
    <span className={`tabular mt-2 inline-block border px-1.5 py-0.5 text-[11px] font-medium ${up ? "border-good/40 bg-good/10 text-good" : "border-danger/40 bg-danger/10 text-danger"}`}>
      {up ? "▲" : "▼"} {compact(Math.abs(now - before))}
    </span>
  );
}

/**
 * The last character analysed in this browser, from the history the character
 * page already records. Every figure is a recorded one; nothing is shown for a
 * value the import did not have. Hidden until there is a snapshot.
 */
export function LastCharacterCard() {
  const { state } = usePersistedState();
  const recents = useLocalStore(recentCharacters);
  const snapshots = state.character.snapshots;
  if (snapshots.length === 0) return null;

  const latest = snapshots.reduce((a, b) => (b.at > a.at ? b : a));
  const same = snapshots.filter((s) => s.key === latest.key && s !== latest);
  const previous: CharacterSnapshot | undefined = same.reduce<CharacterSnapshot | undefined>(
    (a, b) => (!a || b.at > a.at ? b : a),
    undefined
  );
  const recent = recents.find((r) => r.key === latest.key);
  const name = recent?.name ?? latest.key.split("/").pop() ?? latest.key;
  const href = recent ? importPath(recent.url) : "/character";

  // A figure the import did not report is null and is not shown (never as 0).
  // Rows saved before null existed hold 0 for "unknown", so 0 is hidden too.
  const figure = (label: string, value: number | null, before: number | null | undefined) =>
    ({ label, value: value ?? 0, before: before ?? undefined, show: value !== null && value > 0 });
  const figures: { label: string; value: number; before?: number; show: boolean }[] = [
    // Same order as the character page's build card (Showcase): offence, then the hit that kills, then the pools.
    figure("Main skill DPS", latest.dps, previous?.dps),
    figure("Killed by", latest.weakestHit, previous?.weakestHit),
    figure("Life", latest.life, previous?.life),
    figure("Energy shield", latest.energyShield, previous?.energyShield),
  ];

  return (
    <CharacterCard
      name={name}
      level={latest.level}
      className={recent?.className}
      status={`Analysed ${ago(latest.at)}`}
      figures={figures}
      resists={latest}
      actions={
        <>
          <Link href={href} className="btn btn-secondary btn-sm text-accent">
            {recent ? "Re-import and analyse" : "Open character page"} →
          </Link>
          {previous ? (
            <span className="text-xs text-ink-mute">▲▼ change since the import before, {ago(previous.at)}</span>
          ) : null}
        </>
      }
    />
  );
}

type CardFigure = { label: string; value: number; before?: number; show: boolean };

/** The card itself, shared by home (last snapshot) and the character page (live analysis). */
export function CharacterCard({
  name,
  level,
  className,
  status,
  figures,
  resists,
  children,
  actions,
  titleId = "last-character-title",
  eyebrow = "Last character",
}: {
  name: string;
  level: number | null;
  className?: string | null;
  status?: ReactNode;
  figures: CardFigure[];
  resists: Record<(typeof RES)[number][0], number | null>;
  children?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  eyebrow?: string;
}) {
  return (
    <section aria-labelledby={titleId} className="card lc-plate overflow-hidden">
      <div className="lc-strip flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5">
        <span className="eyebrow text-accent">{eyebrow}</span>
        {status ? <span className="text-xs text-ink-mute">{status}</span> : null}
      </div>
      <div className="px-5 pt-4 pb-5">
        <h2 id={titleId} className="text-gradient-gold font-display text-3xl leading-none font-bold tracking-wide uppercase">
          {name}
        </h2>
        <p className="lc-name mt-2 inline-flex items-center gap-2.5 px-2.5 py-1 font-display text-sm tracking-[0.16em] text-ink-dim uppercase">
          {level === null ? "Level unknown" : `Level ${level}`}
          {className ? (
            <>
              <i aria-hidden className="size-1 rotate-45 bg-accent" /> {className}
            </>
          ) : null}
        </p>
        {children}
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {figures
            .filter((f) => f.show)
            .map((f) => (
              <div key={f.label} className="lc-well min-w-0 px-3 py-2.5" style={{ "--c": TONE[f.label] } as CSSProperties}>
                <dt className="label-metric flex items-center gap-1.5">
                  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 shrink-0 fill-current">
                    <path d={ICON[f.label]} />
                  </svg>
                  {f.label}
                </dt>
                <dd title={f.value.toLocaleString()} className="tabular mt-1.5 text-2xl leading-none font-semibold text-ink">
                  {compact(f.value)}
                </dd>
                <Delta now={f.value} before={f.before} />
              </div>
            ))}
        </dl>

        <ul className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Resistances">
          {RES.map(([type, label, tone]) => {
            const value = resists[type];
            // 75 is the base cap; a value below it is under cap whatever the maximum.
            const short = type !== "chaos" && value !== null && value < 75;
            return (
              <li key={type} className="lc-pip px-2 pt-1.5 pb-2 text-xs text-ink-dim" style={{ "--c": tone } as CSSProperties}>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 rotate-45 bg-(--c)" />
                  {label}
                </span>
                <span className={`tabular mt-0.5 block text-base font-semibold ${short ? "text-danger" : "text-ink"}`}>
                  {value === null ? "unknown" : `${value}%`}
                </span>
              </li>
            );
          })}
        </ul>

        {actions ? (
          <>
            <div className="gold-rule my-4" />
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </>
        ) : null}
      </div>
    </section>
  );
}
