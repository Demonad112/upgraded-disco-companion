'use client'

import { useScrollSpy } from '@/hooks/useScrollSpy'

export interface SpyItem {
  id: string
  label: string
}

/**
 * A mini index that highlights the section being read. A sticky pill row on
 * narrow screens, a sticky column beside the content from `lg`. Links are
 * plain fragment links, so hash handling elsewhere is unaffected.
 */
export function ScrollSpyNav({ items, label }: { items: SpyItem[]; label: string }) {
  const [active, setActive] = useScrollSpy(items.map((i) => i.id))
  return (
    <nav
      aria-label={label}
      data-compact-hide
      className="sticky top-[var(--nav-h)] z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line bg-[var(--page)]/90 px-4 backdrop-blur-md sm:mx-0 lg:top-[calc(var(--nav-h)+1rem)] lg:z-0 lg:mb-0 lg:flex-col lg:self-start lg:overflow-visible lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
    >
      {items.map((item) => {
        const current = item.id === active
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => setActive(item.id)}
            aria-current={current ? 'location' : undefined}
            className={`flex shrink-0 items-center border-b-2 px-3 text-xs whitespace-nowrap transition-colors lg:border-b-0 lg:border-l-2 ${
              current
                ? 'border-accent bg-accent-soft font-semibold text-ink'
                : 'border-transparent text-ink-mute hover:text-ink'
            }`}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
