/**
 * Write generated/version.json: the machine-readable data revision and export
 * date that @poe2/core's `readDataVersion` / `provenanceFor` stamp onto answers.
 * Called by the PoB export builder, which produces the canonical artifacts.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function writeDataVersion(outDir, { gameVersion, pobCommit, source, artifacts, extractedAt = new Date().toISOString().slice(0, 10) }) {
  const version = {
    version: 1,
    dataRevision: pobCommit ? `${gameVersion}@${pobCommit}` : gameVersion,
    gameVersion,
    extractedAt,
    source,
    artifacts,
  }
  writeFileSync(join(outDir, 'version.json'), JSON.stringify(version, null, 2) + '\n')
  return version
}
