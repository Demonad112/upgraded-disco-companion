/**
 * What every PoB-sourced build script shares: the pinned PoB2 revision (vendor/pob2/PIN.json) and PoB's own loaded
 * data, dumped by the Lua exporters in tools/pob2/export/ through scripts/pob2/run.mjs. The scripts no longer take a
 * POB2_DIR checkout: the data always comes from the vendored copy, so a build is reproducible from this repo alone.
 *
 * Needs LuaJIT with lua-utf8 (scripts/pob2/install-luajit.sh) or Docker, like the oracle. POB2_RUNNER=luajit|docker forces one.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportData } from '../../../../scripts/pob2/run.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

/** vendor/pob2/PIN.json: the pinned PoB2 commit, its date, PoB version and latest tree version. */
export const pin = JSON.parse(readFileSync(join(root, 'vendor', 'pob2', 'PIN.json'), 'utf8'))

export const pobCommit = pin.commit
export const pobCommitShort = pin.commit.slice(0, 7)
/** The commit date (YYYY-MM-DD): the date the data was extracted as of, so a rebuild is byte-identical. */
export const pobCommitDate = pin.commitDate.slice(0, 10)
export const pobSource = `PathOfBuilding-PoE2@${pobCommitShort}`

/** Run one Lua exporter against the vendored PoB2 and return its JSON. */
export function pobExport(name) {
  const data = exportData(name)
  if (data.pobVersion !== pin.manifestVersion) {
    throw new Error(`exporter ran PoB ${data.pobVersion}, but PIN.json says ${pin.manifestVersion}: run npm run pob2:verify`)
  }
  if (data.treeVersion !== pin.latestTreeVersion) {
    throw new Error(`exporter saw tree ${data.treeVersion}, but PIN.json says ${pin.latestTreeVersion}`)
  }
  return data
}
