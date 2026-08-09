#!/usr/bin/env bun
import { writeMaprouletteSchoolCreates } from '../lib/maprouletteSchoolCreates'
/**
 * Write the create-school MapRoulette feed from current datasets (no full pipeline).
 */
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dir, '../..')
const { errors, meta } = await writeMaprouletteSchoolCreates(projectRoot)
if (errors.length > 0) {
  console.warn('Warnings/errors:', errors)
}
console.info(meta)
