/**
 * Path of Building's own calc engine, run on the server (`services/pob-engine`), as a second source for a pasted code.
 *
 * A code stores PoB's computed stats for its main skill group only. Every other group's damage exists only when PoB's
 * engine computes it, which used to come from poe.ninja (blocked since 2026-11-18). The engine service loads the code
 * in PoB2 headless (the pinned release in `vendor/pob2`) and returns, per skill group and active skill, PoB's main
 * output: hit and DoT DPS, use rate, crit, hit chance, and the main-hand hit average per damage type.
 *
 * The code stays the source of truth (root CLAUDE.md): every figure it carries is kept as read. The engine only adds
 * what the code does not carry, labelled `pob-calc`:
 *   - a damage entry for each enabled group with no figure from the code, one per active skill PoB computed;
 *   - the damage-type split of every skill (the code's main skill included), as the share of each type in PoB's
 *     main-hand average hit. On the main skill it is added only when the engine reproduces the code's TotalDPS.
 * `engineAgreement` says how many of the code's own PlayerStats the engine reproduced, so a reader can see whether
 * the engine and the PoB that wrote the code agree.
 *
 * Pure: `fetchPobEngine` takes `fetch` injected, as the rest of core.
 */

import type { CharModel, NinjaSkill, NinjaSkillDps } from '../model/types.js'
import { NINJA_DAMAGE_ORDER } from '../model/types.js'
import { activeSkillSet, type PobSnapshot } from './snapshot.js'
import { isActiveGem } from './main-skill.js'

/** One (group, active skill) row: `tools/pob2/groups_lib.lua`'s shape. */
export interface PobEngineGroupRow {
  /** 1-based `<Skill>` group of the active skill set. */
  group: number
  activeSkill: number
  pobGroup?: number
  skill?: string
  enabled?: boolean
  loadError?: string
  TotalDPS?: number
  CombinedDPS?: number
  AverageDamage?: number
  Speed?: number
  HitChance?: number
  CritChance?: number
  CritMultiplier?: number
  TotalDotDPS?: number
  IgniteDPS?: number
  BleedDPS?: number
  PoisonDPS?: number
  ManaCost?: number
  Cooldown?: number
  AreaOfEffectRadiusMetres?: number
  mainHand?: Partial<Record<'PhysicalHitAverage' | 'LightningHitAverage' | 'ColdHitAverage' | 'FireHitAverage' | 'ChaosHitAverage' | 'TotalMin' | 'TotalMax', number>>
}

/** What `POST /calc` answers. */
export interface PobEngineResult {
  pobVersion: string | null
  pinCommit: string | null
  snapshot: {
    loadError: string | null
    /** PoB's display and save stats for the main skill (`tools/pob2/headless.lua`). Non-finite values are strings. */
    stats?: Record<string, number | string>
  }
  groups: { groups: number; rows: PobEngineGroupRow[] }
  ms?: number
  cached?: boolean
}

export interface EngineAgreement {
  /** The code's PlayerStats that the engine also computed. */
  checked: number
  /** Of those, the ones within 0.5% (or 0.5 absolute for small values). */
  matched: number
  /** Up to 5 that differ, largest relative gap first. */
  mismatches: { stat: string; code: number; engine: number }[]
}

