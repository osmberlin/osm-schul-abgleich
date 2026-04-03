import { landBoundaryUrl, landMatchesUrl, landOfficialUrl, landOsmUrl } from './paths'
import { schoolsMatchesFileSchema } from './schemas'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

/** Official + OSM GeoJSON + matches + optional Bundesland outline for one land (SchuleDetail / cache). */
export async function fetchLandSchoolsBundle(code: string) {
  const [oRes, osmRes, mRes, bRes] = await Promise.all([
    fetch(landOfficialUrl(code)),
    fetch(landOsmUrl(code)),
    fetch(landMatchesUrl(code)),
    fetch(landBoundaryUrl(code)),
  ])
  if (!oRes.ok || !osmRes.ok || !mRes.ok) {
    throw new Error('land fetch')
  }
  const [official, osmGeojson, matchesRaw] = await Promise.all([
    oRes.json(),
    osmRes.json(),
    mRes.json(),
  ])
  const matches = schoolsMatchesFileSchema.parse(matchesRaw)
  let boundary: Feature<Polygon | MultiPolygon> | null = null
  if (bRes.ok) {
    boundary = (await bRes.json()) as Feature<Polygon | MultiPolygon>
  }
  return { official, osm: osmGeojson, matches, boundary }
}
