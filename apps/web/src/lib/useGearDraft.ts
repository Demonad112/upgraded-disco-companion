'use client'

import { useCallback, useMemo } from 'react'
import {
  EMPTY_DRAFT,
  anchorDraft,
  draftSize,
  lineKey,
  restoreDraft,
  validateItemMods,
  type GearDraft,
  type ItemAnalysis,
  type ModIssue,
  type ModTiers,
  type SavedDraft,
} from '@poe2/core'
import { createLocalStore, useLocalStore } from './localStore'

type SavedDrafts = Record<string, SavedDraft & { savedAt: string }>

const MAX_CHARACTERS = 10

const drafts = createLocalStore<SavedDrafts>(
  'poe2-endgame-companion:gear-drafts:v1',
  {},
  (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
)

/**
 * Impossible-craft flags for the drafted gear, by slot id. Only items the draft
 * touches are checked, so an untouched item is never flagged for what it already
 * wears. Each item's mod ids are its current lines, minus removed ones, with
 * replaced lines and added lines at their drafted ids.
 */
export function draftModIssues(items: ItemAnalysis[], draft: GearDraft, tiers: ModTiers): Record<number, ModIssue[]> {
  const out: Record<number, ModIssue[]> = {}
  for (const item of items) {
    const touched =
      item.mods.some((_, i) => draft.edits[lineKey(item.slotId, i)]) || draft.added.some((a) => a.slotId === item.slotId)
    if (!touched) continue
    const modIds: string[] = []
    item.mods.forEach((mod, i) => {
      const edit = draft.edits[lineKey(item.slotId, i)]
      if (edit?.kind === 'remove') return
      const id = edit?.kind === 'set' ? edit.modId : mod.id
      if (id) modIds.push(id)
    })
    for (const a of draft.added) if (a.slotId === item.slotId) modIds.push(a.modId)
    const { issues } = validateItemMods(tiers, { base: item.baseType, itemLevel: item.itemLevel, modIds })
    if (issues.length) out[item.slotId] = issues
  }
  return out
}

/**
 * The workbench draft, saved per character so a reload or a re-import keeps
 * it. Restoring re-checks every edit against the gear now equipped: an edit
 * whose line changed in game is dropped rather than applied to whatever moved
 * into its place, and `dropped` says how many went.
 */
export function useGearDraft(characterName: string, items: ItemAnalysis[] | null, tiers: ModTiers | null) {
  const saved = useLocalStore(drafts)[characterName]

  const { draft, dropped } = useMemo(() => {
    if (!saved || !items || !tiers) return { draft: EMPTY_DRAFT, dropped: 0 }
    return restoreDraft(items, saved, tiers)
  }, [saved, items, tiers])

  const setDraft = useCallback(
    (next: GearDraft) => {
      if (!items) return
      drafts.set((prev) => {
        const rest = { ...prev }
        delete rest[characterName]
        if (draftSize(next) === 0) return rest
        // Newest last; drop the oldest characters beyond the cap.
        const kept = Object.entries(rest).slice(-(MAX_CHARACTERS - 1))
        return {
          ...Object.fromEntries(kept),
          [characterName]: { ...anchorDraft(items, next), savedAt: new Date().toISOString() },
        }
      })
    },
    [characterName, items],
  )

  const issues = useMemo(() => (items && tiers ? draftModIssues(items, draft, tiers) : {}), [items, draft, tiers])

  return { draft, setDraft, dropped, issues }
}
