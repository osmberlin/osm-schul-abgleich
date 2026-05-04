import { featureCollection } from '@turf/helpers'
import type { FeatureCollection } from 'geojson'

type OverpassMember = {
  type?: string
  ref?: number
  role?: string
  geometry?: Array<{ lat?: number; lon?: number }>
}

type OverpassElement = {
  type?: string
  id?: number
  tags?: Record<string, string>
  members?: OverpassMember[]
}

function relationIdPresentInFc(fc: FeatureCollection, relationId: number): boolean {
  const want = `relation/${relationId}`
  return fc.features.some((f) => String(f.id) === want)
}

/**
 * One campus per `type=site` + school/college tagging (`amenity` and/or `education` with `school` or `college`):
 * remove member ways that carry the same school/college tags, so matching uses the relation feature from
 * osm2geojson-ultra (with geometry).
 *
 * Only drops ways when the corresponding `relation/{id}` exists in `fc` (normal Overpass `out geom` + ultra).
 */
export function injectSchoolSiteRelationsFromOverpass(
  raw: { elements?: unknown[] },
  fc: FeatureCollection,
): FeatureCollection {
  const elements = Array.isArray(raw.elements) ? raw.elements : []
  const wayIdsToDropSchool = new Set<number>()
  const wayIdsToDropCollege = new Set<number>()

  for (const u of elements) {
    const el = u as OverpassElement
    if (el.type !== 'relation' || typeof el.id !== 'number') continue
    const tags = el.tags
    if (!tags || tags.type !== 'site') continue
    const isCollegeSite = tags.amenity === 'college' || tags.education === 'college'
    const isSchoolSite = tags.amenity === 'school' || tags.education === 'school'
    if (!isCollegeSite && !isSchoolSite) continue
    if (!relationIdPresentInFc(fc, el.id)) continue

    const targetSet = isCollegeSite ? wayIdsToDropCollege : wayIdsToDropSchool
    for (const m of el.members ?? []) {
      if (m.type === 'way' && typeof m.ref === 'number') targetSet.add(m.ref)
    }
  }

  if (wayIdsToDropSchool.size === 0 && wayIdsToDropCollege.size === 0) return fc

  const filtered = fc.features.filter((f) => {
    if (typeof f.id !== 'string' || !f.id.startsWith('way/')) return true
    const wid = Number(f.id.slice(4))
    const props =
      f.properties && typeof f.properties === 'object'
        ? (f.properties as { amenity?: string; education?: string })
        : undefined
    const a = String(props?.amenity ?? '')
    const edu = String(props?.education ?? '')
    const isCollegeWay = a === 'college' || edu === 'college'
    if (isCollegeWay && wayIdsToDropCollege.has(wid)) return false
    const isSchoolWay = a === 'school' || edu === 'school'
    if (isSchoolWay && wayIdsToDropSchool.has(wid)) return false
    return true
  })

  return featureCollection(filtered)
}
