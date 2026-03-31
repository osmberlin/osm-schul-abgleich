import centroid from '@turf/centroid'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'

import { MATCH_RADIUS_KM } from '../../src/lib/matchRadius'
import { OSM_SCHOOL_NAME_TAGS_IN_ORDER, type OsmNameMatchTag } from '../../src/lib/osmNameMatchTags'
import type { LandCode } from '../../src/lib/stateConfig'
import { landCodeFromSchoolId } from '../../src/lib/stateConfig'
import { normalizeSchoolNameForMatch } from './schoolNameNormalize'

export { MATCH_RADIUS_KM }
export { normalizeSchoolNameForMatch } from './schoolNameNormalize'

export type { OsmNameMatchTag }

/**
 * Normalized comparison keys from `name`, `name:de`, and `official_name`.
 * If two tags normalize to the same key, the earlier in {@link OSM_SCHOOL_NAME_TAGS_IN_ORDER} wins.
 */
export function normalizedOsmNameVariantMap(
  tags: Record<string, string>,
): Map<string, OsmNameMatchTag> {
  const out = new Map<string, OsmNameMatchTag>()
  for (const tag of OSM_SCHOOL_NAME_TAGS_IN_ORDER) {
    const raw = tags[tag]
    if (raw == null || String(raw).trim() === '') continue
    const key = normalizeSchoolNameForMatch(raw)
    if (!key) continue
    if (!out.has(key)) out.set(key, tag)
  }
  return out
}

/**
 * Non-empty trimmed values, one entry per present tag, in {@link OSM_SCHOOL_NAME_TAGS_IN_ORDER}.
 * Matching still uses {@link normalizedOsmNameVariantMap} (all tags, normalized); this is only for UI strings.
 */
export function osmDisplayNameCandidatesFromTags(tags: Record<string, string>): string[] {
  const out: string[] = []
  for (const tag of OSM_SCHOOL_NAME_TAGS_IN_ORDER) {
    const raw = tags[tag]?.trim()
    if (raw) out.push(raw)
  }
  return out
}

/** First entry of {@link osmDisplayNameCandidatesFromTags} for `OsmSchoolInput.name` / row `osmName` (lists, map). */
export function primaryOsmDisplayNameFromTags(tags: Record<string, string>): string | null {
  const c = osmDisplayNameCandidatesFromTags(tags)
  return c[0] ?? null
}

export type OfficialInput = {
  id: string
  name: string
  lon: number
  lat: number
  properties: Record<string, unknown>
}

export type OsmSchoolInput = {
  osmType: 'way' | 'relation' | 'node'
  osmId: string
  name: string | null
  tags: Record<string, string>
  geometry: Geometry | null
  centroid: [number, number]
}

/** Official record snapshot per ambiguous candidate (stored with the match; even if the ID is absent from state GeoJSON). */
export type AmbiguousOfficialSnapshot = {
  id: string
  name: string
  properties: Record<string, unknown>
}

export type MatchRowOut = {
  key: string
  category: 'matched' | 'official_only' | 'osm_only' | 'match_ambiguous'
  matchMode?: 'distance' | 'distance_and_name' | 'name'
  officialId: string | null
  officialName: string | null
  officialProperties: Record<string, unknown> | null
  osmId: string | null
  osmType: 'way' | 'relation' | 'node' | null
  /** OSM geometry centroid [lon, lat]; distance vs official data uses this point. */
  osmCentroidLon: number | null
  osmCentroidLat: number | null
  distanceMeters: number | null
  osmName: string | null
  osmTags: Record<string, string> | null
  ambiguousOfficialIds?: string[]
  ambiguousOfficialSnapshots?: AmbiguousOfficialSnapshot[]
  /** Normalized string used for OSM↔official name equality (see pipeline). */
  matchedByOsmNameNormalized?: string
  /** OSM tag whose value aligned with `matchedByOsmNameNormalized` for name-based matches. */
  matchedByOsmNameTag?: OsmNameMatchTag
  /** Federal state code for national pipeline split (optional). */
  pipelineLand?: string
}

function snapshotsFromOfficials(offs: OfficialInput[]): AmbiguousOfficialSnapshot[] {
  return offs.map((off) => ({
    id: off.id,
    name: off.name,
    properties: off.properties,
  }))
}