/** Summary of what the engine added, for the analysis and the page. */
export interface EngineNote {
  pobVersion: string | null
  /** Null when the engine could not load the build. */
  agreement: EngineAgreement | null
  /** Skill damage entries added from the engine. */
  skillsAdded: number
  /** Damage-type splits added (new entries included). */
  splitsAdded: number
  /** PoB's own load error, when it could not load the build. */
  loadError: string | null
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function close(a: number, b: number): boolean {
  const diff = Math.abs(a - b)
  return diff <= 0.5 || diff <= Math.abs(a) * 0.005
}

/** How many of the code's own PlayerStats the engine reproduced. */
export function engineAgreement(codeStats: Record<string, number>, engine: PobEngineResult): EngineAgreement {
  const stats = engine.snapshot.stats ?? {}
  let checked = 0
  let matched = 0
  const off: { stat: string; code: number; engine: number; gap: number }[] = []
  for (const [stat, code] of Object.entries(codeStats)) {
    const value = stats[stat]
    if (!isNum(code) || !isNum(value)) continue
    checked++
    if (close(code, value)) matched++
    else off.push({ stat, code, engine: value, gap: Math.abs(code - value) / Math.max(1, Math.abs(code)) })
  }
  off.sort((a, b) => b.gap - a.gap)
  return { checked, matched, mismatches: off.slice(0, 5).map(({ stat, code, engine: e }) => ({ stat, code, engine: e })) }
}

/** Per-type share of PoB's main-hand average hit, in poe.ninja's tuple order (`NINJA_DAMAGE_ORDER`). */
function splitOf(row: PobEngineGroupRow): number[] | undefined {
  const mh = row.mainHand
  if (!mh) return undefined
  const key = { physical: 'PhysicalHitAverage', lightning: 'LightningHitAverage', cold: 'ColdHitAverage', fire: 'FireHitAverage', chaos: 'ChaosHitAverage' } as const
  const parts = NINJA_DAMAGE_ORDER.map((t) => Math.max(0, mh[key[t]] ?? 0))
  const total = parts.reduce((a, b) => a + b, 0)
  if (!(total > 0)) return undefined
  return parts.map((p) => Math.round((p / total) * 1000) / 10)
}

function entryOf(row: PobEngineGroupRow): NinjaSkillDps {
  const entry: NinjaSkillDps = { name: row.skill, dps: row.TotalDPS ?? 0, dotDps: row.TotalDotDPS ?? 0, provenance: 'pob-calc' }
  if (isNum(row.Speed)) entry.rate = row.Speed
  if (isNum(row.CritChance)) entry.critChance = row.CritChance
  if (isNum(row.CritMultiplier)) entry.critMultiplier = row.CritMultiplier
  if (isNum(row.HitChance)) entry.hitChance = row.HitChance
  if (isNum(row.AreaOfEffectRadiusMetres)) entry.aoeRadius = row.AreaOfEffectRadiusMetres
  if (isNum(row.CombinedDPS)) entry.combinedDps = row.CombinedDPS
  const split = splitOf(row)
  if (split && (row.TotalDPS ?? 0) > 0) entry.damageTypes = split
  return entry
}

const hasDamage = (row: PobEngineGroupRow) => (row.TotalDPS ?? 0) > 0 || (row.TotalDotDPS ?? 0) > 0

/** The selected active gem of a model skill: the first non-support gem in `allGems`. */
function activeName(skill: NinjaSkill): string | null {
  return skill.allGems?.find((g) => (g.itemData as { support?: boolean } | undefined)?.support !== true)?.name ?? null
}

/**
 * The model with the engine's figures added where the code has none (see the file comment). Returns a copy; the input
 * model is not written to. `snap` is the code's own snapshot (for its active skill set and gems).
 */
export function applyPobEngine(
  model: CharModel,
  snap: PobSnapshot,
  codeStats: Record<string, number>,
  engine: PobEngineResult,
): { model: CharModel; note: EngineNote } {
  const loadError = engine.snapshot.loadError ?? null
  const note: EngineNote = { pobVersion: engine.pobVersion ?? null, agreement: null, skillsAdded: 0, splitsAdded: 0, loadError }
  if (loadError) return { model, note }
  note.agreement = engineAgreement(codeStats, engine)

  const rows = (engine.groups?.rows ?? []).filter((r) => !r.loadError && typeof r.skill === 'string' && r.skill && r.skill !== '?')
  const byGroup = new Map<number, PobEngineGroupRow[]>()
  for (const r of rows) byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), r])

  const groups = activeSkillSet(snap)?.groups ?? []
  const skills: NinjaSkill[] = (model.skills ?? []).map((s) => ({ ...s, ...(s.dps ? { dps: s.dps.map((d) => ({ ...d })) } : {}) }))
  const extra: NinjaSkill[] = []

  for (const skill of skills) {
    if (typeof skill.group !== 'number') continue
    const groupRows = byGroup.get(skill.group) ?? []
    if (!groupRows.length || groups[skill.group - 1]?.enabled === false) continue
    const existing = skill.dps?.[0]
    if (existing) {
      // A figure read from the code is kept as read; only its missing split is added, from the same skill's row.
      const row = groupRows.find((r) => r.skill === existing.name)
      const reproduces = row && isNum(existing.dps) && isNum(row.TotalDPS) && close(existing.dps, row.TotalDPS)
      if (row && !existing.damageTypes && reproduces) {
        const split = splitOf(row)
        if (split) {
          existing.damageTypes = split
          existing.splitProvenance = 'pob-calc'
          note.splitsAdded++
        }
      }
      continue
    }
    const first = activeName(skill)
    const lead = groupRows.find((r) => r.skill === first && hasDamage(r)) ?? groupRows.find(hasDamage)
    if (!lead) continue
    skill.dps = [entryOf(lead)]
    note.skillsAdded++
    if (skill.dps[0]!.damageTypes) note.splitsAdded++
  }

  // A group's other active skills (Charged Staff's Charged Shockwave, Cast on Critical's Profane Ritual) as their own
  // entries, as `snapshotToCharModel` does for a Full DPS row no group names.
  const named = new Set(skills.flatMap((s) => (s.dps ?? []).map((d) => d.name).filter((n): n is string => typeof n === 'string')))
  for (const [group, groupRows] of byGroup) {
    const host = skills.find((s) => s.group === group)
    if (!host || groups[group - 1]?.enabled === false) continue
    for (const r of groupRows) {
      if (!hasDamage(r) || named.has(r.skill!)) continue
      const gem = groups[group - 1]?.gems.find((g) => g.nameSpec === r.skill && isActiveGem(g))
      extra.push({ group, dps: [entryOf(r)], allGems: [{ name: gem?.nameSpec ?? r.skill! }] })
      named.add(r.skill!)
      note.skillsAdded++
      if (extra[extra.length - 1]!.dps![0]!.damageTypes) note.splitsAdded++
    }
  }

  // One entry per skill name, as poe.ninja lists them: a skill set up twice (the same granted skill on both weapon
  // sets, a copy in a spare group) keeps its strongest PoB calc; a figure read from the code always wins.
  const all = [...skills, ...extra]
  const total = (d: NinjaSkillDps) => (d.dps ?? 0) + (d.dotDps ?? 0)
  const best = new Map<string, NinjaSkillDps>()
  for (const s of all) {
    const d = s.dps?.[0]
    if (!d || typeof d.name !== 'string') continue
    const held = best.get(d.name)
    const codeHeld = held && held.provenance !== 'pob-calc'
    if (!held || (!codeHeld && (d.provenance !== 'pob-calc' || total(d) > total(held)))) best.set(d.name, d)
  }
  const out: NinjaSkill[] = []
  for (const s of all) {
    const d = s.dps?.[0]
    if (!d || d.provenance !== 'pob-calc' || typeof d.name !== 'string' || best.get(d.name) === d) {
      out.push(s)
      continue
    }
    note.skillsAdded--
    if (d.damageTypes) note.splitsAdded--
    // A group keeps its gems without the duplicate figure; an entry made only for the figure goes.
    if (!extra.includes(s)) {
      const { dps: _drop, ...rest } = s
      out.push(rest)
    }
  }

  return { model: { ...model, skills: out }, note }
}

