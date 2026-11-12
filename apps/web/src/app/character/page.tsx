'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { preconnect } from 'react-dom'
import dynamic from 'next/dynamic'
import {
  analyzeCharacter,
  analyzeFromPob,
  snapshotKey,
  type Analysis,
  type PobAnalysis,
} from '@poe2/core'
import { ImportBar, importProfile, sharedProfileUrl, type ImportResult } from '@/components/ImportBar'
import { Skeleton } from '@/components/Skeleton'
import { useCharacterHistory } from '@/lib/useCharacterHistory'
import { recordRecent } from '@/lib/recentCharacters'
import { gradeText } from '@/lib/grade'
import { useLadder } from '@/lib/useLadder'
import { PROXY_BASE } from '@/lib/proxy'
import { PageHeader } from '@/components/layout/PageHeader'
import { analysisNeedsDisplay, useModTiers } from '@/lib/useModTiers'
import { useSupportCatalog } from '@/lib/useSupportCatalog'
import { usePassiveTree } from '@/lib/usePassiveTree'
import { useCharacterTab } from '@/lib/characterTab'

// Everything below the import box only renders once a character is loaded, so it is its own chunk. Overview (build card,
// Top 3) is in it; every other tab is a chunk of its own, fetched when the tab opens. The chunk is requested when an
// import starts, in parallel with the proxy, not after the first analysis.
const loadResults = () => import('@/components/character/CharacterResults')
const CharacterResults = dynamic(() => loadResults().then((m) => m.CharacterResults), {
  ssr: false,
  loading: () => <Skeleton />,
})
const PobResults = dynamic(() => loadResults().then((m) => m.PobResults), {
  ssr: false,
  loading: () => <Skeleton />,
})

/** How long Top 3 waits for the ladder sample once the tiers and the tree are in. It then lands as one more run. */
const LADDER_GRACE_MS = 600

