#!/usr/bin/env bun
import path from 'node:path'
import { runStateFirstPipeline } from './lib/nationalPipeline'

const ROOT = path.join(import.meta.dirname, '..')

const r = await runStateFirstPipeline(ROOT)
if (r.errors.length) console.warn(r.errors.join('\n'))
