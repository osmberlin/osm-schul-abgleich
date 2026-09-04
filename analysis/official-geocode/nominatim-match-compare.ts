#!/usr/bin/env bun
import { parseOfficialPointsMap } from '../../scripts/lib/applyOfficialGeocodeOverlay'
import { initBundeslandBoundaries } from '../../scripts/lib/bundeslandBoundaries'
import { dedupeOfficialInputs } from '../../scripts/lib/dedupeOfficialInputs'
import {
  filterJedeschuleSchoolsByRecency,
  parseSchoolsFromCsvText,
  type JedeschuleSchool,
} from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { buildOsmSchoolsFromGeoJson, matchSchools, type MatchRowOut } from '../../scripts/lib/match'
import { NATIONAL, nationalPath } from '../../scripts/lib/nationalDatasetPaths'
import { officialsFromNationalOfficialFc } from '../../scripts/lib/nationalPipeline'
import { gateOfficialFeatureCollection } from '../../scripts/lib/officialCoordsBundeslandGate'
import { officialGeojsonForState } from '../../scripts/lib/pipelineCommon'
import { MATCH_RADIUS_M } from '../../src/lib/matchRadius'
import {
  officialStateCode,
  STATE_LABEL_DE,
  STATE_ORDER,
  type StateCode,
} from '../../src/lib/stateConfig'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import type { Feature, FeatureCollection } from 'geojson'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '../..')
const POINTS_PATH = path.join(ROOT, 'data', 'official-geocode', 'points.json')
const OUT_PATH = path.join(import.meta.dirname, 'nominatim-match-compare.md')
const SAMPLE_LIMIT = 25
const NAME_WEB_ADDR_MODES = new Set(['name', 'name_prefix', 'website', 'address'])

type LonLat = [number, number]
type PointsMap = Map<string, LonLat>

type BucketCounts = {
  samePartner: number
  differentPartner: number
  baselineMatchedGeoUnmatched: number
  geoMatchedBaselineUnmatched: number
  overlayMissing: number
  neitherMatched: number
}

type SampleRow = {
  officialId: string
  state: string
  officialName: string
  baselineOsm: string
  geoOsm: string
  metres: string
  baselineMode: string
  geoMode: string
}

