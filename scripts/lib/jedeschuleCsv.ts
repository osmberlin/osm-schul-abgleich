import { jedeschuleSchoolSchema, jedeschuleStatSchema } from '../../src/lib/schemas'
import { parse } from 'csv-parse/sync'
import { subMonths } from 'date-fns'
import { z } from 'zod'

/** `PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP`: unset/empty/invalid → false; truthy per `z.stringbool()`. */
const pipelineKeepJedeschuleMissingTimestampEnvSchema = z
  .stringbool()
  .optional()
  .default(false)
  .catch(false)

export type JedeschuleSchool = (typeof jedeschuleSchoolSchema)['_output']

function emptyToNull(s: string | undefined): string | null {
  if (s == null || s.trim() === '') return null
  return s
}

function parseNum(s: string | undefined): number | null {
  if (s == null || s.trim() === '') return null
  const n = Number.parseFloat(s.trim())
  return Number.isFinite(n) ? n : null
}

/** Parse CSV text into schools (used by `pipeline:download:jedeschule` without persisting CSV first). */
export function parseSchoolsFromCsvText(text: string, labelForErrors = 'CSV'): JedeschuleSchool[] {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, string>[]

  const schools: JedeschuleSchool[] = []
  for (let i = 0; i < records.length; i++) {
    try {
      schools.push(rowToSchool(records[i]))
    } catch (e) {
      throw new Error(`${labelForErrors} row ${i + 2}: ${e}`)
    }
  }
  return schools
}

function rowToSchool(row: Record<string, string>): JedeschuleSchool {
  return jedeschuleSchoolSchema.parse({
    id: row.id,
    name: row.name,
    latitude: parseNum(row.latitude),
    longitude: parseNum(row.longitude),
    address: emptyToNull(row.address),
    city: emptyToNull(row.city),
    zip: emptyToNull(row.zip),
    school_type: emptyToNull(row.school_type),
    website: emptyToNull(row.website),
    phone: emptyToNull(row.phone),
    email: emptyToNull(row.email),
    legal_status: emptyToNull(row.legal_status),
    provider: emptyToNull(row.provider),
    update_timestamp: emptyToNull(row.update_timestamp),
  })
}

export type JedeschuleRecencyStats = {
  removedTooOld: number
  removedMissingTimestamp: number
  removedUnparseableTimestamp: number
  kept: number
}

export type FilterJedeschuleSchoolsByRecencyOptions = {
  /** Reference instant for the 12‑month window (default: `Date.now()`). */
  referenceMs?: number
  /**
   * Keep rows with missing `update_timestamp` (ignores env). When omitted, uses
   * `PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP` (truthy per `z.stringbool()`, e.g. `1`, `true`, `yes`).
   */
  keepMissingTimestamp?: boolean
}

function envKeepMissingTimestamp(): boolean {
  return pipelineKeepJedeschuleMissingTimestampEnvSchema.parse(
    process.env.PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP,
  )
}

/**
 * Keeps schools whose `update_timestamp` parses and is not older than 12 calendar months
 * before `referenceMs` (per `date-fns/subMonths`). Drops missing timestamps unless
 * `keepMissingTimestamp` or `PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP` is set.
 */
export function filterJedeschuleSchoolsByRecency(
  schools: JedeschuleSchool[],
  opts?: FilterJedeschuleSchoolsByRecencyOptions,
): { schools: JedeschuleSchool[]; stats: JedeschuleRecencyStats } {
  const referenceMs = opts?.referenceMs ?? Date.now()
  const keepMissing =
    opts?.keepMissingTimestamp !== undefined ? opts.keepMissingTimestamp : envKeepMissingTimestamp()

  const cutoffMs = subMonths(new Date(referenceMs), 12).getTime()

  let removedTooOld = 0
  let removedMissingTimestamp = 0
  let removedUnparseableTimestamp = 0
  const kept: JedeschuleSchool[] = []

  for (const s of schools) {
    const raw = s.update_timestamp?.trim() ?? ''
    if (!raw) {
      if (keepMissing) {
        kept.push(s)
      } else {
        removedMissingTimestamp++
      }
      continue
    }
    const t = Date.parse(raw)
    if (!Number.isFinite(t)) {
      removedUnparseableTimestamp++
      continue
    }
    if (t < cutoffMs) {
      removedTooOld++
      continue
    }
    kept.push(s)
  }

  return {
    schools: kept,
    stats: {
      removedTooOld,
      removedMissingTimestamp,
      removedUnparseableTimestamp,
      kept: kept.length,
    },
  }
}

