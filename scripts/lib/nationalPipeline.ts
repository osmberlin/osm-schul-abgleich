import { createHash } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import simplify from '@turf/simplify'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { berlinCalendarDateKey } from '../../src/lib/berlinCalendarDateKey'
import { schoolsMatchesFileSchema } from '../../src/lib/schemas'
import {
  type LandCode,
  landCodeFromSchoolId,
  STATE_MAP_CENTER,
  STATE_ORDER,
} from '../../src/lib/stateConfig'
import { initBundeslandBoundaries, landCodeForPoint } from './bundeslandBoundaries'
import {
  buildJedeschuleStatsFromDump,
  computeCsvMaxUpdateTimestamp,
  parseJedeschuleStatsJson,
  parseSchoolsFromCsvText,
  serializeJedeschuleStatsCompact,
} from './jedeschuleCsv'
import { JEDESCHULE_WEEKLY_CSV_URL, jedeschuleDumpAbsolutePath } from './jedeschuleDumpConfig'
import {
  buildOsmSchoolsFromGeoJson,
  centroidFromOsmGeometry,
  type MatchRowOut,
  matchSchools,
  type OfficialInput,
} from './match'
import { NATIONAL, nationalPath } from './nationalDatasetPaths'
import { fetchSchoolsOsmOverpassGermanyWithRetries } from './overpassFetch'
import {
  datasetsDir,
  officialGeojsonNational,
  PIPELINE_VERSION,
  readJsonFile,
  schoolToOfficialProps,
  statusDir,
  writeJson,
} from './pipelineCommon'
import { jedeschuleUpstreamDatasetChanged } from './pipelineFreshness'
import type { PipelineSourceMeta } from './pipelineMeta'

function envScopedJsonFileName(fileName: string): string {
  if (process.env.GITHUB_ACTIONS === 'true') return fileName
  return fileName.replace(/\.json$/, '.dev.json')
}

type LandSummaryOut = {
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
  lands: LandSummaryOut[]
}

// 4 decimals ~= 11m latitude resolution; acceptable "about 10m" for Germany.
const USER_FACING_COORD_DECIMALS = 4 as const

/** Douglas–Peucker tolerance in degrees (~N/S meters ≈ tolerance * 111_320). */
const OSM_USER_GEOMETRY_SIMPLIFY_TOLERANCE_DEG = 10 / 111_320

function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}

function roundGeoCoordinates(value: unknown): unknown {
  if (typeof value === 'number') return roundToDecimals(value, USER_FACING_COORD_DECIMALS)
  if (Array.isArray(value)) return value.map(roundGeoCoordinates)
  return value
}

function roundFeatureGeometry(geometry: Feature['geometry'] | null): Feature['geometry'] | null {
  if (!geometry) return geometry
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map((g) => roundFeatureGeometry(g) as NonNullable<typeof g>),
    }
  }
  return {
    ...geometry,
    coordinates: roundGeoCoordinates((geometry as { coordinates: unknown }).coordinates) as never,
  }
}

function optimizeOfficialFeatureForUserOutput(f: Feature): Feature {
  return {
    ...f,
    geometry: roundFeatureGeometry(f.geometry),
  }
}

function simplifyOsmGeometryForUser(
  geometry: Feature['geometry'] | null,
): Feature['geometry'] | null {
  if (!geometry) return geometry
  if (geometry.type === 'GeometryCollection') {
    return {
      type: 'GeometryCollection',
      geometries: geometry.geometries.map((g) => simplifyOsmGeometryForUser(g) as Geometry),
    }
  }
  if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
    return roundFeatureGeometry(geometry)
  }
  try {
    const simplified = simplify(
      { type: 'Feature', properties: {}, geometry },
      {
        tolerance: OSM_USER_GEOMETRY_SIMPLIFY_TOLERANCE_DEG,
        highQuality: false,
      },
    )
    const g = simplified.type === 'Feature' ? simplified.geometry : null
    return roundFeatureGeometry(g ?? geometry)
  } catch {
    return roundFeatureGeometry(geometry)
  }
}

