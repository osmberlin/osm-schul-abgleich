import { landCodeForPointWithRoot, resetBundeslandBoundariesCache } from './bundeslandBoundaries'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const PROJECT_ROOT = path.join(import.meta.dirname, '../..')

afterEach(() => {
  resetBundeslandBoundariesCache()
})

describe('landCodeForPointWithRoot', () => {
  it('classifies Berlin Mitte inside BE', () => {
    expect(landCodeForPointWithRoot(PROJECT_ROOT, 13.405, 52.52)).toBe('BE')
  })

  it('classifies Stuttgart inside BW', () => {
    expect(landCodeForPointWithRoot(PROJECT_ROOT, 9.18, 48.78)).toBe('BW')
  })

  it('returns null for point in the sea', () => {
    expect(landCodeForPointWithRoot(PROJECT_ROOT, 6.0, 55.0)).toBeNull()
  })
})
