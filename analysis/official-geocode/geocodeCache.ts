import { existsSync, readFileSync } from 'node:fs'
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const cacheRecordSchema = z.object({
  id: z.string().min(1),
  query: z.string(),
  attempt: z.enum(['structured', 'unstructured']),
  status: z.enum(['ok', 'not_found', 'rejected', 'http_error']),
  lon: z.number().nullable().optional(),
  lat: z.number().nullable().optional(),
  nominatimClass: z.string().nullable().optional(),
  nominatimType: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  queriedAt: z.string(),
  error: z.string().optional(),
})

export type CacheRecord = z.infer<typeof cacheRecordSchema>

function parseCacheRecord(raw: unknown): CacheRecord | null {
  const parsed = cacheRecordSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
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
