'use client'

import { createLocalStore, useLocalStore } from './localStore'

/**
 * Visual effects tier (footer "Visual effects"). The applied tier is `data-fx`
 * on <html>, set before paint by FX_TIER_BOOTSTRAP and read by the sky and CSS:
 * full = everything (with the idle pause), lite = 15 fps half sky and no
 * float/flicker/hover pulse/grain, still = the reduced-motion frame and no
 * decorative loops. Auto is detected after first paint by lib/fxProbe (a lazy
 * chunk); a user pick wins and is never lowered.
 */
export type Tier = 'full' | 'lite' | 'still'
export type FxChoice = 'auto' | Tier
export interface FxState {
  v: 1
  choice: FxChoice
  /** What detection picked; applied while the choice is auto. */
  auto: Tier
  /** The frame check lowered auto once; detection never raises it past this again. */
  lowered?: boolean
}

export const FX_KEY = 'poe2-fx-tier'
export const TIERS: readonly Tier[] = ['full', 'lite', 'still']
const isTier = (v: unknown): v is Tier => TIERS.includes(v as Tier)

export const acceptFx = (v: unknown): v is FxState => {
  const s = v as FxState
  return !!s && s.v === 1 && (s.choice === 'auto' || isTier(s.choice)) && isTier(s.auto)
}

export const fxStore = createLocalStore<FxState>(FX_KEY, { v: 1, choice: 'auto', auto: 'full' }, acceptFx)

/** The tier on screen now. */
export const appliedTier = (): Tier => {
  const t = document.documentElement.dataset.fx
  return isTier(t) ? t : 'full'
}

export const applyTier = (t: Tier) => document.documentElement.setAttribute('data-fx', t)

export const useFx = () => useLocalStore(fxStore)

/** The footer pick: stored, and applied at once (auto shows what detection last chose). */
export function chooseFx(choice: FxChoice) {
  fxStore.set((s) => ({ ...s, choice }))
  applyTier(choice === 'auto' ? fxStore.get().auto : choice)
}

/**
 * In <head>, before paint: the stored pick (or stored auto), else a quick hardware guess (data saver, ≤4 cores or
 * ≤4 GB is lite). The renderer and frame checks refine auto after first paint.
 */
export const FX_TIER_BOOTSTRAP = `(function(){var d=document.documentElement,t;try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(FX_KEY)})||'null');if(s&&s.v===1)t=s.choice==='auto'?s.auto:s.choice}catch(e){}if(t!=='full'&&t!=='lite'&&t!=='still'){var n=navigator,c=n.connection;t=(c&&c.saveData)||(n.hardwareConcurrency||8)<=4||(n.deviceMemory||8)<=4?'lite':'full'}d.setAttribute('data-fx',t)})()`
