import { lonLatFromOfficialFeature } from './matchRowInBbox'
import { schoolsMatchRowSchema } from './schemas'
import type { Feature, FeatureCollection } from 'geojson'
import type { z } from 'zod'

type Row = z.infer<typeof schoolsMatchRowSchema>

function officialFeatureSchoolId(f: Feature): string | null {
  const p = f.properties as { id?: unknown } | null | undefined
  const pid = p?.id != null && String(p.id).trim() !== '' ? String(p.id) : ''
  const fid = typeof f.id === 'string' && f.id.trim() !== '' ? f.id : ''
  const id = pid || fid
  return id.length ? id : null
}

/** True if the feature has finite lon/lat (Point geometry or JedeSchule fields on properties). */
function hasUsableOfficialGeoCoords(f: Feature): boolean {
  const ll = lonLatFromOfficialFeature(f)
  if (!ll) return false
  return Number.isFinite(ll[0]) && Number.isFinite(ll[1])
}

/**
 * When `schools_matches.json` predates pipeline rows for `official_no_coord`, derive the same rows
 * client-side from amtlichem GeoJSON + existing matches (aligned with `scripts/lib/match.ts`).
 */
export function mergeSyntheticOfficialNoCoordRows(
  matches: Row[],
  official: FeatureCollection,
): Row[] {
  if (matches.some((r) => r.category === 'official_no_coord')) {
    return matches
  }

  const officialIdsOnAmbiguousRows = new Set<string>()
  for (const row of matches) {
    for (const id of row.ambiguousOfficialIds ?? []) {
      officialIdsOnAmbiguousRows.add(id)
    }
  }

  const noCoordNameMatchedOfficialIds = new Set<string>()
  for (const row of matches) {
    if (
      (row.matchMode === 'name' ||
        row.matchMode === 'name_prefix' ||
        row.matchMode === 'website' ||
        row.matchMode === 'address') &&
      row.officialId
    ) {
      noCoordNameMatchedOfficialIds.add(row.officialId)
    }
  }

  const extra: Row[] = []
  for (const f of official.features) {
    const id = officialFeatureSchoolId(f)
    if (!id) continue
    if (hasUsableOfficialGeoCoords(f)) continue
    if (noCoordNameMatchedOfficialIds.has(id)) continue
    if (officialIdsOnAmbiguousRows.has(id)) continue

    const p = (f.properties ?? {}) as Record<string, unknown>
    const nameRaw = p.name
    const name = typeof nameRaw === 'string' && nameRaw.trim() !== '' ? nameRaw.trim() : null

    extra.push(
      schoolsMatchRowSchema.parse({
        key: `official-nocoord-${id}`,
        category: 'official_no_coord',
        officialId: id,
        officialName: name,
        officialProperties: p,
        osmId: null,
        osmType: null,
        osmCentroidLon: null,
        osmCentroidLat: null,
        distanceMeters: null,
        osmName: null,
        osmTags: null,
      }),
    )
  }

  return extra.length === 0 ? matches : [...matches, ...extra]
}
