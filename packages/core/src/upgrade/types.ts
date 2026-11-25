/**
 * Upgrade report schema.
 *
 * Observed and estimated results are separate types. A card is either read
 * (`source: 'ninja'`) or estimated by the mini-calc (`source: 'estimate'`, "≈ est."),
 * and only the second can carry estimate metadata; it cannot be built without it.
 * UI and exporters branch on `source`.
 */

import type { CardWarning } from '../warnings/index.js'
import type { ScoreResult } from './scoring.js'

/** A measured percent change, a range of them, or an explicit unknown. */
export type Change =
  | { kind: 'value'; percent: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'unknown'; reason: string }

export interface UpgradeGain {
  /** Reported separately; never merged into one figure. */
  damage: Change
  survivability: Change
}

export type ModRole = 'keep' | 'needed' | 'replaces'

export interface TaggedMod {
  text: string
  role: ModRole
}

interface CardBase {
  id: string
  slotId: number
  slotLabel: string
  itemName: string
  gain: UpgradeGain
  /** What is given up, or null when nothing is. See `buildTradeoffLine`. */
  tradeoff: string | null
  mods: TaggedMod[]
  /** Everything the estimate assumes, in plain sentences. */
  assumptions: string[]
  rarityLabel: string | null
  score: ScoreResult
  /** Rule-based cautions; absent when none apply. Never alters `gain` or `score`. */
  warnings?: CardWarning[]
}

export interface ObservedCard extends CardBase {
  source: 'ninja'
}

export interface EstimatedCard extends CardBase {
  source: 'estimate'
  estimate: {
    /** The code's config the mini-calc applied (`readPobConfig`). */
    configHash: string
    /** Conditions the estimate assumed, from the code's <Config>. */
    conditions: string[]
  }
}

export type UpgradeCard = ObservedCard | EstimatedCard

/** Something that was not evaluated, and why. Never silently dropped. */
export interface NotEvaluated {
  what: string
  reason: string
}

export interface UpgradeReport {
  cards: UpgradeCard[]
  notEvaluated: NotEvaluated[]
  /** When poe.ninja last indexed the character; null when it did not say. */
  dataUpdatedUtc: string | null
}

export const isEstimated = (card: UpgradeCard): card is EstimatedCard => card.source === 'estimate'
