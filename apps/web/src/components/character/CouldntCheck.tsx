import type { Analysis } from '@poe2/core'
import { ProOnly } from '@/components/shared/ProToggle'
import { couldntCheck } from '@/lib/couldntCheck'

/**
 * Everything the analysis could not check (HG1-9), as one quiet line under "Why this grade"; the list is behind Pro
 * detail. Renders nothing when all was checked.
 */
export function CouldntCheck({ analysis }: { analysis: Analysis }) {
  const items = couldntCheck(analysis)
  if (!items.length) return null
  return (
    <aside data-surface="data" className="card" aria-labelledby="couldnt-check-title" data-testid="couldnt-check">
      <p className="text-xs leading-relaxed text-ink-dim">
        <strong id="couldnt-check-title" className="font-medium text-ink">
          What we couldn’t check:
        </strong>{' '}
        {items.length === 1 ? '1 thing' : `${items.length} things`} this code doesn’t carry. Pro detail lists them.
      </p>
      <ProOnly>
        <ul className="mt-2 space-y-1.5">
          {items.map((i) => (
            <li key={i.key} className="text-xs leading-relaxed text-ink-dim">
              {i.text}
            </li>
          ))}
        </ul>
      </ProOnly>
    </aside>
  )
}
