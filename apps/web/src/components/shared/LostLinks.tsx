import Link from 'next/link'

const TOOLS = [
  { href: '/checklist', label: 'Checklist', note: 'Campaign end to a full Atlas, step by step' },
  { href: '/atlas', label: 'Atlas Tree', note: 'Where the passive points go, and in what order' },
  { href: '/dashboard', label: 'Dashboard', note: 'Farming strategies, bosses and milestones' },
  { href: '/character', label: 'Character', note: 'Import a character and see what kills it first' },
]

/** The four tools as a way back, for the 404 and error pages. */
export function LostLinks() {
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {TOOLS.map((t) => (
        <li key={t.href}>
          <Link
            href={t.href}
            data-surface="data"
            className="card block h-full transition-colors hover:border-accent-line"
          >
            <span className="font-display text-lg font-semibold tracking-[0.06em] text-ink uppercase">{t.label}</span>
            <span className="mt-1 block text-sm text-ink-dim">{t.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
