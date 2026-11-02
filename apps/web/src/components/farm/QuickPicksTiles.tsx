"use client";

import { farmData as d } from "@/data/farm";
import { farmingStrategies } from "@/data/strategies";
import { Button } from "@/components/shared/controls";
import { dangerLevel } from "@/lib/farm/quickPickIds";

const LEVEL_WORD: Record<1 | 2 | 3, string> = { 1: "Low", 2: "Medium", 3: "High" };
const INVEST_WORD: Record<string, string> = { low: "Low investment", medium: "Medium investment", high: "High investment" };

/** Danger 1–3 as a word plus three square pips (the word carries the meaning; the pips are decoration). */
export function DangerPips({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="qp-danger">
      <span className="qp-pips" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className="qp-pip" data-on={n <= level || undefined} />
        ))}
      </span>
      Danger: {LEVEL_WORD[level]}
    </span>
  );
}

/** Quick picks, screen 1: five farms in the data's curated order, each with a Set up button. */
export function QuickPicksTiles({ onPick, onHelp }: { onPick: (pickId: string) => void; onHelp: () => void }) {
  const qp = d.quickPicks;
  return (
    <section aria-labelledby="qp-h" className="qp flex flex-col gap-4" data-testid="quick-picks">
      <div className="flex flex-col gap-1">
        <h3 id="qp-h" className="section-title !mb-0">Quick picks</h3>
        <p className="qp-body text-ink-dim">
          Five good farms with the tablets already chosen. Tap Set up to see what to roll.{" "}
          <button type="button" className="qp-link" onClick={onHelp}>Not sure? Help me choose</button>
        </p>
      </div>
      <ol className="qp-tiles">
        {qp.picks.map((p) => {
          const s = farmingStrategies.find((x) => x.id === p.strategyId);
          return (
            <li key={p.id}>
              <article className="qp-tile" aria-labelledby={`qp-tile-${p.id}`}>
                <span className="label-metric">{s ? INVEST_WORD[s.investment] : ""}</span>
                <h4 id={`qp-tile-${p.id}`} className="title-sentence qp-tile-name">{p.name}</h4>
                <p className="qp-body text-ink-dim">{p.line}</p>
                {s ? <DangerPips level={dangerLevel(s.risk)} /> : null}
                <Button variant="primary" className="qp-setup" aria-label={`Set up ${p.name}`} onClick={() => onPick(p.id)}>
                  Set up →
                </Button>
              </article>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-ink-mute">{qp.excluded.map((x) => x.why).join(" ")} Every farm, Ritual included, is under All farms below.</p>
    </section>
  );
}
