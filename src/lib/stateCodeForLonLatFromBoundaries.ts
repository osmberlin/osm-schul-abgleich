import { PIPELINE_LAND_POLYGON_ORDER } from './bundeslandPolygonOrder'
import { stateBoundaryUrl } from './paths'
import { type StateCode, STATE_ORDER } from './stateConfig'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

type Loaded = Map<StateCode, Feature<Polygon | MultiPolygon>>

let cached: Loaded | null = null

function parseBoundaryFeature(code: StateCode, raw: unknown): Feature<Polygon | MultiPolygon> {
  const f = raw as Feature
  if (f.type !== 'Feature' || !f.geometry) {
    throw new Error(`Invalid boundary Feature for ${code}`)
  }
  const t = f.geometry.type
  if (t !== 'Polygon' && t !== 'MultiPolygon') {
    throw new Error(`Expected Polygon/MultiPolygon for ${code}, got ${t}`)
  }
  const props = f.properties ?? {}
  const codeProp = props && typeof props === 'object' && 'code' in props ? props.code : null
  if (codeProp !== code) {
    throw new Error(`Boundary ${code}: properties.code mismatch`)
  }
  return f as Feature<Polygon | MultiPolygon>
}

/** Load all boundaries from `public/bundesland-boundaries/`; safe to call multiple times. */
async function ensureBundeslandBoundariesLoaded(): Promise<void> {
  if (cached) return
  const results = await Promise.all(
    STATE_ORDER.map(async (code) => {
      const r = await fetch(stateBoundaryUrl(code))
      if (!r.ok) throw new Error(`boundary fetch ${code}: ${r.status}`)
      const json: unknown = await r.json()
      return [code, parseBoundaryFeature(code, json)] as const
    }),
  )
  cached = new Map(results)
}

/** Test-only: clear cached boundaries. */
export function resetBundeslandBoundariesClientCache(): void {
  cached = null
}

/**
 * Resolve Bundesland using the same polygon order and geometry as the pipeline
 * (`scripts/lib/bundeslandBoundaries.ts`).
 */
export async function resolveStateCodeForLonLat(
  lon: number,
  lat: number,
): Promise<StateCode | null> {
  await ensureBundeslandBoundariesLoaded()
  if (!cached) return null
  const pt = point([lon, lat])
  for (const code of PIPELINE_LAND_POLYGON_ORDER) {
    const f = cached.get(code)
    if (!f) continue
    if (booleanPointInPolygon(pt, f)) return code
  }
  return null
}
