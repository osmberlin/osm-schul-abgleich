import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { stateCodeForPointWithRoot, resetBundeslandBoundariesCache } from './bundeslandBoundaries'

const PROJECT_ROOT = path.join(import.meta.dirname, '../..')

afterEach(() => {
  resetBundeslandBoundariesCache()
})

describe('stateCodeForPointWithRoot', () => {
  it('classifies Berlin Mitte inside BE', () => {
    expect(stateCodeForPointWithRoot(PROJECT_ROOT, 13.405, 52.52)).toBe('BE')
  })

  it('classifies Stuttgart inside BW', () => {
    expect(stateCodeForPointWithRoot(PROJECT_ROOT, 9.18, 48.78)).toBe('BW')
  })

  it('returns null for point in the sea', () => {
    expect(stateCodeForPointWithRoot(PROJECT_ROOT, 6.0, 55.0)).toBeNull()
  })
})
