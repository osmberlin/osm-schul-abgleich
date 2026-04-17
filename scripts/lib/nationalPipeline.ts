import { berlinCalendarDateKey } from '../../src/lib/berlinCalendarDateKey'
import { promoteClosedLineStringsToPolygons } from '../../src/lib/osmClosedRingsToPolygons'
import { centroidFromOsmGeometry } from '../../src/lib/osmGeometryCentroid'
import { parseRunHistoryFileText, stringifyRunHistoryJsonl } from '../../src/lib/runHistoryJsonl'
import {
  type StateCode,
  stateCodeFromSchoolId,
  STATE_MAP_CENTER,
  STATE_ORDER,
} from '../../src/lib/stateConfig'
import { initBundeslandBoundaries, stateCodeForPoint } from './bundeslandBoundaries'
import { dedupeOfficialInputs } from './dedupeOfficialInputs'
import {
  buildJedeschuleStatsFromDump,
  computeCsvMaxUpdateTimestamp,
  filterJedeschuleSchoolsByRecency,
  parseJedeschuleStatsJson,
  parseSchoolsFromCsvText,
  serializeJedeschuleStatsCompact,
} from './jedeschuleCsv'
import { JEDESCHULE_WEEKLY_CSV_URL, jedeschuleDumpAbsolutePath } from './jedeschuleDumpConfig'
import {
  buildOsmSchoolsFromGeoJson,
  type MatchRowOut,
  matchSchools,
  type OfficialInput,
} from './match'
import { NATIONAL, nationalPath } from './nationalDatasetPaths'
import { gateOfficialFeatureCollection } from './officialCoordsBundeslandGate'
import { fetchSchoolsOsmOverpassGermanyWithRetries } from './overpassFetch'
import {
  datasetsDir,
  officialGeojsonForState,
  PIPELINE_VERSION,
  readJsonFile,
  schoolToOfficialProps,
  statusDir,
  writeJson,
} from './pipelineCommon'
import { jedeschuleUpstreamDatasetChanged } from './pipelineFreshness'
import type { PipelineSourceMeta } from './pipelineMeta'
import { feature, featureCollection, point } from '@turf/helpers'
import simplify from '@turf/simplify'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

function envScopedJsonFileName(fileName: string): string {
  if (process.env.GITHUB_ACTIONS === 'true') return fileName
  if (fileName.endsWith('.jsonl')) return fileName.replace(/\.jsonl$/, '.dev.jsonl')
  return fileName.replace(/\.json$/, '.dev.json')
}

type StateSummaryOut = {
  code: string
  osmSource: 'live' | 'cached' | 'missing'
  overpassError?: string
  osmSnapshotAt?: string
  overpassQueriedAt?: string
  counts: {
    matched: number
    official_only: number
    osm_only: number
    ambiguous: number
    official_no_coord: number
  }
  jedeschuleLastUpdated?: string
}

type SummaryFileOut = {
  generatedAt: string
  pipelineVersion: number
  jedeschuleCsvSource?: string
  states: StateSummaryOut[]
}

// 4 decimals ~= 11m latitude resolution; acceptable "about 10m" for Germany.
const USER_FACING_COORD_DECIMALS = 4 as const

/** Douglas–Peucker tolerance in degrees (~N/S meters ≈ tolerance * 111_320). */
const OSM_USER_GEOMETRY_SIMPLIFY_TOLERANCE_DEG = 10 / 111_320

/** Deferred polygon/line geometries for detail map (`schools_osm_areas.json`): full outline, no DP simplify. */
const OSM_AREAS_COORD_DECIMALS = 6 as const

function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}

function roundGeoCoordinates(value: unknown, decimals: number): unknown {
  if (typeof value === 'number') return roundToDecimals(value, decimals)
  if (Array.isArray(value)) return value.map((v) => roundGeoCoordinates(v, decimals))
  return value
}

