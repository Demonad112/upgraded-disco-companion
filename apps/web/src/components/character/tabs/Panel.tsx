import type { ReactNode } from 'react'

/** One tab's section. The tab label is the visible title, so the h2 is for the heading outline and screen readers. */
export function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="ct-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="sr-only">
        {title}
      </h2>
      <div className="grid-cards">{children}</div>
    </section>
  )
}
