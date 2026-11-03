import type { Analysis, SkillDamage, SnapshotDiff } from '@poe2/core'

/** Damage types in the order the ring and the split bar draw them. */
export const RING_ORDER = ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const

export interface RingSlice {
  type: string
  percent: number
}

/** The main skill's damage split for the element ring: hits first, else damage over time; empty when unknown. */
export function ringSplit(skill: Pick<SkillDamage, 'damageSplit' | 'dotSplit'> | null | undefined): RingSlice[] {
  if (!skill) return []
  const split = skill.damageSplit?.length ? skill.damageSplit : (skill.dotSplit ?? [])
  return split
    .filter((s) => s.percent > 0)
    .map((s) => ({ type: s.type, percent: s.percent }))
    .sort((a, b) => RING_ORDER.indexOf(a.type as never) - RING_ORDER.indexOf(b.type as never))
}

export interface ShareDelta {
  label: string
  /** Signed, with its unit: "+400", "-12%". */
  text: string
  improved: boolean
}

/** Up to `n` "since last import" moves, largest relative change first (the diff's own order). */
export function shareDeltas(diff: SnapshotDiff | null | undefined, n = 3): ShareDelta[] {
  if (!diff) return []
  return diff.changes.slice(0, n).map((c) => {
    const unit = c.unit === 'percent' ? '%' : ''
    const abs = Math.abs(c.delta)
    const num = Number.isInteger(abs) ? abs.toLocaleString('en-US') : abs.toLocaleString('en-US', { maximumFractionDigits: 1 })
    return { label: c.label, text: `${c.delta > 0 ? '+' : c.delta < 0 ? '−' : ''}${num}${unit}`, improved: c.improved }
  })
}

/** Everything the share card prints, read straight off the analysis (nothing computed beyond picking and ordering). */
export interface ShareCardData {
  name: string
  /** "Level 92 · Monk · Runes of Aldur", leaving out what the import didn't have. */
  subtitle: string
  /** The letter or range and its score, or null when the build couldn't be graded. */
  grade: { letter: string; score: string } | null
  /** The weakest max hit: what kills the character first. */
  killer: { value: number; type: string } | null
  vitals: { label: string; value: number | null; caption?: string }[]
  /** Up to three actionable findings, most important first. Kept for the alt text and MCP parity; v2 draws the showcase instead. */
  findings: string[]
  /** The main skill and its DPS, the figure inside the ring. */
  dps: { value: number; skill: string } | null
  /** The main skill's damage split, drawn as the element ring. */
  ring: RingSlice[]
  /** "Since last import" moves; empty without history. */
  deltas: ShareDelta[]
}

export function shareCardData(a: Analysis, grade: ShareCardData['grade'], diff: SnapshotDiff | null = null): ShareCardData {
  const { identity, defense, dps } = a
  const weakest = [...defense.maxHits].sort((x, y) => x.value - y.value)[0]
  return {
    name: identity.name,
    subtitle: [
      identity.level !== null && identity.level !== undefined ? `Level ${identity.level}` : null,
      identity.className || null,
      identity.league || null,
    ]
      .filter(Boolean)
      .join(' · '),
    grade,
    killer: weakest ? { value: weakest.value, type: weakest.type } : null,
    vitals: [
      { label: 'Life', value: defense.life },
      { label: 'Energy shield', value: defense.energyShield },
      { label: 'Main skill DPS', value: dps.primary?.totalDps ?? null, caption: dps.primary?.name },
      { label: 'Spirit', value: defense.spirit > 0 ? defense.spirit : null },
    ],
    findings: a.recommendations.recommendations
      .filter((r) => r.category !== 'question')
      .slice(0, 3)
      .map((r) => r.action),
    dps: dps.primary ? { value: dps.primary.totalDps, skill: dps.primary.name } : null,
    ring: ringSplit(dps.primary),
    deltas: shareDeltas(diff),
  }
}

/** A file name a download folder will accept: the character's name, letters, digits and dashes only. */
export function shareCardFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${slug || 'character'}-poe2-card.png`
}

/**
 * Cut `text` so that it, plus an ellipsis, passes `fits`: at the last whole word that fits, with trailing punctuation dropped
 * ("…chaos resistance…", not "…chaos resistanc…"). Only a single word too wide on its own is cut mid-word.
 */
export function cutAtWord(text: string, fits: (s: string) => boolean): string {
  if (fits(text)) return text
  const words = text.trim().split(/\s+/)
  for (let k = words.length - 1; k >= 1; k--) {
    const head = words.slice(0, k).join(' ').replace(/[\s,;:.·–—-]+$/u, '')
    if (head && fits(`${head}…`)) return `${head}…`
  }
  let cut = words[0] ?? ''
  while (cut.length > 1 && !fits(`${cut}…`)) cut = cut.slice(0, -1)
  return `${cut}…`
}