function roundFeatureGeometry(
  geometry: Feature['geometry'] | null,
  decimals: number,
): Feature['geometry'] | null {
  if (!geometry) return geometry
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map(
        (g) => roundFeatureGeometry(g, decimals) as NonNullable<typeof g>,
      ),
    }
  }
  return {
    ...geometry,
    coordinates: roundGeoCoordinates(
      (geometry as { coordinates: unknown }).coordinates,
      decimals,
    ) as never,
  }
}

function optimizeOfficialFeatureForUserOutput(f: Feature): Feature {
  return {
    ...f,
    geometry: roundFeatureGeometry(f.geometry, USER_FACING_COORD_DECIMALS),
  }
}

const R = USER_FACING_COORD_DECIMALS

function simplifyOsmGeometryForUser(
  geometry: Feature['geometry'] | null,
): Feature['geometry'] | null {
  if (!geometry) return geometry
  geometry = promoteClosedLineStringsToPolygons(geometry) ?? geometry
  if (geometry.type === 'GeometryCollection') {
    return {
      type: 'GeometryCollection',
      geometries: geometry.geometries.map((g) => simplifyOsmGeometryForUser(g) as Geometry),
    }
  }
  if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
    return roundFeatureGeometry(geometry, R)
  }
  try {
    const simplified = simplify(feature(geometry, {}), {
      tolerance: OSM_USER_GEOMETRY_SIMPLIFY_TOLERANCE_DEG,
      highQuality: false,
    })
    const g = simplified.type === 'Feature' ? simplified.geometry : null
    return roundFeatureGeometry(g ?? geometry, R)
  } catch {
    return roundFeatureGeometry(geometry, R)
  }
}

function geometryIsPointLikeOnly(g: Geometry | null): boolean {
  if (!g) return false
  return g.type === 'Point' || g.type === 'MultiPoint'
}

function osmRefKeyFromFeatureId(f: Feature): string | null {
  const idRaw = f.id
  if (typeof idRaw === 'string') {
    if (idRaw.startsWith('way/') || idRaw.startsWith('relation/') || idRaw.startsWith('node/')) {
      return idRaw
    }
  }
  if (typeof idRaw === 'number') return `way/${idRaw}`
  return null
}

/**
 * Full campus geometry for `schools_osm_areas.json`: closed-ring promotion + coordinate rounding only
 * (used by detail map `resolveOsmSchoolAreaOutline`; no Douglas–Peucker so outlines stay complete).
 */
function normalizeOsmGeometryForAreasFile(
  geometry: Feature['geometry'] | null,
): Feature['geometry'] | null {
  if (!geometry) return geometry
  let g = promoteClosedLineStringsToPolygons(geometry) ?? geometry
  if (g.type === 'GeometryCollection') {
    return {
      type: 'GeometryCollection',
      geometries: g.geometries.map((x) => normalizeOsmGeometryForAreasFile(x) as Geometry),
    }
  }
  return roundFeatureGeometry(g, OSM_AREAS_COORD_DECIMALS)
}

/**
 * Point-only layer for lists/maps + `schools_osm_areas.json` entry with **full** campus geometry
 * whenever we have a non-point outline and an OSM ref key (no heavy geometry on the main file).
 */
function buildOsmUserPointFeatureAndArea(f: Feature): {
  point: Feature
  areaEntry: [string, Feature] | null
} {
  const geom = promoteClosedLineStringsToPolygons(f.geometry ?? null) ?? f.geometry
  if (!geom || geometryIsPointLikeOnly(geom)) {
    return {
      point: feature(simplifyOsmGeometryForUser(geom), { hasPolygonGeometry: false }, { id: f.id }),
      areaEntry: null,
    }
  }
  const key = osmRefKeyFromFeatureId(f)
  const areaFeature = feature(normalizeOsmGeometryForAreasFile(geom), null, { id: f.id })
  if (!key) {
    return {
      point: feature(simplifyOsmGeometryForUser(geom), { hasPolygonGeometry: false }, { id: f.id }),
      areaEntry: null,
    }
  }
  const markerLonLat = centroidFromOsmGeometry(geom)
  const [lon, lat] = markerLonLat
  return {
    point: point(
      [roundToDecimals(lon, R), roundToDecimals(lat, R)],
      { hasPolygonGeometry: true },
      { id: f.id },
    ),
    areaEntry: [key, areaFeature],
  }
}

