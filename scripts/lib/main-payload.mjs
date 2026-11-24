/**
 * The owner's main build as a poe.ninja-shaped character payload, for the mock proxy, the screenshot and perf
 * scripts and the e2e suite (PB-5 replaced the committed poe.ninja captures). It is the PoB code poe.ninja
 * exports for the reference character (`packages/core/test/ninja-legacy/main-ninja.code.txt`, CP-6) read through `pobToCharModel`, so it needs `@poe2/core`
 * built (`npm run build -w @poe2/core`). No network.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const MAIN_CODE_PATH = join(root, 'packages/core/test/ninja-legacy/main-ninja.code.txt')

/** The main build's PoB code. */
export const mainCode = () => readFileSync(MAIN_CODE_PATH, 'utf8').trim()

/** `{ type: 'character', charModel }` for the main build. */
export async function mainPayload() {
  const core = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const model = await core.pobToCharModel(mainCode())
  // A code carries no identity; the mock proxy states one, matching the e2e PROFILE_URL.
  return { type: 'character', charModel: { ...model, name: 'Main', account: 'Demonad112#2589', league: 'Runes of Aldur' } }
}

/**
 * The reference character with group 4 (Hollow Resonance) as its main skill, carrying PoB's engine figures for that
 * group from `main-ninja.groups.oracle.json` (a code holds PlayerStats for its main group only). Its CombinedDPS is
 * below its TotalDPS, so the DPS row shows the per-use line (CP-2). Same variant as core's code-analysis test.
 */
export async function useRatesPayload() {
  const core = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const oracle = JSON.parse(readFileSync(MAIN_CODE_PATH.replace(/\.code\.txt$/, '.groups.oracle.json'), 'utf8'))
  const g4 = oracle.rows.find((r) => r.group === 4 && r.activeSkill === 1)
  const xml = (await core.decodePobExport(mainCode()))
    .replace(/mainSocketGroup="\d+"/, 'mainSocketGroup="4"')
    .replace(/<PlayerStat stat="TotalDPS" value="[^"]*"\/>/, `<PlayerStat stat="TotalDPS" value="${g4.TotalDPS}"/>`)
    .replace(/<PlayerStat stat="CombinedDPS" value="[^"]*"\/>/, `<PlayerStat stat="CombinedDPS" value="${g4.CombinedDPS}"/>`)
  const model = core.snapshotToCharModel(core.readPobSnapshot(xml))
  return { type: 'character', charModel: { ...model, name: 'Main', account: 'Demonad112#2589', league: 'Runes of Aldur' } }
}

/** The payload as the JSON text a proxy or a paste box carries. */
export async function mainPayloadJson() {
  return JSON.stringify(await mainPayload())
}

// `node scripts/lib/main-payload.mjs [--use-rates]` prints the payload JSON (the e2e suite reads it this way, synchronously).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.stdout.write(process.argv.includes('--use-rates') ? JSON.stringify(await useRatesPayload()) : await mainPayloadJson())
}