/** Lexicographic max of `update_timestamp` across schools (content freshness signal). */
export function computeCsvMaxUpdateTimestamp(schools: JedeschuleSchool[]): string | undefined {
  let max = ''
  for (const s of schools) {
    const ts = s.update_timestamp?.trim() ?? ''
    if (ts && (!max || ts > max)) max = ts
  }
  return max || undefined
}

type JedeschuleStatRow = (typeof jedeschuleStatSchema)['_output']

/**
 * Compact on-disk stats (`jedeschule_stats.json`): one line, short keys.
 * `{ "g": "<iso>", "s": [["BB",123,"2024-01-01"], ...] }`
 */
export function serializeJedeschuleStatsCompact(
  generatedAt: string,
  stats: JedeschuleStatRow[],
): string {
  const s = stats.map((x) => [x.state, x.count, x.last_updated] as [string, number, string])
  return JSON.stringify({ g: generatedAt, s })
}

/**
 * Reads `jedeschule_stats.json` compact shape only:
 * `{ "g": "<iso>", "s": [["BB",123,"2024-01-01"], ...] }` (see `serializeJedeschuleStatsCompact`).
 */
export function parseJedeschuleStatsJson(raw: unknown): JedeschuleStatRow[] {
  if (raw == null) return []
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('jedeschule_stats.json: root must be a JSON object')
  }
  const o = raw as Record<string, unknown>
  if (typeof o.g !== 'string' || o.g.trim() === '') {
    throw new Error('jedeschule_stats.json: missing non-empty string field "g" (generatedAt)')
  }
  if (!Array.isArray(o.s)) {
    throw new Error('jedeschule_stats.json: missing array field "s" (per-state rows)')
  }
  if (o.s.length === 0) return []
  for (let i = 0; i < o.s.length; i++) {
    const row = o.s[i]
    if (!Array.isArray(row) || row.length < 3) {
      throw new Error(
        `jedeschule_stats.json: s[${i}] must be [state, count, last_updated] (tuple length ≥ 3)`,
      )
    }
  }
  return o.s.map((row) => {
    const r = row as unknown[]
    return jedeschuleStatSchema.parse({
      state: String(r[0]),
      count: Number(r[1]),
      last_updated: String(r[2]),
    })
  })
}

/** Per-state counts and latest update (from row timestamps), same idea as GET /stats. */
export function buildJedeschuleStatsFromDump(schools: JedeschuleSchool[]): JedeschuleStatRow[] {
  const agg = new Map<string, { count: number; maxTs: string }>()
  for (const s of schools) {
    const dash = s.id.indexOf('-')
    const state = dash > 0 ? s.id.slice(0, dash) : ''
    if (state.length !== 2) continue
    const ts = s.update_timestamp?.trim() ?? ''
    const cur = agg.get(state)
    if (!cur) {
      agg.set(state, { count: 1, maxTs: ts })
    } else {
      cur.count++
      if (ts && (!cur.maxTs || ts > cur.maxTs)) cur.maxTs = ts
    }
  }
  const rows = [...agg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, { count, maxTs }]) => {
      const datePart = maxTs.split(' ')[0]
      const last = maxTs.includes(' ') ? (datePart ?? maxTs) : maxTs
      return jedeschuleStatSchema.parse({
        state,
        count,
        last_updated: last || maxTs,
      })
    })
  return rows
}
