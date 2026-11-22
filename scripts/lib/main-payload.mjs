/**
 * The owner's main build as a poe.ninja-shaped character payload, for the mock proxy, the screenshot and perf
 * scripts and the e2e suite (PB-5 replaced the committed poe.ninja captures). It is the PoB code in
 * `packages/core/test/pob2/forbidden-rites/main.code.txt` read through `pobToCharModel`, so it needs `@poe2/core`
 * built (`npm run build -w @poe2/core`). No network.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const MAIN_CODE_PATH = join(root, 'packages/core/test/pob2/forbidden-rites/main.code.txt')

/** The main build's PoB code. */
export const mainCode = () => readFileSync(MAIN_CODE_PATH, 'utf8').trim()

/** `{ type: 'character', charModel }` for the main build. */
export async function mainPayload() {
  const core = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const model = await core.pobToCharModel(mainCode())
  // A code carries no identity; the mock proxy states one, matching the e2e PROFILE_URL.
  return { type: 'character', charModel: { ...model, name: 'Main', account: 'Demonad112#2589', league: 'Runes of Aldur' } }
}

/** The payload as the JSON text a proxy or a paste box carries. */
export async function mainPayloadJson() {
  return JSON.stringify(await mainPayload())
}

// `node scripts/lib/main-payload.mjs` prints the payload JSON (the e2e suite reads it this way, synchronously).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.stdout.write(await mainPayloadJson())
