'use client'

import { useEffect, useState } from 'react'
import { dataUrl } from '@/lib/basePath'

const cache = new Map<string, Promise<unknown>>()

/** Fetch one generated data file once per page load (shared between callers). Null until it arrives or if it fails. */
export function loadDataFile<T>(name: string): Promise<T> {
  let p = cache.get(name) as Promise<T> | undefined
  if (!p) {
    p = fetch(dataUrl(name)).then((r) => {
      if (!r.ok) throw new Error(`${name} returned ${r.status}`)
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(name))
    cache.set(name, p)
  }
  return p
}

export function useDataFile<T>(name: string, enabled = true): T | null {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    loadDataFile<T>(name).then(
      (d) => live && setData(d),
      () => {},
    )
    return () => {
      live = false
    }
  }, [name, enabled])
  return data
}
