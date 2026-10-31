'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  analyzeCharacter,
  analyzeFromPob,
  snapshotKey,
  type Analysis,
  type PobAnalysis,
} from '@poe2/core'
import { Accordion } from '@/components/shared/Accordion'
import { PanelControls } from '@/components/shared/PanelControls'
import { StatusChip } from '@/components/shared/Instruments'
import { Attribution } from '@/components/Attribution'
import { BuildScore } from '@/components/BuildScore'
import { DefensePanel } from '@/components/DefensePanel'
import { DpsMatrix } from '@/components/DpsMatrix'
import { DamageReview } from '@/components/DamageReview'
import { GearWorkbench } from '@/components/GearWorkbench'
import { CharacterVerdict } from '@/components/character/CharacterVerdict'
import { DefencesGlance, SpareAndChanges, TreeDataNote } from '@/components/character/OverviewCards'
import { CharacterNotes } from '@/components/character/CharacterNotes'
import { ChangedSincePanel } from '@/components/character/ChangedSincePanel'
import { CompareCharacters } from '@/components/character/CompareCharacters'
import { CopyLink } from '@/components/character/CopyLink'
import { ShareCard } from '@/components/character/ShareCard'
import { useShoppingList } from '@/hooks/useShoppingList'
import { attributesFrom } from '@/lib/attributes'
import { Headroom } from '@/components/Headroom'
import { AuditPanel } from '@/components/AuditPanel'
import { Chat } from '@/components/Chat'
import { PobAnalysisView } from '@/components/PobAnalysisView'
import { ImportBar, importProfile, type ImportResult } from '@/components/ImportBar'
import { Progress } from '@/components/Progress'
import { Reconciliation } from '@/components/Reconciliation'
import { Recommendations } from '@/components/Recommendations'
import { Skeleton } from '@/components/Skeleton'
import { TreePanel } from '@/components/tree/TreePanel'
import { useCharacterHistory } from '@/lib/useCharacterHistory'
import { recordRecent } from '@/lib/recentCharacters'
import { gradeText } from '@/components/BuildScore'
import { useLadder } from '@/lib/useLadder'
import { ScrollSpyNav } from '@/components/shared/ScrollSpyNav'
import { WhatIfPanel } from '@/components/character/WhatIfPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { useModTiers } from '@/lib/useModTiers'
import { useSupportCatalog } from '@/lib/useSupportCatalog'
import { usePassiveTree } from '@/lib/usePassiveTree'

