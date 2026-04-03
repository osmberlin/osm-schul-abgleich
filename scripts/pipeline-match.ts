#!/usr/bin/env bun
import { runMatchNational } from './lib/nationalPipeline'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')

const r = await runMatchNational(ROOT)
if (r.errors.length) console.warn(r.errors.join('\n'))
