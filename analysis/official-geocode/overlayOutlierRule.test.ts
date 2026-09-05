import { describe, expect, it } from 'vitest'
import { shouldDiscardOverlayPoint } from './overlayOutlierRule'

describe('shouldDiscardOverlayPoint', () => {
  it('discards a name match farther than 2 km', () => {
    expect(
      shouldDiscardOverlayPoint({
        category: 'matched',
        matchMode: 'name',
        distanceMeters: 2000.1,
      }),
    ).toBe(true)
  })

  it('keeps a name match at or within 2 km', () => {
    expect(
      shouldDiscardOverlayPoint({
        category: 'matched',
        matchMode: 'name',
        distanceMeters: 2000,
      }),
    ).toBe(false)
  })

  it('keeps ref and distance matches even when far', () => {
    expect(
      shouldDiscardOverlayPoint({
        category: 'matched',
        matchMode: 'ref',
        distanceMeters: 50_000,
      }),
    ).toBe(false)
    expect(
      shouldDiscardOverlayPoint({
        category: 'matched',
        matchMode: 'distance',
        distanceMeters: 50_000,
      }),
    ).toBe(false)
  })

  it('keeps unmatched officials', () => {
    expect(
      shouldDiscardOverlayPoint({
        category: 'official_only',
        matchMode: 'name',
        distanceMeters: 50_000,
      }),
    ).toBe(false)
  })
})