function optimizeMatchRowForUserOutput(
  row: Record<string, unknown> & { osmCentroidLon?: number | null; osmCentroidLat?: number | null },
): Record<string, unknown> {
  const out = { ...row }
  delete out.pipelineState
  if (typeof out.osmCentroidLon === 'number') {
    out.osmCentroidLon = roundToDecimals(out.osmCentroidLon, USER_FACING_COORD_DECIMALS)
  }
  if (typeof out.osmCentroidLat === 'number') {
    out.osmCentroidLat = roundToDecimals(out.osmCentroidLat, USER_FACING_COORD_DECIMALS)
  }
  return out
}

function nearestStateByCenter(lon: number, lat: number): StateCode {
  let best: StateCode = 'NI'
  let bestD = Number.POSITIVE_INFINITY
  for (const code of STATE_ORDER) {
    const [clon, clat] = STATE_MAP_CENTER[code]
    const d = (lon - clon) ** 2 + (lat - clat) ** 2
    if (d < bestD) {
      bestD = d
      best = code
    }
  }
  return best
}

function assignPipelineStateToOsmFeature(f: Feature): StateCode {
  const [lon, lat] = centroidFromOsmGeometry(f.geometry ?? null)
  return stateCodeForPoint(lon, lat) ?? nearestStateByCenter(lon, lat)
}

function tagNationalOsmFc(fc: FeatureCollection): FeatureCollection {
  return featureCollection(
    fc.features.map((f) => {
      const state = assignPipelineStateToOsmFeature(f)
      const props = {
        ...(typeof f.properties === 'object' && f.properties != null ? f.properties : {}),
        _pipelineState: state,
      }
      return { ...f, properties: props }
    }),
  )
}

function osmTypeIdKey(osmType: string, osmId: string) {
  return `${osmType}/${osmId}`
}

function buildOsmStateMap(fc: FeatureCollection): Map<string, StateCode> {
  const m = new Map<string, StateCode>()
  for (const f of fc.features) {
    const idRaw = f.id
    let osmType: 'way' | 'relation' | 'node' = 'way'
    let osmId = ''
    if (typeof idRaw === 'string') {
      if (idRaw.startsWith('way/')) {
        osmType = 'way'
        osmId = idRaw.slice(4)
      } else if (idRaw.startsWith('relation/')) {
        osmType = 'relation'
        osmId = idRaw.slice(9)
      } else if (idRaw.startsWith('node/')) {
        osmType = 'node'
        osmId = idRaw.slice(5)
      }
    }
    const state = assignPipelineStateToOsmFeature(f)
    if (osmId) m.set(osmTypeIdKey(osmType, osmId), state)
  }
  return m
}

function enrichRowsWithPipelineState(
  rows: MatchRowOut[],
  osmStateByKey: Map<string, StateCode>,
): MatchRowOut[] {
  return rows.map((r) => {
    let state: StateCode | undefined
    if (r.officialId) state = stateCodeFromSchoolId(r.officialId) ?? undefined
    if (!state && r.osmId && r.osmType)
      state = osmStateByKey.get(osmTypeIdKey(r.osmType, r.osmId)) ?? undefined
    if (!state && r.ambiguousOfficialIds?.length)
      state = stateCodeFromSchoolId(r.ambiguousOfficialIds[0]) ?? undefined
    return state ? { ...r, pipelineState: state } : { ...r }
  })
}

export function officialsFromNationalOfficialFc(fc: FeatureCollection): OfficialInput[] {
  const out: OfficialInput[] = []
  for (const f of fc.features) {
    const id = String(f.id ?? (f.properties as { id?: string })?.id ?? '')
    if (!id) continue
    const p = (f.properties ?? {}) as Record<string, unknown>
    const name = String(p.name ?? '')
    const g = f.geometry
    let lon = Number.NaN
    let lat = Number.NaN
    if (g && g.type === 'Point' && Array.isArray(g.coordinates)) {
      const [x, y] = g.coordinates as [number, number]
      if (Number.isFinite(x + y)) {
        lon = x
        lat = y
      }
    }
    out.push({
      id,
      name,
      lon,
      lat,
      properties: schoolToOfficialProps({ ...p, id, name, latitude: lat, longitude: lon }),
    })
  }
  return out
}

