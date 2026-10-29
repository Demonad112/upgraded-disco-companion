/**
 * State machine behind the "New version ready" toast.
 *
 * sw.js calls skipWaiting() on install, so a new worker never sits in `waiting`:
 * it activates and claims the open page straight away. The page's signal is
 * therefore `controllerchange` on a page that already had a controller. The
 * page is then running the old build's JavaScript against the new worker, and
 * reloading picks up the new shell (which install pre-filled). A first visit
 * also fires `controllerchange` (clients.claim), but had no controller to
 * replace, so it must stay silent.
 */
export type UpdateState = 'idle' | 'ready' | 'dismissed' | 'reloading'

export type UpdateEvent = 'controller-replaced' | 'dismiss' | 'reload'

export function nextUpdateState(state: UpdateState, event: UpdateEvent): UpdateState {
  switch (event) {
    case 'controller-replaced':
      // A later update after "Later" shows the toast again: it is a newer build.
      return state === 'reloading' ? state : 'ready'
    case 'dismiss':
      return state === 'ready' ? 'dismissed' : state
    case 'reload':
      return state === 'ready' || state === 'dismissed' ? 'reloading' : state
  }
}

/** Whether the toast is on screen. */
export const updateToastVisible = (state: UpdateState) => state === 'ready'
