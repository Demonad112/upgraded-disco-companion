'use client'

import { createLocalStore, useLocalStore } from './localStore'

/** "Show companion": on by default; the footer toggle writes it. */
export const COMPANION_KEY = 'poe2-companion'

export const acceptCompanion = (v: unknown): v is boolean => typeof v === 'boolean'

const companionStore = createLocalStore<boolean>(COMPANION_KEY, true, acceptCompanion)

export const useCompanionOn = () => useLocalStore(companionStore)
export const setCompanionOn = (on: boolean) => companionStore.set(() => on)
