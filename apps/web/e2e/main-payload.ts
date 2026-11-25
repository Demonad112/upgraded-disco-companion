import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The owner's main build as a poe.ninja-shaped payload (PB-5 replaced the committed poe.ninja captures): its PoB code
 * read through core's `pobToCharModel`. Needs @poe2/core built. Playwright runs from apps/web.
 */
export const mainPayloadJson: string = execFileSync(process.execPath, [resolve('../../scripts/lib/main-payload.mjs')], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})

/** The same character with Hollow Resonance (group 4) as main skill, so the DPS row has a per-use line (CP-2). */
export const useRatesPayloadJson = (): string =>
  execFileSync(process.execPath, [resolve('../../scripts/lib/main-payload.mjs'), '--use-rates'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })

export const mainPayload = JSON.parse(mainPayloadJson) as { type: string; charModel: Record<string, unknown> & { pathOfBuildingExport: string } }

/** The reference character's PoB code (ninja-default: poe.ninja's export with its default config), as pasted into a code box. */
export const mainCode: string = readFileSync(resolve('../../packages/core/test/reference/ninja-default/code.txt'), 'utf8').trim()

/** The code the `#pob=` share link carries in e2e: the same reference code. */
export const currentCode: string = mainCode
