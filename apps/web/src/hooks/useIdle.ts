'use client'

import { useEffect, useState } from 'react'
import { subscribeIdle } from '@/lib/idle'

/** True once the page has been quiet for `ms` (or the visitor left it); false again on the next input. */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => subscribeIdle(ms, setIdle), [ms])
  return idle
}
