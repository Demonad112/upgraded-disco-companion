/**
 * Items from a Path of Building code, as the `NinjaItem` shape the gear analysis already reads (PB-5).
 *
 * PoB keeps every item as its own item text (`PobItem.raw`) and says which item sits in which slot per item
 * set. This turns that into `CharModel.items` / `flasks` / `jewels`, so a pasted code reaches the same gear
 * findings as a poe.ninja import. The rules:
 *   - only the active item set is read; the other sets never count (PoB calculates with one);
 *   - both weapon sets of that item set are kept in their own slots (6/7 and 15/16), and `useSecondWeaponSet`
 *     says which is live, exactly as poe.ninja reports them, so the existing inactive-set rules apply;
 *   - mod lines come from the item text. A `{range:x}` or a legacy `<ModRange>` resolves `(a-b)` the way PoB
 *     does. A line with a range and no fraction stays as written, and is listed in `unresolvedRanges`;
 *   - a slot with no poe.ninja id (Ring 3) is named in `unmapped`, not forced into another slot;
 *   - no mod ids here: those need the affix data, and are resolved in `gear/text-mods.ts`.
 *
 * Pure: no I/O, no data files.
 */

import type { NinjaItem, NinjaItemData } from '../model/types.js'
import { activeItemSet, activeSpec, splitTree, type PobItem, type PobSnapshot } from './snapshot.js'

/** PoB slot name → poe.ninja `itemSlot` (`model/slots.ts`). Weapon 1 is the main hand, Weapon 2 the off hand. */
const SLOT_ID: Readonly<Record<string, number>> = Object.freeze({
  Helmet: 1,
  Gloves: 2,
  'Body Armour': 3,
  Amulet: 4,
  Boots: 5,
  'Weapon 2': 6,
  'Weapon 1': 7,
  'Ring 1': 8,
  'Ring 2': 9,
  Belt: 11,
  'Weapon 1 Swap': 15,
  'Weapon 2 Swap': 16,
})

const FLASK_SLOT = /^(?:Flask|Charm) \d+$/
const RARITY: Readonly<Record<string, { name: string; frame: number }>> = Object.freeze({
  NORMAL: { name: 'Normal', frame: 0 },
  MAGIC: { name: 'Magic', frame: 1 },
  RARE: { name: 'Rare', frame: 2 },
  UNIQUE: { name: 'Unique', frame: 3 },
  RELIC: { name: 'Unique', frame: 3 },
})

/** What a code's item carries, as `NinjaItemData` fields plus the ranges that could not be resolved. */
export interface ParsedPobItem extends NinjaItemData {
  unresolvedRanges?: string[]
}

const RANGE_TOKEN = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g
const HAS_RANGE = /\(-?\d+(?:\.\d+)?--?\d+(?:\.\d+)?\)/
const decimals = (s: string): number => s.split('.')[1]?.length ?? 0

/**
 * Resolve every `(a-b)` in a line at `range` (0..1): whole numbers when both ends are whole, else rounded to the
 * ends' decimals. PoB's `itemLib.applyRange` also rescales some mods (rune and catalyst scalars); that is not
 * modelled, and a code's lines carry resolved numbers for those.
 */
export function resolveRange(line: string, range: number): string {
  return line.replace(RANGE_TOKEN, (_all, a: string, b: string) => {
    const lo = Number(a)
    const hi = Number(b)
    const value = lo + (hi - lo) * range
    const places = Math.max(decimals(a), decimals(b))
    if (places === 0) return String(Math.floor(value + 0.5))
    const f = 10 ** places
    return String(Math.round(value * f) / f)
  })
}

/** Leading `{...}` markup PoB writes in front of a mod line. */
const MARKUP = /^\{([^}]*)\}/

interface Line {
  text: string
  flags: Set<string>
  range: number | null
  variants: number[] | null
}

function readLine(rawLine: string): Line {
  let text = rawLine.trim()
  const flags = new Set<string>()
  let range: number | null = null
  let variants: number[] | null = null
  for (let m = MARKUP.exec(text); m; m = MARKUP.exec(text)) {
    text = text.slice(m[0].length)
    const body = m[1]!
    const [key, ...rest] = body.split(':')
    const value = rest.join(':')
    if (key === 'range') {
      const n = Number(value)
      if (Number.isFinite(n)) range = n
    } else if (key === 'variant') {
      variants = value.split(',').map(Number).filter(Number.isFinite)
    } else {
      flags.add(key!)
    }
  }
  return { text: text.trim(), flags, range, variants }
}

