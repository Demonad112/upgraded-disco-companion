import type { Analysis } from '@poe2/core'
import { couldntCheck } from '@/lib/couldntCheck'

/** One panel for everything the analysis could not check (HG1-9). Renders nothing when all was checked. */
export function CouldntCheck({ analysis }: { analysis: Analysis }) {
  const items = couldntCheck(analysis)
  if (!items.length) return null
  return (
    <aside data-surface="data" className="card border-warn/50" aria-labelledby="couldnt-check-title" data-testid="couldnt-check">
      <h3 id="couldnt-check-title" className="eyebrow text-warn">
        What we couldn’t check
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i.key} className="text-xs leading-relaxed text-ink-dim">
            {i.text}
          </li>
        ))}
      </ul>
    </aside>
  )
}
