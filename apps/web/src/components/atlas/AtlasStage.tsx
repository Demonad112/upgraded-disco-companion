'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { ProToggle } from '@/components/shared/ProToggle'
import { Button } from '@/components/shared/controls'
import { AtlasCommandBar } from './AtlasCommandBar'
import { AtlasGuidePanel } from './AtlasGuideTabs'
import { useAtlasMap } from './AtlasMapContext'
import { AtlasMapSheet } from './AtlasMapSheet'
import { AtlasTreeMap } from './AtlasTreeMap'

/**
 * One DOM, two layouts, by CSS grid areas (styles/atlas.css):
 *   normal  "bar bar" "map map" "list aside"
 *   full    "list bar" "list map"   (position: fixed, inset 0; the aside is hidden)
 */
export function AtlasStage({ aside }: { aside: ReactNode }) {
  const { full, setFull, drawer, setDrawer } = useAtlasMap()
  const barRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // The map's height is the viewport minus the bar, and the bar's height changes when the tabs wrap.
  useEffect(() => {
    const bar = barRef.current
    const stage = stageRef.current
    if (!bar || !stage) return
    const sync = () => stage.style.setProperty('--atlas-bar-h', `${Math.round(bar.getBoundingClientRect().height)}px`)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  // Full screen: Escape exits (unless the key already did something, like clearing the search box); the page behind
  // doesn't scroll.
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setFull(false)
    }
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = was
    }
  }, [full, setFull])

  return (
    <div
      ref={stageRef}
      id="atlas-stage"
      className="atlas-stage"
      data-full={full || undefined}
      data-drawer={drawer || undefined}
      style={{ '--atlas-bar-h': '7rem' } as CSSProperties}
    >
      <AtlasCommandBar ref={barRef} />
      <div className="atlas-map-area">
        <AtlasTreeMap />
      </div>
      <AtlasMapSheet>
        <div className="atlas-list-head">
          <ProToggle />
          {full ? (
            <Button size="sm" onClick={() => setDrawer(false)} aria-label="Hide the list">
              Hide list
            </Button>
          ) : null}
        </div>
        <div className="atlas-list-scroll" data-atlas-scroll>
          <AtlasGuidePanel />
        </div>
      </AtlasMapSheet>
      {full && !drawer ? (
        <Button size="sm" className="atlas-drawer-open" onClick={() => setDrawer(true)}>
          Show list
        </Button>
      ) : null}
      <aside className="atlas-aside" aria-label="Atlas notes">
        {aside}
        <p className="text-[length:var(--fs-11)] leading-relaxed text-ink-mute">
          Node positions and effects come from the game&apos;s data, via poe2db. Green marks what you&apos;ve ticked here, not what&apos;s on your account.
        </p>
      </aside>
    </div>
  )
}
