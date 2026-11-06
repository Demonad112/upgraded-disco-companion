'use client'

/**
 * Load the affix ladders once, for the whole page.
 *
 * This used to live inside the gear panel, which was fine until the
 * recommendations engine started needing it too — the panel that names the
 * wasted modifier and the list that ranks fixing it must agree, and two fetches
 * of the same 2 MB artifact to feed two components is how they drift.
 *
 * Loaded on demand rather than at page load: a reader who only wants the DPS
 * matrix should not pay 260 KB gzipped for affix data they never see.
 */

import { useEffect, useState } from 'react'
import { analyzeItem, analyzeJewels, ModTiers, type Analysis, type DisplayOnlyMod, type ModTierData } from '@poe2/core'
import { dataUrl } from '@/lib/basePath'

const DATA_URL = dataUrl('mod-tiers.json')
const DISPLAY_URL = dataUrl('mod-display.json')

export type ModTiersState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; tiers: ModTiers }
  | { status: 'error'; message: string }

/**
 * `needsDisplay`: some mod has no craftable ladder, so fetch the implicit/corrupted/unique text (mod-display.json).
 * Latched: once asked for, it stays loaded even if the analysis stops asking.
 */
export function useModTiers(enabled: boolean, needsDisplay = false): ModTiersState {
  const [state, setState] = useState<ModTiersState>({ status: 'idle' })
  const [displayAsked, setDisplayAsked] = useState(false)
  const [displayDone, setDisplayDone] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- latch
    if (needsDisplay && !displayAsked) setDisplayAsked(true)
  }, [needsDisplay, displayAsked])

  useEffect(() => {
    if (!displayAsked || state.status !== 'ready' || displayDone) return
    let cancelled = false
    fetch(DISPLAY_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`the mod text returned ${res.status}`)
        return (await res.json()) as { displayOnly: Record<string, DisplayOnlyMod> }
      })
      .then((d) => {
        if (cancelled) return
        setState((s) => (s.status === 'ready' ? { status: 'ready', tiers: s.tiers.withDisplay(d.displayOnly) } : s))
        setDisplayDone(true)
      })
      // Without the text, those mods keep their raw-id fallback; the ladders still work.
      .catch(() => {
        if (!cancelled) setDisplayDone(true)
      })
    return () => {
      cancelled = true
    }
  }, [displayAsked, displayDone, state.status])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch against an external system
    setState({ status: 'loading' })
    // A reload swaps in a lean ModTiers, so the display text must be fetched again.
    setDisplayDone(false)

    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`the affix data returned ${res.status}`)
        return (await res.json()) as ModTierData
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', tiers: new ModTiers(data) })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: 'error', message: err.message })
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}

/** Whether any equipped item or jewel carries a mod with no craftable ladder, i.e. needs the display-only text. */
export function analysisNeedsDisplay(analysis: Analysis | null, tiersState: ModTiersState): boolean {
  if (!analysis || tiersState.status !== 'ready') return false
  const { tiers } = tiersState
  const unresolved = (m: { unresolved: string | null }) => m.unresolved !== null
  return (
    analysis.items.some((i) => i.active && analyzeItem(i, tiers, null).mods.some(unresolved)) ||
    analyzeJewels(analysis.model, tiers).some((j) => j.mods.some(unresolved))
  )
}
