#!/usr/bin/env bun
import path from 'node:path'
import { runDownloadOsmNational } from './lib/nationalPipeline'

const ROOT = path.join(import.meta.dirname, '..')

await runDownloadOsmNational(ROOT)
