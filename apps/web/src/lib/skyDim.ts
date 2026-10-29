'use client'

import { createLocalStore, useLocalStore } from './localStore'

/** "Dim sky behind blocks": on by default; stored under its own key. */
export const SKY_DIM_KEY = 'poe2-sky-dim'

export const skyDimStore = createLocalStore<boolean>(SKY_DIM_KEY, true, (v) => typeof v === 'boolean')

/** Reflects the setting onto <html>, where the CSS dim keys on `data-sky-dim-off`. */
export function applySkyDim(on: boolean): void {
  document.documentElement.toggleAttribute('data-sky-dim-off', !on)
}

export const useSkyDim = () => useLocalStore(skyDimStore)
export const setSkyDim = (on: boolean) => {
  skyDimStore.set(() => on)
  applySkyDim(on)
}

/** In <head>: a stored "off" applies before first paint, so a reload never flashes the dim. */
export const SKY_DIM_BOOTSTRAP = `(function(){try{if(JSON.parse(localStorage.getItem(${JSON.stringify(SKY_DIM_KEY)})||'true')===false)document.documentElement.setAttribute('data-sky-dim-off','')}catch(e){}})()`
