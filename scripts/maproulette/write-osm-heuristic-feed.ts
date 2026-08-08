#!/usr/bin/env bun
/**
 * Regenerate the nationwide OSM-heuristic MapRoulette Tag Fix feed without a full pipeline match.
 */
import { writeMaprouletteOsmHeuristicSchoolTagFixes } from '../lib/maprouletteSchoolTagFixesOsmHeuristic'
import path from 'node:path'

const projectRoot = path.join(import.meta.dirname, '../..')
const { errors, meta } = await writeMaprouletteOsmHeuristicSchoolTagFixes(projectRoot)
for (const e of errors) console.error(e)
console.info(JSON.stringify(meta, null, 2))
if (errors.length > 0) process.exit(1)
