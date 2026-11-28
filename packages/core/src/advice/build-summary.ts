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
  /** For a step drawn from a ranked finding: its id, so the web can find it for the trade search. */
  findingId?: string
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

/** A ranked finding the step picker may draw on when the three fixed sources leave a gap. */
export interface StepFinding {
  id: string
  area: 'defence' | 'gear' | 'damage'
  /** The action's lead clause, whole. */
  text: string
  /** The stat it moves, when it has one (`chaosResistance`): a finding on a stat a defence tip already names is skipped. */
  stat?: string
}

/**
 * Up to three steps, always three when the build has enough to say. Order: the top defence tip, the top gear swap,
 * the damage lever (when damage grades under an A), then a second defence tip on a different damage type (a chaos hit
 * tip and a chaos resistance tip are one fix), then the engine's ranked gear and damage findings, then whatever
 * defence tips are left.
 */
export function nextSteps(i: {
  defence: Pick<DefenceAxis, 'tips'> | null
  swaps: readonly Pick<StatSwap, 'sentence' | 'plain'>[]
  damage: Pick<DamageAxis, 'score'> | null
  damageLever?: string | null
  findings?: readonly StepFinding[]
}): NextStep[] {
  // A weak hit type whose resistance is short is one fix, and the resistance is the concrete one (it has a trade search).
  const all = i.defence?.tips ?? []
  const tips = all.filter((t) => !(t.kind === 'weak-hit' && all.some((g) => g.kind !== 'weak-hit' && g.type === t.type)))
  const defenceStep = (t: DefenceTip): NextStep => ({ area: 'defence', text: t.text, tip: { kind: t.kind, type: t.type } })
  const steps: NextStep[] = []
  const has = (text: string) => steps.some((s) => s.text === text)
  const tipTypes = () => new Set(steps.flatMap((s) => (s.tip ? [s.tip.type] : [])))
  const full = () => steps.length >= NEXT_STEP_LIMIT
  const push = (s: NextStep) => {
    if (!full() && !has(s.text)) steps.push(s)
  }
  if (tips[0]) push(defenceStep(tips[0]))
  if (i.swaps[0]) push({ area: 'gear', text: i.swaps[0].plain })
  if (i.damage && i.damage.score < DAMAGE_STEP_BELOW && i.damageLever) push({ area: 'damage', text: `Raise damage: ${i.damageLever}` })
  for (const t of tips.slice(1)) if (!tipTypes().has(t.type)) push(defenceStep(t))
  const named = new Set(tips.map((t) => `${t.type}Resistance`))
  for (const f of i.findings ?? []) {
    if (f.area === 'defence' || (f.stat && named.has(f.stat))) continue
    push({ area: f.area, text: f.text, findingId: f.id })
  }
  for (const t of tips.slice(1)) push(defenceStep(t))
  if (!steps.length) return [{ area: 'clear', text: 'Nothing urgent. Keep levelling and check again after your next upgrade.' }]
  return steps
}
