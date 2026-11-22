/**
 * Write generated/version.json: the machine-readable data revision and export
 * date that @poe2/core's `readDataVersion` / `provenanceFor` stamp onto answers.
 * Called by every PoB-sourced builder; they all read the same vendor/pob2/PIN.json,
 * so whichever runs last writes the same file.
 *
 * Nothing here is stamped by hand except GAME_PATCH. The commit, its date, the PoB
 * version and the tree version come from PIN.json; PoB's data carries no game patch
 * string (its tree is only "0_5"), so the patch label is the one reviewed constant.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pin, pobCommit, pobCommitDate, pobCommitShort, pobSource } from './pob.mjs'

/**
 * The game patch the pinned PoB2 data was exported for. Bump it with `npm run pob2:bump` when PoB's data moves to a
 * new patch. `writeDataVersion` refuses a patch that does not extend PoB's tree version ("0.5.5" is tree "0_5").
 */
export const GAME_PATCH = '0.5.5'

/** Every artifact built from PoB's data; each is rebuilt by `npm run build:pob -w @poe2/data`. */
export const POB_ARTIFACTS = ['mod-tiers.json', 'bases.json', 'pob-skills.json', 'passive-tree.json']

export function writeDataVersion(outDir, { artifacts = POB_ARTIFACTS } = {}) {
  const tree = pin.latestTreeVersion.replace('_', '.')
  if (GAME_PATCH !== tree && !GAME_PATCH.startsWith(`${tree}.`)) {
    throw new Error(`GAME_PATCH ${GAME_PATCH} does not match PoB's tree version ${pin.latestTreeVersion}: bump GAME_PATCH in lib/version.mjs`)
  }
  const version = {
    version: 1,
    dataRevision: `${GAME_PATCH}@${pobCommitShort}`,
    gameVersion: GAME_PATCH,
    extractedAt: pobCommitDate,
    source: pobSource,
    pobCommit,
    pobVersion: pin.manifestVersion,
    treeVersion: pin.latestTreeVersion,
    artifacts,
  }
  writeFileSync(join(outDir, 'version.json'), JSON.stringify(version, null, 2) + '\n')
  return version
}