/** Parse and sanity-check a `POST /calc` answer. Throws on a shape this code does not know. */
export function parsePobEngineResult(json: unknown): PobEngineResult {
  const j = json as Partial<PobEngineResult> | null
  if (!j || typeof j !== 'object' || !j.snapshot || typeof j.snapshot !== 'object' || !j.groups || !Array.isArray(j.groups.rows)) {
    throw new Error('The PoB engine answered in an unknown shape.')
  }
  return {
    pobVersion: typeof j.pobVersion === 'string' ? j.pobVersion : null,
    pinCommit: typeof j.pinCommit === 'string' ? j.pinCommit : null,
    snapshot: { loadError: typeof j.snapshot.loadError === 'string' ? j.snapshot.loadError : null, ...(j.snapshot.stats ? { stats: j.snapshot.stats } : {}) },
    groups: { groups: Number(j.groups.groups) || 0, rows: j.groups.rows },
    ...(isNum(j.ms) ? { ms: j.ms } : {}),
    ...(typeof j.cached === 'boolean' ? { cached: j.cached } : {}),
  }
}

export class PobEngineError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'PobEngineError'
  }
}

/** Ask the engine service at `baseUrl` to calculate a code. */
export async function fetchPobEngine(
  code: string,
  { baseUrl, fetch: fetchImpl, signal }: { baseUrl: string; fetch: typeof fetch; signal?: AbortSignal },
): Promise<PobEngineResult> {
  let res: Response
  try {
    res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/calc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
      ...(signal ? { signal } : {}),
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new PobEngineError('The PoB engine could not be reached.', null)
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch (err) {
    // Aborted while the answer was read: say so, or the caller takes it for a broken answer. Bad JSON is handled below.
    if ((err as Error).name === 'AbortError') throw err
  }
  if (!res.ok) {
    const msg = (body as { error?: unknown } | null)?.error
    const retry = Number(res.headers.get('retry-after'))
    throw new PobEngineError(typeof msg === 'string' ? msg : `The PoB engine answered ${res.status}.`, res.status, Number.isFinite(retry) && retry > 0 ? retry : null)
  }
  return parsePobEngineResult(body)
}
