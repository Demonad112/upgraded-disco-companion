'use client'

import { createLocalStore, useLocalStore } from './localStore'

/**
 * Companion on/off: on by default. "Turn off" in the panel and the footer checkbox write the same key, so a dismissal
 * persists until the footer turns it back on.
 */
const companionStore = createLocalStore<boolean>('poe2-companion', true, (v) => typeof v === 'boolean')

export const useCompanionOn = () => useLocalStore(companionStore)
export const setCompanionOn = (on: boolean) => companionStore.set(() => on)