/** The character page's sections, in tab-bar and DOM order. */
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'findings', label: 'Findings' },
  { id: 'defences', label: 'Defences' },
  { id: 'damage', label: 'Damage' },
  { id: 'gear', label: 'Gear' },
  { id: 'checks', label: 'Checks' },
  { id: 'progress', label: 'Progress' },
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="page-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title">
        {title}
      </h2>
      <div className="grid-cards">{children}</div>
    </section>
  )
}

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  // A Path of Building code yields fewer panels — every figure real, none of
  // them estimated — so it is kept as its own shape rather than pretending to
  // be a full poe.ninja analysis with holes in it.
  const [pobAnalysis, setPobAnalysis] = useState<PobAnalysis | null>(null)
  // Kept so the analysis can be re-derived as each optional input lands. Every
  // one only makes the result MORE specific, and re-running is cheap — it is
  // pure computation over already-parsed data.
  const [raw, setRaw] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The profile URL of the current import, when it came from one.
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)

  // One fetch each, for the whole page. The gear panel and the findings list
  // must agree about what is wasted and what would fix it; the tree drawing and
  // the keystone corrections must agree about what is allocated. Two fetches of
  // the same artifact into two components is how both of those drift.
  const tiersState = useModTiers(raw !== null)
  const treeState = usePassiveTree(raw !== null)
  const catalogState = useSupportCatalog(raw !== null)
  // Needs the character's league and ascendancy, so it can only start once
  // there is a first analysis. Failure is silent: the assessment already knows
  // how to leave damage unscored and say why.
  const ladder = useLadder(analysis?.identity.league ?? null, analysis?.identity.className ?? null)
  const shopping = useShoppingList()
  // Memoised so the gear panels' own memos don't recompute on every render.
  const attributes = useMemo(() => attributesFrom(analysis?.pobStats ?? null), [analysis])

  // One options object for the main analysis and the what-if re-runs.
  const analysisOptions = useMemo(
    () => ({
      ...(tiersState.status === 'ready' ? { tiers: tiersState.tiers } : {}),
      ...(treeState.status === 'ready' ? { tree: treeState.tree } : {}),
      ladder,
    }),
    [tiersState, treeState, ladder],
  )

  useEffect(() => {
    if (!raw) return
    let cancelled = false
    void analyzeCharacter(raw, analysisOptions)
      .then((next) => {
        if (!cancelled) setAnalysis(next)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(`Could not analyse that data: ${err.message}`)
        setAnalysis(null)
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [raw, analysisOptions])

  // Only recorded once the tree has settled, either way. A snapshot taken
  // before then carries an uncorrected pool, and would be followed by a
  // corrected one — two rows for one import, showing a change nobody made.
  const treeSettled = treeState.status === 'ready' || treeState.status === 'error'
  const settled = treeSettled ? analysis : null
  const history = useCharacterHistory(settled)

  // A recent-characters row carries no figures the tree could correct, but it
  // is recorded in the same commit as the snapshot anyway: recorded earlier, a
  // visitor who left in that gap got a recents chip (and a Compare candidate)
  // with no snapshot behind it, and no "Last character" card on the home page.
  useEffect(() => {
    if (!sourceUrl || !settled) return
    const { identity } = settled
    if (!identity.account || !identity.name) return
    recordRecent({
      url: sourceUrl,
      key: snapshotKey(identity),
      name: identity.name,
      className: identity.className ?? null,
      level: identity.level ?? null,
      grade: gradeText(settled.assessment)?.letter ?? null,
      at: new Date().toISOString(),
    })
  }, [sourceUrl, settled])

  const handleResult = useCallback(async (r: ImportResult) => {
    if (!r.ok) {
      setError(r.error)
      return
    }
    setError(null)
    setBusy(true)
    setSourceUrl(r.kind === 'ninja' ? (r.url ?? null) : null)
    try {
      if (r.kind === 'pob') {
        setAnalysis(null)
        setRaw(null)
        setPobAnalysis(await analyzeFromPob(r.code))
        setBusy(false)
      } else {
        setPobAnalysis(null)
        setAnalysis(null)
        // The effect above owns analysis from here — it re-runs as the tree,
        // affix data and ladder sample land, and clears `busy` when done.
        setRaw(r.data)
      }
    } catch (err) {
      setError(`Could not analyse that data: ${(err as Error).message}`)
      setAnalysis(null)
      setBusy(false)
    }
  }, [])

  // `?import=<poe.ninja URL>` — from the home page's "Re-import" link, a
  // reload, or a shared link. Read here, once per visit to the page.
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('import')
    if (!target) return
    let cancelled = false
    // The effect starts a fetch; the page has to show it is busy for its length.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true)
    void importProfile(target).then((r) => {
      if (cancelled) return
      setBusy(false)
      void handleResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [handleResult])

  const a = analysis
  const treeForNote = treeState.status === 'ready' ? treeState.tree : null
  const overcapped = a ? a.attribution.stats.filter((st) => st.overcap > 0) : []

  return (
    <>
      <PageHeader
        eyebrow="Character import"
        title="Character"
        accent="Analysis"
        source="poe.ninja"
        description="Reads poe.ninja’s own computed character data and turns it into ranked, quantified findings. Nothing here is re-derived from scratch, and nothing is invented — where a number can’t be established, it says so."
      />

      {a || pobAnalysis ? (
        // Once a character is loaded the import box steps aside, so the verdict
        // sits near the top. Keyed so it closes again on the next load.
        <details data-surface="data" className="card group">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-sm text-ink-dim [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="size-3.5 text-accent transition-transform group-open:rotate-90"
            >
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Load another character
          </summary>
          <div className="dbody border-t border-line">
            <ImportBar onResult={handleResult} busy={busy} setBusy={setBusy} />
          </div>
        </details>
      ) : (
        <ImportBar onResult={handleResult} busy={busy} setBusy={setBusy} />
      )}

      {error ? (
        <p role="alert" className="mt-4 border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        {busy ? <Skeleton /> : null}

        {!busy && !a && !pobAnalysis ? (
          <div className="border border-dashed border-line-strong bg-surface-raised/40 px-6 py-16 text-center">
            <p className="text-sm text-ink-dim">Import a character to see its analysis.</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-mute">
              Survivability is led by the smallest hit that kills, not by an averaged effective health pool — which on
              a typical character overstates safety by three times or more.
            </p>
          </div>
        ) : null}

        {!busy && pobAnalysis ? (
          <div className="space-y-4">
            <PobAnalysisView analysis={pobAnalysis} />
            <Chat pob={pobAnalysis} />
          </div>
        ) : null}

        {!busy && a ? (
          <>
            <ScrollSpyNav
              label="On this page"
              items={SECTIONS.map((s) =>
                // The findings count is the cards shown; a sound build shows a summary instead, so no count.
                s.id === 'findings' && !a.recommendations.buildIsSound
                  ? { ...s, count: a.recommendations.recommendations.filter((r) => r.category !== 'question').length }
                  : s
              )}
            />

            <Section id="overview" title="Overview">
              <CharacterVerdict analysis={a}>
                {sourceUrl ? <CopyLink url={sourceUrl} name={a.identity.name} /> : null}
                <ShareCard analysis={a} sourceUrl={sourceUrl} />
              </CharacterVerdict>
              {a.warnings.map((w) => (
                <p key={w} data-surface="data" className="card border-warn/50 text-xs leading-relaxed text-warn">
                  {w}
                </p>
              ))}
              <SpareAndChanges analysis={a} diff={history.diff} />
              <DefencesGlance analysis={a} />
              <TreeDataNote analysis={a} tree={treeForNote} />
              <BuildScore assessment={a.assessment} keystones={a.keystones} />
            </Section>

            <Section id="findings" title="Findings">
              <Recommendations report={a.recommendations} />
            </Section>

            <Section id="defences" title="Defences">
              <DefensePanel d={a.defense} />
              <Headroom defense={a.defense} />
              <WhatIfPanel analysis={a} options={analysisOptions} />
            </Section>

            <Section id="damage" title="Damage">
              <DpsMatrix
                dps={a.dps}
                pobConfig={a.pobConfig}
                configApplies={a.reconciliation?.checks.find((c) => c.stat.startsWith('dps:'))?.severity === 'match'}
              />
              <Accordion
                id="damage-review"
                title="Supports and gear changes for this skill"
                summary={
                  a.dps.primary
                    ? `Support-gem swaps and damage-mod upgrades for ${a.dps.primary.name}`
                    : 'Support-gem swaps and damage-mod upgrades'
                }
                lazy
              >
                <DamageReview
                  dps={a.dps}
                  model={a.model}
                  items={a.items}
                  defense={a.defense}
                  tiersState={tiersState}
                  catalogState={catalogState}
                  bare
                />
              </Accordion>
            </Section>

            <Section id="gear" title="Gear">
              <Accordion
                id="gear-workbench"
                title="Gear workbench"
                summary={
                  tiersState.status === 'error'
                    ? 'Affix tier data unavailable'
                    : 'Replace-first ranking · remove, re-tier or swap affixes and watch your resistances'
                }
                badge={(() => {
                  const open = shopping.entries.filter((e) => e.characterName === a.identity.name && !e.done).length
                  return open ? <StatusChip tone="good">{open} on shopping list</StatusChip> : undefined
                })()}
              >
                <GearWorkbench
                  items={a.items}
                  defense={a.defense}
                  attribution={a.attribution}
                  state={tiersState}
                  characterName={a.identity.name}
                  recommendations={a.recommendations.recommendations}
                  {...(attributes ? { attributes } : {})}
                  bare
                />
              </Accordion>
              <Accordion
                id="attribution"
                title="What each item is holding up"
                summary={`${a.attribution.items.length} item${a.attribution.items.length === 1 ? '' : 's'} attributed`}
                badge={overcapped.length > 0 ? <StatusChip tone="muted">{overcapped.length} over cap</StatusChip> : undefined}
              >
                <Attribution report={a.attribution} bare />
              </Accordion>
            </Section>

            <Section id="checks" title="Checks">
              <div className="flex items-center">
                <PanelControls targetId="checks-list" />
              </div>
              <div id="checks-list" className="grid-cards">
                <Accordion
                  id="detail-checks"
                  title="Detail checks"
                  summary="Sockets, gem quality, jewels and spare attributes"
                >
                  <AuditPanel model={a.model} pobStats={a.pobStats} state={tiersState} bare />
                </Accordion>
                <Accordion id="character-notes" title="Ailments and inactive weapon set" summary="Immunities, main-skill note, idle gear">
                  <CharacterNotes analysis={a} />
                </Accordion>
                <Accordion
                  id="passive-tree"
                  title="Passive tree"
                  summary={`${a.passives.counts.passives} points allocated`}
                  lazy
                >
                  <TreePanel allocation={a.passives} state={treeState} bare />
                </Accordion>
                {a.reconciliation ? (
                  <Accordion
                    id="reconciliation"
                    title="Cross-validation"
                    summary={`${a.reconciliation.matches} agree${a.reconciliation.minor ? ` · ${a.reconciliation.minor} minor` : ''}${a.reconciliation.unmapped ? ` · ${a.reconciliation.unmapped} unmapped` : ''}`}
                    badge={
                      a.reconciliation.major > 0 ? <StatusChip tone="danger">{a.reconciliation.major} major</StatusChip> : undefined
                    }
                  >
                    <Reconciliation report={a.reconciliation} bare />
                  </Accordion>
                ) : null}
              </div>
              <Chat analysis={a} />
            </Section>

            <Section id="progress" title="Progress">
              <ChangedSincePanel analysis={a} snapshots={history.snapshots} />
              <Accordion
                id="progress-history"
                title="Trends across imports"
                summary={
                  history.diff
                    ? `${history.diff.changes.length} figure${history.diff.changes.length === 1 ? '' : 's'} moved since your last import`
                    : 'Import again after playing to see what moved'
                }
                badge={
                  history.diff?.newlyUncapped.length ? (
                    <StatusChip tone="danger">Dropped below cap</StatusChip>
                  ) : history.diff?.newlyCapped.length ? (
                    <StatusChip tone="good">Capped</StatusChip>
                  ) : undefined
                }
              >
                <Progress history={history} bare />
              </Accordion>
              <Accordion
                id="compare"
                title="Compare with another character"
                summary="Side by side with a character you imported before, from saved snapshots"
              >
                <CompareCharacters currentKey={snapshotKey(a.identity)} currentName={a.identity.name} bare />
              </Accordion>
            </Section>
          </>
        ) : null}
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-mute">
        Character data from poe.ninja. Path of Exile 2 is a trademark of Grinding Gear Games; this is an unofficial
        fan-made tool.
      </footer>
    </>
  )
}
