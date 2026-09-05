import type { PipelineSourceMeta } from './pipelineMeta'

function calendarDateBerlin(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })
}

export function isRefreshedTodayBerlin(iso: string | undefined): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  const gen = new Date(t)
  return calendarDateBerlin(gen) === calendarDateBerlin(new Date())
}

function parseYmdToUtcNoon(ymd: string): number {
  const parts = ymd.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (y === undefined || m === undefined || d === undefined) return Number.NaN
  return Date.UTC(y, m - 1, d, 12, 0, 0)
}

/**
 * True if `iso` falls on the same calendar day or up to `maxDays` calendar days earlier than
 * "today" in Europe/Berlin (inclusive). Used for JedeSchule weekly dumps.
 */
export function isRefreshedWithinDaysBerlin(iso: string | undefined, maxDays: number): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return false
  const genStr = calendarDateBerlin(new Date(t))
  const todayStr = calendarDateBerlin(new Date())
  const genDay = parseYmdToUtcNoon(genStr)
  const todayDay = parseYmdToUtcNoon(todayStr)
  const diffDays = Math.round((todayDay - genDay) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return false
  return diffDays <= maxDays
}

/** Default max-age (days) for `isRefreshedWithinDaysBerlin` (tests); JedeSchule-CSV upstream wöchentlich. */
export const JEDESCHULE_DOWNLOAD_FRESHNESS_DAYS = 7

export function jedeschuleUpstreamDatasetChanged(
  prev: PipelineSourceMeta | null | undefined,
  cur: {
    csvSha256: string
    httpEtag?: string
    httpLastModified?: string
    csvMaxUpdateTimestamp?: string
  },
): boolean {
  if (!prev?.ok) return true
  if (prev.csvSha256 !== cur.csvSha256) return true
  if ((prev.httpEtag ?? '') !== (cur.httpEtag ?? '')) return true
  if ((prev.httpLastModified ?? '') !== (cur.httpLastModified ?? '')) return true
  if ((prev.csvMaxUpdateTimestamp ?? '') !== (cur.csvMaxUpdateTimestamp ?? '')) return true
  return false
}
