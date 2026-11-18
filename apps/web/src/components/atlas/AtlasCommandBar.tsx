'use client'

import { forwardRef } from 'react'
import { Button } from '@/components/shared/controls'
import { AtlasTabs } from './AtlasGuideTabs'
import { useAtlasMap } from './AtlasMapContext'

/**
 * The sticky bar (AR3): tabs, "N of M · name · leg L", Prev / Tick / Next, Full screen and a thin progress line.
 * On phones (styles/atlas.css) the tabs stay on top and the step group becomes the bottom peek bar with a List button.
 */
export const AtlasCommandBar = forwardRef<HTMLElement>(function AtlasCommandBar(_props, ref) {
  const { route, legs, current, currentIdx, takenCount, isTaken, prev, next, tick, full, setFull, setListOpen } = useAtlasMap()
  const leg = current ? legs.find((l) => l.stepId === current.id)?.leg : undefined
  const done = current ? isTaken(current) : false
  const pct = route.length ? Math.round((takenCount / route.length) * 100) : 0

  return (
    <header ref={ref} className="atlas-bar" data-surface="data">
      <div className="atlas-bar-tabs">
        <AtlasTabs />
      </div>
      <div className="atlas-bar-step" role="group" aria-label="Route steps" data-empty={!current || undefined}>
        {current ? (
          <div className="atlas-step-info" aria-live="polite">
            <span className="atlas-step-count tabular">
              {currentIdx + 1} of {route.length}
            </span>
            <span className="atlas-step-name">
              {current.name}
              {leg ? <span className="atlas-step-leg"> · leg {leg}</span> : null}
            </span>
          </div>
        ) : null}
        {current ? (
          <div className="atlas-step-btns">
            <Button size="sm" onClick={prev} disabled={currentIdx <= 0} aria-label="Previous step">
              ‹ Prev
            </Button>
            <Button size="sm" variant={done ? 'secondary' : 'primary'} aria-pressed={done} onClick={tick}>
              {done ? '✓ Ticked' : 'Tick'}
            </Button>
            <Button size="sm" onClick={next} disabled={currentIdx >= route.length - 1} aria-label="Next step">
              Next ›
            </Button>
          </div>
        ) : null}
        <Button size="sm" className="atlas-list-btn" onClick={() => setListOpen(true)}>
          List
        </Button>
      </div>
      <Button size="sm" className="atlas-full-btn" aria-pressed={full} onClick={() => setFull(!full)}>
        {full ? 'Exit full screen' : 'Full screen'}
      </Button>
      {route.length ? (
        <div className="atlas-progress" role="progressbar" aria-label="Route progress" aria-valuemin={0} aria-valuemax={route.length} aria-valuenow={takenCount}>
          <span style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </header>
  )
})
