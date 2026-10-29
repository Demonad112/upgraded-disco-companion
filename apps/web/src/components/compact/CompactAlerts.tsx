'use client'

import Link from 'next/link'
import { usePersistedState } from '@/hooks/usePersistedState'
import { CURRENT_PATCH } from '@/lib/constants'

/**
 * One or two things worth a glance, from what is already recorded: the last
 * character's resistances, and an import taken under an older patch. Shown
 * only in compact mode (CSS), hidden otherwise.
 */
export function CompactAlerts() {
  const { state } = usePersistedState()
  const snaps = state.character.snapshots
  const alerts: { id: string; tone: 'warn' | 'danger'; text: string }[] = []

  if (snaps.length) {
    const latest = snaps.reduce((a, b) => (b.at > a.at ? b : a))
    const short = (['fire', 'cold', 'lightning'] as const)
      .filter((t) => latest[t] !== null && (latest[t] as number) < 75)
      .map((t) => `${t[0]!.toUpperCase()}${t.slice(1)} ${latest[t]}%`)
    if (short.length) alerts.push({ id: 'res', tone: 'danger', text: `Under cap: ${short.join(', ')}` })
    if (latest.gameVersion && latest.gameVersion !== CURRENT_PATCH) {
      alerts.push({ id: 'patch', tone: 'warn', text: `Imported under patch ${latest.gameVersion} — re-import` })
    }
  }
  if (!alerts.length) alerts.push({ id: 'data', tone: 'warn', text: `Patch ${CURRENT_PATCH} · community data — verify ⚠ items in-game` })

  return (
    <ul className="compact-alerts hidden gap-2" aria-label="Alerts">
      {alerts.slice(0, 2).map((a) => (
        <li
          key={a.id}
          data-surface="data" className={`card flex items-center justify-between gap-2 px-3 py-2 text-xs ${a.tone === 'danger' ? 'text-danger' : 'text-warn'}`}
          data-no-lift
        >
          <span>{a.text}</span>
          {a.id === 'res' || a.id === 'patch' ? (
            <Link href="/character" className="shrink-0 text-ink-dim underline">
              Open
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
