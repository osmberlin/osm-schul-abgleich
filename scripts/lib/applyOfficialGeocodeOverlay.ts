import type { Feature, FeatureCollection } from 'geojson'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

/** `data/official-geocode/points.json` and per-state `schools_official_points.json`: id → `[lon, lat]`. */
export const officialPointsMapSchema = z.record(
  z.string(),
  z.tuple([z.number().finite(), z.number().finite()]),
)

export function parseOfficialPointsMap(
  raw: unknown,
  fileLabel: string,
): ReadonlyMap<string, [number, number]> {
  const parsed = officialPointsMapSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`${fileLabel}: root must be an object of id → [lon, lat]`)
  }
  return new Map(Object.entries(parsed.data))
}

function featureOfficialId(f: Feature): string {
  if (typeof f.id === 'string' && f.id !== '') return f.id
  const p = f.properties
  if (typeof p === 'object' && p != null && !Array.isArray(p)) {
    const id = (p as Record<string, unknown>).id
    if (typeof id === 'string' && id !== '') return id
  }
  return ''
}

const OVERLAY_POINTS_LABEL = 'data/official-geocode/points.json'

export async function loadOfficialGeocodeOverlay(
  projectRoot: string,
): Promise<ReadonlyMap<string, [number, number]>> {
  const filePath = path.join(projectRoot, 'data', 'official-geocode', 'points.json')
  if (typeof Bun !== 'undefined') {
    const f = Bun.file(filePath)
    if (!(await f.exists())) return new Map()
    return parseOfficialPointsMap(await f.json(), OVERLAY_POINTS_LABEL)
  }
  if (!existsSync(filePath)) return new Map()
  return parseOfficialPointsMap(JSON.parse(await readFile(filePath, 'utf8')), OVERLAY_POINTS_LABEL)
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
