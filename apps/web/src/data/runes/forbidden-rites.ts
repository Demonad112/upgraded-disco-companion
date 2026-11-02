import type { RuneSet } from './types'

/**
 * Forbidden Rites (0.5.5): five original sigils for the sky's rune glyphs (LS1), drawn for this companion after the
 * league's theme of altars, pacts and bound offerings. Not traced from any game artwork. Straight segments only, so
 * they read as constellation lines.
 */
const runes: RuneSet = {
  league: 'Forbidden Rites',
  patch: '0.5.5',
  runes: [
    {
      name: 'Altar',
      strokes: [
        [[-0.8, 0.2], [0.8, 0.2]],
        [[-0.55, 0.2], [-0.55, 0.85]],
        [[0.55, 0.2], [0.55, 0.85]],
        [[0, 0.2], [0, -0.25]],
        [[0, -0.25], [-0.28, -0.55], [0, -0.92], [0.28, -0.55], [0, -0.25]],
      ],
    },
    {
      name: 'Pact',
      strokes: [
        [[0, -0.9], [0.65, 0], [0, 0.9], [-0.65, 0], [0, -0.9]],
        [[-0.9, -0.45], [0.9, 0.45]],
        [[-0.9, 0.45], [0.9, -0.45]],
      ],
    },
    {
      name: 'Veiled Eye',
      strokes: [
        [[0, -0.85], [0.8, 0.65], [-0.8, 0.65], [0, -0.85]],
        [[-0.32, 0.12], [0, -0.1], [0.32, 0.12], [0, 0.34], [-0.32, 0.12]],
        [[0, 0.65], [0, 0.95]],
      ],
    },
    {
      name: 'Bound Flame',
      strokes: [
        [[0, -0.92], [0, 0.85]],
        [[-0.5, -0.55], [0, -0.22], [0.5, -0.55]],
        [[-0.5, 0.05], [0, 0.38], [0.5, 0.05]],
        [[-0.35, 0.85], [0.35, 0.85]],
      ],
    },
    {
      name: 'Severance',
      strokes: [
        [[-0.7, -0.82], [0.7, -0.82]],
        [[0.3, -0.82], [-0.28, -0.1], [0.28, 0.1], [-0.3, 0.82]],
        [[-0.7, 0.82], [0.7, 0.82]],
      ],
    },
  ],
}

export default runes
