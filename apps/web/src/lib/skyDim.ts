'use client'

import { createLocalStore, useLocalStore } from './localStore'

/** "Dim sky behind blocks": on by default; stored under its own key. */
export const skyDimStore = createLocalStore<boolean>('poe2-sky-dim', true, (v) => typeof v === 'boolean')

export const useSkyDim = () => useLocalStore(skyDimStore)
export const setSkyDim = (on: boolean) => skyDimStore.set(() => on)
