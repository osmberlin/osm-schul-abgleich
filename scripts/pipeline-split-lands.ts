#!/usr/bin/env bun
import { runSplitLands } from './lib/nationalPipeline'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')

const { errors } = await runSplitLands(ROOT)
if (errors.length) console.warn(errors.join('\n'))
