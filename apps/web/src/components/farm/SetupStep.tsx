"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { farmData as d, countByConfidence, dataSourcesLabel, findMod, unverifiedCount } from "@/data/farm";
import { farmingStrategies } from "@/data/strategies";
import { Button, Input, Segmented, Select } from "@/components/shared/controls";
import { useBuildLayers } from "@/hooks/useBuildLayers";
import { isLoadout, useFarm } from "@/hooks/useFarm";
import { removePick, setMapContext, setTabletRarity, setTabletType, setWaystone } from "@/lib/farm/edit";
import { isCorrupted, maxTablets, roomOn, validate, waystoneLimits } from "@/lib/farm/rules";
import { changeSign, formatChange, pctChange, presetFor, scoreLoadout, type Change, type ScoreOptions } from "@/lib/farm/score";
import { starterLoadout, typeForPreset } from "@/lib/farm/starter";
import { applySwap, bestSwaps, netLabels, rollFor, subjectAt, withPick, type SwapTarget } from "@/lib/farm/swaps";
import { computeTotals } from "@/lib/farm/totals";
import type { Loadout, MapContext, ModPick, RiskKey, Side, Tablet } from "@/lib/farm/types";
import { CUSTOM_FARM } from "./ids";

const RISK_OPTIONS: { value: RiskKey; label: string }[] = [
  { value: "safe", label: "Play safe" },
  { value: "balanced", label: "Balanced" },
  { value: "greedy", label: "Greedy" },
];
const CONTEXT_LABEL: Record<MapContext, string> = {
  standard: `Standard map (up to ${d.rules.maxTabletsPerMap} tablets)`,
  overlap: `Overlapping towers (up to ${d.rules.maxTabletsPerCityMap})`,
  city: `City map, Industrial Improvements (up to ${d.rules.maxTabletsPerCityMap})`,
};
const statById = new Map(d.stats.map((s) => [s.id, s]));
const num = (n: number) => Math.round(n).toLocaleString("en-US");
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

const statName = (modId: string) => {
  const st = statById.get(findMod(modId)?.stat ?? "");
  return st ? `${st.name}${st.danger ? " (danger)" : ""}` : modId;
};
/** The mod text with this roll in place of its range. */
const filled = (modId: string, value: number) => (findMod(modId)?.text ?? modId).replace(/\(\d+–\d+\)/, String(value));

function Num({ value, tone }: { value: string; tone?: "good" | "danger" }) {
  return (
    <span key={value} className="farm-num" data-tone={tone}>
      {value}
    </span>
  );
}

function Delta({ c, upIsBad = false }: { c: Change; upIsBad?: boolean }) {
  const sign = changeSign(c);
  const tone = sign === 0 ? undefined : (sign > 0) !== upIsBad ? "good" : "danger";
  return <span className="farm-num" data-tone={tone}>{formatChange(c)}</span>;
}

function ValueField({ label, min, max, value, onCommit }: { label: string; min: number; max: number; value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Math.round(Number(draft));
    setDraft(null);
    if (Number.isFinite(n) && draft.trim() !== "") onCommit(Math.min(max, Math.max(min, n)));
  };
  return (
    <span className="farm-value">
      <Input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="farm-num"
      />
      <span className="farm-range" aria-hidden="true">{min === max ? min : `${min}–${max}`}</span>
    </span>
  );
}

interface RowProps {
  label: string;
  side: Side;
  pick: ModPick | null;
  candidates: string[];
  nets: Map<string, Change> | undefined;
  onPick: (modId: string) => void;
  onTier: (tier: number) => void;
  onValue: (v: number) => void;
  onRemove: () => void;
}

