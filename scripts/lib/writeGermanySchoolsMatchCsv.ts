import { rm } from 'node:fs/promises'
import path from 'node:path'
import {
  schoolsMatchesDetailByKeyFileSchema,
  stateOfficialPointsFileSchema,
} from '../../src/lib/schemas'
import {
  SCHOOLS_MATCH_CSV_FILE_NAME,
  stringifySchoolsMatchCsvBatches,
  type SchoolsMatchCsvBatch,
} from '../../src/lib/schoolsMatchCsv'
import { STATE_ORDER } from '../../src/lib/stateConfig'
import { datasetsDir } from './pipelineCommon'

/**
 * Build `public/datasets/schools_matches.csv` from every Land's match JSON.
 * Also deletes leftover per-Land CSV files from earlier pipeline versions.
 */
export async function writeGermanySchoolsMatchCsv(projectRoot: string): Promise<void> {
  const root = datasetsDir(projectRoot)
  const batches: SchoolsMatchCsvBatch[] = []

  for (const code of STATE_ORDER) {
    const detailPath = path.join(root, code, 'schools_matches_detail.json')
    const detailFile = Bun.file(detailPath)
    if (!(await detailFile.exists())) continue

    const detail = schoolsMatchesDetailByKeyFileSchema.parse(await detailFile.json())
    const pointsPath = path.join(root, code, 'schools_official_points.json')
    const pointsFile = Bun.file(pointsPath)
    const officialPointsById = (await pointsFile.exists())
      ? stateOfficialPointsFileSchema.parse(await pointsFile.json())
      : undefined

    batches.push({
      rows: Object.values(detail),
      options: { bundesland: code, officialPointsById },
    })
    await rm(path.join(root, code, SCHOOLS_MATCH_CSV_FILE_NAME), { force: true })
  }

  await Bun.write(
    path.join(root, SCHOOLS_MATCH_CSV_FILE_NAME),
    stringifySchoolsMatchCsvBatches(batches),
  )
}
