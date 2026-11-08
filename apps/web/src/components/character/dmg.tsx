import type { CSSProperties } from 'react'

export const DMG_VAR: Record<string, string> = {
  physical: 'var(--dmg-physical)',
  fire: 'var(--dmg-fire)',
  cold: 'var(--dmg-cold)',
  lightning: 'var(--dmg-lightning)',
  chaos: 'var(--dmg-chaos)',
}

export const TYPE_ORDER = ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Fill for a damage-type mark. Lightning gets its white-hot core and chaos its dark edge (W0 tokens), so the two read
 * as themselves and not as plain yellow and purple.
 */
function dmgFill(type: string): CSSProperties {
  const background = DMG_VAR[type] ?? 'var(--ink-dim)'
  if (type === 'lightning') {
    return {
      background: 'linear-gradient(var(--dmg-lightning) 0 35%, var(--dmg-lightning-core) 35% 65%, var(--dmg-lightning) 65%)',
    }
  }
  if (type === 'chaos') return { background, boxShadow: 'inset 0 0 0 1px var(--dmg-chaos-edge)' }
  return { background }
}

/** Damage-colour diamond. Colour marks damage type only. */
export function Diamond({ type }: { type: string }) {
  return <span aria-hidden className="diamond" style={dmgFill(type)} />
}
