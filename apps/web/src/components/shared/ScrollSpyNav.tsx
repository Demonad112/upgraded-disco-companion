'use client'

import { useScrollSpy } from '@/hooks/useScrollSpy'

export interface SpyItem {
  id: string
  label: string
}

/**
 * The section tab bar (X1): a sticky strip under the header, solid so nothing
 * shows through, scrolling sideways on narrow screens. A scroll spy marks the
 * section being read. Links are plain fragment links, so hash handling
 * elsewhere is unaffected.
 */
export function ScrollSpyNav({ items, label }: { items: SpyItem[]; label: string }) {
  const [active, setActive] = useScrollSpy(items.map((i) => i.id))
  return (
    <nav
      aria-label={label}
      data-compact-hide
      className="bar idx tabbar"
    >
      {items.map((item) => {
        const current = item.id === active
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => setActive(item.id)}
            aria-current={current ? 'true' : undefined}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
