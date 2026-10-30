import type { Analysis } from '@poe2/core'

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
  /** Up to three actionable findings, most important first. */
  findings: string[]
}

export function shareCardData(a: Analysis, grade: ShareCardData['grade']): ShareCardData {
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
