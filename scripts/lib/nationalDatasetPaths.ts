import { datasetsDir } from './pipelineCommon'
import path from 'node:path'

/** National artifacts under `public/datasets/` (after split, per-land dirs still use `{code}/`). */
export const NATIONAL = {
  schoolsOfficialGeojson: 'schools_official_de.geojson',
  schoolsOfficialMeta: 'schools_official_de.meta.json',
  jedeschuleStats: 'jedeschule_stats.json',
  schoolsOsmGeojson: 'schools_osm_de.geojson',
  schoolsOsmMeta: 'schools_osm_de.meta.json',
  schoolsMatchesJson: 'schools_matches_de.json',
  /** When present, `pipeline:split-lands` no-ops (match skipped or failed). */
  skipSplitMarker: '.pipeline_skip_split',
} as const

export function nationalPath(projectRoot: string, name: string) {
  return path.join(datasetsDir(projectRoot), name)
}
