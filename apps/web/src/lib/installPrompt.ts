import { useSyncExternalStore } from 'react'

/**
 * The browser's install prompt, captured once.
 *
 * `beforeinstallprompt` fires once, early, and not again if missed, so the
 * listener is started by the always-mounted ServiceWorker component rather than
 * by whichever component shows the button (see InstallButton).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'prompt' | 'ios' | 'none'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
let started = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad Safari, which has no install prompt: the user adds it from the Share sheet. */
export function isIosSafari(ua = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): boolean {
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

export function startInstallCapture() {
  if (started || typeof window === 'undefined') return
  started = true
  installed = standalone()
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export function installMode(): InstallMode {
  if (installed) return 'none'
  if (deferred) return 'prompt'
  return isIosSafari() ? 'ios' : 'none'
}

export async function promptInstall(): Promise<void> {
  const event = deferred
  if (!event) return
  deferred = null // a prompt can only be used once
  emit()
  await event.prompt()
  await event.userChoice
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    installMode,
    () => 'none',
  )
}
