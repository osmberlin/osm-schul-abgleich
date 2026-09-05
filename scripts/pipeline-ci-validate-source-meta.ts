#!/usr/bin/env bun
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { NATIONAL, nationalPath } from './lib/nationalDatasetPaths'

const ROOT = path.join(import.meta.dirname, '..')

async function requireMetaOk(fileName: string, label: string) {
  const filePath = nationalPath(ROOT, fileName)
  try {
    await access(filePath)
  } catch {
    throw new Error(`${label} meta missing`)
  }
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as { ok?: unknown }
  if (parsed?.ok !== true) {
    throw new Error(`${label} meta not ok`)
  }
}

await requireMetaOk(NATIONAL.schoolsOfficialMeta, 'official')
await requireMetaOk(NATIONAL.schoolsOsmMeta, 'osm')
console.info('[pipeline:ci] source metadata validation passed')
