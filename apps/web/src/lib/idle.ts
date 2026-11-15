/**
 * One shared idle signal for the decoration (sky, wraith). A single set of
 * passive listeners records the last input; a timer wakes only at the next
 * deadline, so a stream of pointer moves costs one timestamp write each.
 * Leaving the page (blur, the pointer out of the window, a hidden tab) counts
 * as idle at once; the next input ends it. After ROOT_MS the <html> element
 * gets `data-idle`, which pauses the wraith's CSS loops.
 */

const INPUT = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const
const ROOT_MS = 10_000

type Sub = { ms: number; cb: (idle: boolean) => void; idle: boolean }

const subs = new Set<Sub>()
let last = 0
let away = false
let timer: ReturnType<typeof setTimeout> | 0 = 0
let installed = false

const set = (s: Sub, idle: boolean) => {
  if (s.idle === idle) return
  s.idle = idle
  s.cb(idle)
}

/** Marks every subscriber whose quiet time has run out, then sleeps until the next one is due. */
function check() {
  timer = 0
  const quiet = Date.now() - last
  let due = Infinity
  for (const s of subs) {
    if (away || quiet >= s.ms) set(s, true)
    else due = Math.min(due, s.ms - quiet)
  }
  if (due < Infinity) timer = setTimeout(check, due)
}

function onInput() {
  last = Date.now()
  away = false
  let woke = false
  for (const s of subs) {
    if (s.idle) {
      set(s, false)
      woke = true
    }
  }
  if (woke || !timer) {
    if (timer) clearTimeout(timer)
    check()
  }
}

function leave() {
  away = true
  if (timer) clearTimeout(timer)
  check()
}

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  last = Date.now()
  const opts = { passive: true, capture: true }
  for (const e of INPUT) window.addEventListener(e, onInput, opts)
  window.addEventListener('blur', leave)
  // Touch fires pointerout with no relatedTarget after every tap; only a mouse or pen leaving the window counts.
  window.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget && e.pointerType !== 'touch') leave()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leave()
  })
  subscribeIdle(ROOT_MS, (idle) => document.documentElement.toggleAttribute('data-idle', idle))
}

/** Calls `cb(true)` after `ms` without input (or at once on leaving the page), and `cb(false)` on the next input. */
export function subscribeIdle(ms: number, cb: (idle: boolean) => void): () => void {
  install()
  const s: Sub = { ms, cb, idle: false }
  subs.add(s)
  if (timer) clearTimeout(timer)
  check()
  return () => {
    subs.delete(s)
  }
}

/** True when the page has had no input for `ms`, or the visitor has left it. */
export function isIdle(ms: number): boolean {
  install()
  return away || Date.now() - last >= ms
}
