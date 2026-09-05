#!/usr/bin/env bun
/**
 * pipeline:download — parallel downloads; exit 1 unless both Meta-Dateien `ok: true` sind.
 */
import path from 'node:path'
import { NATIONAL, nationalPath } from './lib/nationalDatasetPaths'
import { readJsonFile } from './lib/pipelineCommon'
import type { PipelineSourceMeta } from './lib/pipelineMeta'

const ROOT = path.join(import.meta.dirname, '..')

function envScopedJsonFileName(fileName: string): string {
  if (process.env.GITHUB_ACTIONS === 'true') return fileName
  return fileName.replace(/\.json$/, '.dev.json')
}

const a = Bun.spawn(['bun', 'run', 'pipeline:download:jedeschule'], {
  cwd: ROOT,
  stdout: 'inherit',
  stderr: 'inherit',
})
const b = Bun.spawn(['bun', 'run', 'pipeline:download:osm'], {
  cwd: ROOT,
  stdout: 'inherit',
  stderr: 'inherit',
})

const [ea, eb] = await Promise.all([a.exited, b.exited])
console.info(`[pipeline:download] jedeschule exit=${ea} osm exit=${eb}`)

const pathOfficialMeta = nationalPath(ROOT, envScopedJsonFileName(NATIONAL.schoolsOfficialMeta))
const pathOsmMeta = nationalPath(ROOT, envScopedJsonFileName(NATIONAL.schoolsOsmMeta))
const officialMeta = await readJsonFile<PipelineSourceMeta>(pathOfficialMeta)
const osmMeta = await readJsonFile<PipelineSourceMeta>(pathOsmMeta)
const jedeschuleOk = officialMeta?.ok === true
const osmOk = osmMeta?.ok === true
if (!jedeschuleOk || !osmOk) {
  console.error(
    `[pipeline:download] fehlgeschlagen: beide Quellen müssen ok sein (jedeschule=${jedeschuleOk}, osm=${osmOk})`,
  )
  process.exit(1)
}
process.exit(0)
