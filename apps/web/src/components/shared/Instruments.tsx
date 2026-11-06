/**
 * The small readouts that ride on a collapsed Accordion row.
 *
 * Each shows the single measurement its section is about, so the whole page
 * can be triaged without opening anything. Deliberately tiny and
 * non-interactive — the accordion row itself is the control.
 */

type Tone = 'danger' | 'warn' | 'good' | 'muted' | 'accent'

const TONE_TEXT: Record<Tone, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  good: 'text-good',
  muted: 'text-ink-mute',
  accent: 'text-accent',
}

/** Uppercase status chip, border-only so it never competes with a filled bar. */
export function StatusChip({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`shrink-0 border border-current px-1.5 py-px text-[10px] font-bold tracking-wider uppercase ${TONE_TEXT[tone]}`}
    >
      {children}
    </span>
  )
}

