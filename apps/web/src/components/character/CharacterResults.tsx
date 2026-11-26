'use client'

// The character page below the import box, as tabs (PX4). Overview is in this chunk, so the build card and Next 3 steps paint
// without waiting for anything else; each other tab is its own chunk, fetched when the tab first opens (PX9).
import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Analysis, AnalyzeOptions } from '@poe2/core'
import { defenceAxis, nextSteps } from '@poe2/core'
import { useDamageAxis } from '@/lib/useDamageAxis'
import { ProToggle } from '@/components/shared/ProToggle'
import { BuildScore } from '@/components/BuildScore'
import { useGearReview } from '@/lib/useGearReview'
import { Recommendations } from '@/components/Recommendations'
import { Skeleton } from '@/components/Skeleton'
import { changedFor } from '@/lib/characterNotes'
import type { TabId } from '@/lib/characterTab'
import { usePrefs } from '@/hooks/usePrefs'
import { ChangedSincePanel } from './ChangedSincePanel'
import { EasyWins } from './EasyWins'
import { CharacterTabs, type TabDef } from './CharacterTabs'
import { CopyLink } from './CopyLink'
import { CouldntCheck } from './CouldntCheck'
import { ShareCard } from './ShareCard'
import { Showcase } from './Showcase'
import { NextSteps } from './NextSteps'
import { damageLever, stepFindings } from './topFixesData'
import type { OutlineInput } from './CharacterSheet'
import { Panel } from './tabs/Panel'
import type { PanelProps } from './tabs/types'
import type { CharacterHistory } from '@/lib/useCharacterHistory'
import type { ModTiersState } from '@/lib/useModTiers'
import type { PassiveTreeState } from '@/lib/usePassiveTree'
import type { SupportCatalogState } from '@/lib/useSupportCatalog'

const lazyTab = (load: () => Promise<{ default: (p: PanelProps) => React.ReactNode }>) =>
  dynamic(load, { ssr: false, loading: () => <Skeleton /> })
const SheetTab = lazyTab(() => import('./tabs/SheetTab'))
const DefenceTab = lazyTab(() => import('./tabs/DefenceTab'))
const DamageTab = lazyTab(() => import('./tabs/DamageTab'))
const GearTab = lazyTab(() => import('./tabs/GearTab'))
const ProgressTab = lazyTab(() => import('./tabs/ProgressTab'))
const AdvancedTab = lazyTab(() => import('./tabs/AdvancedTab'))

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sheet', label: 'Sheet' },
  { id: 'defences', label: 'Defence' },
  { id: 'damage', label: 'Damage' },
  { id: 'gear', label: 'Gear' },
  { id: 'progress', label: 'Progress' },
  { id: 'advanced', label: 'Advanced' },
]

/** Warms the other tabs' chunks once the page is idle, so a tab tap rarely waits on the network. */
function prefetchTabs() {
  void import('./tabs/SheetTab')
  void import('./tabs/DefenceTab')
  void import('./tabs/GearTab')
  void import('./tabs/DamageTab')
  void import('./tabs/ProgressTab')
  void import('./tabs/AdvancedTab')
}

/** The Overview panel: build card with three grade chips, since-last-import, Next 3 steps (with all findings in place), grade explanation, what could not be checked. */
function OverviewPanel({
  analysis: a,
  history,
  tiersState,
  catalogState,
  sourceUrl,
  pobCode,
  outlineInput,
  expandFindings,
  fixesReady,
}: PanelProps & { sourceUrl: string | null; pobCode: string | null; expandFindings: boolean; fixesReady: boolean }) {
  const returning = changedFor(a, history.snapshots).available
  const { proDetail } = usePrefs()
  const { review, ready } = useGearReview(a, tiersState, catalogState)
  const { axis: damage, ready: damageReady } = useDamageAxis(a)
  const defAxis = useMemo(() => defenceAxis(a.assessment, a.defense), [a])
  const steps = useMemo(
    () => nextSteps({ defence: defAxis, swaps: review?.swaps ?? [], damage, damageLever: damageLever(a.recommendations), findings: stepFindings(a.recommendations) }),
    [a, defAxis, review, damage],
  )
  // Gear is graded on load: "grading…" until the affix data and the gem data are in (or either failed, then it is not graded).
  const gearFailed = tiersState.status === 'error' || catalogState.status === 'error'
  const gearState = ready || gearFailed ? 'ready' : 'loading'
  const stepsReady = fixesReady && gearState === 'ready' && damageReady
  return (
    <Panel id="overview" title="Overview">
      <Showcase analysis={a} axes={{ gear: ready ? review?.axis.grade ?? null : null, gearState, damage }}>
        {sourceUrl || pobCode ? <CopyLink url={sourceUrl} code={pobCode} box={outlineInput?.box} config={outlineInput?.config} name={a.identity.name} /> : null}
        <ShareCard analysis={a} sourceUrl={sourceUrl} diff={history.diff} />
      </Showcase>
      {returning ? <ChangedSincePanel analysis={a} snapshots={history.snapshots} /> : null}
      <NextSteps
        steps={steps}
        report={a.recommendations}
        league={a.identity.league}
        expand={expandFindings}
        pending={!stepsReady}
        all={
          <>
            {/* Pro detail opens every finding's measured reasoning, cost and evidence by default. */}
            <div className="mb-2 flex justify-end">
              <ProToggle />
            </div>
            <Recommendations report={a.recommendations} />
            <div className="mt-3">
              <EasyWins analysis={a} tiersState={tiersState} proDetail={proDetail} />
            </div>
          </>
        }
      />
      <BuildScore
        assessment={a.assessment}
        keystones={a.keystones}
        axis={defAxis}
        gear={review}
        gearState={gearState}
        damage={damage}
      />
      <CouldntCheck analysis={a} />
    </Panel>
  )
}

export function CharacterResults({
  analysis: a,
  sourceUrl,
  pobCode,
  outlineInput,
  history,
  tiersState,
  treeState,
  catalogState,
  analysisOptions,
  fixesReady,
  tab,
  target,
  onTab,
}: {
  analysis: Analysis
  sourceUrl: string | null
  /** The PoB code behind the character, when it came from one: "Copy link" then gives its `#pob=` link. */
  pobCode: string | null
  /** The paste behind the character (code, box, config toggle), for the Sheet tab. Null for a poe.ninja JSON import. */
  outlineInput: OutlineInput | null
  history: CharacterHistory
  tiersState: ModTiersState
  treeState: PassiveTreeState
  catalogState: SupportCatalogState
  analysisOptions: AnalyzeOptions
  /** False until the full analysis has run: the steps are written once, from it, so a skeleton holds their place. */
  fixesReady: boolean
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
      {tab === 'overview' ? <OverviewPanel {...props} outlineInput={outlineInput} sourceUrl={sourceUrl} pobCode={pobCode} expandFindings={target === 'findings'} fixesReady={fixesReady} /> : null}
      {tab === 'sheet' ? <SheetTab {...props} outlineInput={outlineInput} /> : null}
      {tab === 'defences' ? <DefenceTab {...props} /> : null}
      {tab === 'damage' ? <DamageTab {...props} outlineInput={outlineInput} /> : null}
      {tab === 'gear' ? <GearTab {...props} /> : null}
      {tab === 'progress' ? <ProgressTab {...props} /> : null}
      {tab === 'advanced' ? <AdvancedTab {...props} /> : null}
    </CharacterTabs>
  )
}
