const base = () => import.meta.env.BASE_URL.replace(/\/$/, '')

const datasetsUrl = (path: string) => `${base()}${path.startsWith('/') ? path : `/${path}`}`
function envScopedJsonFileName(fileName: string): string {
  if (!import.meta.env.DEV) return fileName
  if (fileName.endsWith('.jsonl')) return fileName.replace(/\.jsonl$/, '.dev.jsonl')
  return fileName.replace(/\.json$/, '.dev.json')
}

export const summaryJsonUrl = () => datasetsUrl('/datasets/summary.json')
export const runsJsonlUrl = () =>
  datasetsUrl(`/datasets/status/${envScopedJsonFileName('runs.jsonl')}`)
export const nationalOfficialMetaUrl = () =>
  datasetsUrl(`/datasets/${envScopedJsonFileName('schools_official_de.meta.json')}`)
export const nationalOsmMetaUrl = () =>
  datasetsUrl(`/datasets/${envScopedJsonFileName('schools_osm_de.meta.json')}`)
export const stateOfficialUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_official.geojson`)
export const stateOsmAreasUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_osm_areas.json`)
export const stateOsmMetaUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_osm.meta.json`)
export const stateMatchesMapUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_matches_map.json`)
export const stateMatchesListSearchUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_matches_list_search.json`)
export const stateMatchesDetailUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_matches_detail.json`)
export const stateOfficialPointsUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_official_points.json`)

/** Simplified Bundesland outline (GeoJSON Feature) for map overlay; checked in under `public/bundesland-boundaries/`. */
export const stateBoundaryUrl = (code: string) =>
  datasetsUrl(`/bundesland-boundaries/${code}.geojson`)
