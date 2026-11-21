import type { Analysis } from '@poe2/core'

export interface CouldntCheckItem {
  key: string
  text: string
}

/** The tree-version and keystone warnings in `analysis.warnings`, shown here from their structured fields instead. */
const STRUCTURED = [/allocated passive nodes? \(id /, / is allocated on the passive tree, but /]

/**
 * Everything the analysis could not check, once each (HG1-9): the tree-version
 * check, keystones the sheet could not confirm or contradicts, what the source
 * cannot carry, then any other warning.
 */
export function couldntCheck(a: Analysis): CouldntCheckItem[] {
  const items: CouldntCheckItem[] = []
  const tree = a.treeCheck
  if (tree?.status === 'stale') {
    const n = tree.missing.length
    items.push({
      key: 'tree',
      text: `${n} passive node${n === 1 ? ' is' : 's are'} missing from the tree data (${tree.treeName}). Keystones aren’t taken from the tree until it is updated (node ids ${tree.missing.join(', ')}).`,
    })
  }
  for (const u of a.keystones.unverified) {
    items.push({
      key: `ks:${u.keystone}`,
      text:
        u.kind === 'contradicted'
          ? `${u.keystone}: ignored, because ${u.reason}. ${
              a.source === 'pob-export' ? 'Export the code again from a current Path of Building.' : 'Re-import once poe.ninja reindexes the character.'
            }`
          : `${u.keystone}: check it in-game; ${u.reason}.`,
    })
  }
  // What a Path of Building code cannot carry (NP1-6), so a missing panel reads as a limit of the source, not a bug.
  for (const g of a.sourceGaps ?? []) items.push({ key: `gap:${g.what}`, text: `${g.what}: ${g.why}` })
  for (const w of a.warnings) {
    if (STRUCTURED.some((re) => re.test(w))) continue
    items.push({ key: w, text: w })
  }
  return items
}