function ModRow({ label, side, pick, candidates, nets, onPick, onTier, onValue, onRemove }: RowProps) {
  const mod = pick ? findMod(pick.modId) : undefined;
  const tier = mod?.tiers.find((t) => t.tier === pick!.tier) ?? mod?.tiers[0];
  return (
    <div className="farm-mod">
      <div className="farm-mod-row">
        <Select aria-label={label} value={pick?.modId ?? ""} onChange={(e) => e.target.value && onPick(e.target.value)} className="farm-mod-select">
          {!pick ? <option value="" disabled>{`Add ${side}…`}</option> : null}
          {candidates.map((id) => (
            <option key={id} value={id}>
              {id === pick?.modId ? `${statName(id)} · current` : `${statName(id)} · Net ${formatChange(nets?.get(id) ?? { kind: "none" })}`}
            </option>
          ))}
        </Select>
        {pick && mod && tier ? (
          <>
            <Select aria-label={`${label} tier`} value={pick.tier} onChange={(e) => onTier(Number(e.target.value))} className="farm-tier">
              {mod.tiers.map((t) => (
                <option key={t.tier} value={t.tier}>{`T${t.tier}`}</option>
              ))}
            </Select>
            <ValueField label={`${label} value`} min={tier.min} max={tier.max} value={pick.value} onCommit={onValue} />
            <Button size="sm" variant="ghost" aria-label={`Remove ${label}`} onClick={onRemove}>Remove</Button>
          </>
        ) : null}
      </div>
      {pick && mod ? (
        <p className="farm-mod-text">
          {filled(pick.modId, pick.value)}
          {mod.confidence !== "confirmed" ? <span className="farm-flag"> · {mod.confidence === "single" ? "single source" : "unverified"}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function fmtTotal(statId: string, total: number) {
  const st = statById.get(statId)!;
  const n = Number(total.toFixed(2));
  if (st.combine === "flag") return String(n);
  if (st.combine === "multiply") return `${n}${st.unit}`;
  return `${n >= 0 ? "+" : "−"}${Math.abs(n)}${st.unit}`;
}

export default function SetupStep({ strategyId, onChangeFarm }: { strategyId: string; onChangeFarm: () => void }) {
  const { farm, saveLoadout, setRisk, setBuildAware, setPreset } = useFarm();
  const build = useBuildLayers();
  const strategy = farmingStrategies.find((s) => s.id === strategyId);
  const mapped = strategyId === CUSTOM_FARM ? { id: "general", fallback: true } : presetFor(d, strategyId);
  const presetId = farm.presets?.[strategyId] && d.weights.presets[farm.presets[strategyId]!] ? farm.presets[strategyId]! : mapped.id;
  const risk = farm.risk ?? "balanced";
  const layers = farm.buildAware && build ? build.layers : null;
  const layersKey = layers?.join(",") ?? "";
  const o: ScoreOptions = useMemo(() => ({ presetId, risk, layers }), [presetId, risk, layersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = farm.loadouts[strategyId];
  const usable = saved && isLoadout(saved.loadout) ? saved : undefined;
  const loadout: Loadout = useMemo(() => usable?.loadout ?? starterLoadout(d, strategyId, presetId, o), [usable, strategyId, presetId, o]);
  const score = useMemo(() => scoreLoadout(d, loadout, o), [loadout, o]);
  const baseline = usable?.baseline ?? score;

  // The first view of a farm saves its starter loadout and the figures the page measures change from.
  useEffect(() => {
    if (!usable) saveLoadout(strategyId, loadout, score);
  }, [usable, strategyId, loadout, score, saveLoadout]);

  const commit = (next: Loadout) => saveLoadout(strategyId, next, usable?.baseline ?? baseline);
  const totals = useMemo(() => computeTotals(d, loadout), [loadout]);
  const swaps = useMemo(() => bestSwaps(d, loadout, o, 3), [loadout, o]);
  const errors = useMemo(() => validate(d, loadout), [loadout]);
  const nets = useMemo(() => {
    const out = new Map<string, Map<string, Change>>();
    for (let index = 0; index <= loadout.tablets.length; index++) {
      const sub = subjectAt(loadout, index);
      const x = sub.kind === "tablet" ? sub.tablet : sub.waystone;
      for (const side of ["prefix", "suffix"] as const) {
        const n = (side === "prefix" ? x.prefixes : x.suffixes).length;
        for (let slot = 0; slot <= n; slot++) out.set(`${index}:${side}:${slot}`, netLabels(d, loadout, o, { index, side, slot }));
      }
    }
    return out;
  }, [loadout, o]);

  const cap = maxTablets(d, loadout.options.mapContext);
  const way = loadout.waystone;
  const wLim = waystoneLimits(d, way);
  const isSeed = (() => { const c = countByConfidence(); return c.confirmed + c.single === 0; })();
  const preset = d.weights.presets[presetId]!;
  const title = strategy ? strategy.name : "Any farm / custom";

  const targetName = (index: number) => (index < loadout.tablets.length ? `Tablet ${index + 1}` : "Waystone");
  const targetOf = (t: SwapTarget) => ({ ...t });
  const rows = (index: number) => {
    const sub = subjectAt(loadout, index);
    const x = sub.kind === "tablet" ? sub.tablet : sub.waystone;
    return (["prefix", "suffix"] as const).flatMap((side) => {
      const list = side === "prefix" ? x.prefixes : x.suffixes;
      const slots: (ModPick | null)[] = [...list];
      if (roomOn(d, sub, side, loadout.options.keystones) > 0) slots.push(null);
      return slots.map((pick, slot) => {
        const t = targetOf({ index, side, slot });
        const map = nets.get(`${index}:${side}:${slot}`);
        const cands = [...(map?.keys() ?? [])];
        return (
          <ModRow
            key={`${side}${slot}${pick?.modId ?? "new"}`}
            label={`${targetName(index)} ${side} ${slot + 1}`}
            side={side}
            pick={pick}
            candidates={cands}
            nets={map}
            onPick={(modId) => commit(withPick(loadout, t, rollFor(modId, pick)))}
            onTier={(tier) => {
              const m = findMod(pick!.modId)!;
              const tr = m.tiers.find((z) => z.tier === tier)!;
              commit(withPick(loadout, t, { modId: pick!.modId, tier, value: Math.min(tr.max, Math.max(tr.min, pick!.value)) }));
            }}
            onValue={(value) => commit(withPick(loadout, t, { ...pick!, value }))}
            onRemove={() => commit(removePick(loadout, t))}
          />
        );
      });
    });
  };

  const changeFrom = (a: number, b: number) => pctChange(a, b);
  const rewardC = changeFrom(baseline.reward, score.reward);
  const dangerC = changeFrom(baseline.danger, score.danger);
  const netC = changeFrom(baseline.net, score.net);

  const totalRows = Object.entries(totals)
    .map(([id, t]) => ({ id, st: statById.get(id)!, t }))
    .sort((a, b) => Number(b.st.danger) - Number(a.st.danger) || a.st.name.localeCompare(b.st.name));

  const typeCounts = loadout.tablets.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.type]: (acc[t.type] ?? 0) + 1 }), {});
  const stacking = d.rules.mechanicStacking.filter((s) => (typeCounts[s.type] ?? 0) >= s.count);

  return (
    <div className="flex flex-col gap-5" data-testid="farm-setup">
      <div className="farm-sticky" aria-hidden="true">
        Reward {num(score.reward)} · Danger {num(score.danger)} · Net {num(score.net)}
      </div>

      {isSeed ? <p className="farm-banner" role="note">Example data, not verified.</p> : null}

      <header data-surface="data" className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="title-sentence text-[19px] text-ink">{title}</h3>
          <Button size="sm" onClick={onChangeFarm}>Change farm</Button>
        </div>
        <div className="farm-controls">
          <div className="flex flex-col gap-1.5">
            <span className="label-field" id="farm-risk-label">Danger setting</span>
            <Segmented kind="toggle" label="Danger setting" options={RISK_OPTIONS.map((r) => ({ value: r.value, label: `${r.label} ×${d.weights.risk[r.value]}` }))} value={risk} onChange={setRisk} scroll />
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="label-field">Scoring preset</span>
            <Select value={presetId} onChange={(e) => setPreset(strategyId, e.target.value === mapped.id ? undefined : e.target.value)}>
              {Object.entries(d.weights.presets).map(([id, p]) => (
                <option key={id} value={id}>{p.name}</option>
              ))}
            </Select>
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!layers} disabled={!build} onChange={(e) => setBuildAware(e.target.checked)} />
              <span>Danger for my build</span>
            </label>
            <span className="text-xs text-ink-mute">
              {build ? `Uses ${build.name}: ${build.layers.map((l) => (l === "es" ? "ES" : l)).join(", ")}.` : "Import a character on the Character page to turn this on."}
            </span>
          </div>
        </div>
        {mapped.fallback && strategyId !== CUSTOM_FARM ? <p className="text-xs text-ink-mute">No preset for this farm in the data; scored with “{preset.name}”.</p> : null}
      </header>

      <section aria-labelledby="farm-map-h" data-surface="data" className="card flex flex-col gap-3">
        <h3 id="farm-map-h" className="section-title !mb-0">Map and Atlas</h3>
        <div className="farm-controls">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="label-field">Where the map sits</span>
            <Select value={loadout.options.mapContext} onChange={(e) => commit(setMapContext(loadout, e.target.value as MapContext))}>
              {(Object.keys(CONTEXT_LABEL) as MapContext[]).map((k) => (
                <option key={k} value={k}>{CONTEXT_LABEL[k]}</option>
              ))}
            </Select>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={loadout.options.keystones} onChange={(e) => commit({ ...loadout, options: { ...loadout.options, keystones: e.target.checked } })} />
            <span>Reverse Transcription and Partial Translation allocated <span className="block text-xs text-ink-mute">Rare tablets take {d.rules.rarity.rare.totalWithKeystones} mods, not {d.rules.rarity.rare.totalBase}.</span></span>
          </label>
        </div>
        <fieldset className="farm-passives">
          <legend className="label-field">Atlas passives you have (off by default)</legend>
          {d.effectModifiers.map((e) => {
            const blocked = e.requires === "city" && loadout.options.mapContext !== "city";
            const on = loadout.options.effects.includes(e.id);
            return (
              <label key={e.id} className="flex items-start gap-2 text-sm text-ink-dim">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={on && !blocked}
                  disabled={blocked}
                  onChange={(ev) => commit({ ...loadout, options: { ...loadout.options, effects: ev.target.checked ? [...loadout.options.effects, e.id] : loadout.options.effects.filter((x) => x !== e.id) } })}
                />
                <span>{e.text}{blocked ? " — City maps only" : ""}</span>
              </label>
            );
          })}
        </fieldset>
      </section>

      <section aria-labelledby="farm-tablets-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="farm-tablets-h" className="section-title !mb-0">Tablets affecting this map</h3>
          <span className="text-xs text-ink-mute">{loadout.tablets.length} of {cap}</span>
        </div>
        <div className="farm-cards">
          {loadout.tablets.map((t: Tablet, i) => (
            <article key={i} data-surface="data" className="card flex flex-col gap-3" aria-label={`Tablet ${i + 1}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="label-field">Tablet {i + 1}</h4>
                <Button size="sm" variant="ghost" onClick={() => commit({ ...loadout, tablets: loadout.tablets.filter((_, j) => j !== i) })}>Remove tablet</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="label-field">Type</span>
                  <Select value={t.type} onChange={(e) => commit(setTabletType(loadout, i, e.target.value))}>
                    {d.tabletTypes.map((ty) => (
                      <option key={ty.id} value={ty.id}>{ty.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="label-field">Rarity</span>
                  <Select value={t.rarity} onChange={(e) => commit(setTabletRarity(d, loadout, i, e.target.value as Tablet["rarity"]))}>
                    <option value="magic">Magic</option>
                    <option value="rare">Rare</option>
                  </Select>
                </label>
              </div>
              {rows(i)}
            </article>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={loadout.tablets.length >= cap}
            onClick={() => commit({ ...loadout, tablets: [...loadout.tablets, { type: typeForPreset(d, presetId), rarity: "rare", prefixes: [], suffixes: [] }] })}
          >
            Add tablet
          </Button>
          {loadout.tablets.length >= cap ? <span className="text-xs text-ink-mute">{cap} is the most that can affect this map here.</span> : null}
        </div>
      </section>

      <section aria-labelledby="farm-way-h" data-surface="data" className="card flex flex-col gap-3">
        <h3 id="farm-way-h" className="section-title !mb-0">Waystone</h3>
        <div className="farm-controls">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="label-field">Tier</span>
            <Select value={way.tier} onChange={(e) => commit(setWaystone(d, loadout, { tier: Number(e.target.value) }))}>
              {Array.from({ length: d.rules.waystoneMaxTier }, (_, k) => k + 1).map((n) => (
                <option key={n} value={n}>{`Tier ${n} · area level ${n + d.rules.waystoneAreaLevelOffset}`}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="label-field">Rarity</span>
            <Select value={way.rarity} onChange={(e) => commit(setWaystone(d, loadout, { rarity: e.target.value as "magic" | "rare" }))}>
              <option value="magic">Magic</option>
              <option value="rare">Rare</option>
            </Select>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={isCorrupted(d, way)} disabled={way.tier >= d.rules.waystoneMaxTier} onChange={(e) => commit(setWaystone(d, loadout, { corrupted: e.target.checked }))} />
            <span>Corrupted (Vaal reforge)<span className="block text-xs text-ink-mute">Up to {d.rules.waystoneMaxModsCorrupted} mods. Tier {d.rules.waystoneMaxTier} is always corrupted.</span></span>
          </label>
        </div>
        <p className="text-xs text-ink-mute">{capital(way.rarity)} Waystone: up to {wLim.total} mods ({wLim.prefix} prefixes, {wLim.suffix} suffixes).</p>
        {rows(loadout.tablets.length)}
      </section>

      <section aria-labelledby="farm-result-h" data-surface="data" className="card flex flex-col gap-5" data-testid="farm-result">
        <h3 id="farm-result-h" className="section-title !mb-0">Result</h3>
        {errors.length > 0 ? (
          <ul className="farm-errors" role="alert">
            {errors.map((e) => (
              <li key={e}>Fix: {e}</li>
            ))}
          </ul>
        ) : null}
        <dl className="farm-figures">
          <div>
            <dt className="label-metric">Reward</dt>
            <dd><Num value={num(score.reward)} /> <Delta c={rewardC} /> <span className="farm-since">since start</span></dd>
          </div>
          <div>
            <dt className="label-metric">Danger</dt>
            <dd><Num value={num(score.danger)} /> <Delta c={dangerC} upIsBad /> <span className="farm-since">since start</span></dd>
          </div>
          <div>
            <dt className="label-metric">Net</dt>
            <dd data-testid="farm-net"><Num value={num(score.net)} /> <Delta c={netC} /> <span className="farm-since">since start</span></dd>
          </div>
        </dl>

        <div>
          <h4 className="label-field mb-2">Best 3 swaps</h4>
          {swaps.length === 0 ? (
            <p className="text-sm text-ink-mute">No single swap raises Net from here.</p>
          ) : (
            <ol className="farm-swaps">
              {swaps.map((s) => (
                <li key={`${s.target.index}${s.target.side}${s.target.slot}${s.to.modId}`}>
                  <span className="text-sm text-ink-dim">
                    {targetName(s.target.index)} {s.target.side}: {s.from ? statName(s.from.modId) : "empty"} → {statName(s.to.modId)} · Reward <Delta c={s.reward} /> · Danger <Delta c={s.danger} upIsBad /> · Net <Delta c={s.net} />
                  </span>
                  <Button size="sm" onClick={() => commit(applySwap(loadout, s))}>Apply</Button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h4 className="label-field mb-2">What the map has</h4>
          {totalRows.length === 0 ? (
            <p className="text-sm text-ink-mute">Nothing yet. Add a modifier.</p>
          ) : (
            <ul className="farm-totals">
              {totalRows.map(({ id, st, t }) => (
                <li key={id} data-danger={st.danger || undefined}>
                  <span className="farm-total-name">{st.name}{st.danger ? " (danger)" : ""}</span>
                  <span className="farm-num">{fmtTotal(id, t.total)}</span>
                  <span className="farm-total-src">{t.sources.map((s) => `${s.from} ${s.value >= 0 ? "+" : "−"}${Number(Math.abs(s.value).toFixed(2))}`).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {stacking.length > 0 ? (
          <div>
            <h4 className="label-field mb-2">Mechanic effects</h4>
            <ul className="text-sm text-ink-dim">
              {stacking.map((s) => (
                <li key={`${s.type}${s.count}`}>{capital(s.type)} ×{s.count}: {s.effect}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs text-ink-mute" data-testid="farm-footnote">
          Map score, not predicted drops. {isSeed ? "Example data, not verified" : `Values from ${dataSourcesLabel()}`} · patch {d.patch} · {unverifiedCount} unverified.{" "}
          <Link href="/methodology/#farm-planner" className="underline">How this is scored</Link>
        </p>
      </section>
    </div>
  );
}

