#!/usr/bin/env bun
import path from 'node:path'
import { runDownloadJedeschuleNational } from './lib/nationalPipeline'

const ROOT = path.join(import.meta.dirname, '..')

await runDownloadJedeschuleNational(ROOT)
