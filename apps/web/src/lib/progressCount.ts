/**
 * How many of `ids` appear in `saved`. Counting from the live id list means a
 * renamed or removed step or node can't keep inflating progress from an old save.
 */
export function countIn(ids: readonly string[], saved: readonly string[]): number {
  const savedSet = new Set(saved);
  let n = 0;
  for (const id of ids) if (savedSet.has(id)) n++;
  return n;
}