function optimizeOsmFeatureForUserOutput(f: Feature): Feature {
  return {
    type: 'Feature',
    id: f.id,
    properties: null,
    geometry: simplifyOsmGeometryForUser(f.geometry),
  }
}

function optimizeMatchRowForUserOutput(
  row: Record<string, unknown> & { osmCentroidLon?: number | null; osmCentroidLat?: number | null },
): Record<string, unknown> {
  const out = { ...row }
  delete out.pipelineLand
  if (typeof out.osmCentroidLon === 'number') {
    out.osmCentroidLon = roundToDecimals(out.osmCentroidLon, USER_FACING_COORD_DECIMALS)
  }
  if (typeof out.osmCentroidLat === 'number') {
    out.osmCentroidLat = roundToDecimals(out.osmCentroidLat, USER_FACING_COORD_DECIMALS)
  }
  return out
}

function nearestLandByCenter(lon: number, lat: number): LandCode {
  let best: LandCode = 'NI'
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

function assignPipelineLandToOsmFeature(f: Feature): LandCode {
  const c = centroidFromOsmGeometry(f.geometry ?? null)
  if (!c) return nearestLandByCenter(10.45, 51.16)
  const [lon, lat] = c
  return landCodeForPoint(lon, lat) ?? nearestLandByCenter(lon, lat)
}

function tagNationalOsmFc(fc: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      const land = assignPipelineLandToOsmFeature(f)
      const props = {
        ...(typeof f.properties === 'object' && f.properties != null ? f.properties : {}),
        _pipelineLand: land,
      }
      return { ...f, properties: props }
    }),
  }
}

function osmLandKey(osmType: string, osmId: string) {
  return `${osmType}/${osmId}`
}

function buildOsmLandMap(fc: FeatureCollection): Map<string, LandCode> {
  const m = new Map<string, LandCode>()
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
    const land = assignPipelineLandToOsmFeature(f)
    if (osmId) m.set(osmLandKey(osmType, osmId), land)
  }
  return m
}

function enrichRowsWithPipelineLand(
  rows: MatchRowOut[],
  osmLandByKey: Map<string, LandCode>,
): MatchRowOut[] {
  return rows.map((r) => {
    let land: LandCode | undefined
    if (r.officialId) land = landCodeFromSchoolId(r.officialId) ?? undefined
    if (!land && r.osmId && r.osmType)
      land = osmLandByKey.get(osmLandKey(r.osmType, r.osmId)) ?? undefined
    if (!land && r.ambiguousOfficialIds?.length)
      land = landCodeFromSchoolId(r.ambiguousOfficialIds[0]) ?? undefined
    return land ? { ...r, pipelineLand: land } : { ...r }
  })
}

function rowsToJson(rows: MatchRowOut[]) {
  return rows.map((r) => ({
    key: r.key,
    category: r.category,
    matchCategory: r.category,
    matchMode: r.matchMode,
    officialId: r.officialId,
    officialName: r.officialName,
    officialProperties: r.officialProperties,
    osmId: r.osmId,
    osmType: r.osmType,
    osmCentroidLon: r.osmCentroidLon,
    osmCentroidLat: r.osmCentroidLat,
    distanceMeters: r.distanceMeters,
    osmName: r.osmName,
    osmTags: r.osmTags,
    ambiguousOfficialIds: r.ambiguousOfficialIds,
    ambiguousOfficialSnapshots: r.ambiguousOfficialSnapshots,
    matchedByOsmNameNormalized: r.matchedByOsmNameNormalized,
    matchedByOsmNameTag: r.matchedByOsmNameTag,
    pipelineLand: r.pipelineLand,
  }))
}