const SPEC_LINE = /^[A-Za-z][A-Za-z' ]*: /

/**
 * Parse one `<Item>` body. Null when it has no `Rarity:` line (nothing to read; not an item).
 * `modRanges` are PoB's legacy `<ModRange id range>`: `id` is the 1-based position among the lines that
 * carry a `(a-b)` token.
 */
export function parsePobItemText(raw: string, modRanges: PobItem['modRanges']): ParsedPobItem | null {
  const lines = raw.split('\n').map((l) => l.replace(/\r$/, ''))
  const first = lines.findIndex((l) => /^Rarity:\s*\S/.test(l.trim()))
  if (first < 0) return null
  const rarity = RARITY[lines[first]!.split(':')[1]!.trim().toUpperCase()] ?? RARITY.NORMAL!

  let i = first + 1
  const header: string[] = []
  while (i < lines.length && lines[i]!.trim() && !SPEC_LINE.test(lines[i]!.trim())) header.push(lines[i++]!.trim())

  const data: ParsedPobItem = { rarity: rarity.name, frameType: rarity.frame }
  if (header.length) data.name = header[0]!
  const typeLine = header[1] ?? header[0]
  if (typeLine) data.typeLine = typeLine

  const runes: string[] = []
  let sockets = 0
  let implicitCount: number | null = null
  let selectedVariant: number | null = null
  const specs = new Map<string, string>()
  for (; i < lines.length; i++) {
    const l = lines[i]!.trim()
    if (!l) continue
    const spec = SPEC_LINE.exec(l)
    if (!spec) break
    const key = spec[0].slice(0, -2)
    const value = l.slice(spec[0].length).trim()
    if (key === 'Implicits') {
      implicitCount = Number(value)
      i++
      break
    }
    if (key === 'Rune') runes.push(value)
    else if (key === 'Sockets') sockets += value.split(/\s+/).filter(Boolean).length
    else if (key === 'Selected Variant') selectedVariant = Number(value)
    else specs.set(key, value)
  }

  const ilvl = Number(specs.get('Item Level'))
  if (specs.has('Item Level') && Number.isFinite(ilvl)) data.ilvl = ilvl
  const levelReq = Number(specs.get('LevelReq'))
  if (specs.has('LevelReq') && Number.isFinite(levelReq) && levelReq > 0) data.requirements = [{ name: 'Level', values: [[String(levelReq), 0]] }]
  if (sockets > 0) data.sockets = Array.from({ length: sockets }, (_, group) => ({ group, type: 'rune' }))
  // PoB writes `Rune: None` for an empty socket: a socket, not a rune in it.
  const filled = runes.map((typeLine, socket) => ({ socket, typeLine })).filter((r) => r.typeLine !== 'None')
  if (filled.length) data.socketedItems = filled

  const implicit: string[] = []
  const enchant: string[] = []
  const rune: string[] = []
  const explicit: string[] = []
  const crafted: string[] = []
  const fractured: string[] = []
  const desecrated: string[] = []
  const granted: { name: string }[] = []
  const unresolved: string[] = []
  let corrupted = false
  let rangeLineNo = 0
  const ranges = new Map(modRanges.map((r) => [r.id, r.range]))

  for (let n = 0; i < lines.length; i++) {
    const l = lines[i]!
    if (!l.trim()) continue
    const line = readLine(l)
    const isImplicitBlock = implicitCount !== null && n < implicitCount
    n++
    if (line.text === 'Corrupted' && !isImplicitBlock) {
      corrupted = true
      continue
    }
    if (line.flags.has('disabled')) continue
    if (line.variants && selectedVariant !== null && !line.variants.includes(selectedVariant)) continue
    let text = line.text
    if (HAS_RANGE.test(text)) {
      rangeLineNo++
      const fraction = line.range ?? ranges.get(rangeLineNo) ?? null
      if (fraction !== null) text = resolveRange(text, fraction)
      else unresolved.push(text)
    }
    const grant = /^Grants Skill: (?:Level \d+ )?(.+)$/.exec(text)
    if (grant) {
      granted.push({ name: grant[1]!.trim() })
      continue
    }
    if (line.flags.has('rune')) rune.push(text)
    else if (line.flags.has('enchant')) enchant.push(text)
    else if (isImplicitBlock) implicit.push(text)
    else if (line.flags.has('crafted')) crafted.push(text)
    else if (line.flags.has('fractured')) fractured.push(text)
    else if (line.flags.has('desecrated')) desecrated.push(text)
    else explicit.push(text)
  }

  data.implicitMods = implicit
  data.enchantMods = enchant
  data.runeMods = rune
  data.explicitMods = explicit
  data.craftedMods = crafted
  data.fracturedMods = fractured
  data.desecratedMods = desecrated
  data.grantedSkills = granted
  if (corrupted) data.corrupted = true
  if (unresolved.length) data.unresolvedRanges = unresolved
  return data
}

export interface SnapshotItems {
  /** Equipment, with poe.ninja's slot ids. */
  items: NinjaItem[]
  /** Flasks and charms that are switched on. */
  flasks: NinjaItem[]
  /** Jewels in allocated sockets of the active tree. */
  jewels: NinjaItem[]
  /** PoB slots that hold an item but have no poe.ninja slot id, so were not read (never forced into another slot). */
  unmapped: string[]
}

/** One equipped item or socketed jewel of the active set, with its PoB item and parsed text. */
export interface SnapshotEquipment {
  /** poe.ninja slot id; 12 for a jewel. */
  itemSlot: number
  item: PobItem
  data: ParsedPobItem
}

/**
 * The active item set's equipment (slots with a poe.ninja id, both weapon sets) and the jewels in the active tree's
 * allocated sockets, with the PoB item kept so its header (Armour, Evasion, Quality) can be read. Flasks, charms and
 * unmapped slots are left out: `snapshotItems` reports those.
 */
export function snapshotEquipment(snap: PobSnapshot): SnapshotEquipment[] {
  const byId = new Map(snap.items.items.map((it) => [it.id, it]))
  const out: SnapshotEquipment[] = []
  const push = (id: number, itemSlot: number) => {
    const item = byId.get(id)
    const data = item ? parsePobItemText(item.raw, item.modRanges) : null
    if (item && data) out.push({ itemSlot, item, data })
  }
  for (const slot of activeItemSet(snap)?.slots ?? []) {
    const id = SLOT_ID[slot.name]
    if (slot.itemId > 0 && id !== undefined) push(slot.itemId, id)
  }
  const spec = activeSpec(snap)
  const allocated = new Set(splitTree(snap, spec).live)
  for (const socket of spec?.sockets ?? []) {
    if (socket.itemId > 0 && allocated.has(socket.nodeId)) push(socket.itemId, 12)
  }
  return out
}

function toItem(
  byId: ReadonlyMap<number, PobItem>,
  id: number,
  itemSlot: number,
): NinjaItem | null {
  const item = byId.get(id)
  const data = item ? parsePobItemText(item.raw, item.modRanges) : null
  return data ? { itemSlot, itemData: data } : null
}

/** The active item set's items, flasks and charms, and the jewels in the active tree's allocated sockets. */
export function snapshotItems(snap: PobSnapshot): SnapshotItems {
  const byId = new Map(snap.items.items.map((it) => [it.id, it]))
  const out: SnapshotItems = { items: [], flasks: [], jewels: [], unmapped: [] }

  for (const slot of activeItemSet(snap)?.slots ?? []) {
    if (slot.itemId <= 0 || !byId.has(slot.itemId)) continue
    if (FLASK_SLOT.test(slot.name)) {
      if (!slot.active) continue
      const flask = toItem(byId, slot.itemId, 0)
      if (flask) out.flasks.push(flask)
      continue
    }
    const id = SLOT_ID[slot.name]
    if (id === undefined) {
      out.unmapped.push(slot.name)
      continue
    }
    const item = toItem(byId, slot.itemId, id)
    if (item) out.items.push(item)
  }

  const spec = activeSpec(snap)
  const allocated = new Set(splitTree(snap, spec).live)
  for (const socket of spec?.sockets ?? []) {
    if (socket.itemId <= 0 || !allocated.has(socket.nodeId)) continue
    const jewel = toItem(byId, socket.itemId, 12)
    if (jewel) out.jewels.push(jewel)
  }
  return out
}
