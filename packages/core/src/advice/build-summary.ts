/**
 * Batch 3.5, the Overview's two plain-words blocks. "What your build is" is one sentence from the ascendancy, the main
 * skill, its damage mix and the defence layers; "Next 3 steps" picks from advice already computed, in the plan's order
 * (defence fix, gear tip, damage, then more defence fixes). Pure; nothing here invents a figure.
 */

import type { DamageAxis } from '../score/damage-axis.js'
import type { DefenceAxis, DefenceTip } from '../score/defence-axis.js'
import type { SkillDamage } from '../dps/index.js'
import type { StatSwap } from './swaps.js'

export interface NextStep {
  area: 'defence' | 'gear' | 'damage' | 'clear'
  text: string
  /** For a defence step: the tip's kind and type, so the web can find the finding (and trade search) behind it. */
  tip?: { kind: DefenceTip['kind']; type: DefenceTip['type'] }
}

export const NEXT_STEP_LIMIT = 3
/** Damage joins the steps below this score (under an A on the S–D scale: B, C or D). */
const DAMAGE_STEP_BELOW = 70

export function buildSummary(i: { className: string | null; skill: Pick<SkillDamage, 'name' | 'dominantType' | 'damageSplit'> | null; life: number | null; energyShield: number | null }): string | null {
  const who = i.className ? `A ${i.className}` : 'A character'
  const top = i.skill?.damageSplit.find((d) => d.type === i.skill?.dominantType)
  const mix = i.skill?.dominantType ? `, mostly ${i.skill.dominantType} damage${top ? ` (${Math.round(top.percent)}%)` : ''}` : ''
  const layers = [i.life ? 'life' : null, i.energyShield ? 'energy shield' : null].filter(Boolean).join(' and ')
  if (!i.className && !i.skill && !layers) return null
  return `${who}${i.skill ? ` using ${i.skill.name}${mix}` : ''}${layers ? `, on ${layers}${layers === 'life' ? ' only' : ''}` : ''}.`
}

export function nextSteps(i: { defence: Pick<DefenceAxis, 'tips'> | null; swaps: readonly Pick<StatSwap, 'sentence' | 'plain'>[]; damage: Pick<DamageAxis, 'score'> | null; damageLever?: string | null }): NextStep[] {
  const tips = i.defence?.tips ?? []
  const steps: NextStep[] = []
  const defenceStep = (t: DefenceTip): NextStep => ({ area: 'defence', text: t.text, tip: { kind: t.kind, type: t.type } })
  if (tips[0]) steps.push(defenceStep(tips[0]))
  if (i.swaps[0]) steps.push({ area: 'gear', text: i.swaps[0].plain })
  if (i.damage && i.damage.score < DAMAGE_STEP_BELOW && i.damageLever) steps.push({ area: 'damage', text: `Raise damage: ${i.damageLever}` })
  for (const t of tips.slice(1)) steps.push(defenceStep(t))
  if (!steps.length) return [{ area: 'clear', text: 'Nothing urgent. Keep levelling and check again after your next upgrade.' }]
  return steps.slice(0, NEXT_STEP_LIMIT)
}