export async function runDownloadJedeschuleNational(projectRoot: string): Promise<void> {
  const outCsv = jedeschuleDumpAbsolutePath(projectRoot)
  const pathMeta = nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOfficialMeta))
  const pathStats = nationalPath(projectRoot, NATIONAL.jedeschuleStats)
  const generatedAt = new Date().toISOString()
  await mkdir(path.dirname(outCsv), { recursive: true })
  const prevMeta = await readJsonFile<PipelineSourceMeta>(pathMeta)

  try {
    console.info(`[pipeline:download:jedeschule] fetch ${JEDESCHULE_WEEKLY_CSV_URL}`)
    const r = await fetch(JEDESCHULE_WEEKLY_CSV_URL)
    if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`)
    const httpLastModified = r.headers.get('last-modified') ?? undefined
    const httpEtag = r.headers.get('etag') ?? undefined
    const text = await r.text()
    const csvSha256 = createHash('sha256').update(text, 'utf8').digest('hex')
    await Bun.write(outCsv, text)
    const schoolsRaw = parseSchoolsFromCsvText(text, 'jedeschule')
    const { schools, stats: jedeschuleRecencyStats } = filterJedeschuleSchoolsByRecency(schoolsRaw)
    console.info(
      `[pipeline:jedeschule-recency] removedTooOld=${jedeschuleRecencyStats.removedTooOld} removedMissingTimestamp=${jedeschuleRecencyStats.removedMissingTimestamp} removedUnparseable=${jedeschuleRecencyStats.removedUnparseableTimestamp} kept=${jedeschuleRecencyStats.kept}`,
    )
    const csvMaxUpdateTimestamp = computeCsvMaxUpdateTimestamp(schools)
    const upstreamDatasetChanged = jedeschuleUpstreamDatasetChanged(prevMeta, {
      csvSha256,
      httpEtag,
      httpLastModified,
      csvMaxUpdateTimestamp,
    })
    const stats = buildJedeschuleStatsFromDump(schools)
    await Bun.write(pathStats, serializeJedeschuleStatsCompact(generatedAt, stats))
    const meta: PipelineSourceMeta = {
      pipelineStep: 'pipeline:download:jedeschule',
      generatedAt,
      sourceUrl: JEDESCHULE_WEEKLY_CSV_URL,
      ok: true,
      httpLastModified,
      httpEtag,
      csvSha256,
      csvMaxUpdateTimestamp,
      upstreamDatasetChanged,
    }
    await writeJson(pathMeta, meta)
    console.info(
      `[pipeline:download:jedeschule] ok (${schools.length} schools) upstreamDatasetChanged=${upstreamDatasetChanged}`,
    )
  } catch (e) {
    const err = String(e)
    console.error(`[pipeline:download:jedeschule] FAILED: ${err}`)
    const meta: PipelineSourceMeta = {
      pipelineStep: 'pipeline:download:jedeschule',
      generatedAt,
      sourceUrl: JEDESCHULE_WEEKLY_CSV_URL,
      ok: false,
      errorMessage: err,
    }
    await writeJson(pathMeta, meta)
  }
}

export async function runDownloadOsmNational(projectRoot: string): Promise<void> {
  initBundeslandBoundaries(projectRoot)
  const pathGeo = nationalPath(projectRoot, NATIONAL.pipelineOsmGeojson)
  const pathMeta = nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOsmMeta))
  const generatedAt = new Date().toISOString()
  await mkdir(path.dirname(pathGeo), { recursive: true })

  try {
    console.info('[pipeline:download:osm] Overpass Germany …')
    const ok = await fetchSchoolsOsmOverpassGermanyWithRetries()
    const queried = new Date().toISOString()
    const tagged = tagNationalOsmFc(ok.featureCollection)
    await writeJson(pathGeo, tagged)
    const meta: PipelineSourceMeta = {
      pipelineStep: 'pipeline:download:osm',
      generatedAt: queried,
      ok: true,
      overpassResponseTimestamp: ok.responseTimestamp,
      interpreterUrl: ok.interpreterUrl,
    }
    await writeJson(pathMeta, meta)
    console.info(`[pipeline:download:osm] ok (${tagged.features.length} features)`)
  } catch (e) {
    const err = String(e)
    console.error(`[pipeline:download:osm] FAILED: ${err}`)
    const meta: PipelineSourceMeta = {
      pipelineStep: 'pipeline:download:osm',
      generatedAt,
      ok: false,
      errorMessage: err,
    }
    await writeJson(pathMeta, meta)
  }
}

type MatchNationResult = {
  errors: string[]
  matchSkipped: boolean
  matchSkipReason?: string
}

export type RunStateFirstOptions = {
  /** Only rewrite `datasets/{code}/` and patch that land in `summary.json`. Needs a complete existing `summary.json` (falls back to full run). */
  onlyStates?: StateCode[]
}

export type RunSplitStatesOptions = RunStateFirstOptions

const JEDESCHULE_CSV_SOURCE_LABEL = 'jedeschule-latest.csv' as const

async function loadSchoolsFromDump(projectRoot: string) {
  const csvPath = jedeschuleDumpAbsolutePath(projectRoot)
  const f = Bun.file(csvPath)
  if (!(await f.exists())) {
    return {
      ok: false as const,
      error: `Fehlend: ${csvPath} (zuerst pipeline:download:jedeschule)`,
    }
  }
  const text = await f.text()
  const schools = parseSchoolsFromCsvText(text, 'jedeschule')
  return { ok: true as const, schools }
}

export async function runStateFirstPipeline(
  projectRoot: string,
  opts?: RunStateFirstOptions,
): Promise<MatchNationResult & { errors: string[] }> {
  initBundeslandBoundaries(projectRoot)
  const errors: string[] = []
  const startedAt = new Date().toISOString()
  const t0 = performance.now()

  const pathOfficialMeta = nationalPath(
    projectRoot,
    envScopedJsonFileName(NATIONAL.schoolsOfficialMeta),
  )
  const pathOsmMeta = nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOsmMeta))
  const pathOsmFc = nationalPath(projectRoot, NATIONAL.pipelineOsmGeojson)
  const pathOsmFcLegacy = nationalPath(projectRoot, 'schools_osm_de.geojson')

  const officialMeta = await readJsonFile<PipelineSourceMeta>(pathOfficialMeta)
  const osmMeta = await readJsonFile<PipelineSourceMeta>(pathOsmMeta)

  const jedeschuleReady = officialMeta?.ok === true
  const osmReady = osmMeta?.ok === true

  const downloadSnapshot = {
    jedeschule: {
      ok: officialMeta?.ok ?? false,
      generatedAt: officialMeta?.generatedAt,
      errorMessage: officialMeta?.errorMessage,
      upstreamDatasetChanged: officialMeta?.upstreamDatasetChanged,
    },
    osm: {
      ok: osmMeta?.ok ?? false,
      generatedAt: osmMeta?.generatedAt,
      errorMessage: osmMeta?.errorMessage,
    },
  }

  const forceMatch =
    process.env.PIPELINE_FORCE_MATCH === '1' || process.env.PIPELINE_FORCE_MATCH === 'true'
  if (forceMatch) {
    console.info('[pipeline:match] PIPELINE_FORCE_MATCH: Abgleich ohne frische beide Downloads')
  }

  if (!forceMatch && (!jedeschuleReady || !osmReady)) {
    const reason =
      'Match übersprungen: JedeSchule- und OSM-Download müssen beide erfolgreich sein (Meta `ok: true`).'
    console.warn(`[pipeline:match] ${reason}`)
    const finishedAt = new Date().toISOString()
    await appendRunRecord(projectRoot, {
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      overallOk: true,
      errors: [],
      states: [],
      matchSkipped: true,
      matchSkipReason: reason,
      downloads: downloadSnapshot,
    })
    return { errors: [], matchSkipped: true, matchSkipReason: reason }
  }

  const loaded = await loadSchoolsFromDump(projectRoot)
  if (!loaded.ok) {
    errors.push(loaded.error)
  }
  let osmFc = await readJsonFile<FeatureCollection>(pathOsmFc)
  if (!osmFc || osmFc.type !== 'FeatureCollection') {
    osmFc = await readJsonFile<FeatureCollection>(pathOsmFcLegacy)
  }
  if (!osmFc || osmFc.type !== 'FeatureCollection') {
    errors.push(
      `Fehlend: OSM-GeoJSON unter ${NATIONAL.pipelineOsmGeojson} (pipeline:download:osm); optional Migration: alte Datei schools_osm_de.geojson im datasets-Ordner.`,
    )
  }

  if (errors.length || !loaded.ok || !osmFc || osmFc.type !== 'FeatureCollection') {
    const finishedAt = new Date().toISOString()
    await appendRunRecord(projectRoot, {
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      overallOk: false,
      errors,
      states: [],
      matchSkipped: false,
      downloads: downloadSnapshot,
    })
    return { errors, matchSkipped: false }
  }

  const schoolsRaw = loaded.schools
  const { schools, stats: jedeschuleRecencyStats } = filterJedeschuleSchoolsByRecency(schoolsRaw)
  console.info(
    `[pipeline:jedeschule-recency] removedTooOld=${jedeschuleRecencyStats.removedTooOld} removedMissingTimestamp=${jedeschuleRecencyStats.removedMissingTimestamp} removedUnparseable=${jedeschuleRecencyStats.removedUnparseableTimestamp} kept=${jedeschuleRecencyStats.kept}`,
  )
  const pathStats = nationalPath(projectRoot, NATIONAL.jedeschuleStats)
  const statsRaw = await readJsonFile<unknown>(pathStats)
  let statRows: ReturnType<typeof parseJedeschuleStatsJson> = []
  try {
    if (statsRaw != null) statRows = parseJedeschuleStatsJson(statsRaw)
  } catch {
    statRows = []
  }
  const statByState = new Map(statRows.map((s) => [s.state, s.last_updated] as const))

  const summaryPath = path.join(datasetsDir(projectRoot), 'summary.json')

  let codesToProcess: StateCode[] = [...STATE_ORDER]
  const requested = opts?.onlyStates?.filter((c): c is StateCode =>
    STATE_ORDER.includes(c as StateCode),
  )
  if (requested?.length) {
    const uniq = [...new Set(requested)]
    if (uniq.length < STATE_ORDER.length) {
      const prev = await readJsonFile<SummaryFileOut>(summaryPath)
      const prevCodes = new Set((prev?.states ?? []).map((l) => l.code))
      const complete = STATE_ORDER.every((c) => prevCodes.has(c))
      if (complete) {
        codesToProcess = uniq
      } else {
        console.info(
          '[pipeline:match] summary.json fehlt oder unvollständig – Verarbeitung für alle Bundesländer.',
        )
      }
    } else {
      codesToProcess = uniq
    }
  }

  let dedupeRemovedTotal = 0
  const stateRunEntriesForRecord: {
    code: string
    osmSource: 'live' | 'cached' | 'missing'
    osmSnapshotAt?: string
    counts: {
      matched: number
      official_only: number
      osm_only: number
      ambiguous: number
      official_no_coord: number
    }
  }[] = []

  const summaryUpdates = new Map<string, StateSummaryOut>()

  for (const code of codesToProcess) {
    const officialFcState = officialGeojsonForState(schools, code)
    const gated = gateOfficialFeatureCollection(officialFcState)
    const officials = officialsFromNationalOfficialFc(gated)
    const deduped = dedupeOfficialInputs(officials)
    dedupeRemovedTotal += deduped.stats.removedCount

    const osmStateFc: FeatureCollection = featureCollection(
      osmFc.features.filter((f) => assignPipelineStateToOsmFeature(f) === code),
    )
    const osmSchools = buildOsmSchoolsFromGeoJson(osmStateFc)
    const osmStateByKey = buildOsmStateMap(osmStateFc)
    const { rows } = matchSchools(deduped.officials, osmSchools, { osmStateByKey })
    const enriched = enrichRowsWithPipelineState(rows, osmStateByKey)

    const canonicalOfficialIds = new Set(deduped.officials.map((o) => o.id))
    const officialStateOut: FeatureCollection = featureCollection(
      gated.features
        .filter((f) => {
          const fid = String(f.id ?? (f.properties as { id?: string })?.id ?? '')
          return canonicalOfficialIds.has(fid)
        })
        .map(optimizeOfficialFeatureForUserOutput),
    )
    const osmPointsAndAreas = osmStateFc.features.map(buildOsmUserPointFeatureAndArea)
    const osmStateUser: FeatureCollection = featureCollection(osmPointsAndAreas.map((x) => x.point))
    const osmAreasByKey: Record<string, Feature> = {}
    for (const { areaEntry } of osmPointsAndAreas) {
      if (areaEntry) {
        const [k, feat] = areaEntry
        osmAreasByKey[k] = feat
      }
    }
    const rowsStateUser = enriched.map((r) =>
      optimizeMatchRowForUserOutput(
        r as Record<string, unknown> & {
          osmCentroidLon?: number | null
          osmCentroidLat?: number | null
        },
      ),
    )

    await mkdir(path.join(datasetsDir(projectRoot), code), { recursive: true })
    await writeJson(
      path.join(datasetsDir(projectRoot), code, 'schools_official.geojson'),
      officialStateOut,
    )
    await writeJson(path.join(datasetsDir(projectRoot), code, 'schools_osm.geojson'), osmStateUser)
    await writeJson(
      path.join(datasetsDir(projectRoot), code, 'schools_osm_areas.json'),
      osmAreasByKey,
    )
    await writeJson(
      path.join(datasetsDir(projectRoot), code, 'schools_matches.json'),
      rowsStateUser,
    )

    const osmMetaState: Record<string, unknown> = {
      overpassQueriedAt: osmMeta?.generatedAt,
      overpassResponseTimestamp: osmMeta?.overpassResponseTimestamp,
      interpreterUrl: osmMeta?.interpreterUrl,
      osmSource: osmMeta?.ok ? 'live' : 'missing',
    }
    await writeJson(
      path.join(datasetsDir(projectRoot), code, 'schools_osm.meta.json'),
      osmMetaState,
    )

    const counts = {
      matched: enriched.filter((r) => r.category === 'matched').length,
      official_only: enriched.filter((r) => r.category === 'official_only').length,
      osm_only: enriched.filter((r) => r.category === 'osm_only').length,
      ambiguous: enriched.filter((r) => r.category === 'match_ambiguous').length,
      official_no_coord: enriched.filter((r) => r.category === 'official_no_coord').length,
    }

    const osmSource: 'live' | 'cached' | 'missing' =
      osmMeta?.ok && osmStateFc.features.length > 0 ? 'live' : 'missing'

    summaryUpdates.set(code, {
      code,
      osmSource,
      overpassError: osmMeta?.ok ? undefined : osmMeta?.errorMessage,
      osmSnapshotAt: osmMeta?.overpassResponseTimestamp,
      overpassQueriedAt: osmMeta?.generatedAt,
      counts,
      jedeschuleLastUpdated: statByState.get(code),
    })

    stateRunEntriesForRecord.push({
      code,
      osmSource,
      osmSnapshotAt: osmMeta?.overpassResponseTimestamp ?? osmMeta?.generatedAt,
      counts,
    })
  }

  console.info(
    `[pipeline:match] jedeschule dedupe (summiert über ${codesToProcess.length} Länder): −${dedupeRemovedTotal} with-coord Duplikate entfernt`,
  )

  let merged: SummaryFileOut
  if (codesToProcess.length === STATE_ORDER.length) {
    merged = {
      generatedAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      jedeschuleCsvSource: JEDESCHULE_CSV_SOURCE_LABEL,
      states: STATE_ORDER.flatMap((c) => {
        const row = summaryUpdates.get(c)
        return row ? [row] : []
      }),
    }
  } else {
    const prev = await readJsonFile<SummaryFileOut>(summaryPath)
    const byCode = new Map((prev?.states ?? []).map((l) => [l.code, l] as const))
    for (const c of codesToProcess) {
      const row = summaryUpdates.get(c)
      if (row) byCode.set(c, row)
    }
    const states = STATE_ORDER.map((c) => byCode.get(c)).filter(
      (row): row is StateSummaryOut => row != null,
    )
    if (states.length !== STATE_ORDER.length) {
      errors.push('pipeline:match: summary-Zusammenführung unvollständig')
    }
    merged = {
      generatedAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      jedeschuleCsvSource: JEDESCHULE_CSV_SOURCE_LABEL,
      states,
    }
  }
  await writeJson(summaryPath, merged)

  const finishedAt = new Date().toISOString()
  const durationMs = Math.round(performance.now() - t0)

  await appendRunRecord(projectRoot, {
    startedAt,
    finishedAt,
    durationMs,
    overallOk: errors.length === 0,
    errors,
    states: stateRunEntriesForRecord,
    matchSkipped: false,
    downloads: downloadSnapshot,
  })

  if (codesToProcess.length < STATE_ORDER.length) {
    console.info(`[pipeline:match] ok in ${durationMs}ms (nur ${codesToProcess.join(', ')})`)
  } else {
    console.info(`[pipeline:match] ok in ${durationMs}ms`)
  }
  return { errors, matchSkipped: false }
}

/** @deprecated Use {@link runStateFirstPipeline}; kept for scripts that still import this name. */
export async function runMatchNational(projectRoot: string): Promise<MatchNationResult> {
  const r = await runStateFirstPipeline(projectRoot)
  return {
    errors: r.errors,
    matchSkipped: r.matchSkipped,
    matchSkipReason: r.matchSkipReason,
  }
}

/** @deprecated Split is integrated into {@link runStateFirstPipeline}. */
export async function runSplitStates(
  projectRoot: string,
  opts?: RunSplitStatesOptions,
): Promise<{ errors: string[] }> {
  const r = await runStateFirstPipeline(projectRoot, opts)
  return { errors: r.errors }
}

async function appendRunRecord(
  projectRoot: string,
  record: Record<string, unknown>,
): Promise<void> {
  await mkdir(statusDir(projectRoot), { recursive: true })
  const runsFileName = envScopedJsonFileName('runs.jsonl')
  const runsPath = path.join(statusDir(projectRoot), runsFileName)
  let prior: unknown[] = []
  const runsFile = Bun.file(runsPath)
  if (await runsFile.exists()) {
    const text = await runsFile.text()
    if (text.trim() !== '') prior = parseRunHistoryFileText(text)
  }
  const gitSha = process.env.GITHUB_SHA ?? 'local'
  const newRun = { ...record, gitSha }
  const startedAt = record.startedAt
  const dayKey =
    typeof startedAt === 'string' && startedAt.trim() !== '' ? berlinCalendarDateKey(startedAt) : ''
  const filtered =
    dayKey === ''
      ? prior
      : prior.filter((r) => {
          if (typeof r !== 'object' || r === null) return true
          const s = (r as { startedAt?: unknown }).startedAt
          if (typeof s !== 'string' || s.trim() === '') return true
          return berlinCalendarDateKey(s) !== dayKey
        })
  const nextRuns = [...filtered, newRun].slice(-90)
  await Bun.write(runsPath, stringifyRunHistoryJsonl(nextRuns))
}

export async function runPipelineRebuild(projectRoot: string): Promise<{ errors: string[] }> {
  const r = await runStateFirstPipeline(projectRoot)
  return { errors: r.errors }
}
