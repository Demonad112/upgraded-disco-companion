'use client'

import type { Analysis } from '@poe2/core'
import { usePobEngineStatus } from '@/lib/usePobEngine'
import { fmt } from '@/components/ui'

/** One line under the damage card on what Path of Building's engine added for a pasted code, or why it did not. */
export function EngineStatus({ analysis: a }: { analysis: Analysis }) {
  const status = usePobEngineStatus()
  if (a.source !== 'pob-export' || status.status === 'off') return null
  const note = a.engine
  let text: string
  let warn = false
  if (status.status === 'loading') {
    text = 'Calculating every skill with Path of Building’s engine. This takes about 10 seconds.'
  } else if (status.status === 'error') {
    text = `Path of Building’s engine is unavailable (${status.message}). Only the main skill’s damage is shown.`
    warn = true
  } else if (!note) {
    return null
  } else if (note.loadError) {
    text = `Path of Building could not load this code: ${note.loadError}`
    warn = true
  } else {
    const ag = note.agreement
    const worst = ag?.mismatches[0]
    text =
      `Path of Building ${note.pobVersion ?? ''} calculated ${note.skillsAdded} more skill${note.skillsAdded === 1 ? '' : 's'} from your code.` +
      (ag && ag.checked
        ? ` It reproduces ${ag.matched} of the code’s ${ag.checked} stats` +
          (worst ? ` (largest gap: ${worst.stat}, ${fmt(worst.code)} in the code, ${fmt(worst.engine)} calculated).` : '.')
        : '')
    warn = !!ag && ag.matched < ag.checked
  }
  return (
    <p role="status" className={`mt-3 text-xs leading-relaxed ${warn ? 'text-warn' : 'text-ink-mute'}`}>
      {text}
    </p>
  )
}
