import { detailMapConnectorLines } from './detailMapConnectorLines'
import type { StateSchoolsBundle, StateSchoolsMatchRow } from './fetchStateSchoolsBundle'
import { findOfficialSchoolFeature } from './findOfficialSchoolFeature'
import { buildMapDimMaskFeature } from './mapDimMask'
import { MATCH_RADIUS_KM } from './matchRadius'
import { findOsmFeature } from './osmFeatureLookup'
import { resolveOsmSchoolAreaOutline } from './osmSchoolDetailGeometry'
import { parseMatchRowOsmCentroidLonLat } from './zodGeo'
import circle from '@turf/circle'
import { lineString, point } from '@turf/helpers'
import type { Feature, Polygon } from 'geojson'

type HoveredMapLabelLike =
  | { kind: 'osm-reference' }
  | { kind: 'official-current'; lon: number; lat: number }
  | { kind: 'osm-other'; schoolKey: string }
  | null

function resolveSchoolDetailMapFeatures(
  data: StateSchoolsBundle | undefined,
  row: StateSchoolsMatchRow | null,
  mapOsmCentroid: readonly [number, number] | null,
  hoveredMapLabel: HoveredMapLabelLike,
  osmAreasByKey: Record<string, Feature> | undefined,
) {
  const detailFeatures: Feature[] = (() => {
    if (!data || !row) return []
    const features: Feature[] = []
    if (row.ambiguousOfficialIds && row.ambiguousOfficialIds.length > 0) {
      for (const oid of row.ambiguousOfficialIds) {
        const f = findOfficialSchoolFeature(data.official, oid)
        if (f) features.push(f as Feature)
      }
    } else if (row.officialId) {
      const f = findOfficialSchoolFeature(data.official, row.officialId)
      if (f) features.push(f as Feature)
    }
    const mainOsm = findOsmFeature(data.osm, row.osmType, row.osmId)
    const osmArea = resolveOsmSchoolAreaOutline(mainOsm, row.osmType, row.osmId, osmAreasByKey)
    if (osmArea) {
      features.push(osmArea)
    }
    if (mapOsmCentroid) {
      const [clon, clat] = mapOsmCentroid
      features.push(point([clon, clat], { _mapDetail: 'osmCentroid' as const }))
    }
    return features
  })()

  let compareRadiusRing: Feature<Polygon> | null = null
  if (mapOsmCentroid) {
    const [lon, lat] = mapOsmCentroid
    const ring = circle([lon, lat], MATCH_RADIUS_KM, { steps: 64, units: 'kilometers' })
    ring.properties = { ...ring.properties, _mapDetail: 'compareRadius' as const }
    compareRadiusRing = ring as Feature<Polygon>
  }

  const detailMapMaskFeature = buildMapDimMaskFeature(compareRadiusRing)

  const connectorLineFeatures: Feature[] =
    !mapOsmCentroid || !data || !row
      ? []
      : detailMapConnectorLines({
          officialFc: data.official,
          matchRow: row,
          fromLon: mapOsmCentroid[0],
          fromLat: mapOsmCentroid[1],
          mapDetail: 'connector',
        })

  const hoverRelationLineFeatures: Feature[] = (() => {
    if (!data || !row || !hoveredMapLabel) return []
    const officialFc = data.official
    if (hoveredMapLabel.kind === 'osm-other') {
      const match = data.matches.find((m) => m.key === hoveredMapLabel.schoolKey)
      if (!match) return []
      const from = parseMatchRowOsmCentroidLonLat(match)
      if (!from) return []
      const [fromLon, fromLat] = from
      return detailMapConnectorLines({
        officialFc,
        matchRow: match,
        fromLon,
        fromLat,
        mapDetail: 'hoverRelation',
      })
    }
    if (hoveredMapLabel.kind === 'osm-reference') {
      if (!mapOsmCentroid) return []
      const [fromLon, fromLat] = mapOsmCentroid
      return detailMapConnectorLines({
        officialFc,
        matchRow: row,
        fromLon,
        fromLat,
        mapDetail: 'hoverRelation',
      })
    }
    if (hoveredMapLabel.kind === 'official-current') {
      if (!mapOsmCentroid) return []
      const [clon, clat] = mapOsmCentroid
      return [
        lineString(
          [
            [hoveredMapLabel.lon, hoveredMapLabel.lat],
            [clon, clat],
          ],
          { _mapDetail: 'hoverRelation' as const },
        ),
      ]
    }
    return []
  })()

  return {
    detailFeatures,
    compareRadiusRing,
    detailMapMaskFeature,
    connectorLineFeatures,
    hoverRelationLineFeatures,
  }
}

export function deriveSchoolDetailMapFeatures(
  data: StateSchoolsBundle | undefined,
  row: StateSchoolsMatchRow | null,
  mapOsmCentroid: readonly [number, number] | null,
  hoveredMapLabel: HoveredMapLabelLike,
  osmAreasByKey: Record<string, Feature> | undefined,
) {
  return resolveSchoolDetailMapFeatures(data, row, mapOsmCentroid, hoveredMapLabel, osmAreasByKey)
}
