import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Feature, FeatureCollection } from 'geojson'
import { z } from 'zod'

export const officialPointsMapSchema = z.record(
  z.string(),
  z.tuple([z.number().finite(), z.number().finite()]),
)

export function parseOfficialPointsMap(raw: unknown, fileLabel: string) {
  const parsed = officialPointsMapSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`${fileLabel}: root must be an object of id → [lon, lat]`)
  }
  return new Map(Object.entries(parsed.data))
}

function featureOfficialId(f: Feature) {
  if (typeof f.id === 'string' && f.id !== '') return f.id
  const id = f.properties?.id
  if (typeof id === 'string' && id !== '') return id
  return ''
}

const OVERLAY_POINTS_LABEL = 'data/official-geocode/points.json'

export async function loadOfficialGeocodeOverlay(projectRoot: string) {
  const filePath = path.join(projectRoot, 'data', 'official-geocode', 'points.json')
  if (!existsSync(filePath)) return new Map()
  return parseOfficialPointsMap(JSON.parse(await readFile(filePath, 'utf8')), OVERLAY_POINTS_LABEL)
}

export function applyOfficialGeocodeOverlay(
  fc: FeatureCollection,
  overlay: ReadonlyMap<string, [number, number]>,
) {
  return {
    type: 'FeatureCollection' as const,
    features: fc.features.map((f) => {
      if (f.geometry != null) return f
      const id = featureOfficialId(f)
      const ll = id ? overlay.get(id) : undefined
      if (!ll) return f
      const props = f.properties
      const baseProps = props != null ? { ...props } : {}
      return {
        ...f,
        geometry: { type: 'Point' as const, coordinates: [ll[0], ll[1]] },
        properties: { ...baseProps, coord_source: 'nominatim' },
      }
    }),
  }
}