/** Name-based fallback only considers official IDs from the same federal state as the OSM school. */
function officialsInSameLandAsOsm(officials: OfficialInput[], osmLand: LandCode): OfficialInput[] {
  return officials.filter((off) => landCodeFromSchoolId(off.id) === osmLand)
}

function osmLandKey(o: OsmSchoolInput): string {
  return `${o.osmType}/${o.osmId}`
}

/** Officials within match radius (same land); `excludeReserved` optional filter. */
function officialsNearOsm(
  o: OsmSchoolInput,
  withCoord: OfficialInput[],
  osmLand: LandCode,
  excludeReserved?: Set<string>,
): OfficialInput[] {
  const [lon, lat] = o.centroid
  return withCoord.filter((off) => {
    if (excludeReserved?.has(off.id)) return false
    const offLand = landCodeFromSchoolId(off.id)
    if (offLand != null && offLand !== osmLand) return false
    const d = distance(point([off.lon, off.lat]), point([lon, lat]), { units: 'kilometers' })
    return d <= MATCH_RADIUS_KM
  })
}

/** Exactly one official in `officials` matches any normalized OSM name tag; otherwise null. */
function uniqueNameOfficialIn(officials: OfficialInput[], o: OsmSchoolInput): OfficialInput | null {
  const variantMap = normalizedOsmNameVariantMap(o.tags)
  if (variantMap.size === 0) return null
  const matches = officials.filter((x) => variantMap.has(normalizeSchoolNameForMatch(x.name)))
  if (matches.length !== 1) return null
  return matches[0]
}

function isPolyGeom(g: Geometry | null): g is Polygon | MultiPolygon {
  if (!g) return false
  return g.type === 'Polygon' || g.type === 'MultiPolygon'
}

export function centroidFromOsmGeometry(geom: Geometry | null): [number, number] | null {
  if (!geom) return null
  if (geom.type === 'Point') {
    return [geom.coordinates[0], geom.coordinates[1]]
  }
  if (!isPolyGeom(geom)) return null
  try {
    const f: Feature<Polygon | MultiPolygon> = { type: 'Feature', properties: {}, geometry: geom }
    const c = centroid(f)
    const [lon, lat] = c.geometry.coordinates
    return [lon, lat]
  } catch {
    return null
  }
}

export function buildOsmSchoolsFromGeoJson(fc: FeatureCollection): OsmSchoolInput[] {
  const out: OsmSchoolInput[] = []
  for (const f of fc.features) {
    if (f.geometry == null) continue
    const idRaw = f.id
    let osmType: OsmSchoolInput['osmType'] = 'way'
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
      } else {
        osmId = String(idRaw)
      }
    } else if (typeof idRaw === 'number') {
      osmId = String(idRaw)
    }
    const p = f.properties ?? {}
    const tags: Record<string, string> = {}
    for (const [k, v] of Object.entries(p)) {
      if (v == null || typeof v === 'object') continue
      if (k.startsWith('_pipeline')) continue
      tags[k] = String(v)
    }
    const name = primaryOsmDisplayNameFromTags(tags)
    const c = centroidFromOsmGeometry(f.geometry)
    if (!c) continue
    if (!osmId && p.id != null) osmId = String(p.id)
    if (!osmId) continue
    out.push({
      osmType,
      osmId,
      name,
      tags,
      geometry: f.geometry,
      centroid: c,
    })
  }
  return out
}

export type MatchSchoolsOptions = {
  /**
   * Federal state per OSM feature (`way/123`, …). Only officials whose JedeSchule ID prefix matches that
   * state participate in distance-radius matching and in the no-coordinates name fallback. Every
   * `osmSchools` entry must have a map entry.
   */
  osmLandByKey: Map<string, LandCode>
}

