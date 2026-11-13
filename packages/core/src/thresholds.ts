/**
 * Every "is this number good?" judgement in one place.
 *
 * These are the only constants in the codebase that encode an OPINION. Nothing
 * here is a game constant — `defense/constants.ts` holds those, and they are
 * derived from the game's own formulas. What lives here is a set of judgement
 * calls about when a figure is worth telling a player about, and anything that
 * renders a verdict imports from here so one number cannot draw three different
 * conclusions on one screen.
 *
 * The predecessor learned this the hard way: 18% chaos resistance rendered as a
 * healthy green bar (>= 0), a warning in the build assessment (< 30) and "12%
 * short" in the resistance advice (target 30) — three verdicts on one number.
 *
 * Deliberately ABSENT: DPS bands. Damage is graded against figures actually
 * observed on the ladder (see ninja/ladder.ts), and where no sample is
 * available the offence half of the assessment is left unscored rather than
 * measured against invented cutoffs.
 */

import type { ResistanceState } from './defense/index.js'
import type { RecommendationCategory } from './recommend/types.js'

/**
 * Chaos resistance has no cap-driven breakpoint in PoE2 the way the elements
 * do, so this is a target rather than a cap: below it, chaos damage is worth
 * actively fixing. A judgement call, not a game constant — every surface that
 * acts on it says so.
 */
export const CHAOS_TARGET = 30

/** Below this, chaos resistance is actively dangerous rather than merely low. */
export const CHAOS_CRITICAL = 0

/**
 * Lowest maximum hit taken (any damage type) at which the survivability part of
 * the defence score earns nothing, and full credit. Linear in between. A
 * judgement call: the old 4,000 / 6,000 pool bands, made continuous and moved
 * onto the figure that decides what kills the character (audit item 12).
 */
export const MAX_HIT_SCORE = Object.freeze({ zeroAt: 2000, fullAt: 6000 })

/**
 * A resistance gap is critical when it raises damage taken of that type by at
 * least this fraction: (1 - res) / (1 - cap) - 1. Two points short of a 76% cap
 * is +8.3% (warning); 69 of 75 chaos is +24% (warning); 60 of 75 is +60%.
 */
export const RES_GAP_CRITICAL = 0.25

/**
 * Evasion above this is a real mitigation layer worth naming as a strength,
 * rather than a side effect of the base class having some.
 */
export const EVASION_SUBSTANTIAL = 4000

/**
 * Below both of these, the build leans on evasion and resistances alone —
 * armour points too low to matter, and no meaningful block chance either.
 * Both must hold: a low-armour, high-block build is not thin on mitigation,
 * it just gets it from a different layer.
 */
export const ARMOUR_NEGLIGIBLE = 500
export const BLOCK_NEGLIGIBLE = 20

/**
 * A maximum-hit-taken value below this fraction of the character's best marks a
 * weak damage type worth flagging. It compares the character with itself only:
 * the data carries no enemy hit sizes, so it is not a one-shot claim.
 *
 * Applied to EVERY damage type, not only the single lowest. On the reference
 * character physical (4,264) sat under the threshold alongside chaos (3,808)
 * and went unreported — the more dangerous miss of the two, since physical hits
 * are far more common in maps than chaos hits.
 */
export const WEAK_HIT_RATIO = 0.4

/**
 * Below this, critical strikes contribute so little that scaling them is not
 * the lever — expressed as a damage multiplier over never critting, so 1.15
 * means "crit is adding 15%".
 *
 * This is a judgement call about when the split between crit chance and crit
 * multiplier has stopped paying, NOT a DPS band. The distinction matters: it
 * grades a build against its own arithmetic rather than against an outside
 * figure nobody measured, which is why it can live here when a DPS cutoff
 * could not.
 */
export const CRIT_UNINVESTED = 1.15

/**
 * Above this share of a skill's damage, the skill is driven by damage over
 * time and hit-scaling advice would send it the wrong way.
 */
export const DOT_DOMINANT = 0.6

/**
 * Smallest damage gain from reaching full hit chance that is worth raising, in
 * percent. Below it the finding is technically true and practically noise.
 */
export const ACCURACY_MIN_GAIN = 3

/**
 * Hours after which poe.ninja's copy of a character is called out of date.
 * A judgement, not a measurement: gear swaps made since then are invisible to
 * the analysis, so older data deserves a re-import before buying anything.
 */
export const DATA_AGE_STALE_HOURS = 24

/**
 * The target a resistance is judged against.
 *
 * Elemental resistances use the character's OWN maximum as poe.ninja reports
 * it, not a hardcoded 75 — a build that has raised its cap to 80 is not at cap
 * at 75, and saying otherwise would call a real gap closed.
 */
export function targetFor(res: Pick<ResistanceState, 'type' | 'max'>): number {
  return res.type === 'chaos' ? CHAOS_TARGET : res.max
}

/** Whether a resistance clears its target. */
export function isHealthy(res: Pick<ResistanceState, 'type' | 'max'> & { value: number }): boolean {
  return res.value >= targetFor(res)
}

/**
 * Endgame-guide gates, as the companion's progression checklist states them.
 * They grade a character snapshot against the guide, not against the game.
 */
/** Elemental resistance cap before any max-resistance bonuses. */
export const ELEMENTAL_RES_CAP = 75
/** The guide's "3rd Ascendancy at ~70, slightly over-levelled" advice. */
export const LEVEL_THIRD_ASCENDANCY = 70
/** The guide's hard gate before the Arbiter of Divinity push. */
export const LEVEL_PINNACLE_PUSH = 85
/** The guide's "5,000+ life" pinnacle gate, read as the combined pool. */
export const POOL_PINNACLE = 5000

/** Share of the build score given to damage; defence gets the rest. */
export const OFFENCE_WEIGHT = 0.5

/**
 * Damage grades, in the offence half's own units (0 to OFFENCE_WEIGHT), by where
 * the build's DPS falls among the observed ladder sample.
 */
export const OFFENCE_GRADE = Object.freeze({ upperHalf: 0.5, median: 0.4, p25: 0.28, below: 0.15 })

/** Lowest build score that earns each tier; below TIER_C_MIN is D. */
export const TIER_A_MIN = 0.75
export const TIER_B_MIN = 0.5
export const TIER_C_MIN = 0.3

/** Optional view emphasis: which kind of content the reader is preparing for. */
export type FocusMode = 'mapping' | 'bossing'

/**
 * Multipliers on a recommendation's own score, per category, for the optional
 * Mapping / Bossing view. A judgement, not a measurement: bossing leans on
 * survivability (one hit kills), mapping on damage and efficiency (clear speed).
 * A category not listed keeps weight 1. The default view applies no focus.
 */
export const FOCUS_CATEGORY_WEIGHTS: Readonly<Record<FocusMode, Readonly<Partial<Record<RecommendationCategory, number>>>>> =
  Object.freeze({
    mapping: Object.freeze({ damage: 1.25, efficiency: 1.25, survivability: 0.85 }),
    bossing: Object.freeze({ survivability: 1.25, damage: 1.1, efficiency: 0.85 }),
  })
