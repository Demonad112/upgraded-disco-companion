'use client'

/**
 * Register the offline worker, and tell the reader when a new build has taken over.
 *
 * Registration is deliberately silent: it failing is not something a reader can
 * act on, and an error banner about caching would be noise over the analysis they
 * came for. It is logged for anyone with devtools open.
 *
 * Registration is skipped on localhost so a stale worker never serves an old
 * bundle during development — the single most confusing failure mode a service
 * worker has.
 *
 * The one visible thing is the "New version ready" toast. The worker skips
 * waiting, so it appears when the controller of an already-controlled page
 * changes (see lib/updateToast.ts). Reload is a plain reload: install already
 * cached the new shell.
 */

import { useEffect, useReducer } from 'react'
import { startInstallCapture } from '@/lib/installPrompt'
import { nextUpdateState, updateToastVisible, type UpdateState } from '@/lib/updateToast'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
/** Changes whenever the cached data files do — see next.config.ts. */
const DATA_VERSION = process.env.NEXT_PUBLIC_DATA_VERSION ?? 'dev'
/** Changes on every deploy, so the worker drops the old app shell — see next.config.ts. */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

export function ServiceWorker() {
  const [state, dispatch] = useReducer(nextUpdateState, 'idle' as UpdateState)

  useEffect(() => {
    startInstallCapture()
    if (!('serviceWorker' in navigator)) return
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return

    // First visits are claimed too, but there was nothing to replace.
    const hadController = !!navigator.serviceWorker.controller
    const onChange = () => {
      if (hadController) dispatch('controller-replaced')
    }
    navigator.serviceWorker.addEventListener('controllerchange', onChange)

    navigator.serviceWorker
      .register(`${BASE}/sw.js?v=${DATA_VERSION}&b=${BUILD_ID}`, { scope: `${BASE}/` })
      .catch((err: Error) => console.warn('Offline support unavailable:', err.message))

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [])

  useEffect(() => {
    if (state === 'reloading') location.reload()
  }, [state])

  if (!updateToastVisible(state)) return null
  return (
    <div className="update-toast" role="status">
      <span>New version ready</span>
      <button type="button" data-primary onClick={() => dispatch('reload')}>
        Reload
      </button>
      <button type="button" onClick={() => dispatch('dismiss')} aria-label="Dismiss">
        Later
      </button>
    </div>
  )
}
