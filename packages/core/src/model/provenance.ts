/**
 * How a figure should be labelled for the reader.
 *
 * `Provenance` records where a number came from inside the codebase. The reader
 * needs one of five plain labels, and must never see one kind of number
 * dressed as another:
 *
 *  - `observed`       read as given from the PoB code (or poe.ninja). Nothing
 *                     recomputed here.
 *  - `estimate`       computed here by the mini-calc where the code carries no
 *                     figure ("≈ est."). Never shown in place of a read number.
 *  - `derived`        arithmetic this project did on observed values. Says so.
 *  - `nominal`        a figure from game data that says what something grants in
 *                     isolation, not what it does on this build.
 *  - `unknown`        the data cannot establish it; shown as a range or a gap.
 */

import type { Provenance } from './types.js'

export type ValueLabel = 'observed' | 'estimate' | 'derived' | 'nominal' | 'unknown'

export interface ValueLabelInfo {
  label: ValueLabel
  /** Short text for a badge. */
  text: string
  /** One sentence for a tooltip. */
  detail: string
}

const INFO: Record<ValueLabel, ValueLabelInfo> = {
  observed: { label: 'observed', text: 'observed', detail: 'Read as given from poe.ninja or the Path of Building export it attaches. Not recomputed here.' },
  estimate: { label: 'estimate', text: '≈ est.', detail: 'Estimated here from the code’s text with a simple calculation, not Path of Building’s exact figure.' },
  derived: { label: 'derived', text: 'derived', detail: 'Arithmetic done here on observed values. Check it against the source before relying on it.' },
  nominal: { label: 'nominal', text: 'nominal', detail: 'What the game data says it grants in isolation. Not measured on this build.' },
  unknown: { label: 'unknown', text: 'unknown', detail: 'The data cannot establish this value.' },
}

export function valueLabelInfo(label: ValueLabel): ValueLabelInfo {
  return INFO[label]
}

/** Map an internal provenance to the reader-facing label. A missing provenance is unknown, never observed. */
export function labelOf(provenance: Provenance | null | undefined): ValueLabelInfo {
  switch (provenance) {
    case 'ninja':
    case 'pob-export':
      return INFO.observed
    case 'estimate':
      return INFO.estimate
    case 'derived':
      return INFO.derived
    case 'nominal':
      return INFO.nominal
    default:
      return INFO.unknown
  }
}
