'use client'

/**
 * The full defences checklist: resistances against cap, the one-shot ratio and
 * freeze, shock and ignite exposure. Restates figures already on the page;
 * a check the data cannot settle reads "Unknown", never a pass. Collapsed by
 * default under the resist chip row.
 */

import type { Analysis } from '@poe2/core'
import { STATUS_LABEL, defenceChecklist, type CheckStatus } from '@/lib/defenceChecklist'
import { Tag } from '../ui'

const TONE: Record<CheckStatus, 'good' | 'warn' | 'danger' | 'default'> = { pass: 'good', warn: 'warn', fail: 'danger', unknown: 'default' }

export function DefenceChecklist({ analysis }: { analysis: Analysis }) {
  const checks = defenceChecklist(analysis)
  return (
    <details className="mt-4 border border-line" id="defence-checklist-disclosure">
      <summary className="flex cursor-pointer items-center px-4 text-sm text-ink-dim">Full checklist</summary>
      <ul className="space-y-2 border-t border-line p-4" id="defence-checklist" aria-label="Defences checklist">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 text-sm" data-check={c.id} data-status={c.status}>
            <span className="mt-0.5 w-20 shrink-0">
              <Tag tone={TONE[c.status]}>{STATUS_LABEL[c.status]}</Tag>
            </span>
            <span className="min-w-0">
              <span className="label-field">{c.label}</span>
              <span className="text-ink-dim"> · {c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
