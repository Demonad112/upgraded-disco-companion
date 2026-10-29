import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { CHANGELOG, KIND_LABEL } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'What’s new — PoE2 Endgame Companion',
  description: 'Every app change and data regeneration, newest first, with what was not checked against the current patch.',
}

/** Newest first by date; entries on the same date keep their file order. */
const entries = CHANGELOG.map((entry, i) => ({ entry, i }))
  .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.i - b.i)
  .map(({ entry }) => entry)

export default function WhatsNewPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Changelog"
        title="What’s"
        accent="new"
        description="App changes and data regenerations, newest first. Community-derived data drifts, so each release also says what was not checked against the current patch."
      />

      <ol aria-label="Changes, newest first" className="flex flex-col gap-5 border-l border-line pl-5 sm:pl-7">
        {entries.map((entry) => (
          <li key={`${entry.patch}-${entry.date}`} id={`changes-${entry.date}`} className="relative">
            {/* Square marker on the timeline rule. */}
            <span aria-hidden className="absolute top-2 -left-[25px] size-2 bg-accent sm:-left-[33px]" />
            <div className="flex flex-wrap items-center gap-3">
              <time dateTime={entry.date} className="font-mono text-sm text-ink">
                {entry.date}
              </time>
              <span className="chip border-accent-line text-accent">Patch {entry.patch}</span>
            </div>
            <ul data-surface="data" className="card mt-3 space-y-2 text-sm leading-relaxed">
              {entry.items.map((item) => (
                <li key={item.text} className={item.kind === 'caveat' ? 'text-warn' : 'text-ink-dim'}>
                  <span className="eyebrow mr-2">{KIND_LABEL[item.kind]}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
