"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { farmData as d, findMod, unverifiedCount } from "@/data/farm";
import { Button } from "@/components/shared/controls";
import { useBuildLayers } from "@/hooks/useBuildLayers";
import { isLoadout, useFarm } from "@/hooks/useFarm";
import { validate } from "@/lib/farm/rules";
import { changeSign, formatChange, pctChange, scoreLoadout, type Change, type ScoreOptions } from "@/lib/farm/score";
import { applySwap, subjectAt, type SwapTarget } from "@/lib/farm/swaps";
import { computeTotals } from "@/lib/farm/totals";
import {
  alternatives,
  chipsOf,
  disagreementsFor,
  modLabel,
  pickByKey,
  recommendedLoadout,
  shoppingList,
  statLines,
  targetId,
  typeName,
} from "@/lib/farm/quickPicks";
import type { Loadout } from "@/lib/farm/types";
import { ModSheet } from "./ModSheet";
import "@/styles/quick-picks.css";

const TOP_STATS = 5;
const num = (n: number) => Math.round(n).toLocaleString("en-US");
const statName = (modId: string) => d.stats.find((s) => s.id === findMod(modId)?.stat)?.name ?? modId;
const RISK_WORD = { safe: "Play safe", balanced: "Balanced", greedy: "Greedy" } as const;

/** "▲ +6% vs recommended", or "Same as recommended". Danger going up is bad, so its tone flips. */
function VsRecommended({ c, upIsBad = false }: { c: Change; upIsBad?: boolean }) {
  const text = formatChange(c);
  if (text === "no change") return <span className="qp-vs">Same as recommended</span>;
  const sign = changeSign(c);
  const tone = (sign > 0) !== upIsBad ? "good" : "danger";
  return (
    <span className="qp-vs">
      <span className="farm-num" data-tone={tone}>{text}</span> vs recommended
    </span>
  );
}