function officialsFromNationalOfficialFc(fc: FeatureCollection): OfficialInput[] {
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

function rowLandCode(r: {
  officialId: string | null
  pipelineLand?: string
  ambiguousOfficialIds?: string[]
}): LandCode | null {
  if (r.pipelineLand && STATE_ORDER.includes(r.pipelineLand as LandCode))
    return r.pipelineLand as LandCode
  if (r.officialId) return landCodeFromSchoolId(r.officialId)
  if (r.ambiguousOfficialIds?.length) return landCodeFromSchoolId(r.ambiguousOfficialIds[0])
  return null
}

export async function runDownloadJedeschuleNational(projectRoot: string): Promise<void> {
  const outCsv = jedeschuleDumpAbsolutePath(projectRoot)
  const pathOfficial = nationalPath(projectRoot, NATIONAL.schoolsOfficialGeojson)
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
    const schools = parseSchoolsFromCsvText(text, 'jedeschule')
    const csvMaxUpdateTimestamp = computeCsvMaxUpdateTimestamp(schools)
    const upstreamDatasetChanged = jedeschuleUpstreamDatasetChanged(prevMeta, {
      csvSha256,
      httpEtag,
      httpLastModified,
      csvMaxUpdateTimestamp,
    })
    const fc = officialGeojsonNational(schools)
    const stats = buildJedeschuleStatsFromDump(schools)
    await writeJson(pathOfficial, fc)
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
  const pathGeo = nationalPath(projectRoot, NATIONAL.schoolsOsmGeojson)
  const pathMeta = nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOsmMeta))
  const generatedAt = new Date().toISOString()
  await mkdir(datasetsDir(projectRoot), { recursive: true })

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

export async function runMatchNational(projectRoot: string): Promise<MatchNationResult> {
  initBundeslandBoundaries(projectRoot)
  const errors: string[] = []
  const startedAt = new Date().toISOString()
  const t0 = performance.now()

  const pathOfficialMeta = nationalPath(
    projectRoot,
    envScopedJsonFileName(NATIONAL.schoolsOfficialMeta),
  )
  const pathOsmMeta = nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOsmMeta))
  const pathOfficial = nationalPath(projectRoot, NATIONAL.schoolsOfficialGeojson)
  const pathOsm = nationalPath(projectRoot, NATIONAL.schoolsOsmGeojson)
  const pathMatches = nationalPath(projectRoot, NATIONAL.schoolsMatchesJson)

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

  await setSkipSplit(projectRoot, false)

  const forceMatch =
    process.env.PIPELINE_FORCE_MATCH === '1' || process.env.PIPELINE_FORCE_MATCH === 'true'
  if (forceMatch) {
    console.info('[pipeline:match] PIPELINE_FORCE_MATCH: Abgleich ohne frische beide Downloads')
  }

  if (!forceMatch && (!jedeschuleReady || !osmReady)) {
    const reason =
      'Match übersprungen: JedeSchule- und OSM-Download müssen beide erfolgreich sein (Meta `ok: true`).'
    console.warn(`[pipeline:match] ${reason}`)
    await setSkipSplit(projectRoot, true)
    const finishedAt = new Date().toISOString()
    await appendRunRecord(projectRoot, {
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      overallOk: true,
      errors: [],
      lands: [],
      matchSkipped: true,
      matchSkipReason: reason,
      downloads: downloadSnapshot,
    })
    return { errors: [], matchSkipped: true, matchSkipReason: reason }
  }

  const officialFc = await readJsonFile<FeatureCollection>(pathOfficial)
  const osmFc = await readJsonFile<FeatureCollection>(pathOsm)

  if (!officialFc || officialFc.type !== 'FeatureCollection') {
    errors.push(`Fehlend: ${NATIONAL.schoolsOfficialGeojson}`)
  }
  if (!osmFc || osmFc.type !== 'FeatureCollection') {
    errors.push(`Fehlend: ${NATIONAL.schoolsOsmGeojson}`)
  }

  if (errors.length) {
    await setSkipSplit(projectRoot, true)
    const finishedAt = new Date().toISOString()
    await appendRunRecord(projectRoot, {
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      overallOk: false,
      errors,
      lands: [],
      matchSkipped: false,
      downloads: downloadSnapshot,
    })
    return { errors, matchSkipped: false }
  }

  const officials = officialsFromNationalOfficialFc(officialFc)
  const osmSchools = buildOsmSchoolsFromGeoJson(osmFc)
  const osmLandByKey = buildOsmLandMap(osmFc)
  const { rows } = matchSchools(officials, osmSchools, { osmLandByKey })
  const enriched = enrichRowsWithPipelineLand(rows, osmLandByKey)

  await writeJson(pathMatches, rowsToJson(enriched))

  const finishedAt = new Date().toISOString()
  const durationMs = Math.round(performance.now() - t0)

  const noCoordByLand = officialNoCoordUnmatchedByLand(officialFc, enriched)
  const osmHasData = (osmFc.features.length ?? 0) > 0
  const osmSrc: 'live' | 'cached' | 'missing' = osmMeta?.ok && osmHasData ? 'live' : 'missing'

  const landRunEntries = STATE_ORDER.map((code) => {
    const lr = enriched.filter((r) => rowLandCode(r) === code)
    return {
      code,
      osmSource: osmSrc,
      osmSnapshotAt: osmMeta?.overpassResponseTimestamp ?? osmMeta?.generatedAt,
      counts: {
        matched: lr.filter((r) => r.category === 'matched').length,
        official_only: lr.filter((r) => r.category === 'official_only').length,
        osm_only: lr.filter((r) => r.category === 'osm_only').length,
        ambiguous: lr.filter((r) => r.category === 'match_ambiguous').length,
        official_no_coord: noCoordByLand.get(code) ?? 0,
      },
    }
  })

  await appendRunRecord(projectRoot, {
    startedAt,
    finishedAt,
    durationMs,
    overallOk: errors.length === 0,
    errors,
    lands: landRunEntries,
    matchSkipped: false,
    downloads: downloadSnapshot,
  })

  await setSkipSplit(projectRoot, false)

  console.info(`[pipeline:match] ok in ${durationMs}ms`)
  return { errors, matchSkipped: false }
}

