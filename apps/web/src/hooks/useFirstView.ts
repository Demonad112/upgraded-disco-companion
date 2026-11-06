'use client'

import { useCallback } from 'react'

/**
 * Ref callback that marks an element `data-io` while it waits off-screen and `data-seen` once it scrolls into view,
 * so CSS can hold a one-shot animation until the reader gets there (styles/bars.css). Without IntersectionObserver
 * neither attribute is set and the animation simply runs on mount.
 */
export function useFirstView<T extends HTMLElement>(): (el: T | null) => void | (() => void) {
  return useCallback((el: T | null) => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    el.setAttribute('data-io', '')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute('data-seen', '')
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
}