function mdCell(s: string | number) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]) {
  const h = `| ${headers.map(mdCell).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')
  return [h, sep, body].join('\n')
}

function pct(part: number, total: number) {
  if (total <= 0) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function hasFiniteGeo(s: JedeschuleSchool) {
  return Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
}

function stateOfSchool(s: JedeschuleSchool) {
  return officialStateCode({ state: s.state })
}

function emptyBuckets() {
  return {
    samePartner: 0,
    differentPartner: 0,
    baselineMatchedGeoUnmatched: 0,
    geoMatchedBaselineUnmatched: 0,
    overlayMissing: 0,
    neitherMatched: 0,
  }
}

function osmPartnerKey(row: MatchRowOut | undefined) {
  if (row == null || row.osmType == null || row.osmId == null) return null
  return `${row.osmType}/${row.osmId}`
}

function featureOfficialId(f: Feature) {
  if (typeof f.id === 'string' && f.id !== '') return f.id
  const id = f.properties?.id
  if (typeof id === 'string' && id !== '') return id
  return ''
}

function parsePointsJson(raw: unknown) {
  return new Map(parseOfficialPointsMap(raw, 'points.json'))
}

function osmFcForState(fc: FeatureCollection, code: StateCode) {
  return {
    type: 'FeatureCollection' as const,
    features: fc.features.filter((f) => f.properties?._pipelineState === code),
  }
}

function osmStateByKeyForLand(osmFc: FeatureCollection, code: StateCode) {
  const m = new Map<string, StateCode>()
  const schools = buildOsmSchoolsFromGeoJson(osmFc)
  for (const o of schools) {
    m.set(`${o.osmType}/${o.osmId}`, code)
  }
  return m
}

function applyOverlay(fc: FeatureCollection, points: PointsMap) {
  return {
    type: 'FeatureCollection' as const,
    features: fc.features.map((f) => {
      if (f.geometry != null) return f
      const id = featureOfficialId(f)
      const ll = id ? points.get(id) : undefined
      if (!ll) return f
      return {
        ...f,
        geometry: { type: 'Point', coordinates: [ll[0], ll[1]] },
      }
    }),
  }
}

function indexMatched(rows: MatchRowOut[]) {
  const m = new Map<string, MatchRowOut>()
  for (const r of rows) {
    if (r.category === 'matched' && r.officialId) m.set(r.officialId, r)
  }
  return m
}

function metresNominatimToOsm(overlay: LonLat | undefined, row: MatchRowOut | undefined) {
  if (!overlay || row == null) return null
  if (typeof row.osmCentroidLon !== 'number' || typeof row.osmCentroidLat !== 'number') return null
  if (!Number.isFinite(row.osmCentroidLon) || !Number.isFinite(row.osmCentroidLat)) return null
  const km = distance(point(overlay), point([row.osmCentroidLon, row.osmCentroidLat]), {
    units: 'kilometers',
  })
  return km * 1000
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return null
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  const a = sorted[lo]
  const b = sorted[hi]
  if (a == null) return null
  if (lo === hi || b == null) return a
  return a * (hi - idx) + b * (idx - lo)
}

function fmtMetres(n: number | null) {
  if (n == null || !Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

function sampleToCells(s: SampleRow) {
  return [
    s.state,
    s.officialId,
    s.officialName,
    s.baselineOsm,
    s.geoOsm,
    s.metres,
    s.baselineMode,
    s.geoMode,
  ]
}

async function main() {
  const pointsFile = Bun.file(POINTS_PATH)
  if (!(await pointsFile.exists())) {
    console.error(
      `Missing ${path.relative(ROOT, POINTS_PATH)}. Run bun run analysis:official-geocode:nominatim first.`,
    )
    process.exit(1)
  }
  const osmPath = nationalPath(ROOT, NATIONAL.pipelineOsmGeojson)
  const osmFile = Bun.file(osmPath)
  if (!(await osmFile.exists())) {
    console.error(`Missing OSM extract: ${path.relative(ROOT, osmPath)}`)
    process.exit(1)
  }
  const csvPath = jedeschuleDumpAbsolutePath(ROOT)
  const csvFile = Bun.file(csvPath)
  if (!(await csvFile.exists())) {
    console.error(`JedeSchule CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const points = parsePointsJson(await pointsFile.json())
  const osmFc = (await osmFile.json()) as FeatureCollection
  const rawSchools = parseSchoolsFromCsvText(await csvFile.text(), csvPath)
  const { schools } = filterJedeschuleSchoolsByRecency(rawSchools)
  const schoolById = new Map(schools.map((s) => [s.id, s]))
  const noGeoIds = new Set(schools.filter((s) => !hasFiniteGeo(s)).map((s) => s.id))
  const universe = new Set<string>([...noGeoIds, ...points.keys()])

  initBundeslandBoundaries(ROOT)

  const bucketsByState = new Map<StateCode, BucketCounts>()
  for (const c of STATE_ORDER) bucketsByState.set(c, emptyBuckets())

  const disagreementSamples: SampleRow[] = []
  const geoMissedSamples: SampleRow[] = []
  const niDistances: number[] = []

  for (const code of STATE_ORDER) {
    const officialFc = officialGeojsonForState(schools, code)
    const baselineOfficials = dedupeOfficialInputs(
      officialsFromNationalOfficialFc(gateOfficialFeatureCollection(officialFc)),
    ).officials
    const osmLand = osmFcForState(osmFc, code)
    const osmSchools = buildOsmSchoolsFromGeoJson(osmLand)
    const osmStateByKey = osmStateByKeyForLand(osmLand, code)
    const baselineRows = matchSchools(baselineOfficials, osmSchools, { osmStateByKey }).rows
    const baselineMatched = indexMatched(baselineRows)

    const geoFc = applyOverlay(officialGeojsonForState(schools, code), points)
    const geoOfficials = dedupeOfficialInputs(
      officialsFromNationalOfficialFc(gateOfficialFeatureCollection(geoFc)),
    ).officials
    const geoRows = matchSchools(geoOfficials, osmSchools, { osmStateByKey }).rows
    const geoMatched = indexMatched(geoRows)

    const buckets = bucketsByState.get(code)!
    for (const id of universe) {
      const school = schoolById.get(id)
      const st = school ? stateOfSchool(school) : officialStateCode({ state: id.slice(0, 2) })
      if (st !== code) continue
      const overlay = points.get(id)
      const base = baselineMatched.get(id)
      const geo = geoMatched.get(id)
      const name = school?.name ?? base?.officialName ?? geo?.officialName ?? ''
      const metres = metresNominatimToOsm(overlay, base ?? geo)
      const sample: SampleRow = {
        officialId: id,
        state: code,
        officialName: name,
        baselineOsm: osmPartnerKey(base) ?? '—',
        geoOsm: osmPartnerKey(geo) ?? '—',
        metres: fmtMetres(metres),
        baselineMode: base?.matchMode ?? '—',
        geoMode: geo?.matchMode ?? '—',
      }

      if (overlay == null) {
        buckets.overlayMissing++
        continue
      }
      const baseKey = osmPartnerKey(base)
      const geoKey = osmPartnerKey(geo)
      if (baseKey && geoKey) {
        if (baseKey === geoKey) {
          buckets.samePartner++
        } else {
          buckets.differentPartner++
          if (disagreementSamples.length < SAMPLE_LIMIT) disagreementSamples.push(sample)
        }
      } else if (baseKey && !geoKey) {
        buckets.baselineMatchedGeoUnmatched++
        if (geoMissedSamples.length < SAMPLE_LIMIT) geoMissedSamples.push(sample)
      } else if (!baseKey && geoKey) {
        buckets.geoMatchedBaselineUnmatched++
      } else {
        buckets.neitherMatched++
      }

      if (
        code === 'NI' &&
        overlay != null &&
        base != null &&
        base.matchMode != null &&
        NAME_WEB_ADDR_MODES.has(base.matchMode)
      ) {
        const d = metresNominatimToOsm(overlay, base)
        if (d != null) niDistances.push(d)
      }
    }
  }

  niDistances.sort((a, b) => a - b)
  const niN = niDistances.length
  const niP50 = percentile(niDistances, 50)
  const niP90 = percentile(niDistances, 90)
  const shareOver = (threshold: number) =>
    niN === 0 ? '—' : pct(niDistances.filter((d) => d > threshold).length, niN)

  const bucketTable = STATE_ORDER.map((code) => {
    const b = bucketsByState.get(code)!
    return [
      code,
      STATE_LABEL_DE[code],
      String(b.samePartner),
      String(b.differentPartner),
      String(b.baselineMatchedGeoUnmatched),
      String(b.geoMatchedBaselineUnmatched),
      String(b.overlayMissing),
      String(b.neitherMatched),
    ]
  })

  const sampleHeaders = [
    'State',
    'Official id',
    'Name',
    'Baseline OSM',
    'Geo OSM',
    'Nominatim→OSM m',
    'Baseline mode',
    'Geo mode',
  ]

  const gen = new Date().toISOString()
  const md = [
    '# Nominatim overlay vs baseline match',
    '',
    '**Script:** [`analysis/official-geocode/nominatim-match-compare.ts`](./nominatim-match-compare.ts)',
    '',
    `**Overlay:** \`${path.relative(ROOT, POINTS_PATH)}\` (${points.size} points)`,
    '',
    `**OSM extract:** \`${path.relative(ROOT, osmPath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    'Universe: recency-filtered officials with no coordinates, plus ids present in `points.json`.',
    'Baseline match uses official GeoJSON as downloaded; geo pass fills null geometries from the Nominatim overlay, then gates, dedupes, and matches again.',
    '',
    '## Per-state buckets',
    '',
    mdTable(
      [
        'State',
        'Name',
        'Same OSM partner',
        'Different OSM partner',
        'Baseline matched, geo unmatched',
        'Geo matched, baseline unmatched',
        'Overlay missing',
        'Neither matched',
      ],
      bucketTable,
    ),
    '',
    `## Niedersachsen distance histogram (name / website / address baseline matches)`,
    '',
    `Baseline \`matchMode\` in \`name\`, \`name_prefix\`, \`website\`, \`address\`, and overlay has a point. Distance is Nominatim point to OSM centroid. Matcher radius is ${MATCH_RADIUS_M} m.`,
    '',
    mdTable(
      ['Metric', 'Value'],
      [
        ['n', String(niN)],
        ['p50 (m)', niP50 == null ? '—' : niP50.toFixed(1)],
        ['p90 (m)', niP90 == null ? '—' : niP90.toFixed(1)],
        [`Share > ${MATCH_RADIUS_M} m`, shareOver(MATCH_RADIUS_M)],
        ['Share > 300 m', shareOver(300)],
        ['Share > 500 m', shareOver(500)],
      ],
    ),
    '',
    '## Sample: different OSM partner (up to 25)',
    '',
    disagreementSamples.length > 0
      ? mdTable(sampleHeaders, disagreementSamples.map(sampleToCells))
      : '_None._',
    '',
    '## Sample: baseline matched, geo unmatched (up to 25)',
    '',
    geoMissedSamples.length > 0
      ? mdTable(sampleHeaders, geoMissedSamples.map(sampleToCells))
      : '_None._',
    '',
  ].join('\n')

  await writeFile(OUT_PATH, md, 'utf8')
  console.info(`[official-geocode:compare] wrote ${path.relative(ROOT, OUT_PATH)}`)
}

await main()
