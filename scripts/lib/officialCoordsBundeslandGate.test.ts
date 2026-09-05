import path from 'node:path'
import type { Feature, FeatureCollection } from 'geojson'
import { afterEach, describe, expect, it } from 'vitest'
import { initBundeslandBoundaries, resetBundeslandBoundariesCache } from './bundeslandBoundaries'
import {
  gateOfficialFeatureCollection,
  voidOfficialPointOutsideDeclaredState,
} from './officialCoordsBundeslandGate'

const PROJECT_ROOT = path.join(import.meta.dirname, '../..')

afterEach(() => {
  resetBundeslandBoundariesCache()
})

function pointFeature(
  id: string,
  lon: number,
  lat: number,
  extraProps: Record<string, unknown> = {},
) {
  const dash = id.indexOf('-')
  const stateFromId = dash > 0 ? id.slice(0, dash) : undefined
  return {
    type: 'Feature',
    id,
    properties: {
      id,
      name: 'Test',
      ...(stateFromId ? { state: stateFromId } : {}),
      ...extraProps,
    },
    geometry: { type: 'Point', coordinates: [lon, lat] },
  } as Feature
}

describe('voidOfficialPointOutsideDeclaredState', () => {
  it('leaves point inside declared Bundesland unchanged', () => {
    initBundeslandBoundaries(PROJECT_ROOT)
    const f = pointFeature('BE-x', 13.405, 52.52)
    const out = voidOfficialPointOutsideDeclaredState(f)
    expect(out.geometry?.type).toBe('Point')
    expect((out.geometry as { coordinates: number[] }).coordinates).toEqual([13.405, 52.52])
    expect(out.properties).not.toHaveProperty('_error_outside_boundary')
  })

  it('voids geometry and records error when point is outside declared land (RP id in Berlin)', () => {
    initBundeslandBoundaries(PROJECT_ROOT)
    const f = pointFeature('RP-wrong', 13.405, 52.52)
    const out = voidOfficialPointOutsideDeclaredState(f)
    expect(out.geometry).toBeNull()
    expect(out.properties).toMatchObject({
      id: 'RP-wrong',
      _error_outside_boundary: { latitude: 52.52, longitude: 13.405 },
    })
  })

  it('voids when point is in the sea (stateCodeForPoint null)', () => {
    initBundeslandBoundaries(PROJECT_ROOT)
    const f = pointFeature('BY-x', 6.0, 55.0)
    const out = voidOfficialPointOutsideDeclaredState(f)
    expect(out.geometry).toBeNull()
    expect(out.properties?._error_outside_boundary).toEqual({ latitude: 55.0, longitude: 6.0 })
  })

  it('passes through features without a valid state', () => {
    initBundeslandBoundaries(PROJECT_ROOT)
    const f = pointFeature('nope', 13.405, 52.52)
    const out = voidOfficialPointOutsideDeclaredState(f)
    expect(out.geometry?.type).toBe('Point')
  })
})

describe('gateOfficialFeatureCollection', () => {
  it('maps all features', () => {
    initBundeslandBoundaries(PROJECT_ROOT)
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [pointFeature('HE-a', 13.405, 52.52), pointFeature('BE-b', 13.405, 52.52)],
    }
    const out = gateOfficialFeatureCollection(fc)
    expect(out.features).toHaveLength(2)
    expect(out.features[0]!.geometry).toBeNull()
    expect(out.features[1]!.geometry?.type).toBe('Point')
  })
})
