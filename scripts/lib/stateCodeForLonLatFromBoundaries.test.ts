import {
  resetBundeslandBoundariesClientCache,
  resolveStateCodeForLonLat,
} from '../../src/lib/stateCodeForLonLatFromBoundaries'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PROJECT_ROOT = path.join(import.meta.dirname, '../..')

afterEach(() => {
  resetBundeslandBoundariesClientCache()
  vi.unstubAllGlobals()
})

describe('resolveStateCodeForLonLat (client resolver)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const m = u.match(/bundesland-boundaries\/([A-Z]{2})\.geojson/)
        if (!m) return new Response('not found', { status: 404 })
        const code = m[1]
        const p = path.join(PROJECT_ROOT, 'public/bundesland-boundaries', `${code}.geojson`)
        const body = readFileSync(p, 'utf8')
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
      }),
    )
  })

  it('classifies Berlin Mitte inside BE', async () => {
    expect(await resolveStateCodeForLonLat(13.405, 52.52)).toBe('BE')
  })

  it('classifies Stuttgart inside BW', async () => {
    expect(await resolveStateCodeForLonLat(9.18, 48.78)).toBe('BW')
  })

  it('returns null for point in the sea', async () => {
    expect(await resolveStateCodeForLonLat(6.0, 55.0)).toBeNull()
  })
})
