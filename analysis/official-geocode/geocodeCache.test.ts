import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { appendCacheRecord, loadCache, shouldSkipSchool, type CacheRecord } from './geocodeCache'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

async function tempCachePath(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'official-geocode-cache-'))
  dirs.push(dir)
  return path.join(dir, 'cache.ndjson')
}

function rec(partial: Partial<CacheRecord> & Pick<CacheRecord, 'id' | 'status'>): CacheRecord {
  return {
    id: partial.id,
    query: partial.query ?? 'q',
    attempt: partial.attempt ?? 'structured',
    status: partial.status,
    queriedAt: partial.queriedAt ?? '2026-01-01T00:00:00.000Z',
    lon: partial.lon,
    lat: partial.lat,
    error: partial.error,
  }
}

describe('loadCache last-write-wins', () => {
  it('returns an empty map when the file is missing', () => {
    expect(loadCache('/tmp/official-geocode-cache-does-not-exist.ndjson').size).toBe(0)
  })

  it('keeps the last record per id', async () => {
    const filePath = await tempCachePath()
    await appendCacheRecord(
      filePath,
      rec({ id: 'NI-1', status: 'not_found', attempt: 'structured' }),
    )
    await appendCacheRecord(
      filePath,
      rec({ id: 'NI-1', status: 'ok', attempt: 'unstructured', lon: 9.7, lat: 52.4 }),
    )
    await appendCacheRecord(filePath, rec({ id: 'NI-2', status: 'rejected' }))
    const cache = loadCache(filePath)
    expect(cache.size).toBe(2)
    expect(cache.get('NI-1')?.status).toBe('ok')
    expect(cache.get('NI-1')?.attempt).toBe('unstructured')
    expect(cache.get('NI-1')?.lon).toBe(9.7)
    expect(cache.get('NI-2')?.status).toBe('rejected')
  })
})

describe('shouldSkipSchool', () => {
  it('does not skip a missing record', () => {
    expect(shouldSkipSchool(undefined)).toBe(false)
  })

  it('skips ok and unstructured rejected', () => {
    expect(shouldSkipSchool(rec({ id: 'a', status: 'ok' }))).toBe(true)
    expect(shouldSkipSchool(rec({ id: 'a', status: 'rejected', attempt: 'unstructured' }))).toBe(
      true,
    )
  })

  it('does not skip structured rejected (unstructured fallback still due)', () => {
    expect(shouldSkipSchool(rec({ id: 'a', status: 'rejected', attempt: 'structured' }))).toBe(
      false,
    )
  })

  it('retries not_found and http_error until unstructured not_found is cached', () => {
    expect(shouldSkipSchool(rec({ id: 'a', status: 'not_found', attempt: 'structured' }))).toBe(
      false,
    )
    expect(shouldSkipSchool(rec({ id: 'a', status: 'http_error', error: 'HTTP 503' }))).toBe(false)
    expect(shouldSkipSchool(rec({ id: 'a', status: 'not_found', attempt: 'unstructured' }))).toBe(
      true,
    )
    expect(
      shouldSkipSchool(rec({ id: 'a', status: 'not_found', attempt: 'unstructured' }), {
        retryNotFound: true,
      }),
    ).toBe(false)
  })
})
