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

export const mainPayload = JSON.parse(mainPayloadJson) as { type: string; charModel: Record<string, unknown> & { pathOfBuildingExport: string } }

/** The main build's PoB code, as pasted into the paste box. */
export const mainCode: string = readFileSync(resolve('../../packages/core/test/pob2/forbidden-rites/main.code.txt'), 'utf8').trim()
