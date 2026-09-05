import type { z } from 'zod'
import { berlinCalendarDateKey } from './berlinCalendarDateKey'
import { runRecordSchema } from './schemas'
import type { StateCode } from './stateConfig'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from './stateMatchCategories'

type RunRecord = z.infer<typeof runRecordSchema>

/** One pipeline run snapshot for the stacked chart (vier Abgleichkategorien + `official_no_coord`). */
export type MatchHistoryStackPoint = {
  finishedAt: string
  matched: number
  official_only: number
  osm_only: number
  match_ambiguous: number
  official_no_coord: number
}

/** Balken-Reihenfolge: gleiche Abgleich-Reihenfolge, zuletzt Bordeaux (CVD: nicht direkt neben Grün). */
export const MATCH_HISTORY_STACK_KEYS = [...STATE_MATCH_CATEGORIES] as const

export type MatchHistoryChartLabels = Record<StateMatchCategory, string>

export type MatchHistorySegmentKey = (typeof MATCH_HISTORY_STACK_KEYS)[number]

function countsToStack(
  c: NonNullable<RunRecord['states'][number]['counts']>,
): Omit<MatchHistoryStackPoint, 'finishedAt'> {
  return {
    matched: c.matched,
    official_only: c.official_only,
    osm_only: c.osm_only,
    match_ambiguous: c.ambiguous,
    official_no_coord: c.official_no_coord,
  }
}

function totalOfStack(p: Omit<MatchHistoryStackPoint, 'finishedAt'>): number {
  return p.matched + p.official_only + p.osm_only + p.match_ambiguous + p.official_no_coord
}

/** Runs usable for the Germany-wide chart: full 16 Länder, each with counts, match not skipped. */
function isFullNationalRun(run: RunRecord, stateOrder: readonly StateCode[]): boolean {
  if (run.matchSkipped === true) return false
  if (run.states.length !== stateOrder.length) return false
  const byCode = new Map(run.states.map((l) => [l.code, l]))
  for (const code of stateOrder) {
    const e = byCode.get(code)
    if (!e?.counts) return false
  }
  return true
}

/** Aggregate stacked counts per finishedAt for all Germany (sum over Länder). */
export function germanyHistoryFromRuns(
  runs: RunRecord[],
  stateOrder: readonly StateCode[],
): MatchHistoryStackPoint[] {
  const sorted = [...runs].sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt))
  const outByBerlinDay = new Map<string, MatchHistoryStackPoint>()
  for (const run of sorted) {
    if (!isFullNationalRun(run, stateOrder)) continue
    let matched = 0
    let official_only = 0
    let osm_only = 0
    let match_ambiguous = 0
    let official_no_coord = 0
    for (const l of run.states) {
      const c = l.counts
      if (!c) continue
      matched += c.matched
      official_only += c.official_only
      osm_only += c.osm_only
      match_ambiguous += c.ambiguous
      official_no_coord += c.official_no_coord
    }
    if (matched + official_only + osm_only + match_ambiguous + official_no_coord === 0) continue
    const dayKey = berlinCalendarDateKey(run.finishedAt)
    if (!dayKey) continue
    outByBerlinDay.set(dayKey, {
      finishedAt: run.finishedAt,
      matched,
      official_only,
      osm_only,
      match_ambiguous,
      official_no_coord,
    })
  }
  return [...outByBerlinDay.values()].sort(
    (a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt),
  )
}

/** Stacked counts for one federal state over time (chronological). */
export function stateHistoryFromRuns(
  runs: RunRecord[],
  stateCode: string,
): MatchHistoryStackPoint[] {
  const sorted = [...runs].sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt))
  const outByBerlinDay = new Map<string, MatchHistoryStackPoint>()
  for (const run of sorted) {
    const entry = run.states.find((l) => l.code === stateCode)
    if (!entry?.counts) continue
    const stack = countsToStack(entry.counts)
    if (totalOfStack(stack) === 0) continue
    const dayKey = berlinCalendarDateKey(run.finishedAt)
    if (!dayKey) continue
    outByBerlinDay.set(dayKey, { finishedAt: run.finishedAt, ...stack })
  }
  return [...outByBerlinDay.values()].sort(
    (a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt),
  )
}
