import type { RoadmapPhase } from '@/lib/types'

/**
 * LS1: the name each phase's progress constellation carries in the sky. Shown for 3 s, near the constellation, when
 * the phase is completed. One fixed name per phase; proposed in the LS1 PR for owner approval.
 */
export const PHASE_NAMES: Record<RoadmapPhase, string> = {
  'campaign-end': 'The Threshold',
  'precursor-fortress': 'The Warden’s Spire',
  'arbiter-of-ash': 'The Ashen Crown',
  't11-checkpoint': 'The Iron Vigil',
  'arbiter-of-divinity-loop': 'The Godless Wheel',
  'full-tree': 'The Rooted Sky',
  'masters-and-mechanics': 'The Conclave',
  'juiced-farming': 'The Gilded Harvest',
}
