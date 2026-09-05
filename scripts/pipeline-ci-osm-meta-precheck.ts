#!/usr/bin/env bun
import { access, readFile } from 'node:fs/promises'
import { appendFile } from 'node:fs/promises'
import path from 'node:path'
import { NATIONAL, nationalPath } from './lib/nationalDatasetPaths'

const ROOT = path.join(import.meta.dirname, '..')
const osmMetaPath = nationalPath(ROOT, NATIONAL.schoolsOsmMeta)
const outputPath = process.env.GITHUB_OUTPUT

let osmOk = false

try {
  await access(osmMetaPath)
  const parsed = JSON.parse(await readFile(osmMetaPath, 'utf8')) as { ok?: unknown }
  osmOk = parsed.ok === true
} catch {
  osmOk = false
}

if (outputPath) {
  await appendFile(outputPath, `osm_ok=${osmOk ? 'true' : 'false'}\n`)
}

console.info(`[pipeline:ci] osm meta precheck: ok=${osmOk}`)
