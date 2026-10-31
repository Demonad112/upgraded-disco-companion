import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { ScrollFade } from './ScrollFade'

/*
 * Controls kit (UI-PLAN U4). The look is in styles/controls.css; these only pick the classes and keep the ARIA
 * each caller already had. Square, 1 px line, gold for the active state, one focus ring.
 */

/** Native select: no platform chevron, a square gold one drawn in CSS, button height. */
export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`select ${className}`} {...rest} />
}

/** Text field on the select's box model: same height, line, fill and focus ring. */
export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />
}

/** Multi-line `Input`: the same box, padded top and bottom, resizable in height only. */
export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input input-area ${className}`} {...rest} />
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

/** `primary` is the gold surface (one per view), `secondary` a line, `ghost` text only, `danger` destructive. */
export function Button({
  variant = 'secondary',
  size,
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' }) {
  return <button type={type} className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest} />
}

/** Range with a 4 px track, gold fill up to the value and a rotated-square bead for a thumb. */
export function Range({
  className = '',
  style,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { value: number; min: number; max: number }) {
  const { value, min, max } = rest
  const pct = max > min ? ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100 : 0
  return (
    <input
      type="range"
      className={`range ${className}`}
      style={{ ...style, '--range-pct': `${pct}%` } as CSSProperties}
      {...rest}
    />
  )
}

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  /** A small figure after the label (tab counts). */
  count?: ReactNode
}

/**
 * One look for every pick-one row: sort chips, the findings focus, import tabs, page tabs.
 * `tabs` keeps tablist/tab/aria-selected (and adds arrow keys); `toggle` keeps group/aria-pressed buttons.
 * `scroll` puts the row in a ScrollFade strip for rows that can outgrow a phone.
 */
export function Segmented<T extends string>({
  kind,
  label,
  options,
  value,
  onChange,
  scroll = false,
  className = '',
}: {
  kind: 'tabs' | 'toggle'
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  scroll?: boolean
  className?: string
}) {
  const tabs = kind === 'tabs'

  // Arrow keys, Home and End move between tabs and select (WAI-ARIA tabs, automatic activation). Every tab stays
  // in the Tab order as before, so nothing that worked by Tab changes.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!tabs) return
    const i = options.findIndex((o) => o.value === value)
    const last = options.length - 1
    const next =
      e.key === 'ArrowRight' ? (i >= last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i <= 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    onChange(options[next]!.value)
    const items = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.seg-item')
    items?.[next]?.focus()
  }

  const items = options.map((o) => {
    const active = o.value === value
    return (
      <button
        key={o.value}
        type="button"
        className="seg-item"
        {...(tabs ? { role: 'tab', 'aria-selected': active } : { 'aria-pressed': active })}
        onClick={() => onChange(o.value)}
        onKeyDown={onKeyDown}
      >
        {o.label}
        {o.count !== undefined && o.count !== null ? <span className="seg-count tabular">{o.count}</span> : null}
      </button>
    )
  })

  const role = tabs ? 'tablist' : 'group'
  return scroll ? (
    <ScrollFade role={role} aria-label={label} className={`seg seg-scroll ${className}`}>
      {items}
    </ScrollFade>
  ) : (
    <div role={role} aria-label={label} className={`seg ${className}`}>
      {items}
    </div>
  )
}
