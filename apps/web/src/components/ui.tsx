import type { ReactNode } from 'react'

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bare = false,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /**
   * Skips the border, background and title/subtitle header. For a panel
   * rendered inside an Accordion, whose own row already carries the title —
   * doubling it up as an inner <h2> just competes with the accordion summary
   * it sits directly under.
   */
  bare?: boolean
}) {
  if (bare) return <>{children}</>
  return (
    // min-w-0: a grid/flex child defaults to min-width:auto and refuses to
    // shrink below its content, which pushes the page into horizontal scroll on
    // narrow viewports. Wide content scrolls inside its own container instead.
    <section data-surface="data" className={`card min-w-0 overflow-hidden ${className}`}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 className="h3">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-dim">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  )
}

/** A single number that carries a section. Used sparingly — see dataviz. */
export function Hero({
  value,
  label,
  caption,
  tone = 'default',
}: {
  value: string
  label: string
  caption?: ReactNode
  tone?: 'default' | 'danger' | 'good'
}) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'good' ? 'text-good' : 'text-ink'
  return (
    <div>
      <div className="label-metric">{label}</div>
      <div className={`tabular mt-2 text-5xl leading-none font-semibold tracking-tight sm:text-6xl ${color}`}>{value}</div>
      {caption ? <p className="mt-2 max-w-prose text-xs leading-relaxed text-ink-dim">{caption}</p> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'danger' | 'warn' | 'good'
}) {
  const color =
    tone === 'danger'
      ? 'text-danger'
      : tone === 'warn'
        ? 'text-warn'
        : tone === 'good'
          ? 'text-good'
          : 'text-ink'
  return (
    <div className="border border-line/70 bg-surface-sunken px-3.5 py-3">
      <div className="label-metric leading-tight">{label}</div>
      <div className={`tabular mt-1.5 text-xl leading-none font-semibold ${color}`}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] leading-tight text-ink-mute">{hint}</div> : null}
    </div>
  )
}

/** Chip (2.6): mono micro label, status colour only for meaning. */
export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'danger' | 'warn' | 'good' | 'accent' }) {
  const map = {
    default: 'border-line-strong text-ink-dim',
    danger: 'border-danger/50 bg-danger/10 text-danger',
    warn: 'border-warn/50 bg-warn/10 text-warn',
    good: 'border-good/45 bg-good/10 text-good',
    accent: 'border-accent/45 bg-accent/10 text-accent',
  } as const
  return <span className={`chip ${map[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-mute">{children}</p>
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

/** Compact form for large DPS values, keeping three significant figures. */
export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
