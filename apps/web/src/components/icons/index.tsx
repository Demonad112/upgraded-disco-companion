/**
 * Map and league-mechanic icons (IMG-2): a 12-icon line set on a 24-unit grid, 1.3-unit strokes with square caps and
 * mitred joins, no curves closed into round shapes (CLAUDE.md: square everywhere). Our own shapes, no game art.
 * Colour is `currentColor`; `IconPlate` seats one on the engraved plate the bars use (bevelled metal rim, sunken well).
 * Inline styles rather than utilities, so the set only costs bytes on the routes that draw it.
 */

import type { CSSProperties, ReactNode } from 'react'

export const ICON_PATHS = {
  waystone: 'M12 2L18 7L16 21H8L6 7ZM6 7H18M12 2V7M10 12H14M12 12V17',
  'map-boss': 'M4 18V8L8 12L12 5L16 12L20 8V18ZM4 21H20M10 15H14',
  'atlas-node': 'M9 9H15V15H9ZM12 9V3M12 15V21M9 12H3M15 12H21M10 3H14M10 21H14M3 10V14M21 10V14',
  tablet: 'M5 3H19V21H5ZM8 7H16M8 11H16M8 15H13M15 18H16',
  breach: 'M12 2L10 8L14 12L9 17L12 22M5 5L8 8M19 5L16 8M5 19L8 16M19 19L16 16',
  ritual: 'M3 21H21M5 21V15H19V21M8 15V10M12 15V8M16 15V10M8 7V6M12 5V4M16 7V6',
  expedition: 'M4 20L14 10M7 7L12 4L20 12L17 17M10 17L7 14',
  delirium: 'M12 2L20 12L12 22L4 12ZM12 6L10 11L14 13L12 18',
  abyss: 'M3 3H21V21H3ZM7 7H17V17H7ZM10.5 10.5H13.5V13.5H10.5ZM3 3L7 7M21 3L17 7M3 21L7 17M21 21L17 17',
  essence: 'M12 3L18 8V16L12 21L6 16V8ZM12 3V21M6 8L12 12L18 8',
  shrine: 'M7 21V7L12 3L17 7V21M4 21H20M10 21V14H14V21M10 10H14',
  trade: 'M4 8H18M14 4L18 8L14 12M20 16H6M10 12L6 16L10 20',
} as const

export type IconName = keyof typeof ICON_PATHS

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[]

/** One icon. Decorative by default; pass `label` when it stands alone and carries meaning. */
export function MapIcon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-icon={name}
      style={{ flex: 'none' }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

const PLATE: CSSProperties = {
  display: 'inline-grid',
  placeItems: 'center',
  flex: 'none',
  color: 'var(--accent)',
  background: 'linear-gradient(180deg, black, var(--well))',
  border: '1px solid black',
  boxShadow: 'inset 0 0 0 2px var(--metal-hi), inset 0 0 0 3px black, inset 0 3px 5px black, 0 1px 0 var(--accent-line)',
}

/** An icon seated on the engraved plate (square, bevelled rim, sunken well). */
export function IconPlate({ name, size = 32, children }: { name: IconName; size?: number; children?: ReactNode }) {
  return (
    <span aria-hidden style={{ ...PLATE, width: size, height: size }}>
      <MapIcon name={name} size={Math.round(size * 0.6)} />
      {children}
    </span>
  )
}
