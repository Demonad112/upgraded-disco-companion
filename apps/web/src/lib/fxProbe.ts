import { applyTier, appliedTier, fxStore, TIERS, type FxState, type Tier } from './fxTier'

/**
 * Auto effects tier, measured after first paint (a lazy chunk; lib/fxTier
 * holds the store). Two checks:
 * - renderer: a software rasteriser (or no WebGL at all) means still; low
 *   hardware means lite;
 * - frames: once per visit while full, ~5 s of visible frames; more than a
 *   quarter over 33 ms drops one tier and says so once.
 * Auto only ever goes down within a visit; a user pick is never touched.
 */

export const SOFTWARE = /swiftshader|basic render driver|llvmpipe|software/i
const SLOW_MS = 33
const SLOW_SHARE = 0.25
const MIN_SAMPLES = 30
const SAMPLE_MS = 5000
const CHECKED = 'poe2-fx-checked'
export const LOWERED_TOAST = 'Effects lowered for smoother scrolling. Change in the footer.'

type Nav = { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } }

/** No WebGL (null) counts as software. */
export const isSoftware = (renderer: string | null) => renderer === null || SOFTWARE.test(renderer)

export const lowHardware = (nav: Nav) =>
  !!nav.connection?.saveData || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4

export const detectTier = (renderer: string | null, nav: Nav): Tier =>
  isSoftware(renderer) ? 'still' : lowHardware(nav) ? 'lite' : 'full'

const rank = (t: Tier) => TIERS.indexOf(t)
export const lowest = (a: Tier, b: Tier): Tier => (rank(a) >= rank(b) ? a : b)
export const lowerTier = (t: Tier): Tier => TIERS[Math.min(rank(t) + 1, TIERS.length - 1)]

/** Detection result for the store: a tier the frame check lowered stays at most that low. */
export const nextAuto = (s: FxState, detected: Tier): Tier => (s.lowered ? lowest(detected, s.auto) : detected)

/** Share of frames over 33 ms, or null under 30 samples (too few to judge). */
export function slowShare(frames: readonly number[]): number | null {
  if (frames.length < MIN_SAMPLES) return null
  return frames.filter((ms) => ms > SLOW_MS).length / frames.length
}
export const tooSlow = (frames: readonly number[]) => (slowShare(frames) ?? 0) > SLOW_SHARE

/** The GPU's name from a throwaway WebGL context, released at once; null when there is no WebGL. */
export function readRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return null
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return null
  }
}

/** Applies a new auto tier: stored for next visit; on screen only if it is lower than now (never rises mid-visit). */
function setAuto(auto: Tier, lowered = false) {
  fxStore.set((s) => (s.auto === auto && (!lowered || s.lowered) ? s : { ...s, auto, ...(lowered ? { lowered } : {}) }))
  const s = fxStore.get()
  if (s.choice === 'auto') applyTier(lowest(auto, appliedTier()))
}

/** Collects rAF intervals for ~5 s of visible time; hidden stretches (and the frame after one) are skipped. */
function sampleFrames(): Promise<number[]> {
  return new Promise((resolve) => {
    const frames: number[] = []
    let prev = 0
    let seen = 0
    const tick = (now: number) => {
      if (document.hidden) prev = 0
      else if (prev) {
        const dt = now - prev
        // A gap this long is a tab switch or a sleep, not a slow frame.
        if (dt < 1000) {
          frames.push(dt)
          seen += dt
        }
      }
      if (!document.hidden) prev = now
      if (seen >= SAMPLE_MS) resolve(frames)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function toast(text: string) {
  const el = document.createElement('div')
  el.className = 'update-toast'
  el.setAttribute('role', 'status')
  el.dataset.fxToast = ''
  const span = document.createElement('span')
  span.textContent = text
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.textContent = 'OK'
  const done = () => el.remove()
  ok.addEventListener('click', done)
  el.append(span, ok)
  document.body.append(el)
  window.setTimeout(done, 12_000)
}

/** Runs both checks; called once per page load in idle time after first paint. */
export async function probe(): Promise<void> {
  setAuto(nextAuto(fxStore.get(), detectTier(readRenderer(), navigator as Navigator & Nav)))
  let checked = false
  try {
    checked = sessionStorage.getItem(CHECKED) === '1'
    sessionStorage.setItem(CHECKED, '1')
  } catch {
    // No session storage: check every load.
  }
  if (checked || fxStore.get().choice !== 'auto' || appliedTier() !== 'full') return
  const frames = await sampleFrames()
  if (!tooSlow(frames) || fxStore.get().choice !== 'auto' || appliedTier() !== 'full') return
  setAuto(lowerTier('full'), true)
  toast(LOWERED_TOAST)
}
