import { PIPELINE_LAND_POLYGON_ORDER } from '../../src/lib/bundeslandPolygonOrder'
import { type StateCode, STATE_ORDER } from '../../src/lib/stateConfig'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type Loaded = Map<StateCode, Feature<Polygon | MultiPolygon>>

let cached: Loaded | null = null
let cachedRoot: string | null = null

function readBoundaryFile(projectRoot: string, code: StateCode): Feature<Polygon | MultiPolygon> {
  const p = path.join(projectRoot, 'public/bundesland-boundaries', `${code}.geojson`)
  const raw = readFileSync(p, 'utf8')
  const f = JSON.parse(raw) as Feature
  if (f.type !== 'Feature' || !f.geometry) {
    throw new Error(`Invalid boundary file for ${code}: ${p}`)
  }
  const t = f.geometry.type
  if (t !== 'Polygon' && t !== 'MultiPolygon') {
    throw new Error(`Expected Polygon/MultiPolygon for ${code}, got ${t}`)
  }
  const props = f.properties ?? {}
  const codeProp = props && typeof props === 'object' && 'code' in props ? props.code : null
  if (codeProp !== code) {
    throw new Error(`Boundary ${code}.geojson: properties.code mismatch (expected ${code})`)
  }
  return f as Feature<Polygon | MultiPolygon>
}

/** Load all checked-in boundaries; safe to call multiple times with same root. */
export function initBundeslandBoundaries(projectRoot: string): void {
  if (cached && cachedRoot === projectRoot) return
  const m: Loaded = new Map()
  for (const code of STATE_ORDER) {
    m.set(code, readBoundaryFile(projectRoot, code))
  }
  cached = m
  cachedRoot = projectRoot
}

/** Clear cache (e.g. tests). */
export function resetBundeslandBoundariesCache(): void {
  cached = null
  cachedRoot = null
}

export function stateCodeForPoint(lon: number, lat: number): StateCode | null {
  if (!cached) {
    throw new Error('initBundeslandBoundaries must be called before stateCodeForPoint')
  }
  const pt = point([lon, lat])
  for (const code of PIPELINE_LAND_POLYGON_ORDER) {
    const f = cached.get(code)
    if (!f) continue
    if (booleanPointInPolygon(pt, f)) return code
  }
  return null
}

/** Resolve land from optional env for tests (directory containing {code}.geojson). */
export function stateCodeForPointWithRoot(
  projectRoot: string,
  lon: number,
  lat: number,
): StateCode | null {
  initBundeslandBoundaries(projectRoot)
  return stateCodeForPoint(lon, lat)
}