export default function Home() {
  // The proxy origin is known at build time, so the connection can be opened while the page is still parsing.
  preconnect(PROXY_BASE)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  // A Path of Building code yields fewer panels — every figure real, none of
  // them estimated — so it is kept as its own shape rather than pretending to
  // be a full poe.ninja analysis with holes in it.
  const [pobAnalysis, setPobAnalysis] = useState<PobAnalysis | null>(null)
  // Kept so the analysis can be re-derived as each optional input lands. Every
  // one only makes the result MORE specific, and re-running is cheap — it is
  // pure computation over already-parsed data.
  const [raw, setRaw] = useState<unknown>(null)
  const { tab, target, opened, select: selectTab } = useCharacterTab()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The profile URL of the current import, when it came from one.
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  // Whether "Load another character" is open while the import box is collapsed.
  const [boxOpen, setBoxOpen] = useState(false)
  // An import starting closes the box, so the skeleton sits where the panels will land (no shift when they do).
  const setImportBusy = useCallback((b: boolean) => {
    setBusy(b)
    if (b) {
      setBoxOpen(false)
      void loadResults()
    }
  }, [])

  // One fetch each, for the whole page. The gear panel and the findings list must agree about what is wasted and what
  // would fix it; the tree drawing and the keystone corrections must agree about what is allocated.
  //
  // What loads when: the affix ladders on import (Top 3 needs them); the passive tree once the build card has painted,
  // when the browser is idle (keystones can change the card's pool and the findings, and the history snapshot waits for
  // it); the support-gem catalogue when Damage opens; the implicit/unique mod text when Gear, Damage or Advanced opens.
  const [treeWanted, setTreeWanted] = useState(false)
  const [tiersBase, setTiersBase] = useState(false)
  const displayTab = opened.has('gear') || opened.has('damage') || opened.has('advanced')
  const tiersState = useModTiers(raw !== null, tiersBase && displayTab)
  const treeState = usePassiveTree(treeWanted)
  const catalogState = useSupportCatalog(opened.has('damage'))
  const wantsDisplay = useMemo(() => analysisNeedsDisplay(analysis, tiersState), [analysis, tiersState])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-way latch for the hook
    if (wantsDisplay) setTiersBase(true)
  }, [wantsDisplay])
  // Needs the character's league and ascendancy, so it starts once the first analysis has painted. Failure is silent:
  // the assessment already knows how to leave damage unscored and say why.
  const { ladder, settled: ladderSettled } = useLadder(analysis?.identity.league ?? null, analysis?.identity.className ?? null)

  const treeSettled = treeState.status === 'ready' || treeState.status === 'error'
  const tiersSettled = tiersState.status === 'ready' || tiersState.status === 'error'
  const [grace, setGrace] = useState(false)
  const inputsIn = raw !== null && treeSettled && tiersSettled
  useEffect(() => {
    if (!inputsIn || ladderSettled) return
    const t = window.setTimeout(() => setGrace(true), LADDER_GRACE_MS)
    return () => window.clearTimeout(t)
  }, [inputsIn, ladderSettled])
  // The full analysis runs once its inputs are in: tiers, tree, and the ladder if it answered in time.
  const full = inputsIn && (ladderSettled || grace)

  // One options object for the main analysis and the what-if re-runs. Keyed on the tiers as first loaded, so the
  // display text arriving later does not re-run the analysis.
  const baseTiers = tiersState.status === 'ready' ? tiersState.base : null
  const tree = treeState.status === 'ready' ? treeState.tree : null
  const analysisOptions = useMemo(
    () => ({
      ...(baseTiers ? { tiers: baseTiers } : {}),
      ...(tree ? { tree } : {}),
      ladder,
    }),
    [baseTiers, tree, ladder],
  )

  // Two kinds of run per import: the card pass (the raw data alone, enough for the build card) and the full pass once
  // its inputs are in. The ladder landing after the grace window is the only reason for a third. A result from a run
  // that has since been superseded is dropped.
  const runId = useRef(0)
  const [stage, setStage] = useState<'card' | 'full'>('card')
  useEffect(() => {
    const id = ++runId.current
    if (!raw) return
    const isFull = full
    void analyzeCharacter(raw, isFull ? analysisOptions : {})
      .then((next) => {
        if (id !== runId.current) return
        setAnalysis(next)
        setStage(isFull ? 'full' : 'card')
      })
      .catch((err: Error) => {
        if (id !== runId.current) return
        setError(`Could not analyse that data: ${err.message}`)
        setAnalysis(null)
      })
      .finally(() => {
        if (id === runId.current) setBusy(false)
      })
  }, [raw, full, analysisOptions])

  // The tree is asked for once the card is on screen, when the browser is idle.
  const cardPainted = analysis !== null
  useEffect(() => {
    if (!cardPainted) return
    const ric = typeof window.requestIdleCallback === 'function'
    const h = ric ? window.requestIdleCallback(() => setTreeWanted(true), { timeout: 1000 }) : window.setTimeout(() => setTreeWanted(true), 200)
    return () => (ric ? window.cancelIdleCallback(h) : window.clearTimeout(h))
  }, [cardPainted])

  // Only recorded from the full pass. A snapshot taken before then carries an uncorrected pool, and would be followed
  // by a corrected one — two rows for one import, showing a change nobody made.
  const settled = stage === 'full' ? analysis : null
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
      // Back to the bar, which shows the error next to the URL that failed.
      setBoxOpen(true)
      return
    }
    setError(null)
    setImportBusy(true)
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
        setStage('card')
        setGrace(false)
        // The effects above own analysis from here: the card pass now, the full pass once its inputs are in.
        setRaw(r.data)
      }
    } catch (err) {
      setError(`Could not analyse that data: ${(err as Error).message}`)
      setAnalysis(null)
      setBusy(false)
    }
  }, [setImportBusy])

  // `?import=<poe.ninja URL>` — from the home page's "Re-import" link, a
  // reload, or a shared link. Read here, once per visit to the page.
  useEffect(() => {
    // `?url=` / `?text=` come from the PWA share target (Android, Samsung); iOS has none.
    const target = new URLSearchParams(window.location.search).get('import') ?? sharedProfileUrl(window.location.search)
    if (!target) return
    let cancelled = false
    // The effect starts a fetch; the page has to show it is busy for its length.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true)
    void loadResults()
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
  const collapsed = Boolean(a || pobAnalysis || busy)

  return (
    <>
      {/* Once a character is loaded the title folds into the import bar below, so the build card is the first thing on the
          phone screen. The h1 stays for headings and screen readers. */}
      {collapsed ? (
        <h1 className="sr-only">Character Analysis</h1>
      ) : (
        <PageHeader
          tool="character"
          eyebrow="Character import"
          title="Character"
          accent="Analysis"
          source="poe.ninja"
          description="Paste your poe.ninja character and see the top things to fix first."
        />
      )}

      {/* Once an import starts the box steps aside, so the verdict sits near the top. One element either way: the bar
          stays mounted and keeps a failed URL and its error. Open and summary-less until then. */}
      <details
        data-surface={collapsed ? 'data' : undefined}
        className={collapsed ? 'card ct-import group' : 'group'}
        open={collapsed ? boxOpen : true}
        onToggle={(e) => {
          if (collapsed) setBoxOpen(e.currentTarget.open)
        }}
      >
        <summary
          className={`${collapsed ? 'flex' : 'hidden'} min-h-[var(--tap-min)] cursor-pointer list-none items-center gap-3 text-sm text-ink-dim [&::-webkit-details-marker]:hidden`}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="size-3.5 text-accent transition-transform group-open:rotate-90"
          >
            <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="shrink-0">Load another character</span>
          {a ? (
            <span className="tabular ml-auto min-w-0 truncate font-mono text-[11px] text-ink-mute">
              {[a.identity.name, a.identity.level != null ? `Lv ${a.identity.level}` : null].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </summary>
        <div className={collapsed ? 'dbody border-t border-line' : undefined}>
          <ImportBar onResult={handleResult} busy={busy} setBusy={setImportBusy} />
        </div>
      </details>

      {error ? (
        <p role="alert" className="mt-4 border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-2">
        {busy ? <Skeleton /> : null}

        {!busy && !a && !pobAnalysis ? (
          <div className="border border-dashed border-line-strong bg-surface-raised/40 px-6 py-16 text-center">
            <p className="text-sm text-ink-dim">Import a character to see its analysis.</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-mute">
              Survival is judged by the smallest hit that kills you, because average health figures often overstate safety by 3× or more.
            </p>
          </div>
        ) : null}

        {!busy && pobAnalysis ? (
          <PobResults analysis={pobAnalysis} />
        ) : null}

        {!busy && a ? (
          <CharacterResults
            analysis={a}
            sourceUrl={sourceUrl}
            history={history}
            tiersState={tiersState}
            treeState={treeState}
            catalogState={catalogState}
            analysisOptions={analysisOptions}
            fixesReady={stage === 'full'}
            tab={tab}
            target={target}
            onTab={selectTab}
          />
        ) : null}
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-mute">
        Character data from poe.ninja. Path of Exile 2 is a trademark of Grinding Gear Games; this is an unofficial
        fan-made tool.
      </footer>
    </>
  )
}