function sameLoadout(a: Loadout, b: Loadout) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Quick picks, screen 2: the recommended tablets and Waystone as mod chips; a chip opens the alternatives sheet. */
export default function QuickSetup({ farmKey, onChangeFarm, onOpenFull }: { farmKey: string; onChangeFarm: () => void; onOpenFull: () => void }) {
  const pick = pickByKey(farmKey)!;
  const { farm, saveLoadout, ensureLoadout } = useFarm();
  const build = useBuildLayers();

  // The same scoring options FP1's full planner uses for this key, so both views show the same numbers.
  const override = farm.presets?.[farmKey];
  const presetId = override && d.weights.presets[override] ? override : pick.preset;
  const risk = farm.risk ?? "balanced";
  const layers = farm.buildAware && build ? build.layers : null;
  const layersKey = layers?.join(",") ?? "";
  const o: ScoreOptions = useMemo(() => ({ presetId, risk, layers }), [presetId, risk, layersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommended = useMemo(() => recommendedLoadout(pick), [pick]);
  const recScore = useMemo(() => scoreLoadout(d, recommended, o), [recommended, o]);
  const saved = farm.loadouts[farmKey];
  const loadout: Loadout = saved && isLoadout(saved.loadout) ? saved.loadout : recommended;
  const score = useMemo(() => scoreLoadout(d, loadout, o), [loadout, o]);
  const totals = useMemo(() => computeTotals(d, loadout), [loadout]);
  const lines = useMemo(() => statLines(d, totals, presetId), [totals, presetId]);
  const errors = useMemo(() => validate(d, loadout), [loadout]);
  const isRecommended = sameLoadout(loadout, recommended);

  useEffect(() => {
    ensureLoadout(farmKey, recommended, recScore);
  }, [ensureLoadout, farmKey, recommended, recScore]);

  const commit = (next: Loadout) => saveLoadout(farmKey, next, recScore);

  const [sheet, setSheet] = useState<SwapTarget | null>(null);
  const [allStats, setAllStats] = useState(false);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const [announce, setAnnounce] = useState("");
  const list = shoppingList(d, loadout, pick.name);

  const focusChip = (t: SwapTarget) =>
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-chip="${targetId(t)}"]`)?.focus());

  const closeSheet = () => {
    const t = sheet;
    setSheet(null);
    if (t) focusChip(t);
  };

  const sheetAlts = useMemo(() => (sheet ? alternatives(d, loadout, o, sheet, 3) : []), [sheet, loadout, o]);

  const apply = (i: number) => {
    const s = sheetAlts[i];
    if (!s) return;
    const next = applySwap(loadout, s);
    const after = scoreLoadout(d, next, o);
    commit(next);
    setAnnounce(`${modLabel(d, s.to.modId, s.to.value)} applied. Net ${num(after.net)}.`);
    setSheet(null);
    focusChip(s.target);
  };

  const reset = () => {
    commit(structuredClone(recommended));
    setAnnounce(`Reset to recommended. Net ${num(recScore.net)}.`);
  };

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(list);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  };

  const nameOf = (t: SwapTarget) =>
    t.index < loadout.tablets.length ? `Tablet ${t.index + 1} · ${typeName(d, loadout.tablets[t.index]!.type)}` : "Waystone";

  const chips = (index: number) => (
    <ul className="qp-chips">
      {chipsOf(loadout, index).map(({ target, pick: p }) => {
        const mod = findMod(p.modId);
        return (
          <li key={targetId(target)}>
            <button
              type="button"
              className="qp-chip"
              data-chip={targetId(target)}
              data-danger={(mod && "danger" in mod && mod.danger.generic > 0) || undefined}
              aria-haspopup="dialog"
              onClick={() => setSheet(target)}
            >
              <span className="qp-chip-text">{modLabel(d, p.modId, p.value)}</span>
              {mod && mod.confidence !== "confirmed" ? <span className="qp-flag">{mod.confidence === "single" ? "single source" : "unverified"}</span> : null}
              <span className="sr-only">: compare choices</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const way = loadout.waystone;
  const wayIndex = loadout.tablets.length;
  const wayRewards = way.prefixes.map((p) => statName(p.modId));
  const wayDangers = way.suffixes.map((p) => statName(p.modId));
  const joinWords = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  const notes = disagreementsFor(d, loadout);
  const shownLines = allStats ? lines : lines.slice(0, TOP_STATS);
  const riskMult = d.weights.risk[risk];

  const sheetPick = sheet ? (sheet.side === "prefix" ? subjectPicks(loadout, sheet.index).prefixes : subjectPicks(loadout, sheet.index).suffixes)[sheet.slot] : undefined;

  return (
    <div className="qp-view" data-testid="qp-setup">
      <header className="qp-head">
        <p className="label-metric">Your setup</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="title-sentence qp-title">{pick.name}</h3>
          <Button onClick={onChangeFarm}>← Change farm</Button>
        </div>
        <p className="qp-body text-ink-dim">Roll or buy these tablets and this Waystone. Tap any mod to compare it with the best other choices.</p>
        <p className="text-sm text-ink-mute">
          <span className="qp-estimate">Recommended · estimate.</span> {pick.why}
        </p>
        {!isRecommended ? <p className="text-sm text-ink-mute">This is your saved setup. Reset to recommended to start over.</p> : null}
      </header>

      <section className="qp-strip" aria-label="Result" data-testid="qp-result">
        <dl>
          <div>
            <dt className="label-metric">Reward</dt>
            <dd><span className="farm-num qp-big">{num(score.reward)}</span><VsRecommended c={pctChange(recScore.reward, score.reward)} /></dd>
          </div>
          <div>
            <dt className="label-metric">Danger</dt>
            <dd><span className="farm-num qp-big">{num(score.danger)}</span><VsRecommended c={pctChange(recScore.danger, score.danger)} upIsBad /></dd>
          </div>
          <div>
            <dt className="label-metric">Net</dt>
            <dd data-testid="qp-net"><span className="farm-num qp-big">{num(score.net)}</span><VsRecommended c={pctChange(recScore.net, score.net)} /></dd>
          </div>
        </dl>
      </section>
      <div className="qp-main">
        <section aria-labelledby="qp-tablets-h" className="flex flex-col gap-3">
          <h4 id="qp-tablets-h" className="section-title !mb-0">Tablets</h4>
          {loadout.options.mapContext !== "standard" ? (
            <p className="qp-body text-ink-dim">
              Run this on a City map with Industrial Improvements, or where tower ranges overlap: only there can {d.rules.maxTabletsPerCityMap} tablets reach one map.
            </p>
          ) : null}
          <div className="qp-cards">
            {loadout.tablets.map((t, i) => (
              <article key={i} className="qp-card" aria-label={`Tablet ${i + 1}`}>
                <p className="label-metric">
                  Tablet {i + 1} · {typeName(d, t.type)} · {t.rarity === "rare" ? "Rare" : "Magic"}
                </p>
                {chips(i)}
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="qp-way-h" className="flex flex-col gap-3">
          <h4 id="qp-way-h" className="section-title !mb-0">Waystone</h4>
          <article className="qp-card" aria-label="Waystone">
            <p className="label-metric">
              Waystone · tier {way.tier} · {way.rarity === "rare" ? "Rare" : "Magic"}{way.corrupted ? " · corrupted" : ""}
            </p>
            {chips(wayIndex)}
          </article>
          <p className="qp-body text-ink-dim">
            Waystone: look for a tier {way.tier} {way.rarity} with {wayRewards.length ? joinWords(wayRewards) : "reward mods"}.{" "}
            {wayDangers.length ? `It also has ${joinWords(wayDangers)}, which adds Danger.` : "Every danger mod it rolls adds Danger and lowers Net."}
          </p>
          {notes.map((n) => (
            <p key={n.id} className="text-sm text-ink-mute">
              {n.text}
              {n.appliesTo === "waystone" ? ` This page uses ${d.rules.waystoneMaxMods}, or ${d.rules.waystoneMaxModsCorrupted} when corrupted.` : ""}
            </p>
          ))}
        </section>

        <div className="qp-actions">
          <Button variant="primary" onClick={copyList}>Copy shopping list</Button>
          <Button onClick={reset} disabled={isRecommended}>Reset to recommended</Button>
          <Button variant="ghost" onClick={onOpenFull}>Open full planner →</Button>
        </div>
        <p className="text-sm text-ink-dim" role="status" data-testid="qp-copy-status">
          {copy === "done" ? "Copied. Paste it into your notes or a message." : copy === "failed" ? "This browser blocked copying. Select the list below instead." : ""}
        </p>
        {copy === "failed" ? <pre className="qp-list" tabIndex={0} aria-label="Shopping list">{list}</pre> : null}
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>

      <div className="qp-details">
        <p className="text-sm text-ink-dim">
          {riskMult === 1
            ? "Net = reward minus danger."
            : `Net = reward minus danger × ${riskMult} (${RISK_WORD[risk]}, set in the full planner).`}{" "}
          All three are estimates from this farm&rsquo;s scoring weights, not predicted drops.
        </p>
        {errors.length > 0 ? (
          <ul className="farm-errors" role="alert">
            {errors.map((e) => (
              <li key={e}>Open the full planner to fix: {e}</li>
            ))}
          </ul>
        ) : null}
        <div>
          <h4 className="label-field mb-2">What the map has</h4>
          <ul className="qp-lines" id="qp-lines">
            {shownLines.map((l) => (
              <li key={l.id} data-danger={l.danger || undefined}>
                <span>{l.danger ? `Danger: ${l.name}` : l.name}</span>
                <span className="farm-num">{l.text}</span>
              </li>
            ))}
          </ul>
          {lines.length > TOP_STATS ? (
            <Button size="sm" variant="ghost" aria-expanded={allStats} aria-controls="qp-lines" onClick={() => setAllStats((v) => !v)}>
              {allStats ? "Show top 5" : `Show all ${lines.length}`}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-ink-mute" data-testid="qp-footnote">
          Map score, not predicted drops. {d.quickPicks.patchNote} {unverifiedCount} unverified values in the data.{" "}
          <Link href="/methodology/#farm-planner" className="underline">How this is scored</Link>
        </p>
      </div>

      {sheet && sheetPick ? (
        <ModSheet
          anchor={`[data-chip="${targetId(sheet)}"]`}
          title={modLabel(d, sheetPick.modId, sheetPick.value)}
          where={nameOf(sheet)}
          flag={findMod(sheetPick.modId)?.confidence}
          alts={sheetAlts.map((s) => ({
            label: modLabel(d, s.to.modId, s.to.value),
            net: s.net,
            moreDanger: changeSign(s.danger) > 0,
            flag: findMod(s.to.modId)?.confidence,
          }))}
          onApply={apply}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  );
}

function subjectPicks(l: Loadout, index: number) {
  const s = subjectAt(l, index);
  return s.kind === "tablet" ? s.tablet : s.waystone;
}
