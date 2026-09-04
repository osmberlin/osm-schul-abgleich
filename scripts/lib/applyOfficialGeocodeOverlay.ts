import type { Feature, FeatureCollection } from 'geojson'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

function featureOfficialId(f: Feature): string {
  if (typeof f.id === 'string' && f.id !== '') return f.id
  const p = f.properties
  if (typeof p === 'object' && p != null && !Array.isArray(p)) {
    const id = (p as Record<string, unknown>).id
    if (typeof id === 'string' && id !== '') return id
  }
  return ''
}

function parseOverlayJson(raw: unknown): ReadonlyMap<string, [number, number]> {
  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) {
    throw new Error('data/official-geocode/points.json: root must be an object of id → [lon, lat]')
  }
  const m = new Map<string, [number, number]>()
  for (const [id, pair] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(pair) || pair.length < 2) {
      throw new Error(`data/official-geocode/points.json: "${id}" must be [lon, lat]`)
    }
    const lon = pair[0]
    const lat = pair[1]
    if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon + lat)) {
      throw new Error(
        `data/official-geocode/points.json: "${id}" must be [lon, lat] with finite numbers`,
      )
    }
    m.set(id, [lon, lat])
  }
  return m
}

export async function loadOfficialGeocodeOverlay(
  projectRoot: string,
): Promise<ReadonlyMap<string, [number, number]>> {
  const filePath = path.join(projectRoot, 'data', 'official-geocode', 'points.json')
  if (typeof Bun !== 'undefined') {
    const f = Bun.file(filePath)
    if (!(await f.exists())) return new Map()
    return parseOverlayJson(await f.json())
  }
  if (!existsSync(filePath)) return new Map()
  return parseOverlayJson(JSON.parse(await readFile(filePath, 'utf8')))
}

export function applyOfficialGeocodeOverlay(
  fc: FeatureCollection,
  overlay: ReadonlyMap<string, [number, number]>,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      if (f.geometry != null) return f
      const id = featureOfficialId(f)
      const ll = id ? overlay.get(id) : undefined
      if (!ll) return f
      const baseProps =
        typeof f.properties === 'object' && f.properties != null && !Array.isArray(f.properties)
          ? { ...(f.properties as Record<string, unknown>) }
          : {}
      return {
        ...f,
        geometry: { type: 'Point', coordinates: [ll[0], ll[1]] },
        properties: { ...baseProps, coord_source: 'nominatim' },
      }
    }),
  }
}
