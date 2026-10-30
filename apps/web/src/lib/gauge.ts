/**
 * Segment maths for the square gauge (UI-PLAN U5). One segment per unit up to
 * 40 units (checklist steps, phase sub-steps); above that, 20 proportional
 * segments. A proportional segment fills only once its whole share is done, so
 * the gauge never shows full before the total is reached.
 */

export const MAX_UNIT_SEGMENTS = 40;
export const PROPORTIONAL_SEGMENTS = 20;

export type GaugeModel = {
  done: number;
  total: number;
  percent: number;
  segments: number;
  filled: number;
  /** Index of the "up next" segment, or -1 when full or empty-total. */
  next: number;
};

export function gaugeModel(doneIn: number, totalIn: number): GaugeModel {
  const total = Math.max(0, Math.floor(totalIn));
  const done = Math.min(total, Math.max(0, Math.floor(doneIn)));
  if (total === 0) return { done: 0, total: 0, percent: 0, segments: 1, filled: 0, next: -1 };

  const segments = total <= MAX_UNIT_SEGMENTS ? total : PROPORTIONAL_SEGMENTS;
  const filled = segments === total ? done : Math.floor((done * segments) / total);
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
    segments,
    filled,
    next: filled < segments ? filled : -1,
  };
}
