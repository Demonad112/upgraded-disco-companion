'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { PageHeader } from '@/components/layout/PageHeader'
import { useModTiers } from '@/lib/useModTiers'
import { useSupportCatalog } from '@/lib/useSupportCatalog'
import { usePassiveTree } from '@/lib/usePassiveTree'

// Everything below the import box only renders once a character is loaded, so it is its own chunk: a first visit
// downloads the header, import box and empty state, and the panels arrive while the import is in flight.
const CharacterResults = dynamic(
  () => import('@/components/character/CharacterResults').then((m) => m.CharacterResults),
  { ssr: false, loading: () => <Skeleton /> },
)
const PobResults = dynamic(() => import('@/components/character/CharacterResults').then((m) => m.PobResults), {
  ssr: false,
  loading: () => <Skeleton />,
})

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
  // Whether "Load another character" is open while the import box is collapsed.
  const [boxOpen, setBoxOpen] = useState(false)
  // An import starting closes the box, so the skeleton sits where the panels will land (no shift when they do).
  const setImportBusy = useCallback((b: boolean) => {
    setBusy(b)
    if (b) setBoxOpen(false)
  }, [])

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
  // Memoised so the gear panels' own memos don't recompute on every render.

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
        // The effect above owns analysis from here — it re-runs as the tree,
        // affix data and ladder sample land, and clears `busy` when done.
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
      <PageHeader
        tool="character"
        eyebrow="Character import"
        title="Character"
        accent="Analysis"
        source="poe.ninja"
        description="Reads poe.ninja’s own computed character data and turns it into ranked, quantified findings. Nothing here is re-derived from scratch, and nothing is invented — where a number can’t be established, it says so."
      />

      {/* Once an import starts the box steps aside, so the verdict sits near the top. One element either way: the bar
          stays mounted and keeps a failed URL and its error. Open and summary-less until then. */}
      <details
        data-surface={collapsed ? 'data' : undefined}
        className={collapsed ? 'card group' : 'group'}
        open={collapsed ? boxOpen : true}
        onToggle={(e) => {
          if (collapsed) setBoxOpen(e.currentTarget.open)
        }}
      >
        <summary
          className={`${collapsed ? 'flex' : 'hidden'} cursor-pointer list-none items-center gap-3 text-sm text-ink-dim [&::-webkit-details-marker]:hidden`}
        >
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
        <div className={collapsed ? 'dbody border-t border-line' : undefined}>
          <ImportBar onResult={handleResult} busy={busy} setBusy={setImportBusy} />
        </div>
      </details>

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