export function matchSchools(
  officials: OfficialInput[],
  osmSchools: OsmSchoolInput[],
  opts: MatchSchoolsOptions,
) {
  const withCoord = officials.filter((o) => Number.isFinite(o.lon) && Number.isFinite(o.lat))
  const withoutCoord = officials.filter((o) => !Number.isFinite(o.lon) || !Number.isFinite(o.lat))
  /** Officials already paired with an OSM school — an official id appears on at most one `matched` row. */
  const reserved = new Set<string>()
  /** Officials listed on any ambiguous row — excluded from `official_only` when still unresolved. */
  const ambiguousAllIds = new Set<string>()
  const rows: MatchRowOut[] = []

  const fullCandsByOsm = new Map<string, OfficialInput[]>()
  for (const o of osmSchools) {
    const landKey = osmLandKey(o)
    const osmLand = opts.osmLandByKey.get(landKey)
    if (osmLand === undefined) {
      throw new Error(`matchSchools: osmLandByKey missing entry "${landKey}"`)
    }
    fullCandsByOsm.set(landKey, officialsNearOsm(o, withCoord, osmLand))
  }

  /** Global pass: unique distance+name among ≥2 nearby officials — closest matches claim officials first. */
  type Phase1Proposal = {
    landKey: string
    o: OsmSchoolInput
    winner: OfficialInput
    distKm: number
    nameKey: string
    osmNameTag: OsmNameMatchTag | undefined
  }
  const phase1Proposals: Phase1Proposal[] = []
  for (const o of osmSchools) {
    const landKey = osmLandKey(o)
    const full = fullCandsByOsm.get(landKey) ?? []
    if (full.length < 2) continue
    const winner = uniqueNameOfficialIn(full, o)
    if (!winner) continue
    const [lon, lat] = o.centroid
    const distKm = distance(point([winner.lon, winner.lat]), point([lon, lat]), {
      units: 'kilometers',
    })
    const winnerNorm = normalizeSchoolNameForMatch(winner.name)!
    const variantMap = normalizedOsmNameVariantMap(o.tags)
    phase1Proposals.push({
      landKey,
      o,
      winner,
      distKm,
      nameKey: winnerNorm,
      osmNameTag: variantMap.get(winnerNorm),
    })
  }
  phase1Proposals.sort((a, b) => a.distKm - b.distKm || a.landKey.localeCompare(b.landKey, 'en'))
  const phase1RowByLandKey = new Map<string, MatchRowOut>()
  const consumedOsmInPhase1 = new Set<string>()
  for (const p of phase1Proposals) {
    if (consumedOsmInPhase1.has(p.landKey)) continue
    if (reserved.has(p.winner.id)) continue
    reserved.add(p.winner.id)
    consumedOsmInPhase1.add(p.landKey)
    const [lon, lat] = p.o.centroid
    const dM = p.distKm * 1000
    phase1RowByLandKey.set(p.landKey, {
      key: `match-${p.winner.id}`,
      category: 'matched',
      matchMode: 'distance_and_name',
      officialId: p.winner.id,
      officialName: p.winner.name,
      officialProperties: p.winner.properties,
      osmId: p.o.osmId,
      osmType: p.o.osmType,
      osmCentroidLon: lon,
      osmCentroidLat: lat,
      distanceMeters: Math.round(dM),
      osmName: p.o.name,
      osmTags: p.o.tags,
      matchedByOsmNameNormalized: p.nameKey,
      matchedByOsmNameTag: p.osmNameTag,
    })
  }

  for (const o of osmSchools) {
    const [lon, lat] = o.centroid
    const landKey = osmLandKey(o)
    const osmLand = opts.osmLandByKey.get(landKey)
    if (osmLand === undefined) {
      throw new Error(`matchSchools: osmLandByKey missing entry "${landKey}"`)
    }
    const phase1Row = phase1RowByLandKey.get(landKey)
    if (phase1Row) {
      rows.push(phase1Row)
      continue
    }

    const fullAtStart = fullCandsByOsm.get(landKey) ?? []
    const cands = officialsNearOsm(o, withCoord, osmLand, reserved)

    if (cands.length === 0) {
      rows.push({
        key: `osm-${o.osmType}-${o.osmId}`,
        category: 'osm_only',
        officialId: null,
        officialName: null,
        officialProperties: null,
        osmId: o.osmId,
        osmType: o.osmType,
        osmCentroidLon: lon,
        osmCentroidLat: lat,
        distanceMeters: null,
        osmName: o.name,
        osmTags: o.tags,
      })
      continue
    }

    if (cands.length === 1) {
      const off = cands[0]
      const dM =
        distance(point([off.lon, off.lat]), point([lon, lat]), { units: 'kilometers' }) * 1000
      if (fullAtStart.length >= 2) {
        const nameWin = uniqueNameOfficialIn(fullAtStart, o)
        if (nameWin == null) {
          for (const x of cands) {
            ambiguousAllIds.add(x.id)
          }
          rows.push({
            key: `ambig-${o.osmType}-${o.osmId}`,
            category: 'match_ambiguous',
            officialId: null,
            officialName: null,
            officialProperties: null,
            osmId: o.osmId,
            osmType: o.osmType,
            osmCentroidLon: lon,
            osmCentroidLat: lat,
            distanceMeters: Math.round(dM),
            osmName: o.name,
            osmTags: o.tags,
            ambiguousOfficialIds: cands.map((x) => x.id),
            ambiguousOfficialSnapshots: snapshotsFromOfficials(cands),
          })
          continue
        }
        if (nameWin.id !== off.id) {
          for (const x of cands) {
            ambiguousAllIds.add(x.id)
          }
          rows.push({
            key: `ambig-${o.osmType}-${o.osmId}`,
            category: 'match_ambiguous',
            officialId: null,
            officialName: null,
            officialProperties: null,
            osmId: o.osmId,
            osmType: o.osmType,
            osmCentroidLon: lon,
            osmCentroidLat: lat,
            distanceMeters: Math.round(dM),
            osmName: o.name,
            osmTags: o.tags,
            ambiguousOfficialIds: cands.map((x) => x.id),
            ambiguousOfficialSnapshots: snapshotsFromOfficials(cands),
          })
          continue
        }
        reserved.add(off.id)
        const offNorm = normalizeSchoolNameForMatch(off.name)!
        const variantMapSingle = normalizedOsmNameVariantMap(o.tags)
        rows.push({
          key: `match-${off.id}`,
          category: 'matched',
          matchMode: 'distance_and_name',
          officialId: off.id,
          officialName: off.name,
          officialProperties: off.properties,
          osmId: o.osmId,
          osmType: o.osmType,
          osmCentroidLon: lon,
          osmCentroidLat: lat,
          distanceMeters: Math.round(dM),
          osmName: o.name,
          osmTags: o.tags,
          matchedByOsmNameNormalized: offNorm,
          matchedByOsmNameTag: variantMapSingle.get(offNorm),
        })
        continue
      }
      if (ambiguousAllIds.has(off.id)) {
        rows.push({
          key: `osm-${o.osmType}-${o.osmId}`,
          category: 'osm_only',
          officialId: null,
          officialName: null,
          officialProperties: null,
          osmId: o.osmId,
          osmType: o.osmType,
          osmCentroidLon: lon,
          osmCentroidLat: lat,
          distanceMeters: null,
          osmName: o.name,
          osmTags: o.tags,
        })
        continue
      }
      reserved.add(off.id)
      rows.push({
        key: `match-${off.id}`,
        category: 'matched',
        matchMode: 'distance',
        officialId: off.id,
        officialName: off.name,
        officialProperties: off.properties,
        osmId: o.osmId,
        osmType: o.osmType,
        osmCentroidLon: lon,
        osmCentroidLat: lat,
        distanceMeters: Math.round(dM),
        osmName: o.name,
        osmTags: o.tags,
      })
      continue
    }

    const withDist = cands.map((off) => ({
      off,
      distKm: distance(point([off.lon, off.lat]), point([lon, lat]), { units: 'kilometers' }),
    }))
    withDist.sort((a, b) => a.distKm - b.distKm)
    const closestKm = withDist[0].distKm

    const variantMapMulti = normalizedOsmNameVariantMap(o.tags)
    if (variantMapMulti.size > 0) {
      const nameMatches = withDist.filter((x) =>
        variantMapMulti.has(normalizeSchoolNameForMatch(x.off.name)),
      )
      if (nameMatches.length === 1) {
        const win = nameMatches[0]
        const winner = win.off
        reserved.add(winner.id)
        const dM = win.distKm * 1000
        const offNorm = normalizeSchoolNameForMatch(winner.name)!
        rows.push({
          key: `match-${winner.id}`,
          category: 'matched',
          matchMode: 'distance_and_name',
          officialId: winner.id,
          officialName: winner.name,
          officialProperties: winner.properties,
          osmId: o.osmId,
          osmType: o.osmType,
          osmCentroidLon: lon,
          osmCentroidLat: lat,
          distanceMeters: Math.round(dM),
          osmName: o.name,
          osmTags: o.tags,
          matchedByOsmNameNormalized: offNorm,
          matchedByOsmNameTag: variantMapMulti.get(offNorm),
        })
        continue
      }
    }

    for (const x of withDist) {
      ambiguousAllIds.add(x.off.id)
    }

    rows.push({
      key: `ambig-${o.osmType}-${o.osmId}`,
      category: 'match_ambiguous',
      officialId: null,
      officialName: null,
      officialProperties: null,
      osmId: o.osmId,
      osmType: o.osmType,
      osmCentroidLon: lon,
      osmCentroidLat: lat,
      distanceMeters: Math.round(closestKm * 1000),
      osmName: o.name,
      osmTags: o.tags,
      ambiguousOfficialIds: withDist.map((x) => x.off.id),
      ambiguousOfficialSnapshots: snapshotsFromOfficials(withDist.map((x) => x.off)),
    })
  }

  for (const off of withCoord) {
    if (reserved.has(off.id) || ambiguousAllIds.has(off.id)) continue
    rows.push({
      key: `official-${off.id}`,
      category: 'official_only',
      officialId: off.id,
      officialName: off.name,
      officialProperties: off.properties,
      osmId: null,
      osmType: null,
      osmCentroidLon: null,
      osmCentroidLat: null,
      distanceMeters: null,
      osmName: null,
      osmTags: null,
    })
  }

  const noCoordByName = new Map<string, OfficialInput[]>()
  for (const off of withoutCoord) {
    const key = normalizeSchoolNameForMatch(off.name)
    if (!key) continue
    const arr = noCoordByName.get(key)
    if (arr) arr.push(off)
    else noCoordByName.set(key, [off])
  }

  const osmOnlyByName = new Map<string, number[]>()
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    if (row.category !== 'osm_only') continue
    const tags = row.osmTags
    const keys =
      tags && Object.keys(tags).length > 0
        ? [...normalizedOsmNameVariantMap(tags).keys()]
        : (() => {
            const k = normalizeSchoolNameForMatch(row.osmName)
            return k ? [k] : []
          })()
    for (const normKey of keys) {
      const arr = osmOnlyByName.get(normKey)
      if (arr) arr.push(idx)
      else osmOnlyByName.set(normKey, [idx])
    }
  }

  const noCoordMatched = new Set<string>()
  for (const [key, officialsWithNameAll] of noCoordByName.entries()) {
    const osmIdxs = osmOnlyByName.get(key)
    if (!osmIdxs) continue
    if (osmIdxs.length !== 1) continue
    const targetIdx = osmIdxs[0]
    const base = rows[targetIdx]
    const nameLandKey = `${base.osmType}/${base.osmId}`
    const osmLandName = opts.osmLandByKey.get(nameLandKey)
    if (osmLandName === undefined) {
      throw new Error(`matchSchools: osmLandByKey missing entry "${nameLandKey}"`)
    }
    const officialsWithName = officialsInSameLandAsOsm(officialsWithNameAll, osmLandName)
    if (officialsWithName.length === 0) continue
    if (officialsWithName.length === 1) {
      const off = officialsWithName[0]
      if (noCoordMatched.has(off.id)) continue
      const noCoordVariantMap = normalizedOsmNameVariantMap(base.osmTags ?? {})
      rows[targetIdx] = {
        ...base,
        key: `match-${off.id}`,
        category: 'matched',
        matchMode: 'name',
        officialId: off.id,
        officialName: off.name,
        officialProperties: off.properties,
        matchedByOsmNameNormalized: key,
        matchedByOsmNameTag: noCoordVariantMap.get(key),
      }
      noCoordMatched.add(off.id)
      continue
    }
    const ids = officialsWithName.map((off) => off.id).filter((id) => !noCoordMatched.has(id))
    if (ids.length <= 1) continue
    const byId = new Map(officialsWithName.map((off) => [off.id, off] as const))
    const snapOffs = ids.map((id) => byId.get(id)).filter((x): x is OfficialInput => x != null)
    const ambNoCoordVariantMap = normalizedOsmNameVariantMap(base.osmTags ?? {})
    rows[targetIdx] = {
      ...base,
      key: `ambig-${base.osmType ?? 'way'}-${base.osmId ?? 'unknown'}`,
      category: 'match_ambiguous',
      matchMode: 'name',
      officialId: null,
      officialName: null,
      officialProperties: null,
      distanceMeters: null,
      ambiguousOfficialIds: ids,
      ambiguousOfficialSnapshots: snapshotsFromOfficials(snapOffs),
      matchedByOsmNameNormalized: key,
      matchedByOsmNameTag: ambNoCoordVariantMap.get(key),
    }
  }

  return { rows, officialNoCoordCount: withoutCoord.length - noCoordMatched.size }
}
