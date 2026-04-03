#!/usr/bin/env bun
import { runDownloadJedeschuleNational } from './lib/nationalPipeline'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')

await runDownloadJedeschuleNational(ROOT)
