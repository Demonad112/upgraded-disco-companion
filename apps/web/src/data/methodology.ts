/**
 * The Methodology page's sections, in index and DOM order. `summary` is the
 * search-result subtitle; the page body carries the full text and its sources.
 */
export interface MethodologySection {
  id: string
  label: string
  title: string
  summary: string
}

export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    id: 'grade',
    label: 'Grade',
    title: 'How the grade is formed',
    summary: 'Defence and damage each count for half; damage without a ladder sample turns the grade into a range.',
  },
  {
    id: 'largest-hit',
    label: 'Largest hit',
    title: 'Largest hit',
    summary: 'Survivability is led by the smallest hit that kills, read per damage type from poe.ninja.',
  },
  {
    id: 'ehp',
    label: 'EHP',
    title: 'Why EHP overstates safety',
    summary: 'Effective health pool is an average; it is reported but never led with.',
  },
  {
    id: 'findings-ranking',
    label: 'Findings',
    title: 'How findings are ranked',
    summary: 'Ranked by gain per unit of cost, so a free fix outranks an equal one that costs currency.',
  },
  {
    id: 'labels',
    label: 'Labels',
    title: 'Where a number came from',
    summary: 'Observed, PoB-simulated, derived, nominal and unknown labels, and how sources are reconciled.',
  },
  {
    id: 'sources',
    label: 'Sources',
    title: 'Read from poe.ninja, computed here',
    summary: 'Which figures are poe.ninja’s own and which are arithmetic done in this app.',
  },
  {
    id: 'not-guessed',
    label: 'Not guessed',
    title: 'What is deliberately not guessed',
    summary: 'No DPS thresholds, and a missing input is reported as missing, never filled in.',
  },
]
