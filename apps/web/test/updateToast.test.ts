import { describe, expect, it } from 'vitest'
import { nextUpdateState, updateToastVisible, type UpdateEvent, type UpdateState } from '../src/lib/updateToast'

const run = (events: UpdateEvent[], from: UpdateState = 'idle') => events.reduce(nextUpdateState, from)

describe('update toast state machine', () => {
  it('stays hidden until the controller is replaced', () => {
    expect(updateToastVisible('idle')).toBe(false)
    expect(run(['dismiss'])).toBe('idle')
    expect(run(['reload'])).toBe('idle')
  })

  it('shows once the controller is replaced', () => {
    expect(run(['controller-replaced'])).toBe('ready')
    expect(updateToastVisible('ready')).toBe(true)
  })

  it('hides on Later, and comes back when a newer build takes over', () => {
    expect(run(['controller-replaced', 'dismiss'])).toBe('dismissed')
    expect(updateToastVisible('dismissed')).toBe(false)
    expect(run(['controller-replaced', 'dismiss', 'controller-replaced'])).toBe('ready')
  })

  it('reload works from the toast and after dismissing', () => {
    expect(run(['controller-replaced', 'reload'])).toBe('reloading')
    expect(run(['controller-replaced', 'dismiss', 'reload'])).toBe('reloading')
  })

  it('does not flicker back once reloading', () => {
    expect(run(['controller-replaced', 'reload', 'controller-replaced', 'dismiss'])).toBe('reloading')
    expect(updateToastVisible('reloading')).toBe(false)
  })
})
