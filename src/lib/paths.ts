const base = () => import.meta.env.BASE_URL.replace(/\/$/, '')

const datasetsUrl = (path: string) => `${base()}${path.startsWith('/') ? path : `/${path}`}`
function envScopedJsonFileName(fileName: string): string {
  if (!import.meta.env.DEV) return fileName
  return fileName.replace(/\.json$/, '.dev.json')
}

export const summaryJsonUrl = () => datasetsUrl('/datasets/summary.json')
export const runsJsonUrl = () =>
  datasetsUrl(`/datasets/status/${envScopedJsonFileName('runs.json')}`)
export const nationalOfficialMetaUrl = () =>
  datasetsUrl(`/datasets/${envScopedJsonFileName('schools_official_de.meta.json')}`)
export const nationalOsmMetaUrl = () =>
  datasetsUrl(`/datasets/${envScopedJsonFileName('schools_osm_de.meta.json')}`)
export const landOfficialUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_official.geojson`)
export const landOsmUrl = (code: string) => datasetsUrl(`/datasets/${code}/schools_osm.geojson`)
export const landOsmMetaUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_osm.meta.json`)
export const landMatchesUrl = (code: string) =>
  datasetsUrl(`/datasets/${code}/schools_matches.json`)

/** Simplified Bundesland outline (GeoJSON Feature) for map overlay; checked in under `public/bundesland-boundaries/`. */
export const landBoundaryUrl = (code: string) =>
  datasetsUrl(`/bundesland-boundaries/${code}.geojson`)
