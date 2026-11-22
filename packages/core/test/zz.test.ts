import { it } from 'vitest'
import { readPobConfig, describePobConfig } from '../src/pob/config.js'
import { decodePobExport } from '../src/pob/export.js'
import { analyzeCharacter } from '../src/analyze.js'
import { mainPayload, mainCode } from './helpers/main-build.js'
it('x', async () => {
  const c: any = readPobConfig(await decodePobExport(mainCode))
  console.log(describePobConfig(c))
  const a: any = await analyzeCharacter(mainPayload())
  console.log(JSON.stringify(a.assessment.caveats), a.reconciliation?.checks.find((x: any) => x.stat.startsWith('dps:'))?.severity)
})
