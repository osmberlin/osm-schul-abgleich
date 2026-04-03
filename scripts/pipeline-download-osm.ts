#!/usr/bin/env bun
import { runDownloadOsmNational } from './lib/nationalPipeline'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')

await runDownloadOsmNational(ROOT)
