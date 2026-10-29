/**
 * What changed, newest first. Community-derived data drifts, so each entry
 * says what was regenerated and — just as important — what was not checked
 * against the current patch. Dates come from packages/data/PROVENANCE.md.
 */
export interface ChangelogEntry {
  /** Game patch the entry applies to, or the app release it shipped under. */
  patch: string
  date: string
  items: { kind: 'data' | 'app' | 'caveat'; text: string }[]
}

/** Reader-facing name of each item kind. */
export const KIND_LABEL = { data: 'Data', app: 'App', caveat: 'Unverified' } as const

export const CHANGELOG: ChangelogEntry[] = [
  {
    patch: '0.5.5',
    date: '2026-10-20',
    items: [
      { kind: 'app', text: 'New look, a compact second-monitor mode and a section index on long pages.' },
      { kind: 'app', text: 'What-if resistance sliders and re-craft toggles on the Character page.' },
    ],
  },
  {
    patch: '0.5.5',
    date: '2026-09-25',
    items: [
      { kind: 'data', text: 'Affix tiers and item bases regenerated for 0.5.5 (Path of Building 2 0.23.1).' },
      { kind: 'data', text: 'Atlas tree data is the 0.5.5 tree; endgame reference covers the 0.5.0 → 0.5.5 changes.' },
      { kind: 'caveat', text: 'The passive tree is the 0.5 tree and has not been verified against 0.5.5.' },
      { kind: 'caveat', text: 'Other generated data dates from 2026-07-28.' },
    ],
  },
]
