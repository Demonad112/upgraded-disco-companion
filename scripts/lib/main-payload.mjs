/**
 * The owner's main build as a poe.ninja-shaped character payload, for the mock proxy, the screenshot and perf
 * scripts and the e2e suite (PB-5 replaced the committed poe.ninja captures). It is the PoB code poe.ninja
 * exports for the reference character (`packages/core/test/reference/ninja-default/code.txt`) read through `pobToCharModel`, so it needs `@poe2/core`
 * built (`npm run build -w @poe2/core`). No network.
 */

import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const MAIN_CODE_PATH = join(root, 'packages/core/test/reference/ninja-default/code.txt')

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
 * group from `reference/ninja-default/groups.oracle.json` (a code holds PlayerStats for its main group only). Its CombinedDPS is
 * below its TotalDPS, so the DPS row shows the per-use line (CP-2). Same variant as core's code-analysis test.
 */
export async function useRatesPayload() {
  const core = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const oracle = JSON.parse(readFileSync(MAIN_CODE_PATH.replace(/code\.txt$/, 'groups.oracle.json'), 'utf8'))
  const g4 = oracle.rows.find((r) => r.group === 4 && r.activeSkill === 1)
  if (!g4 || typeof g4.TotalDPS !== 'number' || typeof g4.CombinedDPS !== 'number')
    throw new Error('main-payload --use-rates: no group 4 TotalDPS/CombinedDPS row in reference/ninja-default/groups.oracle.json')
  // Each edit must land: a silent miss would keep the main group's figures and fail the e2e on the wrong number.
  const edit = (text, re, to, what) => {
    if (!re.test(text)) throw new Error(`main-payload --use-rates: ${what} not found in the decoded export`)
    return text.replace(re, to)
  }
  let xml = await core.decodePobExport(mainCode())
  xml = edit(xml, /mainSocketGroup="\d+"/, 'mainSocketGroup="4"', 'mainSocketGroup')
  xml = edit(xml, /<PlayerStat stat="TotalDPS" value="[^"]*"\s*\/>/, `<PlayerStat stat="TotalDPS" value="${g4.TotalDPS}"/>`, 'TotalDPS')
  xml = edit(xml, /<PlayerStat stat="CombinedDPS" value="[^"]*"\s*\/>/, `<PlayerStat stat="CombinedDPS" value="${g4.CombinedDPS}"/>`, 'CombinedDPS')
  const model = core.snapshotToCharModel(core.readPobSnapshot(xml))
  return { type: 'character', charModel: { ...model, name: 'Main', account: 'Demonad112#2589', league: 'Runes of Aldur' } }
}

/**
 * The reference code with Skull Song's two runes removed (`Rune: None`, as PoB writes an empty socket), so the
 * empty-rune finding (CP-2) has something to find. Same variant as core's code-analysis test.
 */
export async function emptyRunesCode() {
  const core = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const xml = await core.decodePobExport(mainCode())
  const runes = 'Rune: Soul Core of Topotante\nRune: Saqawal&apos;s Rune of the Sky'
  if (!xml.includes(runes)) throw new Error("main-payload --empty-runes: Skull Song's runes not found in the decoded export")
  return deflateSync(Buffer.from(xml.replace(runes, 'Rune: None\nRune: None'))).toString('base64url')
}

/** The payload as the JSON text a proxy or a paste box carries. */
export async function mainPayloadJson() {
  return JSON.stringify(await mainPayload())
}

// `node scripts/lib/main-payload.mjs [--use-rates|--empty-runes]` prints the payload JSON, or with --empty-runes the
// variant's PoB code (the e2e suite reads it this way, synchronously).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const arg = process.argv.slice(2)
  process.stdout.write(
    arg.includes('--empty-runes') ? await emptyRunesCode() : arg.includes('--use-rates') ? JSON.stringify(await useRatesPayload()) : await mainPayloadJson(),
  )
}
