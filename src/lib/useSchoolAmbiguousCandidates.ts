import { fetchStateSchoolsBundle } from './fetchStateSchoolsBundle'
import { findOfficialSchoolFeature } from './findOfficialSchoolFeature'
import { nameFromOfficialProperties } from './matchRowInBbox'
import { parseJedeschuleLonLatFromRecord } from './zodGeo'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

type StateSchoolsBundle = Awaited<ReturnType<typeof fetchStateSchoolsBundle>>
type StateSchoolMatchRow = StateSchoolsBundle['matches'][number]

export type SchoolAmbiguousCandidate = {
  id: string
  name: string
  properties: Record<string, unknown>
  distM: number | null
  hasOfficialFeature: boolean
  officialLonLat: readonly [number, number] | null
  showOfficialCoordsMissing: boolean
}

export type SchoolAmbiguousCandidatesResult = {
  ambiguousCandidates: SchoolAmbiguousCandidate[]
  ambiguousNoLocalGeoFeature: boolean
}

function resolveSchoolAmbiguousCandidates(
  data: StateSchoolsBundle | undefined,
  row: StateSchoolMatchRow | null,
  mapOsmCentroid: readonly [number, number] | null,
): SchoolAmbiguousCandidate[] {
  if (!data || !row?.ambiguousOfficialIds?.length || row.category !== 'match_ambiguous') return []

  const snapById = new Map((row.ambiguousOfficialSnapshots ?? []).map((s) => [s.id, s] as const))
  return row.ambiguousOfficialIds.map((oid) => {
    const officialFeature = findOfficialSchoolFeature(data.official, oid)
    const snapshot = snapById.get(oid)
    const props = (officialFeature?.properties ?? snapshot?.properties ?? {}) as Record<
      string,
      unknown
    >
    const officialLonLat: readonly [number, number] | null =
      officialFeature?.geometry?.type === 'Point'
        ? ([
            officialFeature.geometry.coordinates[0],
            officialFeature.geometry.coordinates[1],
          ] as const)
        : parseJedeschuleLonLatFromRecord(props)

    const showDistance =
      row.matchMode !== 'name' &&
      row.matchMode !== 'name_prefix' &&
      mapOsmCentroid != null &&
      officialLonLat != null
    let distM: number | null = null
    if (showDistance) {
      const [clon, clat] = mapOsmCentroid
      const [plon, plat] = officialLonLat
      distM = Math.round(
        distance(point([plon, plat]), point([clon, clat]), { units: 'kilometers' }) * 1000,
      )
    }

    const name = nameFromOfficialProperties(props) ?? snapshot?.name ?? oid

    return {
      id: oid,
      name,
      properties: props,
      distM,
      hasOfficialFeature: officialFeature != null,
      officialLonLat,
      showOfficialCoordsMissing: officialLonLat == null,
    }
  })
}

export function deriveSchoolAmbiguousCandidates(
  data: StateSchoolsBundle | undefined,
  row: StateSchoolMatchRow | null,
  mapOsmCentroid: readonly [number, number] | null,
): SchoolAmbiguousCandidatesResult {
  const ambiguousCandidates = resolveSchoolAmbiguousCandidates(data, row, mapOsmCentroid)
  const ambiguousNoLocalGeoFeature = ambiguousCandidates.some((c) => !c.hasOfficialFeature)
  return { ambiguousCandidates, ambiguousNoLocalGeoFeature }
}
