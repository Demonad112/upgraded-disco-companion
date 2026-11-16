/**
 * The wraith companion's decision tree: pure data plus `nodeFor()` and `next()`, no React.
 * Flat `nodes` keyed by id; a choice either moves to another node (`to`) or
 * leaves for a site route (`href`, always ending in `/` before any hash, without the base path:
 * Next's <Link> adds that). Copy follows docs/COPY.md (≤140 chars, sentence case).
 * `start` is not a node of its own: it resolves to the node for the page the visitor is on (`startNode`).
 */

export type NodeId =
  | 'start'
  | 'menu'
  | 'next'
  | 'fix'
  | 'farm'
  | 'atlas'
  | 'plan'
  | 'questions'
  | 'range'
  | 'tip'
  | 'tour1'
  | 'tour2'
  | 'tour3'

export type Choice = { label: string } & ({ to: NodeId; href?: never } | { href: string; to?: never })

export interface TreeNode {
  text: string
  choices: Choice[]
}

const BACK: Choice = { label: 'Something else', to: 'menu' }
const SKIP: Choice = { label: 'Skip the tour', to: 'menu' }

export const TREE: Record<Exclude<NodeId, 'start'>, TreeNode> = {
  menu: {
    text: 'What are you after? Pick one and I will show the way.',
    choices: [
      { label: 'What next', to: 'next' },
      { label: 'Fix my character', to: 'fix' },
      { label: 'Farm or plan my Atlas', to: 'plan' },
      { label: 'Questions', to: 'questions' },
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
  plan: {
    text: 'Farm for currency, or plan your Atlas tree one node at a time.',
    choices: [
      { label: 'Open the farm dashboard', href: '/dashboard/' },
      { label: 'Open the Atlas planner', href: '/atlas/' },
      BACK,
    ],
  },
  questions: {
    text: 'Ask away. Every answer points to where the site shows it.',
    choices: [
      { label: 'Why is my grade a range?', to: 'range' },
      { label: 'How the numbers work', href: '/methodology/' },
      { label: 'What changed this patch', href: '/whats-new/' },
      BACK,
    ],
  },
  range: {
    text: 'poe.ninja left a figure out, so the grade spans what it could be. Nothing is guessed.',
    choices: [{ label: 'How the numbers work', href: '/methodology/' }, BACK],
  },
  tip: {
    text: 'Your next checklist step is waiting.',
    choices: [{ label: 'Show me', href: '/checklist/' }, BACK],
  },
  tour1: {
    text: 'Click me any time for the next thing to do on this site.',
    choices: [{ label: 'Next', to: 'tour2' }, SKIP],
  },
  tour2: {
    text: 'The checklist keeps your place. Import a character and I point at its top fix.',
    choices: [{ label: 'Next', to: 'tour3' }, SKIP],
  },
  tour3: {
    text: 'I nap when you go quiet. Turn me off in the footer if I get in the way.',
    choices: [{ label: 'Got it', to: 'start' }],
  },
}

/** Where `start` lands on each page; anything else (home, trade, methodology) gets the menu. */
const PAGE_START: Record<string, Exclude<NodeId, 'start'>> = {
  '/character/': 'fix',
  '/checklist/': 'next',
  '/atlas/': 'atlas',
  '/dashboard/': 'farm',
}

/** The node `start` opens on `path` (a pathname without the base path; the trailing slash is optional). */
export function startNode(path: string): Exclude<NodeId, 'start'> {
  const p = path.endsWith('/') ? path : `${path}/`
  return PAGE_START[p] ?? 'menu'
}

/** What the visitor brings: the page, a recent character, the next checklist step. */
export interface NodeContext {
  /** Pathname without the base path. */
  path?: string
  /** A recent character: the reopen choice, its top fix and the patch it was last read on. */
  recent?: {
    name: string
    /** In-app import path (`importPath`). */
    href: string
    topFix?: { title: string; tab: string } | null
    /** The patch of its latest snapshot, when it differs from the current one. */
    stalePatch?: { was: string; now: string } | null
  } | null
  /** The first unticked checklist step. */
  step?: { id: string; title: string } | null
}

const CAP = 140

/** Cut a dynamic line to the caddy cap at a word, with an ellipsis. */
export function capLine(text: string, cap = CAP): string {
  if (text.length <= cap) return text
  const cut = text.slice(0, cap - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > cap / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:—–-]+$/, '')}…`
}

/** A node plus what only this visitor gets: the page's own start, the next step, a recent character's top fix. */
export function nodeFor(id: NodeId, ctx: NodeContext = {}): TreeNode {
  if (id === 'start') return nodeFor(startNode(ctx.path ?? '/'), ctx)
  const node = TREE[id]
  const { recent, step } = ctx

  if (id === 'tip' && step) {
    return { ...node, text: capLine(`Next: ${step.title}.`), choices: [{ label: 'Show me', href: `/checklist/#${step.id}` }, BACK] }
  }

  if (id === 'fix' && recent) {
    const reopen: Choice = { label: capLine(`Reopen ${recent.name}`, 40), href: recent.href }
    if (recent.stalePatch) {
      const { was, now } = recent.stalePatch
      return {
        text: capLine(`${recent.name} was last read on patch ${was}. Reopen it for ${now} numbers.`),
        choices: [reopen, ...node.choices],
      }
    }
    if (recent.topFix) {
      return {
        text: capLine(`Top fix for ${recent.name}: ${recent.topFix.title}.`),
        choices: [{ label: 'Show the top fix', href: `${recent.href}#${recent.topFix.tab}` }, reopen, BACK],
      }
    }
    return { ...node, choices: [reopen, ...node.choices] }
  }
  return node
}

/** Where a choice leads: another node, or a route to navigate to. */
export function next(choice: Choice): { node: NodeId } | { href: string } {
  return choice.to ? { node: choice.to } : { href: choice.href as string }
}

/**
 * How a choice's link behaves when it points at the page already open (Next's <Link> does not re-run the character
 * page's `?import=` effect, and a pushState hash change fires no `hashchange`):
 * `link` — let <Link> navigate; `hash` — set `location.hash`; `load` — a full load, so the import runs; `none` —
 * already there.
 */
export function sameRoute(
  href: string,
  here: { pathname: string; search: string; hash: string },
): 'link' | 'hash' | 'load' | 'none' {
  const u = new URL(href, 'https://x.invalid')
  const p = (s: string) => (s.endsWith('/') ? s : `${s}/`)
  if (p(u.pathname) !== p(here.pathname)) return 'link'
  if (u.search !== here.search) return u.search ? 'load' : 'link'
  if (u.hash && u.hash !== here.hash) return 'hash'
  return 'none'
}

/** Hop gating: a tip is worth a hop once the visitor has started the checklist or imported a character. */
export function shouldHop(o: { hasNextStep: boolean; completed: number; hasRecent: boolean; tipSeen: boolean }): boolean {
  return o.hasNextStep && !o.tipSeen && (o.completed > 0 || o.hasRecent)
}