/** Distribute national official_no_coord by land (remaining unmatched after fallback). */
function officialNoCoordUnmatchedByLand(
  officialFc: FeatureCollection,
  rows: Pick<MatchRowOut, 'officialId' | 'matchMode'>[],
): Map<LandCode, number> {
  const m = new Map<LandCode, number>()
  for (const code of STATE_ORDER) m.set(code, 0)
  for (const f of officialFc.features) {
    const id = String(f.id ?? (f.properties as { id?: string })?.id ?? '')
    const land = landCodeFromSchoolId(id)
    if (!land) continue
    const g = f.geometry
    const has =
      g?.type === 'Point' &&
      Array.isArray(g.coordinates) &&
      Number.isFinite((g.coordinates as number[])[0] + (g.coordinates as number[])[1])
    if (!has) m.set(land, (m.get(land) ?? 0) + 1)
  }
  for (const row of rows) {
    if (row.matchMode !== 'name' || !row.officialId) continue
    const land = landCodeFromSchoolId(row.officialId)
    if (!land) continue
    m.set(land, Math.max(0, (m.get(land) ?? 0) - 1))
  }
  return m
}

async function setSkipSplit(projectRoot: string, skip: boolean) {
  const p = nationalPath(projectRoot, NATIONAL.skipSplitMarker)
  if (skip) await Bun.write(p, `${new Date().toISOString()}\n`)
  else await unlink(p).catch(() => {})
}

async function appendRunRecord(
  projectRoot: string,
  record: Record<string, unknown>,
): Promise<void> {
  await mkdir(statusDir(projectRoot), { recursive: true })
  const runsFileName = envScopedJsonFileName('runs.json')
  const runsPath = path.join(statusDir(projectRoot), runsFileName)
  const prev = (await readJsonFile<{ runs: unknown[] }>(runsPath)) ?? { runs: [] }
  const gitSha = process.env.GITHUB_SHA ?? 'local'
  const newRun = { ...record, gitSha }
  const startedAt = record.startedAt
  const dayKey =
    typeof startedAt === 'string' && startedAt.trim() !== '' ? berlinCalendarDateKey(startedAt) : ''
  const prior = Array.isArray(prev.runs) ? prev.runs : []
  const filtered =
    dayKey === ''
      ? prior
      : prior.filter((r) => {
          if (typeof r !== 'object' || r === null) return true
          const s = (r as { startedAt?: unknown }).startedAt
          if (typeof s !== 'string' || s.trim() === '') return true
          return berlinCalendarDateKey(s) !== dayKey
        })
  prev.runs = [...filtered, newRun].slice(-90)
  await writeJson(runsPath, prev)
}

