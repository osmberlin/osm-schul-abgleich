import path from 'node:path'
import { datasetsDir } from './pipelineCommon'

/** Meta, stats, and internal pipeline cache under `public/datasets/`. */
export const NATIONAL = {
  schoolsOfficialMeta: 'schools_official_de.meta.json',
  jedeschuleStats: 'jedeschule_stats.json',
  schoolsOsmMeta: 'schools_osm_de.meta.json',
  /**
   * Gitignored Overpass output (not part of the app bundle). Only the match step reads this
   * after `pipeline:download:osm`.
   */
  pipelineOsmGeojson: '.pipeline/schools_osm_de.geojson',
} as const

export function nationalPath(projectRoot: string, name: string) {
  return path.join(datasetsDir(projectRoot), name)
}
