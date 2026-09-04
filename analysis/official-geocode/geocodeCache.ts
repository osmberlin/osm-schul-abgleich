import { existsSync, readFileSync } from 'node:fs'
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export type CacheRecord = {
  id: string
  query: string
  attempt: 'structured' | 'unstructured'
  status: 'ok' | 'not_found' | 'rejected' | 'http_error'
  lon?: number | null
  lat?: number | null
  nominatimClass?: string | null
  nominatimType?: string | null
  displayName?: string | null
  queriedAt: string
  error?: string
}

function isAttempt(v: unknown): v is CacheRecord['attempt'] {
  return v === 'structured' || v === 'unstructured'
}

function isStatus(v: unknown): v is CacheRecord['status'] {
  return v === 'ok' || v === 'not_found' || v === 'rejected' || v === 'http_error'
}

function optionalCoord(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  return typeof v === 'number' ? v : undefined
}

function optionalNullableString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  return typeof v === 'string' ? v : undefined
}

function parseCacheRecord(raw: unknown): CacheRecord | null {
  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id === '') return null
  if (typeof o.query !== 'string') return null
  if (!isAttempt(o.attempt)) return null
  if (!isStatus(o.status)) return null
  if (typeof o.queriedAt !== 'string') return null
  const rec: CacheRecord = {
    id: o.id,
    query: o.query,
    attempt: o.attempt,
    status: o.status,
    queriedAt: o.queriedAt,
  }
  const lon = optionalCoord(o.lon)
  if (lon !== undefined) rec.lon = lon
  const lat = optionalCoord(o.lat)
  if (lat !== undefined) rec.lat = lat
  const nominatimClass = optionalNullableString(o.nominatimClass)
  if (nominatimClass !== undefined) rec.nominatimClass = nominatimClass
  const nominatimType = optionalNullableString(o.nominatimType)
  if (nominatimType !== undefined) rec.nominatimType = nominatimType
  const displayName = optionalNullableString(o.displayName)
  if (displayName !== undefined) rec.displayName = displayName
  if (typeof o.error === 'string') rec.error = o.error
  return rec
}

/** Last record per `id` wins. Missing file → empty map. Invalid lines skipped. */
export function loadCache(filePath: string): Map<string, CacheRecord> {
  const m = new Map<string, CacheRecord>()
  if (!existsSync(filePath)) return m
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    const rec = parseCacheRecord(parsed)
    if (rec) m.set(rec.id, rec)
  }
  return m
}

export async function appendCacheRecord(filePath: string, record: CacheRecord): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8')
}

export function shouldSkipSchool(
  rec: CacheRecord | undefined,
  opts?: { retryNotFound?: boolean },
): boolean {
  if (rec == null) return false
  if (rec.status === 'ok') return true
  if (rec.status === 'rejected' && rec.attempt === 'unstructured') return true
  if (rec.status === 'not_found' && rec.attempt === 'unstructured' && !opts?.retryNotFound) {
    return true
  }
  return false
}