export type RunSplitLandsOptions = {
  /** Only rewrite `datasets/{code}/` and patch that land in `summary.json`. Needs a complete existing `summary.json` (falls back to full split). */
  onlyLands?: LandCode[]
}

export async function runSplitLands(
  projectRoot: string,
  opts?: RunSplitLandsOptions,
): Promise<{ errors: string[] }> {
  const errors: string[] = []
  const marker = nationalPath(projectRoot, NATIONAL.skipSplitMarker)
  if (await Bun.file(marker).exists()) {
    console.info('[pipeline:split-lands] übersprungen (kein neuer Match)')
    return { errors: [] }
  }

  const pathOfficial = nationalPath(projectRoot, NATIONAL.schoolsOfficialGeojson)
  const pathOsm = nationalPath(projectRoot, NATIONAL.schoolsOsmGeojson)
  const pathMatches = nationalPath(projectRoot, NATIONAL.schoolsMatchesJson)
  const pathStats = nationalPath(projectRoot, NATIONAL.jedeschuleStats)
  const summaryPath = path.join(datasetsDir(projectRoot), 'summary.json')

  const officialFc = await readJsonFile<FeatureCollection>(pathOfficial)
  const osmFc = await readJsonFile<FeatureCollection>(pathOsm)
  const rawMatches = await readJsonFile(pathMatches)
  const matchParsed = schoolsMatchesFileSchema.safeParse(rawMatches ?? [])

  const statsRaw = await readJsonFile<unknown>(pathStats)
  const statRows = parseJedeschuleStatsJson(statsRaw)

  if (!officialFc?.features || !osmFc?.features) {
    errors.push('split-lands: nationale GeoJSON fehlt')
    return { errors }
  }
  if (!matchParsed.success) {
    errors.push('split-lands: schools_matches_de.json fehlt oder ungültig')
    return { errors }
  }
  const matchRows = matchParsed.data

  initBundeslandBoundaries(projectRoot)

  let codesToProcess: LandCode[] = [...STATE_ORDER]
  const requested = opts?.onlyLands?.filter((c): c is LandCode =>
    STATE_ORDER.includes(c as LandCode),
  )
  if (requested?.length) {
    const uniq = [...new Set(requested)]
    if (uniq.length < STATE_ORDER.length) {
      const prev = await readJsonFile<SummaryFileOut>(summaryPath)
      const prevCodes = new Set((prev?.lands ?? []).map((l) => l.code))
      const complete = STATE_ORDER.every((c) => prevCodes.has(c))
      if (complete) {
        codesToProcess = uniq
      } else {
        console.info(
          '[pipeline:split-lands] summary.json fehlt oder unvollständig – Split für alle Bundesländer.',
        )
      }
    } else {
      codesToProcess = uniq
    }
  }

  const statByState = new Map(statRows.map((s) => [s.state, s.last_updated] as const))
  const noCoordByLand = officialNoCoordUnmatchedByLand(officialFc, matchRows)

  const summaryUpdates = new Map<string, LandSummaryOut>()
  const osmMeta = await readJsonFile<PipelineSourceMeta>(
    nationalPath(projectRoot, envScopedJsonFileName(NATIONAL.schoolsOsmMeta)),
  )

  for (const code of codesToProcess) {
    await mkdir(path.join(datasetsDir(projectRoot), code), { recursive: true })
    const officialLand: FeatureCollection = {
      type: 'FeatureCollection',
      features: officialFc.features
        .filter((f) => {
          const p = f.properties as { land?: string } | null
          return p?.land === code || landCodeFromSchoolId(String(f.id)) === code
        })
        .map(optimizeOfficialFeatureForUserOutput),
    }
    const osmLand: FeatureCollection = {
      type: 'FeatureCollection',
      features: osmFc.features
        .filter((f) => assignPipelineLandToOsmFeature(f) === code)
        .map(optimizeOsmFeatureForUserOutput),
    }
    const rowsLand = matchRows.filter((r) => rowLandCode(r) === code)
    const rowsLandUser = rowsLand.map((r) =>
      optimizeMatchRowForUserOutput(
        r as Record<string, unknown> & {
          osmCentroidLon?: number | null
          osmCentroidLat?: number | null
        },
      ),
    )
    await writeJson(
      path.join(datasetsDir(projectRoot), code, 'schools_official.geojson'),
      officialLand,
    )
    await writeJson(path.join(datasetsDir(projectRoot), code, 'schools_osm.geojson'), osmLand)
    await writeJson(path.join(datasetsDir(projectRoot), code, 'schools_matches.json'), rowsLandUser)

    const osmMetaLand: Record<string, unknown> = {
      overpassQueriedAt: osmMeta?.generatedAt,
      overpassResponseTimestamp: osmMeta?.overpassResponseTimestamp,
      interpreterUrl: osmMeta?.interpreterUrl,
      osmSource: osmMeta?.ok ? 'live' : 'missing',
    }
    await writeJson(path.join(datasetsDir(projectRoot), code, 'schools_osm.meta.json'), osmMetaLand)

    const counts = {
      matched: rowsLand.filter((r) => r.category === 'matched').length,
      official_only: rowsLand.filter((r) => r.category === 'official_only').length,
      osm_only: rowsLand.filter((r) => r.category === 'osm_only').length,
      ambiguous: rowsLand.filter((r) => r.category === 'match_ambiguous').length,
      official_no_coord: noCoordByLand.get(code) ?? 0,
    }

    const osmSource: 'live' | 'cached' | 'missing' =
      osmMeta?.ok && osmLand.features.length > 0 ? 'live' : 'missing'

    summaryUpdates.set(code, {
      code,
      osmSource,
      overpassError: osmMeta?.ok ? undefined : osmMeta?.errorMessage,
      osmSnapshotAt: osmMeta?.overpassResponseTimestamp,
      overpassQueriedAt: osmMeta?.generatedAt,
      counts,
      jedeschuleLastUpdated: statByState.get(code),
    })
  }

  let merged: SummaryFileOut
  if (codesToProcess.length === STATE_ORDER.length) {
    merged = {
      generatedAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      jedeschuleCsvSource: NATIONAL.schoolsOfficialGeojson,
      lands: STATE_ORDER.flatMap((c) => {
        const row = summaryUpdates.get(c)
        return row ? [row] : []
      }),
    }
  } else {
    const prev = await readJsonFile<SummaryFileOut>(summaryPath)
    const byCode = new Map((prev?.lands ?? []).map((l) => [l.code, l] as const))
    for (const c of codesToProcess) {
      const row = summaryUpdates.get(c)
      if (row) byCode.set(c, row)
    }
    const lands = STATE_ORDER.map((c) => byCode.get(c)).filter(
      (row): row is LandSummaryOut => row != null,
    )
    if (lands.length !== STATE_ORDER.length) {
      errors.push('split-lands: summary-Zusammenführung unvollständig')
    }
    merged = {
      generatedAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      jedeschuleCsvSource: NATIONAL.schoolsOfficialGeojson,
      lands,
    }
  }
  await writeJson(summaryPath, merged)
  if (codesToProcess.length < STATE_ORDER.length) {
    console.info(`[pipeline:split-lands] ok (nur ${codesToProcess.join(', ')})`)
  } else {
    console.info('[pipeline:split-lands] ok')
  }
  return { errors }
}

export async function runPipelineRebuild(projectRoot: string): Promise<{ errors: string[] }> {
  const m = await runMatchNational(projectRoot)
  if (m.matchSkipped) return { errors: m.errors }
  const s = await runSplitLands(projectRoot)
  return { errors: [...m.errors, ...s.errors] }
}
