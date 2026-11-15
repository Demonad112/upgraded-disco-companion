/**
 * The wraith companion's decision tree: pure data plus `next()`, no React.
 * Flat `nodes` keyed by id; a choice either moves to another node (`to`) or
 * leaves for a site route (`href`, always ending in `/`, without the base path:
 * Next's <Link> adds that). Copy follows docs/COPY.md (≤140 chars, sentence case).
 */

export type NodeId = 'start' | 'next' | 'fix' | 'farm' | 'atlas' | 'tip'

export type Choice = { label: string } & ({ to: NodeId; href?: never } | { href: string; to?: never })

export interface TreeNode {
  text: string
  choices: Choice[]
}

const BACK: Choice = { label: 'Something else', to: 'start' }

export const TREE: Record<NodeId, TreeNode> = {
  start: {
    text: 'What are you after? Pick one and I will show the way.',
    choices: [
      { label: 'What next', to: 'next' },
      { label: 'Fix my character', to: 'fix' },
      { label: 'What to farm', to: 'farm' },
      { label: 'Plan my Atlas', to: 'atlas' },
    ],
  },
  next: {
    text: 'The checklist keeps your place. Open it to see your next step.',
    choices: [{ label: 'Open the checklist', href: '/checklist/' }, BACK],
  },
  fix: {
    text: 'Import your character from poe.ninja. You get the fixes that matter most, first.',
    choices: [
      { label: 'Import a character', href: '/character/' },
      { label: 'Price check an item', href: '/trade/' },
      BACK,
    ],
  },
  farm: {
    text: 'Pick a strategy that fits your build and budget.',
    choices: [{ label: 'Open the farm dashboard', href: '/dashboard/' }, BACK],
  },
  atlas: {
    text: 'Plan your Atlas tree one node at a time, in order.',
    choices: [
      { label: 'Open the Atlas planner', href: '/atlas/' },
      { label: 'How the numbers work', href: '/methodology/' },
      BACK,
    ],
  },
  tip: {
    text: 'Your next checklist step is waiting.',
    choices: [{ label: 'Show me', href: '/checklist/' }, BACK],
  },
}

/** A node plus the choices only this visitor gets (a recent character to reopen). */
export function nodeFor(id: NodeId, extra: { reopen?: Choice } = {}): TreeNode {
  const node = TREE[id]
  if (id === 'fix' && extra.reopen) return { ...node, choices: [extra.reopen, ...node.choices] }
  return node
}

/** Where a choice leads: another node, or a route to navigate to. */
export function next(choice: Choice): { node: NodeId } | { href: string } {
  return choice.to ? { node: choice.to } : { href: choice.href as string }
}
