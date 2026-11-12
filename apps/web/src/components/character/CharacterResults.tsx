'use client'

// The character page below the import box, as tabs (PX4). Overview is in this chunk, so the build card and Top 3 paint
// without waiting for anything else; each other tab is its own chunk, fetched when the tab first opens (PX9).
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Analysis, AnalyzeOptions, PobAnalysis } from '@poe2/core'
import { ProToggle } from '@/components/shared/ProToggle'
import { BuildScore } from '@/components/BuildScore'
import { Chat } from '@/components/Chat'
import { PobAnalysisView } from '@/components/PobAnalysisView'
import { Recommendations } from '@/components/Recommendations'
import { Skeleton } from '@/components/Skeleton'
import { changedFor } from '@/lib/characterNotes'
import type { TabId } from '@/lib/characterTab'
import { usePrefs } from '@/hooks/usePrefs'
import { ChangedSincePanel } from './ChangedSincePanel'
import { EasyWins } from './EasyWins'
import { CharacterTabs, type TabDef } from './CharacterTabs'
import { CopyLink } from './CopyLink'
import { ShareCard } from './ShareCard'
import { Showcase } from './Showcase'
import { TopFixes } from './TopFixes'
import { Panel } from './tabs/Panel'
import type { PanelProps } from './tabs/types'
import type { CharacterHistory } from '@/lib/useCharacterHistory'
import type { ModTiersState } from '@/lib/useModTiers'
import type { PassiveTreeState } from '@/lib/usePassiveTree'
import type { SupportCatalogState } from '@/lib/useSupportCatalog'

const lazyTab = (load: () => Promise<{ default: (p: PanelProps) => React.ReactNode }>) =>
  dynamic(load, { ssr: false, loading: () => <Skeleton /> })
const DefenceTab = lazyTab(() => import('./tabs/DefenceTab'))
const DamageTab = lazyTab(() => import('./tabs/DamageTab'))
const GearTab = lazyTab(() => import('./tabs/GearTab'))
const ProgressTab = lazyTab(() => import('./tabs/ProgressTab'))
const AdvancedTab = lazyTab(() => import('./tabs/AdvancedTab'))

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'defences', label: 'Defence' },
  { id: 'damage', label: 'Damage' },
  { id: 'gear', label: 'Gear' },
  { id: 'progress', label: 'Progress' },
  { id: 'advanced', label: 'Advanced' },
]

/** Warms the other tabs' chunks once the page is idle, so a tab tap rarely waits on the network. */
function prefetchTabs() {
  void import('./tabs/DefenceTab')
  void import('./tabs/GearTab')
  void import('./tabs/DamageTab')
  void import('./tabs/ProgressTab')
  void import('./tabs/AdvancedTab')
}

/** The Overview panel: build card, since-last-import, Top 3 (with all findings in place), grade explanation. */
function OverviewPanel({
  analysis: a,
  history,
  tiersState,
  sourceUrl,
  expandFindings,
}: PanelProps & { sourceUrl: string | null; expandFindings: boolean }) {
  const returning = changedFor(a, history.snapshots).available
  const { proDetail } = usePrefs()
  return (
    <Panel id="overview" title="Overview">
      <Showcase analysis={a}>
        {sourceUrl ? <CopyLink url={sourceUrl} name={a.identity.name} /> : null}
        <ShareCard analysis={a} sourceUrl={sourceUrl} diff={history.diff} />
      </Showcase>
      {returning ? <ChangedSincePanel analysis={a} snapshots={history.snapshots} /> : null}
      <TopFixes
        report={a.recommendations}
        league={a.identity.league}
        expand={expandFindings}
        all={
          <>
            {/* Pro detail opens every finding's measured reasoning, cost and evidence by default. */}
            <div className="mb-2 flex justify-end">
              <ProToggle />
            </div>
            <Recommendations report={a.recommendations} />
          </>
        }
      />
      <EasyWins analysis={a} tiersState={tiersState} proDetail={proDetail} />
      {a.warnings.map((w) => (
        <p key={w} data-surface="data" className="card border-warn/50 text-xs leading-relaxed text-warn">
          {w}
        </p>
      ))}
      <BuildScore assessment={a.assessment} keystones={a.keystones} />
    </Panel>
  )
}

export function CharacterResults({
  analysis: a,
  sourceUrl,
  history,
  tiersState,
  treeState,
  catalogState,
  analysisOptions,
  tab,
  target,
  onTab,
}: {
  analysis: Analysis
  sourceUrl: string | null
  history: CharacterHistory
  tiersState: ModTiersState
  treeState: PassiveTreeState
  catalogState: SupportCatalogState
  analysisOptions: AnalyzeOptions
  tab: TabId
  /** The hash id to scroll to once the tab's panel is mounted (an alias or an element inside a panel). */
  target: string | null
  onTab: (id: TabId) => void
}) {
  const props: PanelProps = { analysis: a, history, tiersState, treeState, catalogState, analysisOptions }

  useEffect(() => {
    const ric = typeof window.requestIdleCallback === 'function'
    const h = ric ? window.requestIdleCallback(prefetchTabs, { timeout: 4000 }) : window.setTimeout(prefetchTabs, 2000)
    return () => (ric ? window.cancelIdleCallback(h) : window.clearTimeout(h))
  }, [])

  // A link to something inside a panel (`#headroom`, `#compare`): the panel mounts after the hash changes, so wait for
  // the element, open any <details> around it, and scroll to it.
  useEffect(() => {
    if (!target || target === 'findings') return
    let tries = 0
    let raf = 0
    const look = () => {
      const el = document.getElementById(target)
      if (el) {
        for (let n: Element | null = el; n; n = n.parentElement) if (n instanceof HTMLDetailsElement) n.open = true
        el.scrollIntoView({ block: 'start' })
        return
      }
      if (++tries < 120) raf = requestAnimationFrame(look)
    }
    raf = requestAnimationFrame(look)
    return () => cancelAnimationFrame(raf)
  }, [tab, target])

  return (
    <CharacterTabs tabs={TABS} active={tab} onSelect={onTab}>
      {tab === 'overview' ? <OverviewPanel {...props} sourceUrl={sourceUrl} expandFindings={target === 'findings'} /> : null}
      {tab === 'defences' ? <DefenceTab {...props} /> : null}
      {tab === 'damage' ? <DamageTab {...props} /> : null}
      {tab === 'gear' ? <GearTab {...props} /> : null}
      {tab === 'progress' ? <ProgressTab {...props} /> : null}
      {tab === 'advanced' ? <AdvancedTab {...props} /> : null}
    </CharacterTabs>
  )
}

/** A Path of Building import: fewer panels, every figure real. */
export function PobResults({ analysis }: { analysis: PobAnalysis }) {
  return (
    <div className="space-y-4">
      <PobAnalysisView analysis={analysis} />
      <Chat pob={analysis} />
    </div>
  )
}
