export const DMG_VAR: Record<string, string> = {
  physical: 'var(--dmg-physical)',
  fire: 'var(--dmg-fire)',
  cold: 'var(--dmg-cold)',
  lightning: 'var(--dmg-lightning)',
  chaos: 'var(--dmg-chaos)',
}

export const TYPE_ORDER = ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** Damage-colour diamond. Colour marks damage type only. */
export function Diamond({ type }: { type: string }) {
  return <span aria-hidden className="diamond" style={{ background: DMG_VAR[type] ?? 'var(--ink-dim)' }} />
}
