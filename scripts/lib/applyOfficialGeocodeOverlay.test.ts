import {
  applyOfficialGeocodeOverlay,
  loadOfficialGeocodeOverlay,
} from './applyOfficialGeocodeOverlay'
import type { Feature, FeatureCollection } from 'geojson'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

async function tempProjectRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'official-geocode-overlay-'))
  dirs.push(dir)
  return dir
}

function nullFeature(id: string, extraProps: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    id,
    properties: { id, name: 'Test', ...extraProps },
    geometry: null,
  }
}

function pointFeature(id: string, lon: number, lat: number): Feature {
  return {
    type: 'Feature',
    id,
    properties: { id, name: 'Test' },
    geometry: { type: 'Point', coordinates: [lon, lat] },
  }
}

function fc(features: Feature[]): FeatureCollection {
  return { type: 'FeatureCollection', features }
}

describe('applyOfficialGeocodeOverlay', () => {
  it('fills null geometry and sets coord_source', () => {
    const overlay = new Map<string, [number, number]>([['NI-1', [9.7, 52.4]]])
    const out = applyOfficialGeocodeOverlay(fc([nullFeature('NI-1')]), overlay)
    expect(out.features[0].geometry).toEqual({ type: 'Point', coordinates: [9.7, 52.4] })
    expect(out.features[0].properties).toMatchObject({
      id: 'NI-1',
      coord_source: 'nominatim',
    })
  })

  it('does not overwrite existing Point', () => {
    const overlay = new Map<string, [number, number]>([['BE-1', [13.0, 52.0]]])
    const input = pointFeature('BE-1', 13.405, 52.52)
    const out = applyOfficialGeocodeOverlay(fc([input]), overlay)
    expect(out.features[0].geometry).toEqual({ type: 'Point', coordinates: [13.405, 52.52] })
    expect(out.features[0].properties).not.toHaveProperty('coord_source')
    expect(out.features[0]).toBe(input)
  })

  it('ignores unknown overlay ids', () => {
    const overlay = new Map<string, [number, number]>([
      ['NI-missing', [9.7, 52.4]],
      ['NI-1', [9.8, 52.5]],
    ])
    const out = applyOfficialGeocodeOverlay(fc([nullFeature('NI-1')]), overlay)
    expect(out.features).toHaveLength(1)
    expect(out.features[0].geometry).toEqual({ type: 'Point', coordinates: [9.8, 52.5] })
  })
})

describe('loadOfficialGeocodeOverlay', () => {
  it('returns an empty map when the file is missing', async () => {
    const root = await tempProjectRoot()
    const overlay = await loadOfficialGeocodeOverlay(root)
    expect(overlay.size).toBe(0)
  })

  it('loads id → [lon, lat] from points.json', async () => {
    const root = await tempProjectRoot()
    await mkdir(path.join(root, 'data', 'official-geocode'), { recursive: true })
    await writeFile(
      path.join(root, 'data', 'official-geocode', 'points.json'),
      JSON.stringify({ 'NI-1': [9.7, 52.4] }),
    )
    const overlay = await loadOfficialGeocodeOverlay(root)
    expect(overlay.get('NI-1')).toEqual([9.7, 52.4])
  })

  it('throws when the JSON root is not an object of id → [lon, lat]', async () => {
    const root = await tempProjectRoot()
    await mkdir(path.join(root, 'data', 'official-geocode'), { recursive: true })
    await writeFile(
      path.join(root, 'data', 'official-geocode', 'points.json'),
      JSON.stringify([{ id: 'NI-1', lon: 9.7, lat: 52.4 }]),
    )
    await expect(loadOfficialGeocodeOverlay(root)).rejects.toThrow(/id → \[lon, lat\]/)
  })
})
